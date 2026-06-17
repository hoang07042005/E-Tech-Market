import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '@/styles/pages/OrdersPage.css'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import Skeleton from '@/components/Skeleton'
import { useAuthStore } from '@/features/store/useAuthStore'

type OrderListRow = {
  id: number
  order_code: string
  created_at?: string | null
  total_amount?: number | string
  status?: string | null
  items?: Array<
    | { product_name_snapshot?: string | null; main_image_url?: string | null }
    | { product?: { name?: string | null; main_image_url?: string | null } | null }
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
  const userStr = useAuthStore((state) => state.userStr)
  const hasAuth = !!userStr

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<OrdersIndexResponse | null>(null)
  const [page, setPage] = useState(1)
  // filters
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('all')
  const [customFrom, setCustomFrom] = useState<string | null>(null)
  const [customTo, setCustomTo] = useState<string | null>(null)
  // current time captured after mount to avoid impure calls during render
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
  }, [])

  const pager = useMemo(() => {
    const last = res?.last_page ?? 1
    const cur = res?.current_page ?? 1
    return { last, cur }
  }, [res?.current_page, res?.last_page])

  useEffect(() => {
    if (!hasAuth) {
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
    apiFetch<OrdersIndexResponse>(`/orders?page=${page}`)
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
  }, [navigate, page, hasAuth])

  const rows = useMemo(() => res?.data ?? [], [res?.data])
  const filteredRows = useMemo(() => {
    const current = now
    return rows.filter((r) => {
      // search
      if (q.trim()) {
        const hay = ((r.order_code || '') + ' ' + ((r.items || [])
          .map((it) => {
            if (!it) return ''
            if ('product_name_snapshot' in it) return it.product_name_snapshot ?? ''
            if ('product' in it) return it.product?.name ?? ''
            return ''
          }).join(' '))).toLowerCase()
        if (!hay.includes(q.trim().toLowerCase())) return false
      }

      // status filter
      if (statusFilter !== 'all') {
        if (((r.status || '') as string).toLowerCase() !== statusFilter) return false
      }

      // time filter
      if (timeRange !== 'all') {
        if (timeRange === 'custom') {
          if (customFrom && customTo && r.created_at) {
            const t = Date.parse(r.created_at)
            const f = Date.parse(customFrom)
            const to = Date.parse(customTo)
            if (!Number.isFinite(t) || t < f || t > to) return false
          }
        } else {
          // days option
          const days = Number.parseInt(timeRange, 10)
          if (!Number.isFinite(days)) return true
          if (!r.created_at) return false
          const t = Date.parse(r.created_at)
          if (!Number.isFinite(t)) return false
          // if current time not set yet (pre-mount), skip time-based filtering
          if (current == null) return true
          const diffDays = (current - t) / (1000 * 60 * 60 * 24)
          if (diffDays > days) return false
        }
      }

      return true
    })
  }, [rows, q, statusFilter, timeRange, customFrom, customTo])
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

  function resolveMediaUrl(maybeUrl?: string | null) {
    if (!maybeUrl) return null
    const s = String(maybeUrl).trim()
    if (!s) return null
    if (/^https?:\/\//i.test(s)) return s
    try {
      return new URL(s, API_BASE_URL || window.location.origin).toString()
    } catch {
      return s
    }
  }

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

              <div className="odFilters">
                <input className="odSearch" placeholder="Tìm mã đơn hoặc sản phẩm..." value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="odSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="processing">Đã xác nhận</option>
                  <option value="paid">Đang chuẩn bị</option>
                  <option value="shipped">Đang giao</option>
                  <option value="delivered">Đã giao</option>
                  <option value="returned">Hoàn trả</option>
                  <option value="cancelled">Đã hủy</option>
                </select>

                <select className="odSelect" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                  <option value="all">Tất cả thời gian</option>
                  <option value="7">7 ngày</option>
                  <option value="15">15 ngày</option>
                  <option value="30">30 ngày</option>
                  <option value="custom">Tùy chọn</option>
                </select>

                {timeRange === 'custom' && (
                  <div className="odCustomRange">
                    <input type="date" className="odDate" value={customFrom ?? ''} onChange={(e) => setCustomFrom(e.target.value || null)} />
                    <span style={{ margin: '0 6px' }}>—</span>
                    <input type="date" className="odDate" value={customTo ?? ''} onChange={(e) => setCustomTo(e.target.value || null)} />
                  </div>
                )}
              </div>

              <div className="odhList">
                {filteredRows.map((o) => {
                  const meta = statusMeta(o.status)
                  const total = typeof o.total_amount === 'string' ? Number(o.total_amount) : (o.total_amount ?? 0)

                  // build thumbnails similar to ProfilePage
                  const thumbs = ((o.items ?? []).map((it) => {
                    const p = (it as any)?.product as any
                    const candidates = [
                      (it as any)?.image,
                      p?.image,
                      p?.image_url,
                      p?.main_image_url,
                      p?.main_image,
                      p?.thumbnail,
                      Array.isArray(p?.images) ? p.images[0] : null,
                      Array.isArray(p?.media) ? p.media[0]?.url ?? p.media[0] : null,
                      (it as any)?.product?.main_image_url,
                    ]
                    let img: any = null
                    for (const c of candidates) {
                      if (!c) continue
                      if (typeof c === 'string') { img = c; break }
                      if (typeof c === 'object') {
                        if (typeof c.url === 'string') { img = c.url; break }
                        if (typeof c.src === 'string') { img = c.src; break }
                        if (typeof c.path === 'string') { img = c.path; break }
                      }
                    }
                    return resolveMediaUrl(img ?? null) || null
                  }).filter(Boolean) as string[])

                  const extraCount = Math.max(0, thumbs.length - 4)
                  const thumbCount = thumbs.length || 1
                  const layout = thumbCount === 1 ? 'one' : thumbCount === 2 ? 'two' : thumbCount === 3 ? 'three' : 'four'

                  const names = (o.items ?? []).map((it) => {
                    const p = (it as any)?.product as any
                    return (p?.name || (it as any)?.product_name_snapshot || '').toString()
                  }).filter(Boolean) as string[]
                  const text = names.length > 0 ? names.join(', ') : '—'

                  return (
                    <div key={o.id} className="odCard odCardWithThumbs">
                      <div className={`odCardThumbs pfOrderThumbGrid pfThumbLayout-${layout}`}>
                          {thumbs.length === 0 ? (
                            <div className={`pfOrderThumbCell odThumbCell odThumbCell-empty`} />
                          ) : (
                            thumbs.slice(0, 4).map((src, idx) => (
                              <div key={idx} className="pfOrderThumbCell odThumbCell" data-idx={idx}>
                                <img className="pfOrderThumbImg" src={src} alt="" loading="lazy" />
                                {idx === 3 && extraCount > 0 && (
                                  <div className="pfThumbOverlay odThumbOverlay">+{extraCount}</div>
                                )}
                              </div>
                            ))
                          )}
                      </div>

                      <div className="odCardBody pfOrderMain">
                        <div className="odCardTop pfOrderHeader">
                          <div className="odCode pfOrderCode">{o.order_code}</div>
                          <span className={`odStatus pfOrderStatus tone-${meta.tone}`}>{meta.label}</span>
                        </div>
                        <div className="pfOrderName odMetaValue" style={{ whiteSpace: 'normal' }}>{text}</div>
                        <div className="odMeta">

                          <div className="odMetaValue">{o.items?.length ?? 0} sản phẩm</div>
                          <div className="odMetaValue">{fmtDateVi(o.created_at)}</div>
                          <div className="odMetaValue strong">{fmtVnd(Number(total) || 0)}đ</div>

                          <div style={{ marginTop: 8 }}>
                            <Link className="odhAction" to={detailHref(o.id)}>Chi tiết</Link>
                          </div>
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="odList">
                {filteredRows.map((o) => {
                  const meta = statusMeta(o.status)
                  const total = typeof o.total_amount === 'string' ? Number(o.total_amount) : (o.total_amount ?? 0)

                  // collect product names (show all, joined)
                  const names = (o.items ?? [])
                    .map((it) => {
                      if (!it) return ''
                      if ('product_name_snapshot' in it) return it.product_name_snapshot ?? ''
                      if ('product' in it) return it.product?.name ?? ''
                      return ''
                    })
                    .filter(Boolean)
                  const title = names.length ? names.join(', ') : '—'

                  const imgs = (o.items ?? [])
                    .map((it) => {
                      if (!it) return null
                      if ('product' in it) return it.product?.main_image_url ?? null
                      if ('product_name_snapshot' in it) return (it as any).main_image_url ?? null
                      return null
                    })
                    .map((u) => resolveMediaUrl(u))
                    .filter(Boolean) as string[]

                  return (
                    <Link key={o.id} to={detailHref(o.id)} className="odCard odCardWithThumbs">
                      <div className="odCardThumbs">
                        {imgs.slice(0, 4).map((src, i) => (
                          <div key={i} className={`odThumbCell odThumbCell-${Math.min(4, imgs.length)}`} style={{ backgroundImage: `url(${src})` }} />
                        ))}
                        {imgs.length < 4 && Array.from({ length: Math.max(0, 4 - imgs.length) }).map((_, i) => (
                          <div key={`empty-${i}`} className="odThumbCell odThumbCell-empty" />
                        ))}
                        {(o.items?.length ?? 0) > 4 && (
                          <div className="odThumbOverlay">+{(o.items?.length ?? 0) - 4}</div>
                        )}
                      </div>
                      <div className="odCardBody">
                        <div className="odCardTop">
                          <div className="odCode">#{o.order_code}</div>
                          <span className={`odStatus tone-${meta.tone}`}>{meta.label}</span>
                        </div>
                        <div className="odMetaRow">
                          <div className="odMeta">
                            <span className="odMetaLabel">Sản phẩm</span>
                            <span className="odMetaValue">{title}</span>
                          </div>
                          <div className="odMeta">
                            <span className="odMetaLabel">Tổng</span>
                            <span className="odMetaValue strong">{fmtVnd(total)}đ</span>
                          </div>
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
