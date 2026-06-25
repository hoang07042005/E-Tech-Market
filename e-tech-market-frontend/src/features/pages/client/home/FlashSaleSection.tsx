import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import '@/styles/pages/FlashSaleSection.css'

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
    discount_price?: number | null
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

// API có thể trả về object (1 sale) hoặc mảng (nhiều sale)
type FlashSaleResponse = FlashSale | FlashSale[]

const resolveImageUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') return '/placeholder.png'
  const s = url.trim()
  if (!s) return '/placeholder.png'
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* keep original */ }
    return s
  }
  return `${API_BASE_URL}${s.startsWith('/') ? s : `/${s}`}`
}

export default function FlashSaleSection() {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCurrentlyActive, setIsCurrentlyActive] = useState(false)

  useEffect(() => {
    const loadSale = async () => {
      try {
        const res = await apiFetch<FlashSaleResponse>('/api/flash-sale/current')

        // API trả về object (1 sale) hoặc mảng (nhiều sale) - normalize về mảng
        const saleList: FlashSale[] = Array.isArray(res) ? res : res ? [res] : []
        setSales(saleList)

        // Lấy flash sale đang active đầu tiên
        const now = new Date().getTime()
        const activeSale = saleList.find(s => {
          if (!s.start_at || !s.end_at) return false
          const start = new Date(String(s.start_at).replace(' ', 'T')).getTime()
          const end = new Date(String(s.end_at).replace(' ', 'T')).getTime()
          return now >= start && now <= end
        })

        if (activeSale) {
          const startStr = String(activeSale.start_at).replace(' ', 'T')
          const endStr = String(activeSale.end_at).replace(' ', 'T')
          const start = new Date(startStr).getTime()
          const end = new Date(endStr).getTime()
          setIsCurrentlyActive(now >= start && now <= end)
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
    // Tìm flash sale đang active đầu tiên từ danh sách
    const now = new Date().getTime()
    const activeSale = sales.find(s => {
      if (!s.start_at || !s.end_at) return false
      const start = new Date(String(s.start_at).replace(' ', 'T')).getTime()
      const end = new Date(String(s.end_at).replace(' ', 'T')).getTime()
      return now >= start && now <= end
    })

    if (!activeSale) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const startStr = String(activeSale.start_at).replace(' ', 'T')
      const endStr = String(activeSale.end_at).replace(' ', 'T')

      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      const diff = end - now

      if (isNaN(start) || isNaN(end) || now < start || diff <= 0) {
        setIsCurrentlyActive(false)
        if (diff <= 0) {
          clearInterval(timer)
          setTimeLeft(null)
        }
      } else {
        setIsCurrentlyActive(true)
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)

        if (!isNaN(h)) {
          setTimeLeft({ h, m, s })
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [sales])

  // Lấy flash sale đang active để hiển thị
  const now = new Date().getTime()
  const activeSale = sales.find(s => {
    if (!s.start_at || !s.end_at) return false
    const start = new Date(String(s.start_at).replace(' ', 'T')).getTime()
    const end = new Date(String(s.end_at).replace(' ', 'T')).getTime()
    return now >= start && now <= end
  })

  const isValidTime = timeLeft && !isNaN(timeLeft.h)
  const hasItems = (activeSale?.items?.length ?? 0) > 0

  if (loading || !activeSale || !isCurrentlyActive || !isValidTime || !hasItems) return null

  const formatNum = (n: number) => String(n).padStart(2, '0')

  return (
    <section className="flashSaleSection">
      <div className="flashSaleContainer">
        <div className="flashSaleHeader">
          <div className="flashSaleHeaderTop">
            <div className="flashSaleTitleRow">
              <svg className="flashIcon" width="28" height="28" viewBox="0 0 24 24" fill="#FF2424">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
              <h2>FLASH SALE</h2>
            </div>
            <Link to="/flash-sale" className="viewAllBtn">
              Xem tất cả <span className="arrowIcon">›</span>
            </Link>
          </div>
          <div className="flashSaleHeaderBottom">
            <span className="countdownLabel">CHƯƠNG TRÌNH KẾT THÚC SAU : </span>
            <div className="flashSaleCountdown">
              <div className="timerBox">{formatNum(timeLeft!.h)}</div>
              <span className="timerSep">:</span>
              <div className="timerBox">{formatNum(timeLeft!.m)}</div>
              <span className="timerSep">:</span>
              <div className="timerBox">{formatNum(timeLeft!.s)}</div>
            </div>
          </div>
        </div>

        <div className="flashSaleGrid">
          {(activeSale.items || []).filter(i => i.product).slice(0, 5).map(item => {
            const productUrl = `/products/${item.product.slug}?flashSale=true${item.variant_id ? `&variant=${item.variant_id}` : ''}`;
            const displayImage = resolveImageUrl(item.variant?.image_url || item.product.main_image_url);
            const displayName = item.variant
              ? `${item.product.name} - ${item.variant.variant_name}`
              : item.product.name;
            const originalPrice = item.variant ? item.variant.price : (item.product.variants?.[0]?.price || 0);

            const discountPercent =
              originalPrice > item.flash_sale_price && originalPrice > 0
                ? Math.round((1 - item.flash_sale_price / originalPrice) * 100)
                : 0;

            const soldQuantity = item.sold_quantity || 0;
            const quantityLimit = item.quantity_limit || 100;
            let progressPercent = quantityLimit > 0
              ? (soldQuantity / quantityLimit * 100)
              : 0;
            progressPercent = Math.max(0, Math.min(100, progressPercent));
            const isHot = progressPercent > 80;

            return (
              <Link key={item.id} to={productUrl} className="flashSaleCard">
                <div className="flashSaleCardTop">
                  <div className="flashSaleThumb">
                    <img src={displayImage} alt={displayName} />
                  </div>
                  {discountPercent > 0 && (
                    <div className="flashSaleBadge">-{discountPercent}%</div>
                  )}
                </div>
                
                <div className="flashSaleInfo">
                  <h3 className="flashSaleProductName">{displayName}</h3>
                  <div className="flashSaleBottom">
                    <span className="flashSalePrice">{Number(item.flash_sale_price).toLocaleString()}đ</span>
                    
                    <div className={`flashSaleProgressWrapper ${isHot ? 'is-hot' : ''}`}>
                      <div className="flashSaleProgress">
                        <div className="progressFill" style={{ width: `${progressPercent === 0 ? 5 : progressPercent}%` }}></div>
                      </div>
                      <span className="progressText">
                        {soldQuantity === 0 ? 'Vừa mở bán' : `Đã bán ${soldQuantity}`}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  )
}
