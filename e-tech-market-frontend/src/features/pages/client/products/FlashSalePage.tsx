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

type SortType = 'popular' | 'discount' | 'priceAsc' | 'priceDesc'

export default function FlashSalePage() {
  const [sale, setSale] = useState<FlashSale | null>(null)
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'active' | 'upcoming' | 'ended'>('ended')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('popular')

  useEffect(() => {
    // Set document title and SEO meta
    document.title = '⚡ Flash Sale Cực Khủng - E-Tech Market'
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Săn sale công nghệ đỉnh cao cùng E-Tech Market. Giảm giá đồng loạt, cập nhật liên tục các ưu đãi sốc theo khung giờ vàng!')
    }
  }, [])

  useEffect(() => {
    const loadSale = async () => {
      try {
        const res = await apiFetch<FlashSale>('/api/flash-sale/current')
        setSale(res)
        
        if (res) {
          const now = new Date().getTime()
          const start = new Date(res.start_at.replace(' ', 'T')).getTime()
          const end = new Date(res.end_at.replace(' ', 'T')).getTime()
          
          if (now >= start && now <= end) {
            setStatus('active')
          } else if (now < start) {
            setStatus('upcoming')
          } else {
            setStatus('ended')
          }
        }
      } catch (e) {
        console.error('Failed to load flash sale:', e)
      } finally {
        setLoading(false)
      }
    }
    loadSale()
  }, [])

  useEffect(() => {
    if (!sale) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const startStr = sale.start_at.replace(' ', 'T')
      const endStr = sale.end_at.replace(' ', 'T')
      
      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      
      let targetTime = 0
      if (now < start) {
        setStatus('upcoming')
        targetTime = start
      } else if (now >= start && now <= end) {
        setStatus('active')
        targetTime = end
      } else {
        setStatus('ended')
        clearInterval(timer)
        setTimeLeft(null)
        setSale(null)
        return
      }

      const diff = targetTime - now
      if (diff <= 0) {
        clearInterval(timer)
        setTimeLeft(null)
        // reload to update status
        window.location.reload()
      } else {
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        
        if (!isNaN(h)) {
          setTimeLeft({ h, m, s })
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [sale])

  // Filter & Sort Logic
  const filteredAndSortedItems = useMemo(() => {
    if (!sale || !sale.items) return []

    // 1. Filter
    let items = sale.items.filter(item => {
      if (!item.product) return false
      const name = item.variant 
        ? `${item.product.name} ${item.variant.variant_name}` 
        : item.product.name
      return name.toLowerCase().includes(searchQuery.toLowerCase())
    })

    // 2. Sort
    items = [...items].sort((a, b) => {
      const priceA = a.variant ? a.variant.price : a.product.price
      const priceB = b.variant ? b.variant.price : b.product.price
      const discPercentA = Math.round((1 - a.flash_sale_price / priceA) * 100)
      const discPercentB = Math.round((1 - b.flash_sale_price / priceB) * 100)

      if (sortBy === 'discount') {
        return discPercentB - discPercentA
      }
      if (sortBy === 'priceAsc') {
        return a.flash_sale_price - b.flash_sale_price
      }
      if (sortBy === 'priceDesc') {
        return b.flash_sale_price - a.flash_sale_price
      }
      return 0 // 'popular' maintains default order
    })

    return items
  }, [sale, searchQuery, sortBy])

  const formatNum = (n: number) => String(n).padStart(2, '0')

  if (loading) {
    return (
      <div className="flashSalePage">
        <div className="fspSkeletonBanner" />
        <div className="fspGrid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="fspSkeletonCard">
              <div className="fspSkeletonImage" />
              <div className="fspSkeletonLine" style={{ width: '80%' }} />
              <div className="fspSkeletonLine" style={{ width: '40%' }} />
              <div className="fspSkeletonLine" style={{ height: '40px', borderRadius: '10px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!sale || status === 'ended' || !timeLeft || filteredAndSortedItems.length === 0 && searchQuery === '') {
    return (
      <div className="flashSalePage" style={{ marginTop: '60px' }}>
        <div className="fspEmptyState">
          <span className="fspEmptyIcon">⏰</span>
          <h2 className="fspEmptyTitle">Hiện tại chưa có sự kiện Flash Sale mới</h2>
          <p className="fspEmptyText">
            Mọi sự kiện săn giá sốc đã diễn ra thành công. Hãy thường xuyên quay lại để không bỏ lỡ các đợt mở bán chớp nhoáng với giá ưu đãi kịch sàn của E-Tech Market nhé!
          </p>
          <Link to="/" className="fspBackHomeBtn">Quay lại trang chủ</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flashSalePage">
      <div className="fspHeroBanner">
        <div className={`fspStatusBadge ${status}`}>
          {status === 'active' ? '⚡ Đang diễn ra' : '⏰ Sắp diễn ra'}
        </div>
        <h1 className="fspHeroTitle">{sale.name.toUpperCase()}</h1>
        <p className="fspHeroSubtitle">Cơ hội mua sắm đỉnh cao! Tất cả các sản phẩm được giảm giá sâu chớp nhoáng trong thời gian giới hạn.</p>
        <div className="fspTimerWrap">
          <span className="fspTimerLabel">
            {status === 'active' ? 'Kết thúc sau:' : 'Bắt đầu sau:'}
          </span>
          <div className="fspTimerBox">{formatNum(timeLeft.h)}</div>
          <span className="fspTimerSep">:</span>
          <div className="fspTimerBox">{formatNum(timeLeft.m)}</div>
          <span className="fspTimerSep">:</span>
          <div className="fspTimerBox">{formatNum(timeLeft.s)}</div>
        </div>
      </div>

      {/* Filter and Sort options */}
      <div className="fspFilterBar">
        <div className="fspSearchBox">
          <span className="fspSearchIcon">🔍</span>
          <input
            type="text"
            className="fspSearchInput"
            placeholder="Tìm kiếm sản phẩm ưu đãi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="fspSortOptions">
          <span className="fspSortLabel">Sắp xếp:</span>
          <button
            type="button"
            className={`fspSortBtn ${sortBy === 'popular' ? 'active' : ''}`}
            onClick={() => setSortBy('popular')}
          >
            🔥 Bán chạy
          </button>
          <button
            type="button"
            className={`fspSortBtn ${sortBy === 'discount' ? 'active' : ''}`}
            onClick={() => setSortBy('discount')}
          >
            📉 Giảm nhiều nhất
          </button>
          <button
            type="button"
            className={`fspSortBtn ${sortBy === 'priceAsc' ? 'active' : ''}`}
            onClick={() => setSortBy('priceAsc')}
          >
            💸 Giá tăng dần
          </button>
          <button
            type="button"
            className={`fspSortBtn ${sortBy === 'priceDesc' ? 'active' : ''}`}
            onClick={() => setSortBy('priceDesc')}
          >
            📈 Giá giảm dần
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="fspGrid">
        {filteredAndSortedItems.map(item => {
          const productUrl = `/products/${item.product.slug}${item.variant_id ? `?variant=${item.variant_id}` : ''}`;
          const displayImage = item.variant?.image_url 
            ? `${API_BASE_URL}${item.variant.image_url}` 
            : (item.product.main_image_url ? `${API_BASE_URL}${item.product.main_image_url}` : '/placeholder.png');
          const displayName = item.variant 
            ? `${item.product.name} - ${item.variant.variant_name}` 
            : item.product.name;
          const originalPrice = item.variant ? item.variant.price : item.product.price;
          
          const progressPercent = Math.min(100, (item.sold_quantity / (item.quantity_limit || 100)) * 100);
          const isHot = progressPercent >= 80;

          return (
            <Link key={item.id} to={productUrl} className="fspCard">
              <div className="fspBadge">-{Math.round((1 - item.flash_sale_price / originalPrice) * 100)}%</div>
              <div className="fspThumb">
                <img src={displayImage} alt={displayName} />
                {status === 'upcoming' && (
                  <div className="fspUpcomingOverlay">
                    <div className="fspUpcomingBadge">⏰ Xem trước</div>
                  </div>
                )}
              </div>
              <div className="fspInfo">
                <h3 className="fspName">{displayName}</h3>
                <div className="fspPricing">
                  <span className="fspSalePrice">{Number(item.flash_sale_price).toLocaleString()}đ</span>
                  <span className="fspOldPrice">{Number(originalPrice).toLocaleString()}đ</span>
                </div>
                
                <div className="fspProgress">
                  <div className="fspProgressBar">
                    <div className="fspProgressFill" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <div className="fspProgressText">
                    <span>
                      {status === 'upcoming' 
                        ? 'Chưa mở bán' 
                        : (item.sold_quantity === 0 ? 'Vừa mở bán' : `Đã bán ${item.sold_quantity}`)
                      }
                    </span>
                    {isHot && status === 'active' && <span className="fspHotFire">🔥 Sắp cháy hàng!</span>}
                  </div>
                </div>

                <button 
                  type="button" 
                  className={`fspCTA ${status === 'upcoming' ? 'upcoming' : ''}`}
                >
                  {status === 'upcoming' ? 'CHỜ BÁN ⏰' : 'MUA NGAY ⚡'}
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  )
}
