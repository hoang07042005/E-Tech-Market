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

  const load = useCallback(async () => {
    if (!hasAuth) {
      setError('Bạn chưa đăng nhập.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<NotifRes>(`/notifications?per_page=30&page=${page}`)
      setRes(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông báo.')
    } finally {
      setLoading(false)
    }
  }, [page, hasAuth])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
  }, [load])

  const rows = useMemo(() => res?.data ?? [], [res?.data])
  const pg = res?.pagination

  const markRead = async (id: number) => {
    if (!hasAuth) return
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({}) })
      await load()
    } catch {
      // ignore
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
        {res && res.unread > 0 && (
          <span className="notifUnreadBadge">
            {res.unread} thông báo mới
          </span>
        )}
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
                className={`notifItemRow ${n.read_at ? 'isRead' : 'isUnread'}`}
                onClick={() => void markRead(n.id)}
              >
                {/* Khối biểu tượng minh họa */}
                <div className="notifIconBox">
                  {getNotifIcon(n.title || '')}
                </div>

                {/* Khối nội dung chữ */}
                <div className="notifContentBox">
                  <div className="notifMetaTop">
                    <h4 className="notifTitleText">{n.title || 'Thông báo hệ thống'}</h4>
                    <span className={`notifStatusTag ${n.read_at ? 'read' : 'unread'}`}>
                      {n.read_at ? 'Đã đọc' : 'Mới'}
                    </span>
                  </div>
                  <p className="notifBodyText">{n.body || ''}</p>
                  <span className="notifTimeText">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {fmtVi(n.created_at)}
                  </span>
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