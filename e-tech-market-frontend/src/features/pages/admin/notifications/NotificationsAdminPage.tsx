import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/admin/NotificationsAdmin.css' // Đảm bảo import đúng file CSS mới này

type Notif = {
  id: number
  type?: string | null
  title?: string | null
  body?: string | null
  data?: Record<string, unknown> | null
  read_at?: string | null
  created_at?: string | null
}

type NotifRes = {
  data: Notif[]
  pagination: { current_page: number; last_page: number; total: number; per_page: number }
  unread: number
  read_count?: number
}

function fmtVi(iso?: string | null) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleString('vi-VN')
}

export default function NotificationsAdminPage() {
  const hasAuth = true
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<NotifRes | null>(null)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread')
  const [expandedNotifs, setExpandedNotifs] = useState<number[]>([])

  const toggleExpand = (id: number) => {
    setExpandedNotifs((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const load = useCallback(async () => {
    if (!hasAuth) {
      setError('Bạn chưa đăng nhập.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<NotifRes>(`/notifications?per_page=30&page=${page}&status=${activeTab}`)
      setRes(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông báo.')
    } finally {
      setLoading(false)
    }
  }, [page, hasAuth, activeTab])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const rows = useMemo(() => res?.data ?? [], [res?.data])
  const pg = res?.pagination

  const markRead = async (id: number, currentReadAt?: string | null) => {
    if (!hasAuth || currentReadAt) return
    
    // Optimistic update: Cập nhật UI ngay lập tức không cần chờ API
    setRes((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        data: prev.data.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        unread: Math.max(0, prev.unread - 1)
      }
    })

    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({}) })
    } catch {
      // Nếu lỗi có thể rollback hoặc bỏ qua
    }
  }

  // Hàm tự động gán Icon dựa vào từ khóa tiêu đề hoặc loại thông báo
  const getNotifIcon = (title: string = '') => {
    const t = title.toLowerCase();
    if (t.includes('đơn hàng') || t.includes('order')) return '📦';
    if (t.includes('thành viên') || t.includes('user')) return '👤';
    if (t.includes('doanh thu') || t.includes('tiền')) return '💰';
    if (t.includes('mã') || t.includes('coupon')) return '🎫';
    return '🔔';
  }

  return (
    <div className="notifPageContainer">
      {/* Header phía trên */}
      <div className="notifPageHeader">
        <div>
          <h2 className="notifPageTitle">Trung tâm Thông báo</h2>
          <p className="notifPageSubtitle">Xem và cập nhật các thông tin vận hành từ hệ thống.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="notifTabsWrapper">
        <div className="notifTabs">
          <button 
            className={`notifTabBtn ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => { setActiveTab('unread'); setPage(1); }}
          >
            Thư mới 
            <span className={`tabBadge ${res?.unread ? 'unread' : ''}`}>{res?.unread || 0}</span>
          </button>
          <button 
            className={`notifTabBtn ${activeTab === 'read' ? 'active' : ''}`}
            onClick={() => { setActiveTab('read'); setPage(1); }}
          >
            Đã đọc
            <span className="tabBadge">{res?.read_count || 0}</span>
          </button>
        </div>
      </div>

      {/* Vùng nội dung chính */}
      <div className="notifFeedWrapper">
        {loading ? (
          <div className="notifLoadingList">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="notifSkeletonItem">
                <div className="skeletonIcon" />
                <div className="skeletonContent">
                  <div className="admSkeletonBar" style={{ width: '35%', height: 16, marginBottom: 8 }} />
                  <div className="admSkeletonBar" style={{ width: '75%', height: 14, marginBottom: 8 }} />
                  <div className="admSkeletonBar" style={{ width: '20%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="notifErrorState">{error}</div>
        ) : !rows.length ? (
          <div className="notifEmptyState">
            <div className="emptyStateIcon">📭</div>
            <p>Hộp thư của bạn đang trống.</p>
          </div>
        ) : (
          <div className="notifList">
            {rows.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notifItemRow ${n.read_at ? 'isRead' : 'isUnread'} ${expandedNotifs.includes(n.id) ? 'isExpanded' : ''}`}
                onClick={() => {
                  toggleExpand(n.id)
                  void markRead(n.id, n.read_at)
                }}
              >
                {/* Khối biểu tượng minh họa */}
                <div className="notifIconBox">
                  {getNotifIcon(n.title || '')}
                </div>

                {/* Khối nội dung chữ */}
                <div className="notifContentBox">
                  <div className="notifMetaTop">
                    <div className="notifMetaLeft">
                      <h4 className="notifTitleText">{n.title || 'Thông báo hệ thống'}</h4>
                      <span className="notifTimeText">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {fmtVi(n.created_at)}
                      </span>
                    </div>
                    <div className="notifMetaRight">
                      <span className={`notifStatusTag ${n.read_at ? 'read' : 'unread'}`}>
                        {n.read_at ? 'Đã đọc' : 'Mới'}
                      </span>
                      <svg className="notifChevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedNotifs.includes(n.id) ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                  
                  {expandedNotifs.includes(n.id) && (
                    <div className="notifBodyExpanded">
                      {(() => {
                        const isContact = n.title?.toLowerCase().includes('liên hệ');
                        const parts = n.body ? n.body.split(/(?: \u2022 |\n|<br\s*\/?>)/) : [];
                        
                        if (isContact && parts.length >= 2) {
                          return (
                            <div className="notifContactCard">
                              <div className="notifContactRow">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <strong>Người gửi:</strong> <span>{parts[0]}</span>
                              </div>
                              <div className="notifContactRow">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                <strong>Chủ đề:</strong> <span>{parts[1]}</span>
                              </div>
                              <div className="notifContactMessage">
                                {parts.slice(2).join(' ')}
                              </div>
                            </div>
                          )
                        }

                        // Mặc định
                        return (
                          <div className="notifStandardText">
                            {parts.map((line, idx) => (
                              <p key={idx}>{line}</p>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Bộ phân trang */}
        <div className="notifPagination">
          <button 
            className="notifPagerBtn" 
            disabled={(pg?.current_page ?? 1) <= 1} 
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Trước
          </button>
          
          <span className="notifPagerInfo">
            Trang <b>{(pg?.current_page ?? 1)}</b> / {(pg?.last_page ?? 1)}
          </span>
          
          <button 
            className="notifPagerBtn" 
            disabled={(pg?.current_page ?? 1) >= (pg?.last_page ?? 1)} 
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </div>
  )
}