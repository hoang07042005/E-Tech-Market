import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import '@/styles/pages/FlashSalePage.css'

type FlashSaleItem = {
  id: number
  flash_sale_price: number
  quantity_limit: number | null
  sold_quantity: number
  variant_id: number | null
  product: {
    id: number
    name: string
    slug: string
    main_image_url: string | null
    price: number
    variants?: Array<{
      id: number
      price: number
      effective_price: number
    }>
  }
  variant?: {
    id: number
    variant_name: string
    image_url: string | null
    price: number
  } | null
}

type FlashSale = {
  id: number
  name: string
  start_at: string
  end_at: string
  items: FlashSaleItem[]
}

const resolveImageUrl = (url?: string | null) => {
  if (!url) return '/placeholder.png'
  const s = url.trim()
  if (!s) return '/placeholder.png'
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* ignore URL parsing errors */ }
    return s
  }
  return `${API_BASE_URL}${s.startsWith('/') ? s : `/${s}`}`
}

type SortType = 'popular' | 'discount' | 'priceAsc' | 'priceDesc'

interface TimelineSlot {
  time: string
  label: string
  status: 'passed' | 'active' | 'upcoming'
}

const defaultTimelineSlots: TimelineSlot[] = [
  { time: '10:00', label: 'Da qua', status: 'passed' },
  { time: '12:00', label: 'DANG DIEN RA', status: 'active' },
  { time: '14:00', label: 'Sap toi', status: 'upcoming' },
  { time: '16:00', label: 'Sap toi', status: 'upcoming' },
  { time: '20:00', label: 'Sap toi', status: 'upcoming' },
]

function getSaleStatus(sale: FlashSale): 'active' | 'upcoming' | 'ended' {
  const now = new Date().getTime()
  const start = new Date(sale.start_at.replace(' ', 'T')).getTime()
  const end = new Date(sale.end_at.replace(' ', 'T')).getTime()
  if (now >= start && now <= end) return 'active'
  if (now < start) return 'upcoming'
  return 'ended'
}

function getTimeLeftObject(sale: FlashSale): { h: number; m: number; s: number } | null {
  const now = new Date().getTime()
  const saleStatus = getSaleStatus(sale)
  if (saleStatus === 'ended') return null

  const targetTime = saleStatus === 'upcoming'
    ? new Date(sale.start_at.replace(' ', 'T')).getTime()
    : new Date(sale.end_at.replace(' ', 'T')).getTime()

  const diff = targetTime - now
  if (diff <= 0) return null

  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  return isNaN(h) ? null : { h, m, s }
}

function formatDateTimeVN(dateStr: string): string {
  const date = new Date(dateStr.replace(' ', 'T'))
  const day = date.getDate()
  const month = date.getMonth() + 1
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} lúc ${hours}:${minutes}`
}

export default function FlashSalePage() {
  const [salesData, setSalesData] = useState<FlashSale | FlashSale[] | null>(null)
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentSaleIndex, setCurrentSaleIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('popular')
  const [timelineSlots] = useState<TimelineSlot[]>(defaultTimelineSlots)

  const isMultiple = Array.isArray(salesData) && salesData.length >= 2
  const currentSale = isMultiple
    ? (salesData as FlashSale[])[currentSaleIndex]
    : (salesData as FlashSale | null)

  useEffect(() => {
    document.title = 'E-Tech Market'
  }, [])

  useEffect(() => {
    const loadSale = async () => {
      try {
        const res = await apiFetch<FlashSale | FlashSale[]>('/api/flash-sale/current')
        setSalesData(res)
      } catch (e) {
        console.error('Failed to load flash sale:', e)
      } finally {
        setLoading(false)
      }
    }
    loadSale()
  }, [])

  useEffect(() => {
    if (!currentSale) return
    const timer = setInterval(() => {
      const saleStatus = getSaleStatus(currentSale)
      if (saleStatus === 'ended') {
        const timeLeftObj = getTimeLeftObject(currentSale)
        setTimeLeft(timeLeftObj)
        return
      }
      const timeLeftObj = getTimeLeftObject(currentSale)
      if (!timeLeftObj) {
        if (isMultiple) {
          setCurrentSaleIndex(prev => {
            const next = prev + 1
            if (next >= (salesData as FlashSale[]).length) {
              window.location.reload()
              return prev
            }
            return next
          })
        } else {
          setTimeLeft(null)
          setSalesData(null)
          window.location.reload()
        }
        return
      }
      setTimeLeft(timeLeftObj)
    }, 1000)
    return () => clearInterval(timer)
  }, [currentSale, isMultiple, salesData])

  const filteredAndSortedItems = useMemo(() => {
    if (!currentSale || !currentSale.items) return []
    let items = currentSale.items.filter(item => {
      if (!item.product) return false
      const name = item.variant
        ? `${item.product.name} ${item.variant.variant_name}`
        : item.product.name
      return name.toLowerCase().includes(searchQuery.toLowerCase())
    })
    items = [...items].sort((a, b) => {
      const priceA = a.variant ? a.variant.price : a.product.price
      const priceB = b.variant ? b.variant.price : b.product.price
      const discPercentA = Math.round((1 - a.flash_sale_price / priceA) * 100)
      const discPercentB = Math.round((1 - b.flash_sale_price / priceB) * 100)
      switch (sortBy) {
        case 'popular': return b.sold_quantity - a.sold_quantity
        case 'discount': return discPercentB - discPercentA
        case 'priceAsc': return a.flash_sale_price - b.flash_sale_price
        case 'priceDesc': return b.flash_sale_price - a.flash_sale_price
        default: return 0
      }
    })
    return items
  }, [currentSale, searchQuery, sortBy])

  const status = currentSale ? getSaleStatus(currentSale) : 'ended'
  const formatNum = (n: number) => n.toString().padStart(2, '0')

  // Empty state
  if (loading) {
    return (
      <div className="fspLoading">
        <div className="fspLoader"></div>
        <p>Dang tai Flash Sale...</p>
      </div>
    )
  }

  if (!salesData || status === 'ended') {
    return (
      <div className="flashSalePage">
        <div className="fspEmptyState">
          <span className="fspEmptyIcon">bolt</span>
          <h2 className="fspEmptyTitle">Chua Co Flash Sale</h2>
          <p className="fspEmptyText">Hay quay lai sau! Chuong toi se som co nhung uu dai soc danh rieng cho ban.</p>
          <Link to="/" className="fspBackHomeBtn">Ve Trang Chu</Link>
        </div>
      </div>
    )
  }

  // Multiple flash sales - Banner style (theo mau dark theme)
  if (isMultiple) {
    const allSales = salesData as FlashSale[]
    return (
      <div className="flashSalePage">
        {/* Hero Section / Flash Sale Banner - Dark theme */}
        <section className="fspMultiBanner">
          {/* Atmospheric Particles/Glow */}
          <div className="fspMultiBannerGlow">
            <div className="fspGlowLeft"></div>
            <div className="fspGlowRight"></div>
          </div>

          <div className="fspMultiBannerContent">
            {/* Heading */}
            <div className="fspMultiBannerTitle">
              <span className="material-symbols-outlined fspBoltIcon">
                <svg className="flashIcon" width="60" height="60" viewBox="0 0 24 24" fill="#FF2424">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
              </span>
              <h1 className="fspMultiTitleText">FLASH SALE</h1>
            </div>
            <p className="fspMultiText">
              Chỉ trong thời gian có hạn. Hệ thống thương mại tốc độ cao của <strong>E-Tech Market</strong> mang đến cho bạn những sản phẩm độc quyền nhất mùa hè với mức giá đột phá.
            </p>

            {/* Countdown Timer Module */}
            <div className="fspMultiTimerWrap">
              {/* Hours */}
              <div className="fspMultiTimerCol">
                <div className="fspMultiTimerBox">
                  <span className="fspMultiTimerNum">{formatNum(timeLeft?.h ?? 0).slice(0, 2)}</span>
                </div>
                <span className="fspMultiTimerLabel">HOURS</span>
              </div>
              <span className="fspMultiTimerSep">:</span>
              {/* Minutes */}
              <div className="fspMultiTimerCol">
                <div className="fspMultiTimerBox">
                  <span className="fspMultiTimerNum">{formatNum(timeLeft?.m ?? 0).slice(0, 2)}</span>
                </div>
                <span className="fspMultiTimerLabel">MINUTES</span>
              </div>
              <span className="fspMultiTimerSep">:</span>
              {/* Seconds */}
              <div className="fspMultiTimerCol">
                <div className="fspMultiTimerBox">
                  <span className="fspMultiTimerNum">{formatNum(timeLeft?.s ?? 0).slice(0, 2)}</span>
                </div>
                <span className="fspMultiTimerLabel">SECONDS</span>
              </div>
            </div>

            {/* Program Items - Multiple buttons */}
            <div className="fspMultiProgramBtns">
              {allSales.map((sale, index) => (
                <button
                  key={sale.id}
                  onClick={() => setCurrentSaleIndex(index)}
                  className={`fspMultiProgramBtn ${index === currentSaleIndex ? 'active' : ''}`}
                >
                  <span className="fspMultiProgramName">{sale.name}</span>
                  <span className="fspMultiProgramTime">
                    {getSaleStatus(sale) === 'active' ? 'Kết thúc: ' : 'Bắt đầu: '}
                    {formatDateTimeVN(sale.end_at)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Current Program Info */}
        <section className="fspCurrentProgramInfo">
          <h2 className="fspCurrentProgramTitle">
            <span className="material-symbols-outlined">
              <svg className="flashIcon" width="24" height="24" viewBox="0 0 24 24" fill="#FF2424">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
            </span>
            {currentSale?.name}
          </h2>
          <span className="fspCurrentProgramTime">
            {status === 'active' ? 'Kết thúc: ' : 'Bắt đầu: '}
            {formatDateTimeVN(currentSale?.end_at || '')}
          </span>
        </section>

        <section className="fspFilterSection">
          <div className="fspSearchBox">
            <span className="fspSearchIcon material-symbols-outlined">
              <svg className="hfSearchIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input type="text" className="fspSearchInput" placeholder="Tìm sản phẩm flash sale..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="fspSortOptions">
            <button type="button" className={`fspSortBtn ${sortBy === 'popular' ? 'active' : ''}`} onClick={() => setSortBy('popular')}>Bán chạy</button>
            <button type="button" className={`fspSortBtn ${sortBy === 'priceAsc' ? 'active' : ''}`} onClick={() => setSortBy('priceAsc')}>Giá tăng dần</button>
            <button type="button" className={`fspSortBtn ${sortBy === 'discount' ? 'active' : ''}`} onClick={() => setSortBy('discount')}>Giảm nhiều nhất</button>
            <button type="button" className={`fspSortBtn ${sortBy === 'priceDesc' ? 'active' : ''}`} onClick={() => setSortBy('priceDesc')}>Mới nhất</button>
          </div>
        </section>

        <section className="fspProductsSection">
          <div className="fspGrid">
            {filteredAndSortedItems.map(item => {
              const productUrl = `/products/${item.product.slug}?flashSale=true${item.variant_id ? `&variant=${item.variant_id}` : ''}`
              const displayImage = resolveImageUrl(item.variant?.image_url || item.product.main_image_url)
              const displayName = item.variant ? `${item.product.name} - ${item.variant.variant_name}` : item.product.name
              const originalPrice = item.variant ? item.variant.price : item.product.price
              const progressPercent = Math.min(100, (item.sold_quantity / (item.quantity_limit || 100)) * 100)
              const isHot = progressPercent >= 80
              const isScarcity = progressPercent >= 95

              return (
                <Link key={item.id} to={productUrl} className={`fspCard ${isScarcity ? 'scarcity' : ''}`}>
                  <div className="fspBadge">
                    <span className="fspBadgePercent">-{Math.round((1 - item.flash_sale_price / originalPrice) * 100)}%</span>
                  </div>
                  <div className="fspThumb">
                    <img src={displayImage} alt={displayName} />
                  </div>
                  <div className="fspInfo">
                    <h3 className="fspName">{displayName}</h3>
                    <div className="fspPricing">
                      <span className="fspSalePrice">{Number(item.flash_sale_price).toLocaleString()}đ</span>
                      <span className="fspOldPrice">{Number(originalPrice).toLocaleString()}đ</span>
                    </div>
                    <div className="fspProgress">
                      <div className="fspProgressRow">
                        <span className={`fspProgressLabel ${isHot ? 'hot' : ''}`}>
                          {status === 'upcoming' ? 'Chưa mở bán' : item.sold_quantity === 0 ? 'Vừa mở bán' : `Đã bán ${item.sold_quantity}`}
                        </span>
                        <span className="fspStockLabel">
                          {status === 'upcoming' ? 'Sắp diễn ra' : item.quantity_limit && (item.quantity_limit - item.sold_quantity) <= 3 ? `Chỉ còn ${item.quantity_limit - item.sold_quantity} chiếc` : isHot ? 'ĐANG CHÁY HÀNG!' : 'Còn hàng'}
                        </span>
                      </div>
                      <div className="fspProgressBar">
                        <div className={`fspProgressFill ${isHot ? 'hot' : ''}`} style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>
                    <div className="fspCTA">
                      XEM CHI TIẾT →
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  // Single flash sale - Original style (with timer in hero)
  return (
    <div className="flashSalePage">
      <section className="fspHero">
        <div className="fspHeroContent">
          <div className="fspMultiBannerTitle">
              <span className="material-symbols-outlined fspBoltIcon">
                <svg className="flashIcon" width="60" height="60" viewBox="0 0 24 24" fill="#FF2424">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
              </span>
              <h1 className="fspHeroTitle">{currentSale?.name || "Flash Sale"}</h1>
            </div>
            <p className="fspMultiText">
              Chỉ trong thời gian có hạn. Hệ thống thương mại tốc độ cao của <strong>E-Tech Market</strong> mang đến cho bạn những sản phẩm độc quyền nhất mùa hè với mức giá đột phá.
            </p>
          <div className="fspTimerWrap">
            <div className="fspTimerBlock">
              <div className="fspTimerBox">{formatNum(timeLeft?.h ?? 0).slice(0, 2)}</div>
              <span className="fspTimerLabel">HOURS</span>
            </div>
            <span className="fspTimerSep">:</span>
            <div className="fspTimerBlock">
              <div className="fspTimerBox" id="timer-mins">{formatNum(timeLeft?.m ?? 0).slice(0, 2)}</div>
              <span className="fspTimerLabel">MINUTES</span>
            </div>
            <span className="fspTimerSep">:</span>
            <div className="fspTimerBlock">
              <div className="fspTimerBox" id="timer-secs">{formatNum(timeLeft?.s ?? 0).slice(0, 2)}</div>
              <span className="fspTimerLabel">SECONDS</span>
            </div>
          </div>
        </div>
      </section>

      <section className="fspFilterSection">
        <div className="fspSearchBox">
          <span className="fspSearchIcon material-symbols-outlined">
            <svg className="hfSearchIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <input type="text" className="fspSearchInput" placeholder="Tim san pham flash sale..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="fspSortOptions">
          <button type="button" className={`fspSortBtn ${sortBy === 'popular' ? 'active' : ''}`} onClick={() => setSortBy('popular')}>Bán chạy</button>
          <button type="button" className={`fspSortBtn ${sortBy === 'priceAsc' ? 'active' : ''}`} onClick={() => setSortBy('priceAsc')}>Giá tăng dần</button>
          <button type="button" className={`fspSortBtn ${sortBy === 'discount' ? 'active' : ''}`} onClick={() => setSortBy('discount')}>Giảm nhiều nhất</button>
          <button type="button" className={`fspSortBtn ${sortBy === 'priceDesc' ? 'active' : ''}`} onClick={() => setSortBy('priceDesc')}>Mới nhất</button>
        </div>
      </section>

      <section className="fspProductsSection">
        <div className="fspGrid">
          {filteredAndSortedItems.map(item => {
            const productUrl = `/products/${item.product.slug}?flashSale=true${item.variant_id ? `&variant=${item.variant_id}` : ''}`
            const displayImage = resolveImageUrl(item.variant?.image_url || item.product.main_image_url)
            const displayName = item.variant ? `${item.product.name} - ${item.variant.variant_name}` : item.product.name
            const originalPrice = item.variant ? item.variant.price : item.product.price
            const progressPercent = Math.min(100, (item.sold_quantity / (item.quantity_limit || 100)) * 100)
            const isHot = progressPercent >= 80
            const isScarcity = progressPercent >= 95

            return (
              <Link key={item.id} to={productUrl} className={`fspCard ${isScarcity ? 'scarcity' : ''}`}>
                <div className="fspBadge">
                  <span className="fspBadgePercent">-{Math.round((1 - item.flash_sale_price / originalPrice) * 100)}%</span>
                </div>
                <div className="fspThumb">
                  <img src={displayImage} alt={displayName} />
                </div>
                <div className="fspInfo">
                  <h3 className="fspName">{displayName}</h3>
                  <div className="fspPricing">
                    <span className="fspSalePrice">{Number(item.flash_sale_price).toLocaleString()}đ</span>
                    <span className="fspOldPrice">{Number(originalPrice).toLocaleString()}đ</span>
                  </div>
                  <div className="fspProgress">
                    <div className="fspProgressRow">
                      <span className={`fspProgressLabel ${isHot ? 'hot' : ''}`}>
                        {status === 'upcoming' ? 'Chưa mở bán' : item.sold_quantity === 0 ? 'Vừa mở bán' : `Đã bán ${item.sold_quantity}`}
                      </span>
                      <span className="fspStockLabel">
                        {status === 'upcoming' ? 'Sắp diễn ra' : item.quantity_limit && (item.quantity_limit - item.sold_quantity) <= 3 ? `Chỉ còn ${item.quantity_limit - item.sold_quantity} chiếc` : isHot ? 'ĐANG CHÁY HÀNG!' : 'Còn hàng'}
                      </span>
                    </div>
                    <div className="fspProgressBar">
                      <div className={`fspProgressFill ${isHot ? 'hot' : ''}`} style={{ width: `${progressPercent}%` }}></div>
                    </div>
                  </div>
                   <div className="fspCTA">
                      XEM CHI TIẾT →
                    </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}