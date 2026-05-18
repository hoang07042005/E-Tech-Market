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

export default function FlashSaleSection() {
  const [sale, setSale] = useState<FlashSale | null>(null)
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCurrentlyActive, setIsCurrentlyActive] = useState(false)

  useEffect(() => {
    const loadSale = async () => {
      try {
        const res = await apiFetch<FlashSale>('/api/flash-sale/current')
        setSale(res)
        
        // Initial check if active
        if (res) {
          const now = new Date().getTime()
          const start = new Date(res.start_at).getTime()
          const end = new Date(res.end_at).getTime()
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
    if (!sale) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      // Fix for some browsers not parsing 'YYYY-MM-DD HH:mm:ss'
      const startStr = sale.start_at.replace(' ', 'T')
      const endStr = sale.end_at.replace(' ', 'T')
      
      const start = new Date(startStr).getTime()
      const end = new Date(endStr).getTime()
      const diff = end - now

      if (isNaN(start) || isNaN(end) || now < start || diff <= 0) {
        setIsCurrentlyActive(false)
        if (diff <= 0) {
          clearInterval(timer)
          setTimeLeft(null)
          setSale(null)
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
  }, [sale])

  const isValidTime = timeLeft && !isNaN(timeLeft.h)
  const hasItems = (sale?.items?.length ?? 0) > 0

  if (loading || !sale || !isCurrentlyActive || !isValidTime || !hasItems) return null

  const formatNum = (n: number) => String(n).padStart(2, '0')

  return (
    <section className="flashSaleSection">
      <div className="flashSaleContainer">
        <div className="flashSaleHeader">
          <div className="flashSaleTitle">
            <h2>⚡ FLASH SALE</h2>
            <div className="flashSaleCountdown">
              <span>KẾT THÚC TRONG:</span>
              <div className="timerBox">{formatNum(timeLeft!.h)}</div>
              <span className="timerSep">:</span>
              <div className="timerBox">{formatNum(timeLeft!.m)}</div>
              <span className="timerSep">:</span>
              <div className="timerBox">{formatNum(timeLeft!.s)}</div>
            </div>
          </div>
          <Link to="/flash-sale" className="viewAllBtn">Xem tất cả ›</Link>
        </div>

        <div className="flashSaleGrid">
          {(sale.items || []).filter(i => i.product).slice(0, 5).map(item => {
            const productUrl = `/products/${item.product.slug}${item.variant_id ? `?variant=${item.variant_id}` : ''}`;
            const displayImage = item.variant?.image_url 
              ? `${API_BASE_URL}${item.variant.image_url}` 
              : (item.product.main_image_url ? `${API_BASE_URL}${item.product.main_image_url}` : '/placeholder.png');
            const displayName = item.variant 
              ? `${item.product.name} - ${item.variant.variant_name}` 
              : item.product.name;
            const originalPrice = item.variant ? item.variant.price : (item.product.variants?.[0]?.price || 0);
            
            const progressPercent = Math.min(100, (item.sold_quantity / (item.quantity_limit || 100)) * 100);
            const isHot = progressPercent > 80;
            const hasProgress = progressPercent > 40;

            return (
              <Link key={item.id} to={productUrl} className="flashSaleCard">
                <div className="flashSaleBadge">-{Math.round((1 - item.flash_sale_price / originalPrice) * 100)}%</div>
                <div className="flashSaleThumb">
                  <img src={displayImage} alt={displayName} />
                </div>
                <div className="flashSaleInfo">
                  <h3 className="flashSaleProductName">{displayName}</h3>
                  <div className="flashSalePricing">
                    <span className="flashSalePrice">{Number(item.flash_sale_price).toLocaleString()}đ</span>
                    <span className="flashSaleOldPrice">{Number(originalPrice).toLocaleString()}đ</span>
                  </div>
                  <div className={`flashSaleProgress ${isHot ? 'is-hot' : ''} ${hasProgress ? 'has-progress' : ''}`}>
                    <div className="progressBar">
                      <div className="progressFill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <span className="progressText">
                      {item.sold_quantity === 0 ? 'Vừa mở bán' : `Đã bán ${item.sold_quantity}`}
                    </span>
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
