import '@/styles/pages/HomePage.css'
import '@/styles/pages/ProductsPage.css'
import '@/styles/pages/VideoPage.css'
import heroImg from '@/assets/banner.jpg'
import cpuImg from '@/assets/unnamed.png'

import { useEffect, useState, useMemo, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProducts, type Product as ApiProduct, fetchCategories, type Category, type ProductReview } from '@/features/services/products.service'
import { API_BASE_URL, apiFetch } from '@/configs/api.config'

import { addToCompare, getCompareList, removeFromCompare } from '@/features/services/compare.service'
import FlashSaleSection from './FlashSaleSection'
import { fetchActiveBanners, type Banner } from '@/features/services/client/banners.client.service'
import { useWishlistQuery, useWishlistMutation } from '@/features/services/mutations'
import Skeleton from '@/components/Skeleton'
import { useAuthStore } from '@/features/store/useAuthStore'
import { toast } from '@/utils/toast';

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/400'
  const s = url.trim()
  if (!s) return 'https://via.placeholder.com/400'
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

// Extract YouTube thumbnail from video_url to avoid broken thumbnail_url stored in DB
const getVideoThumbnail = (videoUrl: string, fallbackUrl?: string | null): string => {
  const ytMatch = videoUrl?.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?\/)|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
  }
  return resolveImageUrl(fallbackUrl ?? null)
}


interface Video {
  id: number
  product_id?: number | null
  title?: string | null
  description?: string | null
  video_url: string
  thumbnail_url?: string | null
  sort_order?: number
  is_active: boolean
  product?: {
    id: number
    name: string
    slug: string
    main_image_url: string | null
    price: string | number
    short_description?: string | null
  } | null
}


function avatarInitial(name: string) {
  const t = (name || '').trim()
  return t ? t.charAt(0).toUpperCase() : 'U'
}

function ratingLabel(rating: number) {
  const r = Math.round(Math.max(1, Math.min(5, rating)))
  if (r >= 5) return 'Tuyệt vời'
  if (r === 4) return 'Rất tốt'
  if (r === 3) return 'Tốt'
  if (r === 2) return 'Tạm ổn'
  return 'Chưa hài lòng'
}

function timeAgoVi(iso: string) {
  if (!iso) return 'vừa xong'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'vừa xong'
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} ngày trước`
  return new Date(t).toLocaleDateString('vi-VN')
}

function formatPriceVnd(price: string) {
  const n = Number.parseFloat(price)
  if (!Number.isFinite(n)) return `${price} đ`
  return `${n.toLocaleString('vi-VN')} đ`
}

function FlashSaleBanner({ endAt, discountPercent }: { endAt: string, discountPercent: number }) {
  const [timeLeft, setTimeLeft] = useState({ hours: "00", minutes: "00", seconds: "00" });

  useEffect(() => {
    const compute = () => {
      const distance = new Date(endAt).getTime() - new Date().getTime();
      if (distance < 0) return { hours: "00", minutes: "00", seconds: "00" };
      const h = Math.floor(distance / (1000 * 60 * 60)).toString().padStart(2, "0");
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
      const s = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, "0");
      return { hours: h, minutes: m, seconds: s };
    };
    setTimeLeft(compute());
    const timer = setInterval(() => setTimeLeft(compute()), 1000);
    return () => clearInterval(timer);
  }, [endAt]);

  return (
    <div className="fsBannerWrapper">
      <div className="fsBannerBg" />
      <div className="fsLabelBlock">
        <div className="fsLabelMain">
           <svg width="18" height="24" viewBox="0 0 24 24" fill="#ffeb3b" stroke="#ffaa00" strokeWidth="1">
             <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
           </svg>
           <div className="fsLabelText">
             FLASH<br/>SALE
           </div>
        </div>
      </div>
      <div className="fsTimerBlock">
         <span className="fsTimerTitle">Kết thúc sau:</span>
         <div className="fsTimerDisplay">
           <span className="fsTimerDigit">{timeLeft.hours}</span>
           <span className="fsTimerColon">:</span>
           <span className="fsTimerDigit">{timeLeft.minutes}</span>
           <span className="fsTimerColon">:</span>
           <span className="fsTimerDigit">{timeLeft.seconds}</span>
         </div>
      </div>
      <div className="fsDiscountBlock">
        <div className="fsDiscountMain">
          -{discountPercent}%
        </div>
      </div>
    </div>
  );
}

// Ngưỡng tồn kho: <=5 là sắp hết hàng, max hiển thị là 100
const STOCK_MAX = 100;

function StockBar({ stock }: { stock: number }) {
  const pct = Math.max(0, Math.min(100, (stock / STOCK_MAX) * 100));
  const isOut = stock <= 0;
  const isLow = stock > 0 && stock <= 10;
  return (
    <div className="ppStockBar">
      <div className="ppStockBarMeta">
        <span className={`ppStockBarSold${isLow || isOut ? " ppStockBarSold--low" : ""}`} style={isOut ? { color: '#9e9e9e' } : {}}>
          {isOut 
              ? "❌ Hết hàng" 
              : isLow 
                  ? `⚠️ Sắp hết hàng (còn ${stock})` 
                  : `Còn ${stock} sản phẩm`}
        </span>
        <span className="ppStockBarPct">{pct.toFixed(0)}%</span>
      </div>
      <div className="ppStockBarTrack">
        <div
          className={`ppStockBarFill${isLow ? " ppStockBarFill--low" : isOut ? "" : " ppStockBarFill--normal"}`}
          style={{ width: `${pct}%`, background: isOut ? '#e0e0e0' : undefined }}
        />
      </div>
    </div>
  );
}


function ProductCard({
  product,
  liked,
  onToggleLike
}: {
  product: ApiProduct
  liked: boolean
  onToggleLike: (id: number) => void
}) {

  const brand = product.brand ? product.brand : 'ECOVACS'
  const excerpt = product.short_description || 'Thiết kế thông minh, lực hút mạnh mẽ, làm sạch hoàn hảo mọi ngóc ngách trong ngôi nhà của bạn...'

  const activeFlashSaleItem = useMemo(() => {
    return product.flash_sale_items?.find((item) => {
      const isSoldOut = item.quantity_limit !== null && item.quantity_limit > 0 && item.sold_quantity >= item.quantity_limit;
      return !!item.flash_sale && !isSoldOut;
    });
  }, [product.flash_sale_items]);
  const isFlashSale = !!activeFlashSaleItem;

  const { displayPrice, displayPriceMax, displayOldPrice, discountPercent, hasMultiplePrices, showDiscountBadge, variantId, imageUrl } = useMemo(() => {
    const activeVariants = (product.variants || []).filter(v => v.is_active)
    const isSingleVariant = activeVariants.length === 1
    let selectedVariant = null;

    if (activeVariants.length > 0) {
      const sorted = [...activeVariants].sort((a, b) => a.effective_price - b.effective_price)
      selectedVariant = sorted[0];
      const highest = sorted[sorted.length - 1]
      let hasMultiplePrices = selectedVariant.effective_price !== highest.effective_price
      let showDiscountBadge = isSingleVariant
      let originalPrice = Number.parseFloat(selectedVariant.price)
      let finalPrice = selectedVariant.effective_price
      let variantId = selectedVariant.id

      if (isFlashSale && activeFlashSaleItem) {
        if (activeFlashSaleItem.variant_id) {
          const flashVariant = activeVariants.find((v) => v.id === activeFlashSaleItem.variant_id);
          if (flashVariant) {
            selectedVariant = flashVariant;
            originalPrice = Number(flashVariant.price);
            variantId = flashVariant.id; 
          }
        }
        finalPrice = Number(activeFlashSaleItem.flash_sale_price);
        hasMultiplePrices = false;
        showDiscountBadge = true;
      }

      const hasDiscount = finalPrice < originalPrice && showDiscountBadge
      const vImgUrl = selectedVariant.image_url ? resolveImageUrl(selectedVariant.image_url) : resolveImageUrl(product.main_image_url);

      return {
        displayPrice: finalPrice,
        displayPriceMax: hasMultiplePrices ? highest.effective_price : null,
        displayOldPrice: hasDiscount ? originalPrice : null,
        hasMultiplePrices,
        showDiscountBadge,
        discountPercent: hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0,
        variantId,
        imageUrl: vImgUrl
      }
    }
    return {
      displayPrice: 0,
      displayPriceMax: null,
      displayOldPrice: null,
      hasMultiplePrices: false,
      showDiscountBadge: false,
      discountPercent: 0,
      variantId: null,
      imageUrl: resolveImageUrl(product.main_image_url)
    }
  }, [product.variants, isFlashSale, activeFlashSaleItem, product.main_image_url])

  const [isInCompare, setIsInCompare] = useState(() => getCompareList().some(p => p.id === product.id))

  useEffect(() => {
    const handleCompareChange = () => setIsInCompare(getCompareList().some(p => p.id === product.id))
    window.addEventListener('compare-change', handleCompareChange)
    return () => window.removeEventListener('compare-change', handleCompareChange)
  }, [product.id])

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isInCompare) {
      removeFromCompare(product.id)
    } else {
      const res = addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: imageUrl,
        price: displayPrice,
      })
      if (!res.success && res.message) {
        toast.error(res.message)
      }
    }
  }

  const { avgRating, ratingCount } = useMemo(() => {
    const count = typeof product.reviews_count === 'number' ? product.reviews_count : 0
    const avgRaw = product.avg_rating
    const avgFromApi =
      typeof avgRaw === 'number'
        ? avgRaw
        : typeof avgRaw === 'string'
          ? Number.parseFloat(avgRaw)
          : NaN
    if (Number.isFinite(avgFromApi) && count >= 0) {
      return {
        avgRating: Math.min(5, Math.max(0, avgFromApi)),
        ratingCount: count
      }
    }
    return { avgRating: 0, ratingCount: 0 }
  }, [product.avg_rating, product.reviews_count])

  const starArr = useMemo(() => {
    const full = Math.floor(avgRating)
    const half = avgRating - full >= 0.5
    const arr: Array<'full' | 'half' | 'empty'> = []
    for (let i = 0; i < 5; i++) {
      if (i < full) arr.push('full')
      else if (i === full && half) arr.push('half')
      else arr.push('empty')
    }
    return arr
  }, [avgRating])

  return (
    <div className="hpProductCard">
      <div className="hpProductImageWrap">
        <Link to={`/products/${product.slug}${variantId ? `?variant=${variantId}` : ""}`} className="hpProductImageLink">
          <img src={imageUrl} alt={product.name} className="hpProductImage" />
          {isFlashSale && activeFlashSaleItem?.flash_sale && (
            <FlashSaleBanner endAt={activeFlashSaleItem.flash_sale.end_at} discountPercent={discountPercent} />
          )}
        </Link>
        <div className="hpProductActions">
          <button
            type="button"
            className={`hpProductActionBtn ${liked ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              onToggleLike(product.id)
            }}
          >
            <HeartIcon filled={liked} />
          </button>
          <button
            type="button"
            className={`hpProductActionBtn ${isInCompare ? 'active' : ''}`}
            onClick={toggleCompare}
            style={{ color: isInCompare ? '#f97316' : undefined, borderColor: isInCompare ? '#f97316' : undefined }}
          >
            <ExpandIcon />
          </button>
        </div>
        {!isFlashSale && discountPercent > 0 ? (
          <span className="hpBadge hpBadgeSale">
            -{discountPercent}%
          </span>
        ) : !isFlashSale && product.is_new ? (
          <span className="hpBadge hpBadgeNew">MỚI</span>
        ) : null}
      </div>
      <div className="hpProductInfo">
        <div className="hpProductMetaRow">
          <span className="hpProductBrand">{brand}</span>
          <div className="hpProductStars">
            {starArr.map((type, idx) => (
              <span key={idx} className={`star ${type === 'full' || type === 'half' ? 'filled' : ''}`}>
                ★
              </span>
            ))}
            <span className="hpCardRatingText">
              {avgRating > 0 ? avgRating.toFixed(1) : '(0)'}
              {ratingCount > 0 ? ` (${ratingCount})` : ''}
            </span>
          </div>
        </div>

        <Link to={`/products/${product.slug}${variantId ? `?variant=${variantId}` : ""}`} className="hpProductNameLink">
          <h3 className="hpProductName">{product.name}</h3>
        </Link>

        <div className="ppCardPriceRow">
          <span className="ppCardPrice">
            {showDiscountBadge
              ? `${displayPrice.toLocaleString('vi-VN')} đ`
              : hasMultiplePrices
                ? `${displayPrice.toLocaleString('vi-VN')} đ - ${displayPriceMax!.toLocaleString('vi-VN')} đ`
                : `${displayPrice.toLocaleString('vi-VN')} đ`}
          </span>
          {displayOldPrice && displayOldPrice > displayPrice && showDiscountBadge && (
            <span className="ppCardOldPrice">{displayOldPrice.toLocaleString('vi-VN')} đ</span>
          )}
        </div>

        {isFlashSale && activeFlashSaleItem && activeFlashSaleItem.quantity_limit && (
          <div className="ppStockBar">
            <div className="ppStockBarMeta">
              <span className="ppStockBarSold">Đã bán {activeFlashSaleItem.sold_quantity}/{activeFlashSaleItem.quantity_limit}</span>
              <span className="ppStockBarPct">
                {Math.round((activeFlashSaleItem.sold_quantity / activeFlashSaleItem.quantity_limit) * 100)}%
              </span>
            </div>
            <div className="ppStockBarTrack">
              <div
                className="ppStockBarFill ppStockBarFill--flash"
                style={{ width: `${Math.min(100, (activeFlashSaleItem.sold_quantity / activeFlashSaleItem.quantity_limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {!isFlashSale && (() => {
          const totalStock = (product.variants && product.variants.length > 0)
            ? product.variants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0)
            : (product.stock_quantity ?? null);
          return totalStock != null ? <StockBar stock={totalStock} /> : null;
        })()}

        <p className="hpProductExcerpt">{excerpt}</p>

        {/* <Link
          to={`/products/${product.slug}`}
          className="hpAddToCartFullBtn"
        >
          XEM CHI TIẾT →        
        </Link> */}
      </div>
    </div>
  )
}

function Stars({ value }: { value: number }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  const arr: ('full' | 'half' | 'empty')[] = []
  for (let i = 0; i < 5; i++) {
    if (i < full) arr.push('full')
    else if (i === full && half) arr.push('half')
    else arr.push('empty')
  }
  return (
    <div className="hpStars">
      {arr.map((t, idx) => (
        <span key={idx} className={`hpStar hpStar--${t}`}>★</span>
      ))}
    </div>
  )
}
type CouponPublic = {
  id: number
  code: string
  coupon_type: 'fixed' | 'percentage'
  value: number
  min_order_amount: number | null
  start_at: string | null
  end_at: string | null
  max_uses: number | null
  max_uses_per_user: number | null
  usages_count: number
  user_usage_count: number
  is_saved: boolean
}

type BlogPost = {
  id: number
  title: string
  slug: string
  thumbnail_url: string | null
  excerpt: string | null
  published_at: string | null
  category?: { name: string } | null
  reading_time?: number
}

function FeaturedProductSkeleton() {
  return (
    <div className="hpProductCard">
      <div className="hpProductImageWrap">
        <Skeleton height="280px" borderRadius="12px" />
      </div>
      <div className="hpProductInfo">
        <Skeleton width="80%" height="20px" style={{ marginBottom: '12px' }} />
        <div className="hpProductPriceRow">
          <Skeleton width="40%" height="24px" />
          <Skeleton width="32px" height="32px" borderRadius="50%" />
        </div>
      </div>
    </div>
  )
}

function CouponSkeleton() {
  return (
    <div className="hpCouponCard">
      <div className="hpCouponIconWrap">
        <Skeleton width="32px" height="32px" borderRadius="50%" />
      </div>
      <div className="hpCouponInfo">
        <Skeleton width="60%" height="18px" style={{ marginBottom: '8px' }} />
        <Skeleton width="40%" height="14px" />
      </div>
      <Skeleton width="80px" height="36px" borderRadius="20px" />
    </div>
  )
}

function CategorySkeleton() {
  return (
    <div className="hpCuratedCard">
      <Skeleton height="100%" borderRadius="16px" />
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [featuredProducts, setFeaturedProducts] = useState<ApiProduct[]>([])
  const [activeCoupons, setActiveCoupons] = useState<CouponPublic[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [globalReviews, setGlobalReviews] = useState<ProductReview[]>([])
  const [latestNews, setLatestNews] = useState<BlogPost[]>([])
  const [homeVideos, setHomeVideos] = useState<Video[]>([])
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  // Removed setTabActive
  // Removed phoneProducts
  // Removed laptopProducts
  // Removed pcProducts
  // Removed monitorProducts
  // Removed printerProducts
  const [tabActive, setTabActive] = useState<'phone' | 'laptop' | 'pc' | 'monitor' | 'printer'>('phone')
  const [phoneProducts, setPhoneProducts] = useState<ApiProduct[]>([])
  const [laptopProducts, setLaptopProducts] = useState<ApiProduct[]>([])
  const [pcProducts, setPcProducts] = useState<ApiProduct[]>([])
  const [monitorProducts, setMonitorProducts] = useState<ApiProduct[]>([])
  const [printerProducts, setPrinterProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [isLightBg, setIsLightBg] = useState(false)
  const [selectedReviewMediaList, setSelectedReviewMediaList] = useState<{ url: string; type: string }[]>([])
  const [selectedReviewMediaIndex, setSelectedReviewMediaIndex] = useState(0)

  useEffect(() => {
    if (!banners.length) return
    const banner = banners[currentBannerIndex]
    if (!banner || !banner.image_url) return
    const url = resolveImageUrl(banner.image_url)
    
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        
        // Analyze the left 50% of the image (where text is placed)
        const w = Math.floor(img.width / 2) || 1
        const h = img.height || 1
        const imgData = ctx.getImageData(0, 0, w, h)
        const data = imgData.data
        let colorSum = 0
        
        for (let x = 0, len = data.length; x < len; x += 4) {
          const r = data[x]
          const g = data[x + 1]
          const b = data[x + 2]
          // Relative luminance formula
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
          colorSum += luminance
        }
        
        const avgLuminance = colorSum / (w * h)
        // If average luminance is > 160 (out of 255), we consider it a light background
        setIsLightBg(avgLuminance > 160)
      } catch (e) {
        // Fallback in case of CORS errors
        setIsLightBg(false)
      }
    }
    img.src = url
  }, [currentBannerIndex, banners])

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length)
    }, 300000)
    return () => clearInterval(interval)
  }, [banners.length])
  // 🔒 Check auth via user in localStorage (not token - token is in httpOnly cookie)
  const userStr = useAuthStore((state) => state.userStr)
  const hasAuth = !!userStr

  const { data: wishlistData } = useWishlistQuery(hasAuth)
  const wishSet = useMemo(() => new Set(wishlistData?.map((i) => i.product_id) || []), [wishlistData])
  const wishlistMutation = useWishlistMutation()

  async function onToggleLike(productId: number) {
    if (!hasAuth) {
      navigate('/login')
      return
    }
    wishlistMutation.mutate(productId)
  }

  useEffect(() => {
    let active = true
    Promise.all([
      fetchProducts({ limit: 10, is_featured: 1 }),
      // 🔒 Token is sent via httpOnly cookie automatically
      apiFetch<CouponPublic[]>('/api/coupons'),
      fetchCategories('product'),
      apiFetch<ProductReview[]>('/api/reviews?min_rating=5&limit=6'),
      apiFetch<{ data: BlogPost[] }>('/api/blog/posts?per_page=5'),
      fetchProducts({ limit: 16, category_id: 2, is_featured: 1 }),
      fetchActiveBanners(),
      apiFetch<Video[]>('/api/videos')
    ])
      .then(([prodRes, couponRes, catRes, reviewRes, newsRes, phoneRes, bannerRes, videoRes]) => {
        if (active) {
          setBanners(Array.isArray(bannerRes) ? bannerRes : [])
          setFeaturedProducts(prodRes.data)
          if (Array.isArray(couponRes)) setActiveCoupons(couponRes)
          if (Array.isArray(videoRes)) setHomeVideos(videoRes.slice(0, 4))
          if (Array.isArray(catRes)) {
            const mainCats = catRes.filter(c => c.parent_id === null && c.is_active && c.image).slice(0, 5)
            setCategories(mainCats)
          }
          if (Array.isArray(reviewRes)) {
            setGlobalReviews(reviewRes)
          }
          if (newsRes && Array.isArray(newsRes.data)) {
            setLatestNews(newsRes.data)
          }
          if (phoneRes && Array.isArray(phoneRes.data)) {
            setPhoneProducts(phoneRes.data)
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (tabActive === 'laptop' && laptopProducts.length === 0) {
      fetchProducts({ limit: 16, category_id: 3, is_featured: 1 })
        .then((res) => {
          if (res && Array.isArray(res.data)) setLaptopProducts(res.data)
        })
        .catch(console.error)
    } else if (tabActive === 'pc' && pcProducts.length === 0) {
      fetchProducts({ limit: 16, category_id: 51, is_featured: 1 })
        .then((res) => {
          if (res && Array.isArray(res.data)) setPcProducts(res.data)
        })
        .catch(console.error)
    } else if (tabActive === 'monitor' && monitorProducts.length === 0) {
      fetchProducts({ limit: 16, category_id: 53, is_featured: 1 })
        .then((res) => {
          if (res && Array.isArray(res.data)) setMonitorProducts(res.data)
        })
        .catch(console.error)
    } else if (tabActive === 'printer' && printerProducts.length === 0) {
      fetchProducts({ limit: 16, category_id: 52, is_featured: 1 })
        .then((res) => {
          if (res && Array.isArray(res.data)) setPrinterProducts(res.data)
        })
        .catch(console.error)
    }
  }, [tabActive, laptopProducts.length, pcProducts.length, monitorProducts.length, printerProducts.length])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active')
          }
        })
      },
      { threshold: 0.12 }
    )

    const revealElements = document.querySelectorAll('.reveal, .reveal-scale')
    revealElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [loading, tabActive, featuredProducts, latestNews])

  const saveCoupon = async (code: string) => {
    if (!hasAuth) {
      toast.error('Vui lòng đăng nhập để lưu mã giảm giá!')
      navigate('/login')
      return
    }

    try {
      // 🔒 Token is sent via httpOnly cookie automatically
      const res = await apiFetch<{ message: string }>('/api/me/coupons/save', {
        method: 'POST',
        body: JSON.stringify({ code })
      })
      toast.error(res.message)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra khi lưu mã.')
    }
  }

  const onNewsletterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = newsletterEmail.trim()
    if (!email || newsletterLoading) return
    setNewsletterLoading(true)
    try {
      await apiFetch('/api/newsletter/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ email, source: 'home' }),
      })
      setNewsletterEmail('')
      toast.success('Đăng ký nhận tin tức thành công!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký.')
    } finally {
      setNewsletterLoading(false)
    }
  }

  const reviewMediaModal = selectedReviewMediaList.length > 0 ? createPortal(
    <div className="hpReviewMediaModalOverlay" onClick={() => setSelectedReviewMediaList([])}>
      <div
        className="hpReviewMediaModal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="hpReviewMediaModalClose"
          onClick={() => setSelectedReviewMediaList([])}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="hpReviewMediaModalContent">
          {selectedReviewMediaList[selectedReviewMediaIndex]?.type === 'image' ? (
            <img
              src={resolveImageUrl(selectedReviewMediaList[selectedReviewMediaIndex]?.url)}
              alt="Ảnh đánh giá"
            />
          ) : (
            <video
              src={resolveImageUrl(selectedReviewMediaList[selectedReviewMediaIndex]?.url)}
              controls
              autoPlay
              className="hpReviewMediaModalVideo"
            />
          )}
        </div>
        {selectedReviewMediaList.length > 1 && (
          <div className="hpReviewMediaModalNav">
            <button
              type="button"
              className="hpReviewMediaModalNavBtn"
              onClick={() => setSelectedReviewMediaIndex((current) => Math.max(0, current - 1))}
              disabled={selectedReviewMediaIndex === 0}
            >
              ‹
            </button>
            <span className="hpReviewMediaModalNavCounter">
              {selectedReviewMediaIndex + 1} / {selectedReviewMediaList.length}
            </span>
            <button
              type="button"
              className="hpReviewMediaModalNavBtn"
              onClick={() => setSelectedReviewMediaIndex((current) => Math.min(selectedReviewMediaList.length - 1, current + 1))}
              disabled={selectedReviewMediaIndex === selectedReviewMediaList.length - 1}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="hpPage">
      <main className="hpMain">
        {banners.length > 0 ? (
          <section className={`hpHeroNew ${isLightBg ? 'theme-light' : ''}`}>
            <div className="hpHeroImageContainer">
              {banners.map((b, idx) => (
                <img 
                  key={b.id} 
                  src={resolveImageUrl(b.image_url)} 
                  alt={b.title || ''} 
                  className="hpHeroImg"
                  style={{ opacity: idx === currentBannerIndex ? 1 : 0, transition: 'opacity 0.8s ease-in-out', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = heroImg;
                  }}
                />
              ))}
              <div className="hpHeroOverlay"></div>
            </div>

            <div className="hpHeroContent">
              {banners.length > 1 && (
                <>
                  <button className="hpBannerNavBtn hpBannerPrev" onClick={() => setCurrentBannerIndex(i => i === 0 ? banners.length - 1 : i - 1)}>
                    ‹
                  </button>
                  <button className="hpBannerNavBtn hpBannerNext" onClick={() => setCurrentBannerIndex(i => i === banners.length - 1 ? 0 : i + 1)}>
                    ›
                  </button>
                </>
              )}

              <div className="hpHeroTextWrapper">
                <div className="hpHeroBadge">
                  <span className="hpHeroBadgeText">E-TECH</span>
                  <span className="hpHeroBadgeHighlight">MARKET</span>
                </div>
                
                <h1 className="hpHeroTitleNew">
                  {(() => {
                    const title = banners[currentBannerIndex]?.title || 'CHẠM ĐẾN TƯƠNG LAI\nTHIẾT BỊ ĐỈNH CAO';
                    let parts = title.split('\n');
                    
                    if (parts.length === 1 && title.includes(' ')) {
                       // If no newline but has spaces, split into two roughly equal halves
                       const words = title.split(' ');
                       const mid = Math.floor(words.length / 2);
                       parts = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
                    }
                    
                    if (parts.length > 1) {
                      return (
                        <>
                          <span className="text-white">{parts[0]}</span><br />
                          <span className="text-orange">{parts.slice(1).join('\n')}</span>
                        </>
                      );
                    }
                    return <span className="text-white">{title}</span>;
                  })()}
                </h1>
                
                <p className="hpHeroDescNew">
                  {banners[currentBannerIndex]?.description || 'Khám phá thế hệ công nghệ mới với những thiết bị chính hãng, hiệu năng vượt trội và thiết kế hiện đại - đáp ứng mọi nhu cầu học tập, làm việc và giải trí.'}
                </p>

                <div className="hpHeroActions">
                  <button 
                    type="button" 
                    className="hpBtnShopNow" 
                    onClick={() => navigate(banners[currentBannerIndex]?.link_url || '/products')}
                  >
                    KHÁM PHÁ NGAY &rarr;
                  </button>
                  <button 
                    type="button" 
                    className="hpBtnHotDeals" 
                    onClick={() => navigate('/flash-sale')}
                  >
                    XEM ƯU ĐÃI HOT 🎁
                  </button>
                </div>
              </div>
            </div>

            <div className="hpHeroFeatures">
              <div className="hpHeroMarqueeTrack">
                {[
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>,
                    text: "Đảm bảo thiết bị chính hãng, nguyên seal, đầy đủ chứng từ."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"></path><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><path d="M15 18H9"></path><circle cx="17" cy="18" r="2"></circle></svg>,
                    text: "Hỗ trợ giao hàng nhanh chóng và an toàn tận tay bạn."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path><path d="M12 18v3"></path></svg>,
                    text: "Chuyên viên luôn sẵn sàng tư vấn và giải đáp mọi thắc mắc."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><path d="m9 12 2 2 4-4"></path></svg>,
                    text: "Xử lý bảo hành chuyên nghiệp, đúng tiêu chuẩn nhà sản xuất."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>,
                    text: "Thủ tục linh hoạt, hỗ trợ 1 đổi 1 khi phát sinh lỗi. Đổi trả dễ dàng"
                  }
                ].map((f, idx) => (
                  <div key={idx} className="hpFeatureItem">
                    <div className="hpFeatureIcon">{f.icon}</div>
                    <div className="hpFeatureText">{f.text}</div>
                  </div>
                ))}
                
                {/* Duplicated items for seamless marquee on mobile */}
                {[
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>,
                    text: "Đảm bảo thiết bị chính hãng, nguyên seal, đầy đủ chứng từ."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"></path><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><path d="M15 18H9"></path><circle cx="17" cy="18" r="2"></circle></svg>,
                    text: "Hỗ trợ giao hàng nhanh chóng và an toàn tận tay bạn."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path><path d="M12 18v3"></path></svg>,
                    text: "Chuyên viên luôn sẵn sàng tư vấn và giải đáp mọi thắc mắc."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><path d="m9 12 2 2 4-4"></path></svg>,
                    text: "Xử lý bảo hành chuyên nghiệp, đúng tiêu chuẩn nhà sản xuất."
                  },
                  {
                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>,
                    text: "Thủ tục linh hoạt, hỗ trợ 1 đổi 1 khi phát sinh lỗi. Đổi trả dễ dàng"
                  }
                ].map((f, idx) => (
                  <div key={`dup-${idx}`} className="hpFeatureItem hpFeatureItemDup">
                    <div className="hpFeatureIcon">{f.icon}</div>
                    <div className="hpFeatureText">{f.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {banners.length > 1 && (
              <div className="hpBannerDots">
                {banners.map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`hpBannerDot ${idx === currentBannerIndex ? 'active' : ''}`}
                    onClick={() => setCurrentBannerIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="hpHeroNew">
            <div className="hpHeroImageContainer">
              <img src={heroImg} alt="Sản phẩm tiêu biểu" className="hpHeroImg" />
              <div className="hpHeroOverlay"></div>
            </div>

            <div className="hpHeroContent">
              <div className="hpHeroTextWrapper">
                <div className="hpHeroBadge">
                  <span className="hpHeroBadgeText">CÔNG NGHỆ</span>
                  <span className="hpHeroBadgeHighlight">DẪN LỐI</span>
                </div>
                
                <h1 className="hpHeroTitleNew">
                  <span className="text-white">CHẠM ĐẾN TƯƠNG LAI</span><br />
                  <span className="text-orange">THIẾT BỊ ĐỈNH CAO</span>
                </h1>
                
                <p className="hpHeroDescNew">
                  Khám phá thế hệ công nghệ mới với những thiết bị chính hãng, hiệu năng vượt trội và thiết kế hiện đại - đáp ứng mọi nhu cầu học tập, làm việc và giải trí.
                </p>

                <div className="hpHeroActions">
                  <button type="button" className="hpBtnShopNow" onClick={() => navigate('/products')}>
                    KHÁM PHÁ NGAY &rarr;
                  </button>
                  <button type="button" className="hpBtnHotDeals" onClick={() => navigate('/flash-sale')}>
                    XEM ƯU ĐÃI HOT 🎁
                  </button>
                </div>
              </div>
            </div>

            <div className="hpHeroFeatures">
              <div className="hpFeatureItem">
                <div className="hpFeatureIcon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <div className="hpFeatureText">Sản phẩm<br/>chính hãng 100%</div>
              </div>
              <div className="hpFeatureItem">
                <div className="hpFeatureIcon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"></path><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"></path><circle cx="7" cy="18" r="2"></circle><path d="M15 18H9"></path><circle cx="17" cy="18" r="2"></circle></svg>
                </div>
                <div className="hpFeatureText">Giao hàng<br/>toàn quốc</div>
              </div>
              <div className="hpFeatureItem">
                <div className="hpFeatureIcon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path><path d="M12 18v3"></path></svg>
                </div>
                <div className="hpFeatureText">Hỗ trợ<br/>24/7</div>
              </div>
              <div className="hpFeatureItem">
                <div className="hpFeatureIcon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <div className="hpFeatureText">Bảo hành<br/>uy tín</div>
              </div>
              <div className="hpFeatureItem">
                <div className="hpFeatureIcon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </div>
                <div className="hpFeatureText">Đổi trả<br/>dễ dàng</div>
              </div>
            </div>
          </section>
        )}

        {(loading || activeCoupons.length > 0) && (() => {
          // Nếu đã đăng nhập: lọc ẩn các mã user đã hết lượt dùng (max_uses_per_user)
          const visibleCoupons = hasAuth
            ? activeCoupons.filter(c => {
                if (c.max_uses_per_user && c.user_usage_count >= c.max_uses_per_user) return false
                return true
              })
            : activeCoupons

          if (!loading && visibleCoupons.length === 0) return null

          return (
            <section className="hpCouponSection reveal">
              <div className="hpContainer">
                <div className="hpCouponHeader">
                  <div>
                    <h2 className="hpCouponSectionTitle">Ưu đãi dành cho bạn</h2>
                    <p className="hpCouponSectionSub">CHẠM VÀO MÃ ĐỂ SAO CHÉP NHANH</p>
                  </div>
                  <div className="hpCouponBadge">
                    {visibleCoupons.length} ưu đãi
                  </div>
                </div>
                <div className="hpCouponGridWrapper">
                  <div className="hpCouponGrid">
                    {loading
                      ? Array.from({ length: 4 }).map((_, i) => <CouponSkeleton key={i} />)
                      : [...visibleCoupons, ...visibleCoupons].map((c, index) => {
                          // Tính lượt còn lại theo user (nếu có giới hạn per-user)
                          const perUserLimit = c.max_uses_per_user
                          const userUsed = c.user_usage_count ?? 0
                          const userRemaining = perUserLimit ? perUserLimit - userUsed : null

                          // Tính lượt còn lại tổng (nếu có giới hạn max_uses)
                          const totalLimit = c.max_uses
                          const totalUsed = c.usages_count ?? 0
                          const totalRemaining = totalLimit ? totalLimit - totalUsed : null

                          // Ưu tiên hiển thị: per-user nếu có, sau đó total
                          const showRemaining = userRemaining !== null ? userRemaining : totalRemaining
                          const showLimit = userRemaining !== null ? perUserLimit! : totalLimit

                          return (
                            <div key={`${c.id}-${index}`} className="hpCouponCardNew">
                              <div className="hpCouponCardNewLeft">
                                <span className="hpCouponCardNewLeftLabel">Giảm</span>
                                <span className="hpCouponCardNewLeftValue">
                                  {c.coupon_type === 'percentage' ? (
                                    <>
                                      {c.value}<span className="percent">%</span>
                                    </>
                                  ) : (
                                    <>
                                      {Math.floor(c.value / 1000)}<span className="percent">K</span>
                                    </>
                                  )}
                                </span>
                                <div className="hpCouponCardNewLeftMax">
                                  {c.coupon_type === 'percentage' ? 'Phiếu ưu đãi' : 'Giảm trực tiếp'}
                                </div>
                              </div>

                              <div className="hpCouponCardNewRightWrapper">
                                <div className="hpCouponCardNewRight">
                                <div className="hpCouponCardNewRightTop">
                                  <div className="hpCouponCardNewIconBox">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M21 10V6C21 4.9 20.1 4 19 4H5C3.9 4 3 4.9 3 6V10C4.1 10 5 10.9 5 12C5 13.1 4.1 14 3 14V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V14C19.9 14 19 13.1 19 12C19 10.9 19.9 10 21 10Z"
                                            stroke="#FF6B00"
                                            stroke-width="2"
                                            stroke-linejoin="round"/>

                                      <path d="M10 10L8.5 12L10 14"
                                                stroke="#FF6B00"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"/>

                                      <path d="M14 10L15.5 12L14 14"
                                            stroke="#FF6B00"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"/>

                                      <path d="M12.8 9L11.2 15"
                                            stroke="#FF6B00"
                                            stroke-width="2"
                                            stroke-linecap="round"/>
                                    </svg>
                                  </div>
                                  <div className="hpCouponCardNewInfo">
                                    <div className="hpCouponCardNewTitle">
                                      {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatPriceVnd(c.value.toString())}`}
                                    </div>
                                    <div className="hpCouponCardNewMin">
                                      {c.min_order_amount ? `Đơn từ ${formatPriceVnd(c.min_order_amount.toString())}` : 'Áp dụng mọi đơn hàng'}
                                    </div>
                                  </div>
                                  <button
                                    className={`hpCouponCardNewSaveBtn${c.is_saved ? ' saved' : ''}`}
                                    onClick={() => !c.is_saved && saveCoupon(c.code)}
                                   disabled={c.is_saved}
                                  >
                                    {c.is_saved ? 'Đã lưu' : 'Lưu'}
                                  </button>
                                </div>

                                {hasAuth && showRemaining !== null && showLimit !== null && (
                                  <>
                                    <div className="hpCouponCardNewDivider" />
                                    <div className="hpCouponCardNewUsageRow">
                                      <div className="hpCouponCardNewUsageText">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <span>Còn <strong style={{color: '#ff6b2b'}}>{showRemaining}/{showLimit}</strong> lượt</span>
                                      </div>
                                      <div className="hpCouponCardNewUsageBar">
                                        <div
                                          className="hpCouponCardNewUsageFill"
                                          style={{ width: `${Math.max(0, Math.min(100, ((showLimit - showRemaining) / showLimit) * 100))}%` }}
                                        />
                                      </div>
                                    </div>
                                  </>
                                )}

                                <div className="hpCouponCardNewCodeBox" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Đã sao chép mã!'); }}>
                                  <div className="hpCouponCardNewCodeLeft">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                    <span>{c.code}</span>
                                  </div>
                                  <div className="hpCouponCardNewCopy">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                  </div>
                                </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                  </div>
                </div>
              </div>
            </section>
          )
        })()}

        <div className="reveal">
          <FlashSaleSection />
        </div>

        <section className="hpCuratedSection reveal">
          <div className="hpContainer">
            <div className="hpCuratedHeader">
              <div className="hpCuratedTitleBox">
                <span className="hpCuratedKicker">KHÁM PHÁ HỆ SINH THÁI</span>
                <h2 className="hpCuratedTitle">Tuyển chọn đẳng cấp</h2>
              </div>
              <Link to="/products" className="hpCuratedLink">
                XEM TẤT CẢ BỘ SƯU TẬP
              </Link>
            </div>

            <div className="hpCuratedGrid">
              {loading ? (
                <>
                  <div className="hpCuratedCard hpCuratedCard--1"><CategorySkeleton /></div>
                  <div className="hpCuratedCard hpCuratedCard--2"><CategorySkeleton /></div>
                  <div className="hpCuratedCard hpCuratedCard--3"><CategorySkeleton /></div>
                  <div className="hpCuratedCard hpCuratedCard--4"><CategorySkeleton /></div>
                  <div className="hpCuratedCard hpCuratedCard--5"><CategorySkeleton /></div>
                </>
              ) : categories.length > 0 ? (
                categories.slice(0, 5).map((cat, index) => {
                  return (
                    <Link
                      key={cat.id}
                      to={`/products?category=${cat.slug}`}
                      className={`hpCuratedCard hpCuratedCard--${index + 1}`}
                    >
                      <img
                        src={resolveImageUrl(cat.image)}
                        alt={cat.name}
                        className="hpCuratedImg"
                      />
                      <div className="hpCuratedOverlay">
                        <h3 className="hpCuratedName">{cat.name}</h3>
                        {(index === 0 || index === 4) && <p className="hpCuratedDesc">Khám phá các sản phẩm nổi bật</p>}
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="hpStatusText">Chưa có danh mục nào.</div>
              )}
            </div>
          </div>
        </section>

        

        <section className="hpFeaturedSection reveal">
          <div className="hpContainer">
            <div className="hpSectionHeaderNew">
              <h1 className="hpSectionTitleNew text-center mb-5">Hàng mới &amp; Nổi bật</h1>

            </div>
            <div className="hpProductGrid">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => <FeaturedProductSkeleton key={i} />)
              ) : featuredProducts.length === 0 ? (
                <div className="hpStatusText">Chưa có sản phẩm nổi bật.</div>
              ) : (
                featuredProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    liked={wishSet.has(prod.id)}
                    onToggleLike={onToggleLike}
                  />
                ))
              )}
            </div>
          </div>
        </section>


        <section className="hpFutureSection reveal">
          <div className="hpContainer">
            <div className="hpFutureGrid">
              <div className="hpFutureContent">
                <span className="hpFutureKicker">ĐỘ CHÍNH XÁC KỸ THUẬT</span>
                <h2 className="hpFutureTitle">
                  Công nghệ tương lai<br />được tạo nên một cách tinh xảo
                </h2>
                <p className="hpFutureDesc">
                  Chúng tôi không chỉ bán thiết bị điện tử — chúng tôi chọn lọc những công cụ thúc đẩy sự tiến bộ.
                  Quy trình tuyển chọn dựa trên kiểm định kỹ thuật khắt khe để mỗi sản phẩm đạt tiêu chuẩn
                  “Chất lượng không thỏa hiệp”.
                </p>

                <div className="hpFutureStats">
                  <div className="hpStatItem">
                    <div className="hpStatValue">0.01mm</div>
                    <div className="hpStatLabel">ĐỘ DUNG SAI CHẾ TẠO</div>
                  </div>
                  <div className="hpStatItem">
                    <div className="hpStatValue">99.9%</div>
                    <div className="hpStatLabel">ĐỘ TRONG CỦA TÍN HIỆU</div>
                  </div>
                </div>
              </div>

              <div className="hpFutureImage">
                <div className="hpFutureImageInner">
                  <img src={cpuImg} alt="Chế tạo chính xác" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section className="hpTabbedSection reveal">
          <div className="hpContainer">
            <div className="hpTabHeader">
              <div className="hpTabButtons">
                <button
                  className={`hpTabBtn ${tabActive === 'phone' ? 'active' : ''}`}
                  onClick={() => setTabActive('phone')}
                >
                  ĐIỆN THOẠI
                </button>
                <button
                  className={`hpTabBtn ${tabActive === 'laptop' ? 'active' : ''}`}
                  onClick={() => setTabActive('laptop')}
                >
                  LAPTOP
                </button>
                <button
                  className={`hpTabBtn ${tabActive === 'pc' ? 'active' : ''}`}
                  onClick={() => setTabActive('pc')}
                >
                  PC
                </button>
                <button
                  className={`hpTabBtn ${tabActive === 'monitor' ? 'active' : ''}`}
                  onClick={() => setTabActive('monitor')}
                >
                  MÀN HÌNH
                </button>
                <button
                  className={`hpTabBtn ${tabActive === 'printer' ? 'active' : ''}`}
                  onClick={() => setTabActive('printer')}
                >
                  MÁY IN
                </button>
              </div>
              <Link to={`/products?category_id=${tabActive === 'phone' ? 2 : tabActive === 'laptop' ? 3 : tabActive === 'pc' ? 51 : tabActive === 'monitor' ? 53 : 52}`} className="hpTabSeeAll">
                XEM TẤT CẢ →
              </Link>
            </div>

            <div className="hpTabGrid4">
              {loading ? (
                Array.from({ length: 16 }).map((_, i) => <FeaturedProductSkeleton key={i} />)
              ) : (tabActive === 'phone' ? phoneProducts : tabActive === 'laptop' ? laptopProducts : tabActive === 'pc' ? pcProducts : tabActive === 'monitor' ? monitorProducts : printerProducts).length === 0 ? (
                <div className="hpStatusText">Chưa có sản phẩm trong mục này.</div>
              ) : (
                (tabActive === 'phone'
                  ? phoneProducts
                  : tabActive === 'laptop'
                    ? laptopProducts
                    : tabActive === 'pc'
                      ? pcProducts
                      : tabActive === 'monitor'
                        ? monitorProducts
                        : printerProducts
                ).map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    liked={wishSet.has(prod.id)}
                    onToggleLike={onToggleLike}
                  />
                ))
              )}
            </div>
          </div>
        </section> */}

        {latestNews.length > 0 && (
          <section className="hpNewsSection reveal">
            <div className="hpContainer">
              <div className="hpSectionHeaderNew">
                <span className="hpSectionKicker text-center">TIN TỨC CÔNG NGHỆ</span>
                <h2 className="hpSectionTitleNew text-center mb-5">Bài viết mới nhất</h2>
              </div>
              <div className="hpNewsGrid">
                {latestNews.slice(0, 10).map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="hpNewsCard">
                    <div className="hpNewsThumb">
                      <img src={resolveImageUrl(post.thumbnail_url)} alt={post.title} />
                      {post.category && <span className="hpNewsTag">{post.category.name}</span>}
                    </div>
                    <div className="hpNewsContent">
                      <div className="hpNewsMeta">
                        <span>{timeAgoVi(post.published_at || '')}</span>
                        {post.reading_time && <span> • {post.reading_time} phút đọc</span>}
                      </div>
                      <h3 className="hpNewsTitle">{post.title}</h3>
                      <p className="hpNewsExcerpt">{post.excerpt}</p>
                      <span className="hpNewsLink">Đọc tiếp →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {homeVideos.length > 0 && (
          <section className="hpCuratedSection reveal" style={{ marginTop: '60px' }}>
            <div className="hpContainer">
              <div className="hpCuratedHeader" style={{ marginBottom: '24px' }}>
                <div className="hpCuratedTitleBox">
                  <h2 className="hpCuratedTitle">Video nổi bật</h2>
                </div>
                <Link to="/videos" className="hpCuratedLink">
                  XEM TẤT CẢ VIDEO →
                </Link>
              </div>

              <div className="cvGrid">
                {homeVideos.map((video) => (
                  <div key={video.id} className="cvCard" onClick={() => navigate(`/videos/${video.id}`)}>
                    <div className="cvThumbnailWrap">
                      <img
                        src={getVideoThumbnail(video.video_url, video.product?.main_image_url)}
                        alt={video.title || ''}
                        className="cvThumbnail"
                      />
                      <div className="cvPlayOverlay">
                        <div className="cvPlayBtn">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: '2px' }}>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="cvCardBody">
                      <div>
                        <h3 className="cvCardTitle">{video.title || 'Video giới thiệu'}</h3>
                        {(video.description || video.product?.short_description) && (
                          <p className="cvCardDesc">
                            {video.description || video.product?.short_description}
                          </p>
                        )}
                      </div>
                      {video.product && (
                        <div className="cvProductLinkBadge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          {video.product.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="hpWhyUsSection reveal">
          <div className="hpContainer">
            <div className="hpWhyUsGrid">
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <ShippingIcon />
                </div>
                <h3>Miễn phí vận chuyển</h3>
                <p>Miễn phí giao hàng toàn quốc cho đơn từ 5 triệu đồng, giao nhanh và đảm bảo sản phẩm nguyên vẹn.</p>
              </div>
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <WarrantyIcon />
                </div>
                <h3>Bảo hành 24 tháng</h3>
                <p>Bảo hành chính hãng lên đến 24 tháng, hỗ trợ đổi trả theo chính sách và xử lý nhanh khi phát sinh lỗi.</p>
              </div>
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <SupportIcon />
                </div>
                <h3>Hỗ trợ chuyên gia</h3>
                <p>Chuyên viên kỹ thuật tư vấn cấu hình, nâng cấp và lắp đặt PC, luôn đồng hành cùng bạn trước và sau khi mua hàng.</p>
              </div>
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <PaymentIcon />
                </div>
                <h3>Thanh toán an toàn</h3>
                <p>Thanh toán linh hoạt qua thẻ, chuyển khoản hoặc COD với hệ thống bảo mật hiện đại, đảm bảo an toàn cho mọi giao dịch.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="hpGlobalReviewsSection reveal">
          <div className="hpContainer">
            <div className="hpSectionHeaderNew">
              <span className="hpSectionKicker text-center">TRẢI NGHIỆM THỰC TẾ</span>
              <h2 className="hpSectionTitleNew text-center mb-5">Đánh giá từ khách hàng</h2>
            </div>

            <div className="hpReviewsGrid">
              {globalReviews.length === 0 ? (
                <div className="hpStatusText">Chưa có đánh giá nổi bật.</div>
              ) : (
                globalReviews.map((rev) => (
                  <div key={rev.id} className="hpReviewCard">
                    <div className="hpReviewLeft">
                      <div className="hpReviewAvatar">
                        {rev.user?.avatar_url ? (
                          <img src={resolveImageUrl(rev.user.avatar_url)} alt={rev.user.name} />
                        ) : (
                          <span>{avatarInitial(rev.user?.name || 'U')}</span>
                        )}
                      </div>
                      <div className="hpReviewUserName">{rev.user?.name || 'Người dùng'}</div>
                    </div>

                    <div className="hpReviewRight">
                      <div className="hpReviewTopRow">
                        <Stars value={rev.rating} />
                        <span className="hpReviewLabel">{ratingLabel(rev.rating)}</span>
                      </div>

                      

                      <div className="hpReviewComment">
                        {rev.comment || 'Khách hàng không để lại bình luận.'}
                      </div>

                      {Array.isArray(rev.media) && rev.media.length > 0 && (
                        <div className="hpReviewMediaRow" style={{ marginTop: '12px' }}>
                          {rev.media.map((item, idx) => (
                            <button
                              key={`${item.url}-${idx}`}
                              type="button"
                              className="hpReviewMediaItem"
                              onClick={() => {
                                const mediaList = Array.isArray(rev.media) ? rev.media : []
                                setSelectedReviewMediaList(mediaList.map((m) => ({ url: m.url, type: m.type })))
                                setSelectedReviewMediaIndex(idx)
                              }}
                            >
                              {item.type === 'image' ? (
                                <img
                                  className="hpReviewMediaImage"
                                  src={resolveImageUrl(item.url)}
                                  alt={`Ảnh đánh giá ${idx + 1}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="hpReviewMediaVideoWrap">
                                  <video
                                    className="hpReviewMediaVideoPreview"
                                    src={resolveImageUrl(item.url)}
                                    muted
                                    playsInline
                                    loop
                                    preload="metadata"
                                  />
                                  <span className="hpReviewMediaVideoBadge" aria-hidden>
                                    ▶
                                  </span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="hpReviewBottom">
                        <div className="hpReviewTime">
                          <span className="hpReviewClock">🕒</span>
                          Đánh giá đã đăng vào {timeAgoVi(rev.created_at || '')}
                        </div>
                        {rev.product && (
                          <div className="hpReviewProduct">
                            <Link to={`/products/${rev.product.slug}`} className="hpReviewProductLink">
                              Sản phẩm: <span>{rev.product.name}</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>



        <section className="hpNewsletterSection reveal">
          <div className="hpContainer">
            <div className="hpNewsletterBox">
              <h2 className="hpNewsletterTitle">Luôn cập nhật tin tức</h2>
              <p className="hpNewsletterDesc">
                Tham gia cộng đồng ưu tiên: ưu đãi sớm cho phiên bản giới hạn và tài liệu kỹ thuật chọn lọc.
              </p>
              <form className="hpNewsletterForm" onSubmit={onNewsletterSubmit}>
                <input
                  type="email"
                  placeholder="ĐỊA CHỈ EMAIL"
                  className="hpNewsletterInput"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit" className="hpNewsletterBtn" disabled={newsletterLoading}>
                  {newsletterLoading ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {reviewMediaModal}
    </div>
  )
}




function HeartIcon({ filled }: { filled?: boolean }) {return (<svg viewBox="0 0 24 24"fill={filled ? '#f97316' : 'none'}width="16"height="16"stroke={filled ? '#f97316' : 'currentColor'}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>)}
function ExpandIcon() {return (<svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>)}
function PaymentIcon() {return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>)}
function ShippingIcon() {return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>)}
function WarrantyIcon() {return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>)}
function SupportIcon() {return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>)}
