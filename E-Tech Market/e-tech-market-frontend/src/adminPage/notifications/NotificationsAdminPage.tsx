import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'

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
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<NotifRes | null>(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    if (!token) {
      setError('Bạn chưa đăng nhập.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const d = await apiFetch<NotifRes>(`/notifications?per_page=30&page=${page}`, { token })
      setRes(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thông báo.')
    } finally {
      setLoading(false)
    }
  }, [page, token])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(t)
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

  return (
    <div className="admOrdersPage">
      <div className="admOrdersTop">
        <div>
          <h2 className="admOrdersTitle">Thông báo</h2>
        </div>
      </div>

      <section className="admOrdersTableCard">
        {loading ? (
          <div className="admOrdersEmpty">Đang tải…</div>
        ) : error ? (
          <div className="admOrdersEmpty">{error}</div>
        ) : !rows.length ? (
          <div className="admOrdersEmpty">Chưa có thông báo.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void markRead(n.id)}
                style={{
                  textAlign: 'left',
                  border: '1px solid rgba(15,23,42,.08)',
                  background: n.read_at ? '#fff' : 'rgba(37,99,235,.06)',
                  borderRadius: 5,
                  padding: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a' }}>{n.title || '—'}</div>
                  <span className={`admOrdersStatus2 ${n.read_at ? 'tone-muted' : 'tone-info'}`}>{n.read_at ? 'Đã đọc' : 'Mới'}</span>
                </div>
                <div style={{ marginTop: 6, fontWeight: 700, fontSize: 12, color: '#64748b' }}>{n.body || ''}</div>
                <div style={{ marginTop: 6, fontWeight: 800, fontSize: 12, color: '#94a3b8' }}>{fmtVi(n.created_at)}</div>
              </button>
            ))}
          </div>
        )}

        <div className="admOrdersPager">
          <button className="admOrdersBtn" disabled={(pg?.current_page ?? 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
          <span className="admOrdersPagerInfo">
            Trang {(pg?.current_page ?? 1)} / {(pg?.last_page ?? 1)}
          </span>
          <button className="admOrdersBtn" disabled={(pg?.current_page ?? 1) >= (pg?.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>Sau</button>
        </div>
      </section>
    </div>
  )
}

