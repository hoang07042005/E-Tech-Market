import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { apiFetch } from '../../lib/api'
import '../css_admin/ContactsAdminPage.css'

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
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

  const fetchMessages = useCallback(
    async (currentPage: number, handledStatus: 'all' | 'yes' | 'no') => {
      if (!token) return
      setLoading(true)
      try {
        let url = `/api/admin/contact-messages?page=${currentPage}&limit=10`
        if (handledStatus !== 'all') {
          url += `&handled=${handledStatus}`
        }
        const res = await apiFetch<{ data: ContactMessage[]; last_page: number }>(url, { token })
        setMessages(res.data || [])
        setTotalPages(res.last_page || 1)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    const loadMessages = async () => {
      await fetchMessages(page, handledFilter)
    }
    void loadMessages()
  }, [fetchMessages, page, handledFilter])

  const markHandled = async (id: number) => {
    if (!token) return
    try {
      const res = await apiFetch<ContactMessage>(`/api/admin/contact-messages/${id}/handle`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({}),
      })
      setMessages((prev) => prev.map((m) => (m.id === id ? res : m)))
    } catch {
      alert('Lỗi cập nhật.')
    }
  }

  const deleteMessage = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá tin nhắn này?')) return
    if (!token) return
    try {
      await apiFetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE', token })
      setMessages((prev) => prev.filter((m) => m.id !== id))
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
    <div className="contactsAdminPage adminPageContainer">
      <div className="contactsToolbar">
        <div className="contactsFilterTabs">
          <button className={handledFilter === 'all' ? 'isActive' : ''} onClick={() => { setHandledFilter('all'); setPage(1) }}>
            Tất cả
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

      <div className="adminTableWrap">
        {loading ? (
          <div className="adminLoading">Đang tải...</div>
        ) : messages.length === 0 ? (
          <div className="adminEmpty">Không có tin nhắn nào.</div>
        ) : (
          <table className="contactsTable">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Thông tin liên hệ</th>
                <th>Chủ đề</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedMessages.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="customerCell">
                      <div className="customerAvatar">{getInitials(m.name)}</div>
                      <div className="customerInfo">
                        <strong>{m.name}</strong>
                        <span>ID: #{m.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
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
                    <span className={`statusPill ${m.handled_at ? 'done' : 'pending'}`} title={m.handled_at ? `Xử lý bởi: ${m.handled_by?.name || 'Admin'}` : undefined}>
                      {m.handled_at ? 'Đã xử lý' : 'Cần chú ý'}
                    </span>
                  </td>
                  <td>
                    <div className="contactActions">
                      {!m.handled_at && (
                        <button className="iconBtn" onClick={() => markHandled(m.id)} title="Đánh dấu đã xử lý" aria-label="Đánh dấu đã xử lý">
                          ✓
                        </button>
                      )}
                      <a
                        href={getGmailComposeUrl(m)}
                        target="_blank"
                        rel="noreferrer"
                        className="iconBtn"
                        title="Trả lời email"
                        aria-label="Trả lời email"
                      >
                        ↩
                      </a>
                      <button className="iconBtn danger" onClick={() => deleteMessage(m.id)} title="Xóa liên hệ" aria-label="Xóa liên hệ">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="contactsPagination">
        <p>Hiển thị {startItem}-{endItem} trong số {totalPages * 10} liên hệ</p>
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
    </div>
  )
}
