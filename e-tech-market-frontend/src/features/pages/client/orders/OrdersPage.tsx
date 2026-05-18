import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '@/styles/pages/OrdersPage.css'
import { apiFetch } from '@/configs/api.config'
import Skeleton from '@/components/Skeleton'

type OrderListRow = {
  id: number
  order_code: string
  created_at?: string | null
  total_amount?: number | string
  status?: string | null
  items?: Array<
    | { product_name_snapshot?: string | null }
    | { product?: { name?: string | null } | null }
    | null
  >
}

type OrdersIndexResponse = {
  data: OrderListRow[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

function fmtVnd(n: number) {
  return Math.round(n).toLocaleString('vi-VN')
}

function fmtDateVi(iso?: string | null) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const d = new Date(t)
  // "24 Tháng 10, 2024"
  const m = d.getMonth() + 1
  return `${d.getDate()} Tháng ${m}, ${d.getFullYear()}`
}

function statusMeta(status?: string | null) {
  const s = (status || '').toLowerCase()
  if (s === 'pending') return { label: 'Chờ xác nhận', tone: 'wait' as const }
  if (s === 'processing') return { label: 'Đã xác nhận', tone: 'info' as const }
  if (s === 'paid') return { label: 'Đang chuyển bị hàng', tone: 'info' as const }
  if (s === 'shipped') return { label: 'Đang giao', tone: 'info' as const }
  if (s === 'delivered') return { label: 'Đã giao', tone: 'ok' as const }
  if (s === 'completed') return { label: 'Hoàn thành', tone: 'ok' as const }
  if (s === 'returned') return { label: 'Hoàn trả', tone: 'return' as const }
  if (s === 'cancelled') return { label: 'Hủy', tone: 'bad' as const }
  return { label: s || '—', tone: 'muted' as const }
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<OrdersIndexResponse | null>(null)
  const [page, setPage] = useState(1)

  const pager = useMemo(() => {
    const last = res?.last_page ?? 1
    const cur = res?.current_page ?? 1
    return { last, cur }
  }, [res?.current_page, res?.last_page])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    let cancelled = false
    setTimeout(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    }, 0)
    apiFetch<OrdersIndexResponse>(`/orders?page=${page}`, { token })
      .then((d) => {
        if (!cancelled) setRes(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được đơn hàng.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [navigate, page, token])

  const rows = useMemo(() => res?.data ?? [], [res?.data])
  const inProfile = (location.pathname || '').toLowerCase().startsWith('/profile/')
  const detailHref = (id: number) => (inProfile ? `/profile/orders/${id}` : `/orders/${id}`)
  const backHref = inProfile ? '/profile' : '/profile'

  const kpis = useMemo(() => {
    const totalOrders = res?.total ?? rows.length
    const shippingCount = rows.filter((r) => (r.status || '').toLowerCase() === 'shipped').length
    const totalSpend = rows.reduce((acc, r) => {
      const n = typeof r.total_amount === 'string' ? Number(r.total_amount) : (r.total_amount ?? 0)
      return acc + (Number.isFinite(n) ? n : 0)
    }, 0)
    return { totalOrders, shippingCount, totalSpend }
  }, [res?.total, rows])

  return (
    <div className={inProfile ? 'odhWrap' : 'odPage'}>
      <div className={inProfile ? 'odhTop' : 'odTop'}>
        <div>
          <h1 className={inProfile ? 'odhTitle' : 'odTitle'}>Lịch sử đơn hàng</h1>
          <div className={inProfile ? 'odhSub' : 'odSub'}>
            Hồ sơ chi tiết về các thiết bị phần cứng và khoản đầu tư kỹ thuật số của bạn.
            <br />
            Theo dõi trạng thái vận chuyển và xem lại thông số kỹ thuật các sản phẩm đã mua.
          </div>
        </div>
        {!inProfile && (
          <Link className="odBackLink" to={backHref}>
            Quay lại tài khoản
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '20px' }}>
          {inProfile ? (
            <>
              <div className="odhKpis">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="odhKpi">
                    <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="150px" height="24px" />
                  </div>
                ))}
              </div>
              <div className="odhTableCard">
                <table className="odhTable">
                  <tbody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j}><Skeleton width="100%" height="20px" /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="odList">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="odCard">
                  <div className="odCardTop">
                    <Skeleton width="100px" height="20px" />
                    <Skeleton width="80px" height="20px" borderRadius="10px" />
                  </div>
                  <div className="odMetaRow">
                    <Skeleton width="120px" height="40px" />
                    <Skeleton width="100px" height="40px" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : error ? (
        <div className={inProfile ? 'odhEmpty' : 'odEmpty'}>{error}</div>
      ) : !rows.length ? (
        <div className={inProfile ? 'odhEmpty' : 'odEmpty'}>
          Bạn chưa có đơn hàng nào. <Link to="/products">Mua sắm ngay</Link>
        </div>
      ) : (
        <>
          {inProfile ? (
            <>
              <div className="odhKpis">
                <div className="odhKpi">
                  <div className="odhKpiLabel">Tổng số đơn hàng</div>
                  <div className="odhKpiValue">{kpis.totalOrders.toLocaleString('vi-VN')}</div>
                </div>
                <div className="odhKpi">
                  <div className="odhKpiLabel">Đơn hàng đang giao</div>
                  <div className="odhKpiValue">
                    {kpis.shippingCount.toString().padStart(2, '0')} <span className="odhDot" aria-hidden />
                  </div>
                </div>
                <div className="odhKpi">
                  <div className="odhKpiLabel">Tổng giá trị mua sắm</div>
                  <div className="odhKpiValue">{fmtVnd(kpis.totalSpend)}đ</div>
                </div>
              </div>

              <div className="odhTableCard">
                <table className="odhTable">
                  <thead>
                    <tr>
                      <th>Mã đơn hàng</th>
                      <th className="odhHideMobile">Ngày mua</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                      <th className="odhHideMobile" style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => {
                      const meta = statusMeta(o.status)
                      const total = typeof o.total_amount === 'string' ? Number(o.total_amount) : (o.total_amount ?? 0)
                      const s = (o.status || '').toLowerCase()
                      const actionText = s === 'processing' || s === 'shipped' ? 'Theo dõi' : 'Xem chi tiết'
                      const disabled = s === 'cancelled'
                      return (
                        <tr key={o.id}>
                          <td className="odhCodeCell">
                            <Link className="odhCode" to={detailHref(o.id)}>{o.order_code}</Link>
                            <div className="odhDateMobile">{fmtDateVi(o.created_at)}</div>
                          </td>
                          <td className="odhDate odhHideMobile">{fmtDateVi(o.created_at)}</td>
                          <td>
                            <span className={`odhPill tone-${meta.tone}`}>
                              <span className="odhPillDot" aria-hidden />
                              {meta.label}
                            </span>
                          </td>
                          <td className="odhMoney">{fmtVnd(Number(total) || 0)}đ</td>
                          <td className="odhActionCell odhHideMobile">
                            {disabled ? (
                              <span className="odhAction disabled">Vô hiệu</span>
                            ) : (
                              <Link className="odhAction" to={detailHref(o.id)}>
                                {actionText}
                              </Link>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="odList">
                {rows.map((o) => {
                  const meta = statusMeta(o.status)
                  const total = typeof o.total_amount === 'string' ? Number(o.total_amount) : (o.total_amount ?? 0)
                  const firstItem = o.items?.[0] ?? null
                  const first =
                    (firstItem && 'product_name_snapshot' in firstItem ? (firstItem.product_name_snapshot ?? '') : '') ||
                    (firstItem && 'product' in firstItem ? (firstItem.product?.name ?? '') : '') ||
                    '—'
                  const more = Math.max(0, (o.items?.length ?? 0) - 1)
                  return (
                    <Link key={o.id} to={detailHref(o.id)} className="odCard">
                      <div className="odCardTop">
                        <div className="odCode">#{o.order_code}</div>
                        <span className={`odStatus tone-${meta.tone}`}>{meta.label}</span>
                      </div>
                      <div className="odMetaRow">
                        <div className="odMeta">
                          <span className="odMetaLabel">Sản phẩm</span>
                          <span className="odMetaValue">
                            {first}
                            {more > 0 ? ` +${more} SP` : ''}
                          </span>
                        </div>
                        <div className="odMeta">
                          <span className="odMetaLabel">Tổng</span>
                          <span className="odMetaValue strong">{fmtVnd(total)}đ</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              <div className="odPager">
                <button type="button" className="odPageBtn" disabled={pager.cur <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ‹
                </button>
                <div className="odPageInfo">
                  Trang {pager.cur} / {pager.last}
                </div>
                <button
                  type="button"
                  className="odPageBtn"
                  disabled={pager.cur >= pager.last}
                  onClick={() => setPage((p) => Math.min(pager.last, p + 1))}
                >
                  ›
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

