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


function ProductCard({
  product,
  liked,
  onToggleLike
}: {
  product: ApiProduct
  liked: boolean
  onToggleLike: (id: number) => void
}) {
  const imageUrl = resolveImageUrl(product.main_image_url)

  const brand = product.brand ? product.brand : 'ECOVACS'
  const excerpt = product.short_description || 'Thiết kế thông minh, lực hút mạnh mẽ, làm sạch hoàn hảo mọi ngóc ngách trong ngôi nhà của bạn...'

  // Calculate display price and old price based on variants (uses backend effective_price)
  const { displayPrice, displayPriceMax, displayOldPrice, discountPercent, hasMultiplePrices, showDiscountBadge } = useMemo(() => {
    const activeVariants = (product.variants || []).filter(v => v.is_active)
    const isSingleVariant = activeVariants.length === 1

    if (activeVariants.length > 0) {
      const sorted = [...activeVariants].sort((a, b) => a.effective_price - b.effective_price)
      const lowest = sorted[0]
      const highest = sorted[sorted.length - 1]
      const hasMultiplePrices = lowest.effective_price !== highest.effective_price
      const showDiscountBadge = isSingleVariant
      const originalPrice = Number.parseFloat(lowest.price)
      const finalPrice = lowest.effective_price
      const hasDiscount = finalPrice < originalPrice && showDiscountBadge
      return {
        displayPrice: finalPrice,
        displayPriceMax: hasMultiplePrices ? highest.effective_price : null,
        displayOldPrice: hasDiscount ? originalPrice : null,
        hasMultiplePrices,
        showDiscountBadge,
        discountPercent: hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0,
      }
    }
    return {
      displayPrice: 0,
      displayPriceMax: null,
      displayOldPrice: null,
      hasMultiplePrices: false,
      showDiscountBadge: false,
      discountPercent: 0,
    }
  }, [product.variants])

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
        alert(res.message)
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
        <Link to={`/products/${product.slug}`} className="hpProductImageLink">
          <img src={imageUrl} alt={product.name} className="hpProductImage" />
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
        {discountPercent > 0 ? (
          <span className="hpBadge hpBadgeSale">
            -{discountPercent}%
          </span>
        ) : product.is_new ? (
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

        <Link to={`/products/${product.slug}`} className="hpProductNameLink">
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

        <p className="hpProductExcerpt">{excerpt}</p>

        <Link
          to={`/products/${product.slug}`}
          className="hpAddToCartFullBtn"
        >
          XEM CHI TIẾT →        </Link>
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
  const [tabActive, setTabActive] = useState<'phone' | 'laptop' | 'pc' | 'monitor' | 'printer'>('phone')
  const [phoneProducts, setPhoneProducts] = useState<ApiProduct[]>([])
  const [laptopProducts, setLaptopProducts] = useState<ApiProduct[]>([])
  const [pcProducts, setPcProducts] = useState<ApiProduct[]>([])
  const [monitorProducts, setMonitorProducts] = useState<ApiProduct[]>([])
  const [printerProducts, setPrinterProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [selectedReviewMediaList, setSelectedReviewMediaList] = useState<{ url: string; type: string }[]>([])
  const [selectedReviewMediaIndex, setSelectedReviewMediaIndex] = useState(0)

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
      apiFetch<CouponPublic[]>('/api/coupons?exclude_saved=true'),
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
          if (Array.isArray(couponRes)) setActiveCoupons(couponRes.slice(0, 4))
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
      alert('Vui lòng đăng nhập để lưu mã giảm giá!')
      navigate('/login')
      return
    }

    try {
      // 🔒 Token is sent via httpOnly cookie automatically
      const res = await apiFetch<{ message: string }>('/api/me/coupons/save', {
        method: 'POST',
        body: JSON.stringify({ code })
      })
      alert(res.message)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Có lỗi xảy ra khi lưu mã.')
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
      alert('Đăng ký nhận tin tức thành công!')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký.')
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
          <section className="hpHeroNew" style={{ position: 'relative' }}>
            <div className="hpHeroImageContainer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              {banners.map((b, idx) => (
                <img 
                  key={b.id} 
                  src={resolveImageUrl(b.image_url)} 
                  alt={b.title || ''} 
                  className="hpHeroImg"
                  style={{ opacity: idx === currentBannerIndex ? 1 : 0, transition: 'opacity 0.8s ease-in-out', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ))}
              <div className="hpHeroOverlay"></div>
            </div>

            <div className="hpHeroContent" style={{ position: 'relative', zIndex: 2 }}>
              <div className="hpHeroText">
                <h1 className="hpHeroTitleNew" style={{ whiteSpace: 'pre-line' }}>
                  {banners[currentBannerIndex]?.title || 'Chính xác.\nSức mạnh.\nHoàn hảo.'}
                </h1>
                {(banners[currentBannerIndex]?.description) && (
                  <p className="hpHeroDescNew" style={{ whiteSpace: 'pre-line' }}>
                    {banners[currentBannerIndex].description}
                  </p>
                )}
                
                <div className="hpHeroActions">
                  <button 
                    type="button" 
                    className="hpBtnShopNow" 
                    onClick={() => navigate(banners[currentBannerIndex]?.link_url || '/products')}
                  >
                    Khám Phá Ngay
                  </button>
                </div>

                <div className="hpHeroIndicator">
                  <span className="hpIndicatorLine"></span>
                  <span className="hpIndicatorText">CẬP NHẬT MỚI NHẤT</span>
                </div>
              </div>
            </div>
            
            {banners.length > 1 && (
              <div className="hpBannerDots" style={{ position: 'absolute', bottom: '30px', left: '0', width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 10 }}>
                {banners.map((_, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentBannerIndex(idx)}
                    style={{ width: '12px', height: '12px', borderRadius: '50%', background: idx === currentBannerIndex ? '#f97316' : '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.3s', opacity: idx === currentBannerIndex ? 1 : 0.4 }}
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
              <div className="hpHeroText">
                <h1 className="hpHeroTitleNew">
                  Chính xác.<br />Sức mạnh.<br />Hoàn hảo.
                </h1>
                <p className="hpHeroDescNew">
                  Trải nghiệm đỉnh cao của kỹ thuật hiệu năng cao.<br />
                  Mỗi linh kiện đều được tuyển chọn dành cho người dùng chuyên nghiệp khó tính.
                </p>
                <div className="hpHeroActions">
                  <button type="button" className="hpBtnShopNow" onClick={() => navigate('/products')}>
                    MUA NGAY
                  </button>
                </div>

                <div className="hpHeroIndicator">
                  <span className="hpIndicatorLine"></span>
                  <span className="hpIndicatorText">HÀNG MỚI: BỘ TITANIUM</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {(loading || activeCoupons.length > 0) && (
          <section className="hpCouponSection reveal">
            <div className="hpContainer">
              <div className="hpCouponHeader">
                <div>
                  <h2 className="hpCouponSectionTitle">Ưu đãi dành cho bạn</h2>
                  <p className="hpCouponSectionSub">CHẠM VÀO MÃ ĐỂ SAO CHÉP NHANH</p>
                </div>
                <div className="hpCouponBadge">
                  {activeCoupons.length} ưu đãi
                </div>
              </div>
              <div className="hpCouponGridWrapper">
                <div className="hpCouponGrid">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => <CouponSkeleton key={i} />)
                    : activeCoupons.map((c) => (
                      <div key={c.id} className="hpCouponCard">
                        <div className="hpCouponCardTop">
                          <div className="hpCouponInfo">
                            <div className="hpCouponValue">
                              {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatPriceVnd(c.value.toString())}`}
                            </div>
                            <div className="hpCouponMin">
                              {c.min_order_amount ? `Đơn từ ${formatPriceVnd(c.min_order_amount.toString())}` : 'Áp dụng mọi đơn hàng'}
                            </div>
                          </div>
                          <button
                            className="hpCouponSaveBtn"
                            onClick={() => saveCoupon(c.code)}
                          >
                            Lưu
                          </button>
                        </div>
                        
                        <div className="hpCouponDivider"></div>
                        
                        <div className="hpCouponCardBottom" onClick={() => { navigator.clipboard.writeText(c.code); alert('Đã sao chép mã!'); }}>
                          <div className="hpCouponCode">{c.code}</div>
                          <div className="hpCouponCopyAction">
                            <span>Sao chép</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

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

        <section className="hpTabbedSection reveal">
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
        </section>

        {latestNews.length > 0 && (
          <section className="hpNewsSection reveal">
            <div className="hpContainer">
              <div className="hpSectionHeaderNew">
                <span className="hpSectionKicker text-center">TIN TỨC CÔNG NGHỆ</span>
                <h2 className="hpSectionTitleNew text-center mb-5">Bài viết mới nhất</h2>
              </div>
              <div className="hpNewsGrid">
                {latestNews.map((post) => (
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
                  <span className="hpCuratedKicker">REVIEW THỰC TẾ &amp; TRỰC QUAN</span>
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
                <p>Áp dụng đơn từ 5 triệu đồng</p>
              </div>
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <WarrantyIcon />
                </div>
                <h3>Bảo hành 24 tháng</h3>
                <p>Bảo vệ trọn vẹn thiết bị của bạn</p>
              </div>
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <SupportIcon />
                </div>
                <h3>Hỗ trợ chuyên gia</h3>
                <p>Đội ngũ kỹ thuật đồng hành 24/7</p>
              </div>
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <PaymentIcon />
                </div>
                <h3>Thanh toán an toàn</h3>
                <p>Giao dịch được mã hóa 100%</p>
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

                      {/* <div className="hpReviewPills">
                        {typeof rev.exp_performance === 'number' && (
                          <span className="hpReviewPill">Hiệu năng {rev.exp_performance >= 5 ? 'Siêu mạnh mẽ' : ratingLabel(rev.exp_performance)}</span>
                        )}
                        {typeof rev.exp_battery === 'number' && (
                          <span className="hpReviewPill">Thời lượng pin {rev.exp_battery >= 5 ? 'Cực khủng' : ratingLabel(rev.exp_battery)}</span>
                        )}
                        {typeof rev.exp_camera === 'number' && (
                          <span className="hpReviewPill">Chất lượng camera {rev.exp_camera >= 5 ? 'Chụp đẹp, chuyên nghiệp' : ratingLabel(rev.exp_camera)}</span>
                        )}
                      </div> */}

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
