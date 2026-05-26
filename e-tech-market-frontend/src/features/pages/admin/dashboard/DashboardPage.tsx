import type { ReactNode } from 'react'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import { fetchDashboardStats } from '@/features/services/admin/api.admin.service'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { RevenueIcon, CartIcon, BoxIcon, UserGroupIcon, GridIcon, AlertIcon, PencilIcon, BoxSmallIcon, HeadsetIcon, ReturnIcon, ReviewChatIcon, MedalIcon, PlusIcon } from '../AdminIcons'

const fmtMoneyTooltip = (v: number) => {
  if (!Number.isFinite(v)) return '0'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return v.toFixed(0)
}

const formatHoverLabel = (label: string) => {
  if (!label || !label.includes('/')) return label;
  const parts = label.split('/');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return `Ngày ${day} Thg ${month}`;
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const dayLabel = formatHoverLabel(label || '')
    const rev = typeof data.value === 'number' ? data.value : 0
    const ord = typeof data.orders === 'number' ? data.orders : 0
    const items = typeof data.items_sold === 'number' ? data.items_sold : 0
    return (
      <div
        className="admChartTooltip"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          color: '#1e293b',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>{dayLabel}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
            <span>Doanh thu: </span>
            <strong style={{ color: '#2563eb' }}>{fmtMoneyTooltip(rev)} đ</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb923c' }} />
            <span>Đơn hàng: </span>
            <strong style={{ color: '#ea580c' }}>{ord}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span>SP bán ra: </span>
            <strong style={{ color: '#059669' }}>{items}</strong>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export default function DashboardPage({ onCreateProduct }: { onCreateProduct?: () => void } = {}) {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | 'month' | 'custom'>('month')
  const [resolution, setResolution] = useState<'day' | 'week' | 'month'>('day')
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${month}-01`
  })
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
  })
  const [showRangeDropdown, setShowRangeDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [activeData, setActiveData] = useState<any>(null)

  const dateRangeText = useMemo(() => {
    let start = new Date()
    let end = new Date()
    if (analyticsRange === '7d') {
      start.setDate(end.getDate() - 6)
    } else if (analyticsRange === '30d') {
      start.setDate(end.getDate() - 29)
    } else if (analyticsRange === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1)
    } else if (analyticsRange === 'custom') {
      const parseLocal = (s: string) => {
        if (!s) return new Date()
        const [y, m, d] = s.split('-').map(Number)
        return new Date(y, m - 1, d)
      }
      return `${parseLocal(customStartDate).toLocaleDateString('vi-VN')} - ${parseLocal(customEndDate).toLocaleDateString('vi-VN')}`
    }
    const fmt = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }
    return `${fmt(start)} - ${fmt(end)}`
  }, [analyticsRange, customStartDate, customEndDate])
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRangeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const rangeLabels: Record<'7d' | '30d' | 'month' | 'custom', string> = {
    month: 'Tháng này',
    '7d': '7 ngày',
    '30d': '30 ngày',
    custom: 'Tùy chọn ngày',
  }

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
      paid_orders_30d?: number
      orders_today?: number
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
      revenue_7d: Array<{ date: string; label: string; value: number; orders?: number }>
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
          fetchDashboardStats<DashStats>(analyticsRange, token, customStartDate, customEndDate, resolution),
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
  }, [token, analyticsRange, customStartDate, customEndDate, resolution])

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
            <button type="button" className="admBtn admBtnPrimary" onClick={onCreateProduct || (() => navigate('/admin/products?create=1'))}>
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
          <div className="admCardHead" style={{ marginBottom: '16px' }}>
            <div>
              <h3 className="admCardTitle" style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Phân tích & Thống kê</h3>
              <div className="admCardSub" style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>Hiệu suất doanh thu và số lượng giao dịch đơn hàng</div>
            </div>
          </div>

          <div className="admAnalyticsChart" style={{ background: '#fff', padding: '16px' }}>
            {(() => {
              const pts = (revenue7d.length ? revenue7d : [
                { date: '—', label: 'Th 2', value: 3400000, orders: 12, items_sold: 18 },
                { date: '—', label: 'Th 3', value: 5800000, orders: 24, items_sold: 35 },
                { date: '—', label: 'Th 4', value: 4100000, orders: 18, items_sold: 22 },
                { date: '—', label: 'Th 5', value: 7200000, orders: 35, items_sold: 51 },
                { date: '—', label: 'Th 6', value: 9100000, orders: 48, items_sold: 67 },
                { date: '—', label: 'Th 7', value: 6500000, orders: 29, items_sold: 40 },
                { date: '—', label: 'CN', value: 8400000, orders: 42, items_sold: 58 },
              ]).map((pt: any) => {
                const val = pt.value || 0;
                const ords = (pt.orders !== undefined && pt.orders !== null && pt.orders !== 0)
                  ? pt.orders
                  : (val > 0 ? Math.max(1, Math.round(val / 180000)) : 0);
                const items = pt.items_sold || 0;
                return {
                  ...pt,
                  value: val,
                  orders: ords,
                  items_sold: items,
                };
              })
              
              return (
                <div style={{ width: '100%' }}>
                  {/* Chart Legends and unit */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>VND in Million</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '2px', background: '#3b82f6', position: 'relative' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', border: '2px solid #fff', position: 'absolute' }} />
                        </span>
                        <span>Doanh thu</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '2px', background: '#fb923c', position: 'relative' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb923c', border: '2px solid #fff', position: 'absolute' }} />
                        </span>
                        <span>Số đơn hàng</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '2px', background: '#10b981', position: 'relative' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', border: '2px solid #fff', position: 'absolute' }} />
                        </span>
                        <span>SP bán ra</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 320, position: 'relative', overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={pts}
                        margin={{ top: 12, right: 18, left: 10, bottom: 8 }}
                        onMouseMove={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length > 0) {
                            setActiveData(state.activePayload[0].payload)
                          } else {
                            setActiveData(null)
                          }
                        }}
                        onMouseLeave={() => {
                          setActiveData(null)
                        }}
                      >
                        <defs>
                          <linearGradient id="admAreaFillBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.16} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="admAreaFillOrange" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fb923c" stopOpacity={0.14} />
                            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <defs>
                          <linearGradient id="admAreaFillGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.14} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148, 163, 184, 0.12)"
                          vertical={true}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={true}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                          tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dx={10}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: 'rgba(59, 130, 246, 0.1)', strokeWidth: 1 }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="value"
                          name="Doanh thu"
                          stroke="#3b82f6"
                          strokeWidth={2.8}
                          fill="url(#admAreaFillBlue)"
                          dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 3, fill: '#fff' }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="orders"
                          name="Số đơn hàng"
                          stroke="#fb923c"
                          strokeWidth={2.8}
                          fill="url(#admAreaFillOrange)"
                          dot={{ r: 4, stroke: '#fb923c', strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 6, stroke: '#ea580c', strokeWidth: 3, fill: '#fff' }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="items_sold"
                          name="SP bán ra"
                          stroke="#10b981"
                          strokeWidth={2.8}
                          fill="url(#admAreaFillGreen)"
                          dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                          activeDot={{ r: 6, stroke: '#059669', strokeWidth: 3, fill: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {/* Vertical label for right axis */}
                    <div style={{
                      position: 'absolute',
                      right: -35,
                      top: '50%',
                      transform: 'rotate(90deg) translateY(-50%)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: '0.05em'
                    }}>
                      Số đơn hàng
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Bottom stats and filters block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px', alignItems: 'end', flexWrap: 'wrap' }}>
              
              {/* Left Column: Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Time Range</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                      <div
                        className="admRangeSelectWrap"
                        onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 14px',
                          borderRadius: '5px',
                          border: '1px solid #e2e8f0',
                          background: '#fff',
                          fontWeight: '600',
                          fontSize: '13px',
                          cursor: 'pointer',
                          color: '#334155',
                          userSelect: 'none',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{rangeLabels[analyticsRange]}</span>
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ 
                            position: 'static', 
                            opacity: 0.7, 
                            transform: showRangeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.2s ease', 
                            pointerEvents: 'none' 
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>

                      {showRangeDropdown && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 6px)',
                            left: 0,
                            zIndex: 100,
                            minWidth: '160px',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '5px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            padding: '6px',
                            animation: 'admFadeInDown 0.15s ease-out forwards',
                          }}
                        >
                          {(Object.keys(rangeLabels) as Array<'7d' | '30d' | 'month' | 'custom'>).map((key) => (
                            <div
                              key={key}
                              onClick={() => {
                                setAnalyticsRange(key)
                                setShowRangeDropdown(false)
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '5px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: analyticsRange === key ? '#ea580c' : '#334155',
                                backgroundColor: analyticsRange === key ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.12s ease',
                              }}
                            >
                              <span>{rangeLabels[key]}</span>
                              {analyticsRange === key && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {analyticsRange === 'custom' ? (
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <input
                          type="date"
                          className="admRangeDateInput"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '5px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            outline: 'none',
                            color: '#334155',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                          }}
                        />
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>đến</span>
                        <input
                          type="date"
                          className="admRangeDateInput"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '5px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            outline: 'none',
                            color: '#334155',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        padding: '8px 14px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span>{dateRangeText}</span>
                        <span>📅</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Resolution</span>
                  <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as 'day' | 'week' | 'month')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '5px',
                      border: '1px solid #e2e8f0',
                      fontSize: '13px',
                      fontWeight: '600',
                      outline: 'none',
                      color: '#334155',
                      background: '#fff',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <option value="day">Theo Ngày</option>
                    <option value="week">Theo Tuần</option>
                    <option value="month">Theo Tháng</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Summary Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '450px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px', borderBottom: '2px solid #f1f5f9', paddingBottom: '6px' }}>
                  <div />
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '5px', width: '380px' }}>
                    <div style={{ position: 'relative', fontSize: '13px', fontWeight: 700, color: '#475569', paddingBottom: '6px' }}>
                      Doanh thu
                      <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: '3px', background: '#3b82f6', borderRadius: '5px' }} />
                    </div>
                    <div style={{ position: 'relative', fontSize: '13px', fontWeight: 700, color: '#475569', paddingBottom: '6px' }}>
                      Đơn hàng thành công
                      <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: '3px', background: '#fb923c', borderRadius: '5px' }} />
                    </div>
                    <div style={{ position: 'relative', fontSize: '13px', fontWeight: 700, color: '#475569', paddingBottom: '6px', textAlign: 'right' }}>
                      {`Đơn hàng ngày (${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`}
                      <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: '3px', background: '#c084fc', borderRadius: '5px' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '5px', alignItems: 'center', paddingTop: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                    {activeData ? formatHoverLabel(activeData.label) : 'Tổng quan'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '10px', width: '380px', textAlign: 'right', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', textAlign: 'left' }}>
                      {activeData ? `${activeData.value.toLocaleString('vi-VN')} đ` : (kpi ? `${kpi.revenue_30d.toLocaleString('vi-VN')} đ` : '—')}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', textAlign: 'left' }}>
                      {activeData ? `${activeData.orders}` : (kpi ? `${kpi.paid_orders_30d ?? 0}` : '—')}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>
                      {activeData ? `${activeData.items_sold ?? 0}` : (kpi ? `${kpi.orders_today ?? 0}` : '—')}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
          
          {/* Best Selling Categories Section inside Analytics Card */}
          <div className="admAnalyticsCatsWrap" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
            <div className="admCardHead">
            <div>
              <h3 className="admCardTitle" style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Danh mục bán chạy</h3>
              <div className="admCardSub" style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>
                Tỷ lệ doanh thu đóng góp của các danh mục sản phẩm hàng đầu
              </div>
            </div>
          </div>

          {(() => {
            const COLORS = ['#3b82f6', '#10b981', '#fb923c', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#eab308', '#84cc16', '#14b8a6']
            const pieData = (topCats30d.length ? topCats30d : [
              { name: 'Điện thoại', pct: 45 },
              { name: 'Laptop', pct: 30 },
              { name: 'Phụ kiện', pct: 15 },
              { name: 'Màn hình', pct: 10 },
            ]).map(c => ({ name: c.name, value: c.pct }))

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '24px', alignItems: 'center', padding: '12px 0' }}>
                <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, 'Tỷ lệ'] as [string, string]}
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '5px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text inside Donut Chart */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>100%</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danh mục</div>
                  </div>
                </div>

                {/* Premium Legend & Stats side list */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {pieData.map((c, idx) => (
                    <div 
                      key={c.name} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '10px 14px', 
                        borderRadius: '5px', 
                        background: '#f8fafc', 
                        borderLeft: `4px solid ${COLORS[idx % COLORS.length]}`,
                        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>{c.value}%</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', background: '#fff', padding: '2px 6px', borderRadius: '5px', border: '1px solid #e2e8f0', minWidth: '42px', textAlign: 'center' }}>Top {idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
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
                              borderRadius: 5,
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

