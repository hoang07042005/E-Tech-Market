import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import { fetchDashboardStats } from '@/features/services/admin/api.admin.service'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { RevenueIcon, CartIcon, BoxIcon, UserGroupIcon, GridIcon, AlertIcon, PencilIcon, BoxSmallIcon, HeadsetIcon, ReturnIcon, ChevronDownIcon, ReviewChatIcon, MedalIcon, PlusIcon } from '../AdminIcons'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        className="admChartTooltip"
        style={{
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          color: '#fff',
          fontSize: '13px',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#94a3b8' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
          <span>Doanh thu: </span>
          <strong style={{ color: '#fb923c' }}>{payload[0].value.toLocaleString('vi-VN')} đ</strong>
        </div>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | 'month'>('month')
  const [openOrderMenuId, setOpenOrderMenuId] = useState<number | null>(null)
  const [detailOrder, setDetailOrder] = useState<null | {
    id: number
    order_code: string
    customer_name: string
    customer_avatar_url?: string | null
    product: string
    total_amount: number
    created_date?: string
    status_label: string
    status_tone: 'ok' | 'wait' | 'bad'
  }>(null)

  type DashStats = {
    kpi: {
      revenue_30d: number
      current_orders: number
      total_products: number
      new_customers_7d: number
      avg_order_value_30d: number
      low_stock_variants: number
      low_stock_threshold: number
    }
    quick_tasks?: {
      pending_reviews: number
      low_stock_products: number
      pending_support: number
      pending_return_requests?: number
    }
    recent_activities?: Array<{
      dot: 'ok' | 'info' | 'warn'
      title: string
      desc: string
      time: string
    }>
    top_rated_products?: Array<{
      id: number
      name: string
      slug: string
      main_image_url?: string | null
      avg_rating: number
      reviews_count: number
    }>
    analytics?: {
      range?: '7d' | '30d' | 'month'
      revenue_7d: Array<{ date: string; label: string; value: number }>
      top_categories_30d: Array<{ name: string; pct: number }>
    }
    recent_orders?: Array<{
      id: number
      order_code: string
      customer_name: string
      customer_avatar_url?: string | null
      product: string
      total_amount: number
      created_at?: string | null
      created_date?: string
      status?: string
      status_label: string
      status_tone: 'ok' | 'wait' | 'bad'
    }>
    recent_reviews?: Array<{
      id: number
      user_name: string
      user_avatar_url?: string | null
      rating: number
      comment: string
      time: string
    }>
    top_customers?: Array<{
      user_id: number
      name: string
      avatar_url?: string | null
      spent: number
      orders_count: number
      vip_label: string
      vip_tone: 'gold' | 'silver' | 'bronze'
    }>
  }

  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState<string | null>(null)
  const [dash, setDash] = useState<DashStats | null>(null)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [lowStockProducts, setLowStockProducts] = useState<Array<{
    id: number
    sku?: string | null
    product_name: string
    variant_name?: string | null
    category?: { name?: string } | null
    price?: string | null
    stock_quantity?: number | null
  }>>([])
  const [restockDraft, setRestockDraft] = useState<Record<number, string>>({})
  const [restockBusyId, setRestockBusyId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setDashLoading(false)
        setDashError('Chưa đăng nhập admin.')
        return
      }
      setDashLoading(true)
      setDashError(null)
      try {
        const [res, products] = await Promise.all([
          fetchDashboardStats<DashStats>(analyticsRange, token),
          apiFetch<unknown[]>('/api/admin/products', { token }),
        ])
        if (cancelled) return
        setDash(res)

        // Low stock list for table (best-effort, depends on API fields)
        const threshold = res?.kpi?.low_stock_threshold ?? 10
        setLowStockThreshold(threshold)
        const flat = (products ?? []).flatMap((row) => {
          const p = (row && typeof row === 'object') ? (row as Record<string, unknown>) : {}
          const base = {
            id: typeof p.id === 'number' ? p.id : Number.NaN,
            name: typeof p.name === 'string' ? p.name : '—',
            sku: typeof p.sku === 'string' ? p.sku : null,
            category: (p.category && typeof p.category === 'object') ? (p.category as { name?: string } | null) : null,
            price: typeof p.price === 'string' ? p.price : null,
            stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
            variants: Array.isArray(p.variants) ? (p.variants as unknown[]) : [],
          }
          // If variants exist, use their stock_quantity too
          if (base.variants.length === 0) {
            return [{
              id: base.id,
              product_name: base.name,
              variant_name: null,
              sku: base.sku,
              category: base.category,
              price: base.price,
              stock_quantity: base.stock_quantity,
            }]
          }
          return base.variants.map((vRow, idx) => {
            const v = (vRow && typeof vRow === 'object') ? (vRow as Record<string, unknown>) : {}
            const vid = typeof v.id === 'number' ? v.id : Number.NaN
            const vname = typeof v.variant_name === 'string' ? v.variant_name : ''
            const vsku = typeof v.sku === 'string' ? v.sku : null
            const vprice = typeof v.price === 'string' ? v.price : null
            const vstock = typeof v.stock_quantity === 'number' ? v.stock_quantity : null
            return {
              id: Number.isFinite(vid) ? vid : Number(`${base.id}${idx}`),
              product_name: base.name,
              variant_name: vname || null,
              sku: vsku ?? base.sku,
              category: base.category,
              price: vprice ?? base.price,
              stock_quantity: vstock,
            }
          })
        })

        const low = flat
          .filter((x) => typeof x.stock_quantity === 'number' && x.stock_quantity <= threshold)
          .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
          .slice(0, 6)
        setLowStockProducts(low)
      } catch (e: unknown) {
        if (cancelled) return
        setDashError(e instanceof Error ? e.message : 'Không tải được dữ liệu dashboard.')
      } finally {
        if (!cancelled) setDashLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token, analyticsRange])

  const restockVariant = async (variantId: number) => {
    if (!token) return
    const raw = (restockDraft[variantId] ?? '').trim()
    const add = Number.parseInt(raw, 10)
    if (!Number.isFinite(add) || add <= 0) return

    setRestockBusyId(variantId)
    try {
      await apiFetch(`/api/admin/product-variants/${variantId}/restock`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ add }),
      })
      setRestockDraft((p) => {
        const next = { ...p }
        delete next[variantId]
        return next
      })
      setLowStockProducts((p) => {
        const next = p
          .map((row) =>
            row.id === variantId
              ? { ...row, stock_quantity: (typeof row.stock_quantity === 'number' ? row.stock_quantity : 0) + add }
              : row,
          )
          .filter((row) => typeof row.stock_quantity === 'number' && row.stock_quantity <= lowStockThreshold)
        return next
      })
    } finally {
      setRestockBusyId(null)
    }
  }

  const kpi = dash?.kpi
  const fmtMoneyShort = (v: number) => {
    if (!Number.isFinite(v)) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(0)
  }

  const quickTasks = useMemo(() => {
    const qt = dash?.quick_tasks
    return [
      { key: 'review', label: `Duyệt ${qt?.pending_reviews ?? 0} đánh giá mới`, icon: <PencilIcon /> },
      { key: 'stock', label: `Nhập kho ${qt?.low_stock_products ?? 0} mặt hàng sắp hết`, icon: <BoxSmallIcon /> },
      { key: 'support', label: `Phản hồi ${qt?.pending_support ?? 0} yêu cầu hỗ trợ`, icon: <HeadsetIcon /> },
      { key: 'returns', label: `Duyệt ${qt?.pending_return_requests ?? 0} yêu cầu hoàn trả`, icon: <ReturnIcon /> },
      
      
    ]
  }, [dash?.quick_tasks])

  type KpiCard = {
    key: string
    label: string
    value: string
    sub: string
    badge: string
    icon: ReactNode
    tone: 'orange' | 'blue' | 'green' | 'purple' | 'cyan'
  }

  const kpis: KpiCard[] = [
    { key: 'rev', label: 'Tổng doanh thu', value: kpi ? `${fmtMoneyShort(kpi.revenue_30d)} đ` : '—', sub: '30 ngày qua', badge: '+12.5%', icon: <RevenueIcon />, tone: 'orange' as const },
    { key: 'orders', label: 'Đơn hàng hiện tại', value: kpi ? String(kpi.current_orders) : '—', sub: 'Đang xử lý', badge: 'Đang xử lý', icon: <CartIcon />, tone: 'blue' as const },
    { key: 'products', label: 'Tổng số sản phẩm', value: kpi ? String(kpi.total_products) : '—', sub: 'Cập nhật 5 phút trước', badge: 'Kho: 98%', icon: <BoxIcon />, tone: 'green' as const },
    { key: 'newCus', label: 'Khách hàng mới', value: kpi ? `+${kpi.new_customers_7d}` : '—', sub: '7 ngày', badge: '+18%', icon: <UserGroupIcon />, tone: 'purple' as const },
    { key: 'avg', label: 'Giá trị đơn hàng TB', value: kpi ? `${fmtMoneyShort(kpi.avg_order_value_30d)} đ` : '—', sub: 'So với tháng trước', badge: '+5.2%', icon: <GridIcon />, tone: 'cyan' as const },
  ]

  const recentActivities = dash?.recent_activities ?? []
  const topRated = dash?.top_rated_products ?? []
  const revenue7d = dash?.analytics?.revenue_7d ?? []
  const topCats30d = dash?.analytics?.top_categories_30d ?? []
  const resolveAdminImg = (url?: string | null) => {
    if (!url) return '/logo.png'
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  }

  const fmtVnd = (n: number) => n.toLocaleString('vi-VN')
  const initialsOf = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '—'
    const a = parts[0]?.[0] ?? ''
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
    return (a + b).toUpperCase()
  }
  const avatarToneOf = (s: string) => {
    const x = Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5
    return (['beige', 'blue', 'peach', 'sand', 'gray'] as const)[x]
  }
  const recentOrders = (dash?.recent_orders ?? []).slice(0, 10)
  const recentReviews = (dash?.recent_reviews ?? []).slice(0, 2)
  const topCustomers = (dash?.top_customers ?? []).slice(0, 3)
  const resolveUserAvatar = (url?: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  }

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.closest('.admOrdersMenuWrap')) return
      setOpenOrderMenuId(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="dashboardFadeIn">
      <div className="admDashWrap">
        <div className="admDashTop">
          <div>
            <h2 className="admDashTitle">Tổng quan hệ thống</h2>
            <div className="admDashSub">Chào mừng trở lại, bạn có lịch trình 1 ngày rất bận rộn.</div>
          </div>
          <div className="admDashTopActions">
            {/* <button type="button" className="admBtn admBtnGhost">
              <DownloadIcon /> Xuất báo cáo
            </button> */}
            <button type="button" className="admBtn admBtnPrimary" onClick={() => navigate('/admin/products?create=1')}>
              <PlusIcon /> Thêm sản phẩm
            </button>
          </div>
        </div>

        <div className="admKpiGrid">
          {kpis.map((k) => (
            <div key={k.key} className={`admKpiCard2 tone-${k.tone}`}>
              <div className="admKpiTop">
                <div className="admKpiIcon2" aria-hidden>{k.icon}</div>
                <div className="admKpiBadge" aria-hidden>{k.badge}</div>
              </div>
              <div className="admKpiLabel2">{k.label}</div>
              <div className="admKpiValue2">{k.value}</div>
              <div className="admKpiSub2">{k.sub}</div>
              
            </div>
          ))}
          <div className="admKpiCard2 tone-red">
            <div className="admKpiTop">
              <div className="admKpiIcon2" aria-hidden><AlertIcon /></div>
              <div className="admKpiBadge" aria-hidden>
                {kpi ? `${kpi.low_stock_variants}` : '—'} sản phẩm
              </div>
            </div>
            <div className="admKpiLabel2">Cảnh báo tồn kho</div>
            <div className="admKpiValue2">Sắp hết hàng</div>
            <div className="admKpiSub2">Cần nhập thêm ngay</div>
            
          </div>
        </div>

        <div className="admDashGrid2 admDashGrid2--triple">
          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Nhiệm vụ nhanh</h3>
            </div>
            <div className="admQuickList2">
              {quickTasks.map((t) => (
                <button key={t.key} type="button" className="admQuickRow">
                  <span className="admQuickRowIcon" aria-hidden>{t.icon}</span>
                  <span className="admQuickRowText">{t.label}</span>
                  <span className="admQuickRowChevron" aria-hidden>›</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Hoạt động gần đây</h3>
            </div>
            <div className="admActivityList2">
              {(recentActivities.length ? recentActivities : [
                { dot: 'info' as const, title: '—', desc: 'Chưa có dữ liệu', time: '' },
              ]).slice(0, 3).map((a, idx) => (
                <div key={`${a.title}-${idx}`} className="admActivityRow">
                  <span className={`admActivityDot ${a.dot}`} aria-hidden />
                  <div className="admActivityRowBody">
                    <div className="admActivityRowText">
                      <b>{a.title}</b> {a.desc}
                    </div>
                    {a.time && <div className="admActivityRowTime">{a.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Top sản phẩm đánh giá cao</h3>
            </div>
            <div className="admTopRatedList">
              {(topRated.length ? topRated : [
                { id: 0, name: 'Chưa có dữ liệu', slug: '', main_image_url: null, avg_rating: 0, reviews_count: 0 },
              ]).slice(0, 3).map((p) => (
                <div key={p.id || p.name} className="admTopRatedRow">
                  <div className="admTopRatedLeft">
                    <img
                      className="admTopRatedThumb"
                      src={resolveAdminImg(p.main_image_url)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="admTopRatedRight">
                    <div className="admTopRatedName">{p.name}</div>
                    <div className="admTopRatedMeta">
                      <span className="admTopRatedStars" aria-label={`${p.avg_rating} sao`}>
                        {'★'.repeat(Math.max(0, Math.min(5, Math.round(p.avg_rating))))}
                        <span className="admTopRatedStarsMuted">
                          {'★'.repeat(Math.max(0, 5 - Math.round(p.avg_rating)))}
                        </span>
                      </span>
                      <span className="admTopRatedScore">{p.avg_rating ? p.avg_rating.toFixed(1) : '—'}</span>
                      <span className="admTopRatedCount">({p.reviews_count || 0})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="admCard admAnalyticsCard">
          <div className="admCardHead">
            <div>
              <h3 className="admCardTitle">Phân tích & Thống kê</h3>
              <div className="admCardSub">Hiệu suất doanh thu và danh mục hàng đầu</div>
            </div>
            <label className="admRangeSelectWrap">
              <select
                className="admRangeSelect"
                value={analyticsRange}
                onChange={(e) => setAnalyticsRange(e.target.value as '7d' | '30d' | 'month')}
                aria-label="Chọn khoảng thời gian"
              >
                <option value="month">Tháng này</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
              </select>
              <ChevronDownIcon />
            </label>
          </div>

          <div className="admAnalyticsGrid">
            <div className="admAnalyticsChart">
              {(() => {
                const pts = (revenue7d.length ? revenue7d : [
                  { date: '—', label: 'Th 2', value: 0 },
                  { date: '—', label: 'Th 3', value: 0 },
                  { date: '—', label: 'Th 4', value: 0 },
                  { date: '—', label: 'Th 5', value: 0 },
                  { date: '—', label: 'Th 6', value: 0 },
                  { date: '—', label: 'Th 7', value: 0 },
                  { date: '—', label: 'CN', value: 0 },
                ]).slice(-7)

                return (
                  <div style={{ width: '100%', height: 220, position: 'relative', overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={pts}
                        margin={{ top: 18, right: 18, left: 10, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="admAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fb923c" stopOpacity={0.16} />
                            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="admLineStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fb923c" />
                            <stop offset="60%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ea580c" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148, 163, 184, 0.18)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                          tickFormatter={(v) => `${fmtMoneyShort(v)} đ`}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: 'rgba(249, 115, 22, 0.15)', strokeWidth: 1 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="url(#admLineStroke)"
                          strokeWidth={2.4}
                          fill="url(#admAreaFill)"
                          dot={{ r: 3.5, stroke: '#9a5a12', strokeWidth: 1.5, fill: '#fff' }}
                          activeDot={{ r: 5.5, stroke: '#ea580c', strokeWidth: 2, fill: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </div>

            <div className="admAnalyticsCats">
              <div className="admCatsTitle">Danh mục bán chạy</div>
              <div className="admCatsList">
                {(topCats30d.length ? topCats30d : [
                  { name: 'Điện thoại', pct: 0 },
                  { name: 'Laptop', pct: 0 },
                  { name: 'Phụ kiện', pct: 0 },
                  { name: 'Màn hình', pct: 0 },
                ]).slice(0, 4).map((c, idx) => (
                  <div key={`${c.name}-${idx}`} className="admCatsRow">
                    <div className="admCatsRowTop">
                      <span>{c.name}</span>
                      <span>{c.pct}%</span>
                    </div>
                    <div className="admCatsBar">
                      <div className="admCatsBarFill" style={{ width: `${Math.max(0, Math.min(100, c.pct))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="admCard admOrdersCard">
          <div className="admCardHead admOrdersHead">
            <h3 className="admCardTitle">Đơn hàng gần đây</h3>
            <button type="button" className="admOrdersAllBtn">Xem tất cả</button>
          </div>

          <div className="admOrdersTableWrap">
            <table className="admOrdersTable">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Số tiền</th>
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders.length ? recentOrders : []).map((o) => (
                  <tr key={o.id}>
                    <td className="admOrdersCodeCell">
                      <span className="admOrdersCode">#{o.order_code}</span>
                    </td>
                    <td>
                      <div className="admOrdersCustomer">
                        {o.customer_avatar_url ? (
                          <img
                            className="admOrdersAvatarImg"
                            src={resolveUserAvatar(o.customer_avatar_url) || undefined}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className={`admOrdersAvatar tone-${avatarToneOf(o.customer_name)}`}>{initialsOf(o.customer_name)}</span>
                        )}
                        <span className="admOrdersCustomerName">{o.customer_name}</span>
                      </div>
                    </td>
                    <td className="admOrdersProduct">{o.product}</td>
                    <td className="admOrdersAmount">
                      {fmtVnd(o.total_amount)}
                      <span className="admOrdersCurrency">đ</span>
                    </td>
                    <td className="admOrdersDate">{o.created_date ?? ''}</td>
                    <td>
                      <span className={`admOrdersStatus ${o.status_tone}`}>
                        {o.status_label}
                      </span>
                    </td>
                    <td className="admOrdersActions">
                      <div className="admOrdersMenuWrap">
                        <button
                          type="button"
                          className="admOrdersMenuBtn"
                          aria-label="Thao tác"
                          aria-expanded={openOrderMenuId === o.id}
                          onClick={() => setOpenOrderMenuId((cur) => (cur === o.id ? null : o.id))}
                        >
                          <span aria-hidden>⋮</span>
                        </button>
                        {openOrderMenuId === o.id && (
                          <div className="admOrdersMenu" role="menu">
                            <button
                              type="button"
                              className="admOrdersMenuItem"
                              onClick={() => {
                                setOpenOrderMenuId(null)
                                setDetailOrder({
                                  id: o.id,
                                  order_code: o.order_code,
                                  customer_name: o.customer_name,
                                  customer_avatar_url: o.customer_avatar_url ?? null,
                                  product: o.product,
                                  total_amount: o.total_amount,
                                  created_date: o.created_date,
                                  status_label: o.status_label,
                                  status_tone: o.status_tone,
                                })
                              }}
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {detailOrder && (
          <div
            className="admModalOverlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDetailOrder(null)
            }}
          >
            <div className="admModal">
              <div className="admModalHead">
                <div>
                  <div className="admModalTitle">Chi tiết đơn hàng</div>
                  <div className="admModalSub">#{detailOrder.order_code}</div>
                </div>
                <button type="button" className="admModalClose" onClick={() => setDetailOrder(null)} aria-label="Đóng">
                  ×
                </button>
              </div>

              <div className="admModalBody">
                <div className="admModalRow">
                  <div className="admModalLabel">Khách hàng</div>
                  <div className="admModalValue">
                    <div className="admOrdersCustomer">
                      {detailOrder.customer_avatar_url ? (
                        <img className="admOrdersAvatarImg" src={resolveUserAvatar(detailOrder.customer_avatar_url) || undefined} alt="" />
                      ) : (
                        <span className={`admOrdersAvatar tone-${avatarToneOf(detailOrder.customer_name)}`}>{initialsOf(detailOrder.customer_name)}</span>
                      )}
                      <span className="admOrdersCustomerName">{detailOrder.customer_name}</span>
                    </div>
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Sản phẩm</div>
                  <div className="admModalValue">{detailOrder.product}</div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Số tiền</div>
                  <div className="admModalValue admModalStrong">
                    {fmtVnd(detailOrder.total_amount)} đ
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Ngày đặt</div>
                  <div className="admModalValue">{detailOrder.created_date ?? ''}</div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Trạng thái</div>
                  <div className="admModalValue">
                    <span className={`admOrdersStatus ${detailOrder.status_tone}`}>{detailOrder.status_label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="admCard">
          <div className="admCardHead">
            <h3 className="admCardTitle">Tồn kho sản phẩm thấp</h3>
            <button type="button" className="admBtn admBtnGhostSm">Quản lý kho</button>
          </div>
          <div className="admTableWrap">
            <table className="admTable">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>Phiên bản</th>
                  <th>Danh mục</th>
                  <th>Còn lại</th>
                  <th>Nhập thêm</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {dashLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="admSkeletonRow">
                      <td colSpan={8}>
                        <div className="admSkeletonCell">
                          <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '70%' : '90%' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 16, color: '#64748b' }}>
                      {dashError ? dashError : 'Chưa có dữ liệu tồn kho (API chưa trả `stock_quantity` hoặc không có SP sắp hết).'}
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="admMono">{(p.sku ?? `#${p.id}`).toString()}</td>
              <td>{p.product_name}</td>
              <td>{p.variant_name ? p.variant_name : '—'}</td>
                      <td>{p.category?.name ?? '—'}</td>
                      <td className="admStrong">{p.stock_quantity ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            value={restockDraft[p.id] ?? ''}
                            onChange={(e) => setRestockDraft((cur) => ({ ...cur, [p.id]: e.target.value }))}
                            placeholder="0"
                            inputMode="numeric"
                            style={{
                              width: 86,
                              padding: '8px 10px',
                              borderRadius: 10,
                              border: '1px solid rgba(15,23,42,.10)',
                              fontWeight: 800,
                            }}
                          />
                          <button
                            type="button"
                            className="admBtn admBtnPrimary"
                            style={{ padding: '8px 10px' }}
                            disabled={restockBusyId === p.id || !(Number.parseInt((restockDraft[p.id] ?? '').trim(), 10) > 0)}
                            onClick={() => void restockVariant(p.id)}
                          >
                            {restockBusyId === p.id ? '...' : 'Nhập'}
                          </button>
                        </div>
                      </td>
                      <td>{p.price ? `${Number.parseFloat(p.price).toLocaleString('vi-VN')} đ` : '—'}</td>
                      <td><span className="admBadge wait">Sắp hết</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="admDashGrid2b">
          <section className="admCard admReviewCard">
            <div className="admCardHead admReviewHead">
              <h3 className="admCardTitle">Đánh giá gần đây</h3>
              <button type="button" className="admIconBtn" aria-label="Đánh giá">
                <ReviewChatIcon />
              </button>
            </div>
            <div className="admReviewList2">
              {(recentReviews.length ? recentReviews : []).map((r) => (
                <div key={r.id} className="admReviewRow2">
                  <div className="admReviewRowTop">
                    <div className="admReviewUser">
                      {r.user_avatar_url ? (
                        <img className="admReviewAvatarImg" src={resolveUserAvatar(r.user_avatar_url) || undefined} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="admReviewAvatar" aria-hidden>{initialsOf(r.user_name)}</span>
                      )}
                      <span className="admReviewUserName">{r.user_name}</span>
                    </div>
                    <div className="admReviewStars2" aria-label={`${r.rating} sao`}>
                      {'★★★★★'.slice(0, Math.max(0, Math.min(5, r.rating)))}
                      <span className="admReviewStarsMuted2">{'★★★★★'.slice(Math.max(0, Math.min(5, r.rating)))}</span>
                    </div>
                  </div>
                  <div className="admReviewQuote">“{r.comment}”</div>
                  <div className="admReviewTime2">{r.time}</div>
                </div>
              ))}
              {!recentReviews.length && (
                <div style={{ padding: 12, color: '#64748b', fontWeight: 700 }}>Chưa có đánh giá.</div>
              )}
            </div>
          </section>

          <section className="admCard admLoyalCard">
            <div className="admCardHead admLoyalHead">
              <h3 className="admCardTitle">Top khách hàng thân thiết</h3>
              <button type="button" className="admIconBtn" aria-label="Thành tích">
                <MedalIcon />
              </button>
            </div>
            <div className="admLoyalList">
              {(topCustomers.length ? topCustomers : []).map((c) => (
                <div key={c.user_id} className="admLoyalRow">
                  <div className="admLoyalLeft">
                    {c.avatar_url ? (
                      <img className="admLoyalAvatarImg" src={resolveUserAvatar(c.avatar_url) || undefined} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className={`admLoyalAvatar tone-${avatarToneOf(c.name)}`} aria-hidden>{initialsOf(c.name)}</span>
                    )}
                    <div className="admLoyalInfo">
                      <div className="admLoyalName">{c.name}</div>
                      <div className={`admVipBadge tone-${c.vip_tone}`}>{c.vip_label}</div>
                    </div>
                  </div>
                  <div className="admLoyalRight">
                    <div className="admLoyalSpent">{fmtMoneyShort(c.spent)} đ</div>
                    <div className="admLoyalOrders">{c.orders_count} đơn hàng</div>
                  </div>
                </div>
              ))}
              {!topCustomers.length && (
                <div style={{ padding: 12, color: '#64748b', fontWeight: 700 }}>Chưa có dữ liệu khách hàng.</div>
              )}
            </div>
            <button type="button" className="admLoyalAllBtn">Xem tất cả khách hàng</button>
          </section>
        </div>
      </div>
    </div>
  )
}

