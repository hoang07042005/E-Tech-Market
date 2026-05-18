import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/OrdersPage.css'

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
  return new Date(t).toLocaleString('vi-VN')
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<NotifRes | null>(null)
  const [page, setPage] = useState(1)

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

  const markRead = async (id: number) => {
    if (!token) return
    try {
      await apiFetch(`/notifications/${id}/read`, { token, method: 'PATCH', body: JSON.stringify({}) })
      await load()
    } catch {
      // ignore
    }
  }

  const openFromNotif = async (n: Notif) => {
    await markRead(n.id)
    const data = (n.data || {}) as Record<string, unknown>
    if (typeof data.order_id === 'number') {
      navigate(`/orders/${data.order_id}`)
      return
    }
  }

  return (
    <div className="odPage">
      <div className="odTop">
        <div>
          <h1 className="odTitle">Thông báo</h1>
          <div className="odSub">Xem tất cả thông báo của bạn.</div>
        </div>
        <Link className="odBackLink" to="/profile">← Quay lại</Link>
      </div>

      {loading ? (
        <div className="odEmpty">Đang tải…</div>
      ) : error ? (
        <div className="odEmpty">{error}</div>
      ) : (
        <>
          {!rows.length ? (
            <div className="odEmpty">Chưa có thông báo.</div>
          ) : (
            <div className="odList">
              {rows.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="odCard"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => void openFromNotif(n)}
                >
                  <div className="odCardTop">
                    <div className="odCode">{n.title || '—'}</div>
                    <span className={`odStatus ${n.read_at ? 'tone-muted' : 'tone-info'}`}>{n.read_at ? 'Đã đọc' : 'Mới'}</span>
                  </div>
                  <div className="odMetaRow" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="odMeta">
                      <div className="odMetaValue" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{n.body || ''}</div>
                      <div className="odMetaLabel" style={{ marginTop: 6 }}>{fmtDateTime(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="odPager">
            <button className="odPageBtn" disabled={(pg?.current_page ?? 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            <div className="odPageInfo">
              Trang {(pg?.current_page ?? 1)} / {(pg?.last_page ?? 1)}
            </div>
            <button className="odPageBtn" disabled={(pg?.current_page ?? 1) >= (pg?.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>›</button>
          </div>
        </>
      )}
    </div>
  )
}

