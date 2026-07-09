import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/admin/ContactsAdminPage.css' // Import CSS mới cập nhật

type ContactMessage = {
  id: number
  name: string
  email: string
  phone: string
  subject: string
  message: string
  handled_at: string | null
  handled_by_user_id: number | null
  created_at: string
  handled_by?: {
    id: number
    name: string
  }
}

const GMAIL_COMPOSE_BASE_URL = 'https://mail.google.com/mail/u/0/#inbox?compose=new'

export default function ContactsAdminPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [handledFilter, setHandledFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null) // State quản lý xem chi tiết
  const hasAuth = true 

  const fetchMessages = useCallback(
    async (currentPage: number, handledStatus: 'all' | 'yes' | 'no') => {
      if (!hasAuth) return
      setLoading(true)
      try {
        let url = `/api/admin/contact-messages?page=${currentPage}&limit=10`
        if (handledStatus !== 'all') {
          url += `&handled=${handledStatus}`
        }
        const res = await apiFetch<{ data: ContactMessage[]; last_page: number }>(url)
        setMessages(res.data || [])
        setTotalPages(res.last_page || 1)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [hasAuth],
  )

  useEffect(() => {
    const loadMessages = async () => {
      await fetchMessages(page, handledFilter)
    }
    void loadMessages()
  }, [fetchMessages, page, handledFilter])

  const markHandled = async (id: number) => {
    if (!hasAuth) return
    try {
      const res = await apiFetch<ContactMessage>(`/api/admin/contact-messages/${id}/handle`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      })
      setMessages((prev) => prev.map((m) => (m.id === id ? res : m)))
      // Cập nhật lại thông tin hiển thị nếu đang mở modal chi tiết
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(res)
      }
    } catch {
      alert('Lỗi cập nhật.')
    }
  }

  const deleteMessage = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá tin nhắn này?')) return
    if (!hasAuth) return
    try {
      await apiFetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE' })
      setMessages((prev) => prev.filter((m) => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)
    } catch {
      alert('Lỗi khi xoá.')
    }
  }

  const displayedMessages = useMemo(() => {
    const sorted = [...messages]
    sorted.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
    })
    return sorted
  }, [messages, sortOrder])

  const startItem = messages.length === 0 ? 0 : (page - 1) * 10 + 1
  const endItem = messages.length === 0 ? 0 : startItem + messages.length - 1

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = [page - 1, page, page + 1].filter((p) => p > 0 && p <= totalPages)
    if (!pages.includes(1)) pages.unshift(1)
    if (!pages.includes(totalPages)) pages.push(totalPages)
    return pages
  }, [page, totalPages])

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((part) => part.charAt(0).toUpperCase()).join('')
  }

  const getGmailComposeUrl = (message: ContactMessage) => {
    const to = encodeURIComponent(message.email)
    const subject = encodeURIComponent(`RE: ${message.subject}`)
    return `${GMAIL_COMPOSE_BASE_URL}&to=${to}&su=${subject}`
  }

  return (
    <div className="contactsAdminPage">
      {/* Page Title */}
      <div className="contactsAdminHeader">
        <h2 className="adminPageTitle">Quản lý hộp thư liên hệ</h2>
        <p className="adminPageSubtitle">Tiếp nhận, xử lý và phản hồi các yêu cầu từ khách hàng gửi về hệ thống.</p>
      </div>

      {/* Toolbar Filters & Sorting */}
      <div className="contactsToolbar">
        <div className="contactsFilterTabs">
          <button className={handledFilter === 'all' ? 'isActive' : ''} onClick={() => { setHandledFilter('all'); setPage(1) }}>
            Tất cả ({messages.length})
          </button>
          <button className={handledFilter === 'no' ? 'isActive' : ''} onClick={() => { setHandledFilter('no'); setPage(1) }}>
            Chưa xử lý
          </button>
          <button className={handledFilter === 'yes' ? 'isActive' : ''} onClick={() => { setHandledFilter('yes'); setPage(1) }}>
            Đã giải quyết
          </button>
        </div>

        <div className="contactsToolbarActions">
          <label className="contactsSortSelect">
            <span>Sắp xếp:</span>
            <select value={sortOrder} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortOrder(e.target.value as 'newest' | 'oldest')}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </label>
        </div>
      </div>

      {/* Table Section */}
      <div className="adminTableWrap">
        {loading ? (
          <table className="contactsTable">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Thông tin liên hệ</th>
                <th>Chủ đề</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={6}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '75%' : '85%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : messages.length === 0 ? (
          <div className="adminEmpty">Hộp thư trống. Không có tin nhắn nào khớp với bộ lọc.</div>
        ) : (
          <table className="contactsTable">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Thông tin liên hệ</th>
                <th>Chủ đề</th>
                <th>Nội dung tóm tắt</th>
                <th>Trạng thái</th>
                <th className="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedMessages.map((m) => (
                <tr key={m.id} className="clickableRow" onClick={() => setSelectedMessage(m)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="customerCell">
                      <div className="customerAvatar">{getInitials(m.name)}</div>
                      <div className="customerInfo">
                        <strong>{m.name}</strong>
                        <span>ID: #{m.id}</span>
                      </div>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="contactInfoCell">
                      <a className="contactInfoLink" href={`mailto:${m.email}`}>{m.email}</a>
                      {m.phone && <a className="contactInfoLink" href={`tel:${m.phone}`}>{m.phone}</a>}
                    </div>
                  </td>
                  <td>
                    <p className="subjectText" title={m.subject}>{m.subject}</p>
                  </td>
                  <td>
                    <p className="messageText" title={m.message}>{m.message}</p>
                  </td>
                  <td>
                    <span 
                      className={`statusPill ${m.handled_at ? 'done' : 'pending'}`} 
                      title={m.handled_at ? `Xử lý bởi: ${m.handled_by?.name || 'Admin'}` : undefined}
                    >
                      {m.handled_at ? 'Đã xử lý' : 'Chưa xử lý'}
                    </span>
                  </td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="contactActions">
                      <button className="iconBtn detail" onClick={() => setSelectedMessage(m)} title="Xem chi tiết">
                        <DetailIcon />
                      </button>
                      {!m.handled_at && (
                        <button className="iconBtn success" onClick={() => markHandled(m.id)} title="Đánh dấu đã xử lý">
                          <ApproveIcon />
                        </button>
                      )}
                      <a
                        href={getGmailComposeUrl(m)}
                        target="_blank"
                        rel="noreferrer"
                        className="iconBtn info"
                        title="Phản hồi qua Gmail"
                      >
                        <ReplyIcon />
                      </a>
                      <button className="iconBtn danger" onClick={() => deleteMessage(m.id)} title="Xóa thư">
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Container */}
      <div className="contactsPagination">
        <p>Hiển thị <strong>{startItem} - {endItem}</strong> trong tổng số <strong>{totalPages * 10}</strong> yêu cầu liên hệ</p>
        <div className="pageNumbers">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Trang trước">
            ‹
          </button>
          {visiblePages.map((pageNumber) => (
            <button key={pageNumber} className={pageNumber === page ? 'isCurrent' : ''} onClick={() => setPage(pageNumber)}>
              {pageNumber}
            </button>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Trang sau">
            ›
          </button>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT LIÊN HỆ */}
      {selectedMessage && (
        <div className="contactDetailModalOverlay" onClick={() => setSelectedMessage(null)}>
          <div className="contactDetailModalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Chi tiết yêu cầu liên hệ #{selectedMessage.id}</h3>
              <button className="closeModalBtn" onClick={() => setSelectedMessage(null)}>&times;</button>
            </div>
            
            <div className="modalContentLayout">
              {/* Cột trái: Thông tin khách hàng */}
              <div className="modalSidebarInfo">
                <div className="modalAvatarLarge">{getInitials(selectedMessage.name)}</div>
                <h4>{selectedMessage.name}</h4>
                <p className="modalMetaTime">Gửi lúc: {new Date(selectedMessage.created_at).toLocaleString('vi-VN')}</p>
                
                <div className="infoDivider"></div>
                
                <div className="infoDetailRow">
                  <span className="infoLabel">Email:</span>
                  <a href={`mailto:${selectedMessage.email}`} className="infoValue link">{selectedMessage.email}</a>
                </div>
                <div className="infoDetailRow">
                  <span className="infoLabel">Số điện thoại:</span>
                  {selectedMessage.phone ? (
                    <a href={`tel:${selectedMessage.phone}`} className="infoValue link">{selectedMessage.phone}</a>
                  ) : (
                    <span className="infoValue italic text-muted">Chưa cung cấp</span>
                  )}
                </div>
                <div className="infoDetailRow">
                  <span className="infoLabel">Trạng thái:</span>
                  <span className={`statusPill ${selectedMessage.handled_at ? 'done' : 'pending'}`}>
                    {selectedMessage.handled_at ? 'Đã xử lý' : 'Đang chờ giải quyết'}
                  </span>
                </div>

                {selectedMessage.handled_at && (
                  <div className="handledMetaBox">
                    <p><strong>Người duyệt:</strong> {selectedMessage.handled_by?.name || 'Quản trị viên'}</p>
                    <p><strong>Vào lúc:</strong> {new Date(selectedMessage.handled_at).toLocaleString('vi-VN')}</p>
                  </div>
                )}
              </div>

              {/* Cột phải: Nội dung chi tiết nhắn gửi */}
              <div className="modalMainMessage">
                <div className="messageGroup">
                  <label>Chủ đề liên hệ</label>
                  <div className="subjectDisplay">{selectedMessage.subject}</div>
                </div>

                <div className="messageGroup">
                  <label>Nội dung tin nhắn</label>
                  <div className="messageContentDisplay">{selectedMessage.message}</div>
                </div>
              </div>
            </div>

            <div className="modalFooterActions">
              <button className="ab-btn btn-outline" onClick={() => setSelectedMessage(null)}>Đóng</button>
              <a 
                href={getGmailComposeUrl(selectedMessage)} 
                target="_blank" 
                rel="noreferrer" 
                className="ab-btn btn-info"
              >
                ↩ Phản hồi Email
              </a>
              {!selectedMessage.handled_at && (
                <button 
                  className="ab-btn btn-primary" 
                  onClick={() => markHandled(selectedMessage.id)}
                >
                  ✓ Xác nhận đã xử lý
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function ReplyIcon() {return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-reply" viewBox="0 0 16 16"><path d="M6.598 5.013a.144.144 0 0 1 .202.134V6.3a.5.5 0 0 0 .5.5c.667 0 2.013.005 3.3.822.984.624 1.99 1.76 2.595 3.876-1.02-.983-2.185-1.516-3.205-1.799a8.7 8.7 0 0 0-1.921-.306 7 7 0 0 0-.798.008h-.013l-.005.001h-.001L7.3 9.9l-.05-.498a.5.5 0 0 0-.45.498v1.153c0 .108-.11.176-.202.134L2.614 8.254l-.042-.028a.147.147 0 0 1 0-.252l.042-.028zM7.8 10.386q.103 0 .223.006c.434.02 1.034.086 1.7.271 1.326.368 2.896 1.202 3.94 3.08a.5.5 0 0 0 .933-.305c-.464-3.71-1.886-5.662-3.46-6.66-1.245-.79-2.527-.942-3.336-.971v-.66a1.144 1.144 0 0 0-1.767-.96l-3.994 2.94a1.147 1.147 0 0 0 0 1.946l3.994 2.94a1.144 1.144 0 0 0 1.767-.96z"/></svg>)}
function DetailIcon() {return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>)}
function TrashIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>)}
function ApproveIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)}