import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/NotificationsPage.css'

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
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function getNotifType(n: Notif): 'blog' | 'order' | 'warning' | 'system' {
  const type = (n.type || '').toLowerCase()
  const title = (n.title || '').toLowerCase()
  const body = (n.body || '').toLowerCase()

  if (type.includes('blog') || type.includes('post') || title.includes('tin tức') || title.includes('bài viết')) {
    return 'blog'
  }
  if (type.includes('order') || type.includes('return') || title.includes('đơn hàng') || title.includes('vận chuyển') || title.includes('thanh toán')) {
    return 'order'
  }
  if (type.includes('warning') || type.includes('alert') || title.includes('tồn kho') || title.includes('cảnh báo') || body.includes('hết hàng') || body.includes('sắp hết')) {
    return 'warning'
  }
  return 'system'
}

function renderIcon(type: 'blog' | 'order' | 'warning' | 'system') {
  if (type === 'blog') {return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path d="M16 8h2M11 8h3M8 8h1M8 12h10M8 16h10" /></svg>)}
  if (type === 'order') {return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>)}
  if (type === 'warning') {return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)}
  return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7z" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>)}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<NotifRes | null>(null)
  const [page, setPage] = useState(1)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const load = useCallback(async () => {
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<NotifRes>(`/notifications?per_page=20&page=${page}`, { token })
      setRes(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông báo.')
    } finally {
      setLoading(false)
    }
  }, [navigate, page, token])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => res?.data ?? [], [res?.data])
  const pg = res?.pagination
  const unreadCount = res?.unread ?? 0

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'unread') return rows.filter((r) => !r.read_at)
    return rows.filter((r) => r.read_at)
  }, [rows, filter])

  const markRead = async (id: number) => {
    if (!token) return
    try {
      await apiFetch(`/notifications/${id}/read`, { token, method: 'PATCH', body: JSON.stringify({}) })
      // Reload silently to update counts and state
      const d = await apiFetch<NotifRes>(`/notifications?per_page=20&page=${page}`, { token })
      setRes(d)
    } catch {
      // ignore
    }
  }

  const markAllRead = async () => {
    if (!token || unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    try {
      await apiFetch(`/notifications/read-all`, { token, method: 'PATCH', body: JSON.stringify({}) })
      await load()
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  const openFromNotif = async (n: Notif) => {
    await markRead(n.id)
    const data = (n.data || {}) as Record<string, unknown>
    if (typeof data.order_id === 'number') {
      navigate(`/orders/${data.order_id}`)
      return
    }
    if (typeof data.post_slug === 'string') {
      navigate(`/blog/${data.post_slug}`)
      return
    }
    if (typeof data.action_url === 'string') {
      navigate(data.action_url)
      return
    }
  }

  return (
    <div className="notifPage">
      <div className="notifTop">
        <div className="notifTitleRow">
          <h1 className="notifTitle">Hộp thư thông báo</h1>
          <div className="notifSub">
            Xem tất cả các tin tức công nghệ, cảnh báo kho và cập nhật đơn hàng của bạn.
          </div>
        </div>

        <Link className="notifBackLink" to="/profile" title="Quay lại trang cá nhân">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Quay lại</span>
        </Link>
      </div>

      {error && <div className="prodErrorBanner" style={{ marginBottom: 24 }}>{error}</div>}

      <div className="notifMainGrid">
        {/* Sidebar filters */}
        <aside className="notifSidebar">
          <div className="notifSidebarCard">
            <h3 className="notifSidebarTitle">Bộ lọc thư</h3>
            <div className="notifFilterList">
              <button
                type="button"
                className={`notifFilterItem ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                <span className="notifFilterLabel">Tất cả</span>
                <span className="notifFilterCount">{rows.length}</span>
              </button>
              <button
                type="button"
                className={`notifFilterItem ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                <span className="notifFilterLabel">Chưa đọc</span>
                <span className={`notifFilterCount ${unreadCount > 0 ? 'badge-unread' : ''}`}>{unreadCount}</span>
              </button>
              <button
                type="button"
                className={`notifFilterItem ${filter === 'read' ? 'active' : ''}`}
                onClick={() => setFilter('read')}
              >
                <span className="notifFilterLabel">Đã đọc</span>
                <span className="notifFilterCount">{rows.length - unreadCount}</span>
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notifBtnMarkAll"
                onClick={() => void markAllRead()}
                disabled={markingAll}
                title="Đánh dấu tất cả là đã đọc"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{markingAll ? 'Đang đọc...' : 'Đọc tất cả'}</span>
              </button>
            )}
          </div>
        </aside>

        {/* Notifications Feed */}
        <section className="notifFeed">
          {loading ? (
            <div className="notifEmptyState" style={{ borderStyle: 'solid' }}>
              <div className="adminLoader" style={{ margin: '0 auto 20px' }}></div>
              <div className="notifEmptyTitle">Đang tải thông báo…</div>
            </div>
          ) : (
            <>
              {!filteredRows.length ? (
                <div className="notifEmptyState">
                  <div className="notifEmptyIcon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7z" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <h3 className="notifEmptyTitle">Không có thông báo</h3>
                  <p className="notifEmptyText">
                    {filter === 'unread'
                      ? 'Tuyệt vời! Bạn không có thông báo chưa đọc nào.'
                      : filter === 'read'
                        ? 'Bạn chưa có thông báo nào được đánh dấu đã đọc.'
                        : 'Hộp thư thông báo của bạn hiện đang trống.'}
                  </p>
                </div>
              ) : (
                <div className="notifList">
                  {filteredRows.map((n) => {
                    const type = getNotifType(n)
                    return (
                      <button
                        key={n.id}
                        type="button"
                        className={`notifCard ${n.read_at ? 'read' : 'unread'} notifCard--${type}`}
                        onClick={() => void openFromNotif(n)}
                      >
                        <div className="notifCardInner">
                          <div className={`notifIconContainer notifIcon--${type}`}>
                            {renderIcon(type)}
                          </div>
                          <div className="notifCardContent">
                            <div className="notifCardHeader">
                              <h3 className="notifCardTitle">{n.title || 'Thông báo'}</h3>
                              <div className="notifCardMeta">
                                <span className="notifCardTime">{fmtDateTime(n.created_at)}</span>
                                {n.read_at ? (
                                  <span className="notifBadgeRead">Đã đọc</span>
                                ) : (
                                  <>
                                    <span className="notifBadgeNew">Mới</span>
                                    <button
                                      type="button"
                                      className="notifSingleMarkReadBtn"
                                      onClick={(e) => {
                                        e.stopPropagation() // Prevents navigating to the detail link!
                                        void markRead(n.id)
                                      }}
                                      title="Đánh dấu đã đọc"
                                      aria-label="Đánh dấu đã đọc thông báo này"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="notifCardBody">{n.body || ''}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {pg && pg.last_page > 1 && filter === 'all' && (
                <div className="notifPager">
                  <button
                    className="notifPageBtn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Trang trước"
                  >
                    ‹
                  </button>
                  <div className="notifPageInfo">
                    Trang {page} / {pg.last_page}
                  </div>
                  <button
                    className="notifPageBtn"
                    disabled={page >= pg.last_page}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Trang sau"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
