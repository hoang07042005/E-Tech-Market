import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/configs/api.config'
import { useGlobalToast } from '@/components/GlobalToastProvider'
import {
  fetchProductBySlug,
  fetchProducts,
  type Product,
  type ProductShopQnaPublic,
  type ProductVariant,
  type ProductFaq,
  type ProductNews,
  type ProductReview,
} from '@/features/services/products.service'
import { addToCart } from '@/features/services/cart.service'
import { fetchWishlist, toggleWishlist } from '@/features/services/wishlist.service'
import { addToCompare, getCompareList, removeFromCompare } from '@/features/services/compare.service'
import '@/styles/pages/ProductDetailPage.css'
import Skeleton from '@/components/Skeleton'

import {
  resolveImageUrl,
  renderVideoPlayer,
  fetchProductShopQnasPublic,
  variantColorLabel,
  variantStorageLabel,
  buildVariantFacetModel,
  PdpThumbStrip,
  PdpFacetVariantPicker,
  
  ratingLabel} from './components/PdpShared'
import { ProductReviewsSection } from './components/ProductReviewsSection'
import { ProductQnASection } from './components/ProductQnASection'
import { PdpRichSection } from './components/PdpRichSection'
import { PdpSpecsSection } from './components/PdpSpecsSection'
import { PdpFaqSection } from './components/PdpFaqSection'
import { PdpRelatedProductsSection } from './components/PdpRelatedProductsSection'
import type { ProductSpecRow, ProductMediaItem } from './components/PdpShared'

export default function ProductDetailPage() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const variantIdParam = searchParams.get('variant')

  const queryClient = useQueryClient()
  const toast = useGlobalToast()
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const hasAuth = !!token
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [wishSet, setWishSet] = useState<Set<number>>(() => new Set())

  const { data: product, isLoading: loading, error } = useQuery<Product, Error>({
    queryKey: ['productBySlug', slug, variantIdParam],
    queryFn: async () => {
      if (!slug) throw new Error('Sản phẩm không hợp lệ.')
      return await fetchProductBySlug(slug)
    },
    enabled: !!slug,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })

  const relatedProductsQuery = useQuery<Product[]>({
    queryKey: ['relatedProducts', product?.category_id, product?.id],
    queryFn: async () => {
      if (!product?.category_id || !product?.id) return []
      const res = await fetchProducts({ category_id: product.category_id, limit: 20 })
      return (res.data || []).filter((p) => p.id !== product.id).slice(0, 5)
    },
    enabled: !!product?.category_id && !!product?.id,
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  })

  const wishlistQuery = useQuery<Array<{ product_id: number }>>({
    queryKey: ['wishlist', token],
    queryFn: async () => {
      if (!token) return []
      return await fetchWishlist(token)
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: true,
  })

  const shopQnasQuery = useQuery<ProductShopQnaPublic[]>({
    queryKey: ['shopQnas', product?.slug],
    queryFn: async () => {
      if (!product?.slug) return []
      return await fetchProductShopQnasPublic(product.slug)
    },
    enabled: !!product?.slug,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  })

  const [selectedImg, setSelectedImg] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [qty, setQty] = useState(1)
  const [openFaqId, setOpenFaqId] = useState<number | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [expPerformance, setExpPerformance] = useState(5)
  const [expBattery, setExpBattery] = useState(5)
  const [expCamera, setExpCamera] = useState(5)
  const [reviewImages, setReviewImages] = useState<File[]>([])
  const [reviewFilter, setReviewFilter] = useState<
    'all' | 'with_images' | 'verified' | 'star_5' | 'star_4' | 'star_3' | 'star_2' | 'star_1'
  >('all')
  const [shopQnas, setShopQnas] = useState<ProductShopQnaPublic[]>([])
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaGuestName, setQaGuestName] = useState('')
  const [qaSending, setQaSending] = useState(false)
  const [qaFlash, setQaFlash] = useState<string | null>(null)
  const [qaError, setQaError] = useState<string | null>(null)
  const [buyerLoggedIn, setBuyerLoggedIn] = useState(false)
  const [qnaShopOpenById, setQnaShopOpenById] = useState<Record<number, boolean>>({})
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([])

  const isInCompare = useMemo(() => {
    if (!product) return false
    return getCompareList().some(p => p.id === product.id)
  }, [product?.id])

  async function toggleCompare() {
    if (!product) return
    if (isInCompare) {
      removeFromCompare(product.id)
      toast.showToast({ type: 'info', message: 'Đã xóa sản phẩm khỏi so sánh.' })
    } else {
      const res = addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: resolveImageUrl(product.main_image_url),
        price: selectedVariant ? selectedVariant.effective_price : 0,
      })
      if (!res.success) {
        toast.showToast({ type: 'error', message: res.message || 'Không thể thêm vào so sánh.' })
      } else {
        toast.showToast({ type: 'success', message: 'Đã thêm sản phẩm vào so sánh.' })
      }
    }
  }

  const visibleReviews: ProductReview[] = useMemo(() => [...(product?.reviews ?? [])], [product?.reviews])

  const reviewStats = useMemo(() => {
    const total = visibleReviews.length
    if (total === 0) {
      return {
        total: 0,
        avg: 0,
        counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>,
        exp: {
          performance: { avg: 0, count: 0 },
          battery: { avg: 0, count: 0 },
          camera: { avg: 0, count: 0 },
        },
      }
    }
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
    let sum = 0
    let perfSum = 0, perfCount = 0
    let batSum = 0, batCount = 0
    let camSum = 0, camCount = 0
    for (const r of visibleReviews) {
      const rating = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5
      counts[rating] += 1
      sum += rating

      const p = r.exp_performance
      if (typeof p === 'number' && p >= 1 && p <= 5) {
        perfSum += p
        perfCount += 1
      }
      const b = r.exp_battery
      if (typeof b === 'number' && b >= 1 && b <= 5) {
        batSum += b
        batCount += 1
      }
      const c = r.exp_camera
      if (typeof c === 'number' && c >= 1 && c <= 5) {
        camSum += c
        camCount += 1
      }
    }
    const avg = sum / total
    return {
      total,
      avg,
      counts,
      exp: {
        performance: { avg: perfCount ? perfSum / perfCount : 0, count: perfCount },
        battery: { avg: batCount ? batSum / batCount : 0, count: batCount },
        camera: { avg: camCount ? camSum / camCount : 0, count: camCount },
      },
    }
  }, [visibleReviews])

  const mergedDisplaySpecs = useMemo(() => {
    const raw = product?.specs ?? []
    const vid = selectedVariant?.id
    const common = raw.filter(s => s.product_variant_id == null || s.product_variant_id === undefined)
    const forVariant =
      vid != null ? raw.filter(s => Number(s.product_variant_id) === vid) : []
    const map = new Map<string, ProductSpecRow>()
    const order: string[] = []
    const mergeKey = (s: ProductSpecRow) => `${s.spec_group ?? ''}\0${s.spec_key ?? ''}`
    for (const s of common) {
      const key = mergeKey(s)
      order.push(key)
      map.set(key, s)
    }
    for (const s of forVariant) {
      const key = mergeKey(s)
      map.set(key, s)
      if (!order.includes(key)) order.push(key)
    }
    return order.map(k => map.get(k)!)
  }, [product?.specs, selectedVariant?.id])

  const variantFacetModel = useMemo(() => {
    const list = product?.variants
    if (!list?.length) return null
    return buildVariantFacetModel(list)
  }, [product?.variants])

  const showVariantFacetUi =
    !!variantFacetModel &&
    variantFacetModel.colors.length >= 1 &&
    (variantFacetModel.colors.length >= 2 || variantFacetModel.storages.length >= 2)

  const filteredReviews = useMemo(() => {
    const base = [...visibleReviews].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    if (reviewFilter === 'all') return base
    if (reviewFilter === 'with_images') return base // chưa lưu ảnh review, giữ UI filter
    if (reviewFilter === 'verified') return base.filter(r => !!r.order_id)
    if (reviewFilter === 'star_5') return base.filter(r => Math.round(r.rating) === 5)
    if (reviewFilter === 'star_4') return base.filter(r => Math.round(r.rating) === 4)
    if (reviewFilter === 'star_3') return base.filter(r => Math.round(r.rating) === 3)
    if (reviewFilter === 'star_2') return base.filter(r => Math.round(r.rating) === 2)
    return base.filter(r => Math.round(r.rating) === 1)
  }, [reviewFilter, visibleReviews])

  const productJsonLd = useMemo(() => {
    if (!product) return null

    const priceValue = selectedVariant
      ? selectedVariant.effective_price
      : Number(String(product.price).replace(/[^0-9.]/g, ''))

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.short_description || product.description || undefined,
      sku: product.sku || undefined,
      image: product.main_image_url ? [resolveImageUrl(product.main_image_url)] : undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'VND',
        price: Number.isFinite(priceValue) ? priceValue : 0,
        availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
    }

    if (reviewStats.total > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(reviewStats.avg.toFixed(1)),
        reviewCount: reviewStats.total,
        bestRating: 5,
      }
    }

    return schema
  }, [product, reviewStats, selectedVariant])

  const activeFlashSale = useMemo(() => {
    if (!product?.flash_sale_items?.length) return null
    // Assuming only one active flash sale per product for simplicity
    return product.flash_sale_items[0]
  }, [product])

  const [flashTimeLeft, setFlashTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    if (!activeFlashSale) {
      setFlashTimeLeft(null)
      return
    }

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(activeFlashSale.flash_sale.end_at).getTime()
      const diff = end - now

      if (diff <= 0) {
        clearInterval(timer)
        setFlashTimeLeft(null)
      } else {
        setFlashTimeLeft({
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeFlashSale])

  useEffect(() => {
    if (!product) {
      setSelectedVariant(null)
      setSelectedImg(null)
      setQty(1)
      setOpenFaqId(null)
      return
    }

    setSelectedImg(product.main_image_url)
    setQty(1)
    const faqsSorted = [...(product.faqs ?? [])]
      .filter((f) => f.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    setOpenFaqId(faqsSorted[0]?.id ?? null)

    if (product.variants && product.variants.length > 0) {
      let targetVariant = product.variants[0]
      if (variantIdParam) {
        const matched = product.variants.find((v) => String(v.id) === variantIdParam)
        if (matched) targetVariant = matched
      }
      setSelectedVariant(targetVariant)
      if (targetVariant.image_url) {
        setSelectedImg(targetVariant.image_url)
      }
      return
    }

    setSelectedVariant(null)
  }, [product, variantIdParam])

  useEffect(() => {
    if (product) {
      try {
        const stored = localStorage.getItem('recently_viewed_products');
        let rv: Product[] = stored ? JSON.parse(stored) : [];
        rv = rv.filter((p: Product) => p.id !== product.id);
        rv.unshift({
          id: product.id,
          name: product.name,
          slug: product.slug,
          main_image_url: product.main_image_url,
          // Add other required fields with dummy values to satisfy Product type if needed,
          // but PdpRelatedProductsSection only needs id, slug, main_image_url, name, short_description
        } as Product);
        if (rv.length > 6) rv = rv.slice(0, 6);
        localStorage.setItem('recently_viewed_products', JSON.stringify(rv));
        
        // Exclude current product from displaying in the recently viewed section
        setRecentlyViewed(rv.filter((p: Product) => p.id !== product.id));
      } catch (e) {
        // ignore JSON parse error
      }
    }
  }, [product])


  useEffect(() => {
    if (relatedProductsQuery.data) {
      setRelatedProducts(relatedProductsQuery.data)
    }
  }, [relatedProductsQuery.data])

  useEffect(() => {
    let cancelled = false
    if (!slug) return
    const t = localStorage.getItem('token')
    Promise.resolve().then(async () => {
      if (!t) {
        if (!cancelled) setBuyerLoggedIn(false)
        return
      }
      try {
        await apiFetch<{ name?: string }>('/api/me', { token: t })
        if (!cancelled) setBuyerLoggedIn(true)
      } catch {
        if (!cancelled) setBuyerLoggedIn(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!hasAuth) {
      setWishSet(new Set())
      return
    }
    if (wishlistQuery.data) {
      setWishSet(new Set(wishlistQuery.data.map((i) => i.product_id)))
    }
  }, [hasAuth, wishlistQuery.data])

  async function onToggleLike(productId: number) {
    if (!token) {
      navigate('/login')
      return
    }

    // Optimistic UI
    setWishSet((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })

    try {
      const status = await toggleWishlist(token, productId)
      setWishSet((prev) => {
        const next = new Set(prev)
        if (status === 'added') next.add(productId)
        else next.delete(productId)
        return next
      })
    } catch {
      // rollback
      setWishSet((prev) => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
    }
  }

  const refreshShopQnas = useCallback(async () => {
    const slugCur = product?.slug
    if (!slugCur) return
    await queryClient.invalidateQueries({ queryKey: ['shopQnas', slugCur] })
  }, [product?.slug, queryClient])

  useEffect(() => {
    if (shopQnasQuery.data) {
      setShopQnas(shopQnasQuery.data)
    }
  }, [shopQnasQuery.data])

  const mediaItems = useMemo<ProductMediaItem[]>(() => {
    if (!product) return []
    const list: ProductMediaItem[] = []

    const images = product.images || []
    const rawImages = product.main_image_url ? [product.main_image_url, ...images.map(i => i.image_url)] : images.map(i => i.image_url)
    const uniqueImages = Array.from(new Set(rawImages.filter(Boolean)))

    uniqueImages.forEach(url => {
      list.push({ type: 'image', url })
    })

    if (product.videos) {
      product.videos.forEach(video => {
        if (video.is_active !== false) {
          list.push({
            type: 'video',
            url: video.video_url,
            thumbnailUrl: video.thumbnail_url,
            video
          })
        }
      })
    }

    return list
  }, [product])

  const selectedMediaItem = useMemo(() => {
    return mediaItems.find(item => item.url === selectedImg) || mediaItems[0]
  }, [mediaItems, selectedImg])

  const isVideo = selectedMediaItem?.type === 'video'

  const commitmentItems = useMemo(
    () => [
      { key: 'fast', icon: '🚀', text: 'Giao hàng siêu tốc' },
      { key: 'support', icon: '🛠️', text: 'Hỗ trợ kỹ thuật 24/7' },
      { key: 'secure', icon: '🔒', text: 'Thanh toán an toàn' },
    ] as const,
    [],
  )

  if (loading) {
    return (
      <div className="pdpPage" style={{ paddingTop: '100px' }}>
        <div className="ppContainer">
          <div className="pdpMainGrid">
            {/* Gallery Skeleton */}
            <div className="pdpGallery">
              <div className="pdpGallerySkeleton">
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="pdpThumbSkeletonWrap" style={{ display: 'flex', flexDirection: 'row', gap: '12px', overflowX: 'auto', width: '100%' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} width="70px" height="70px" borderRadius="8px" style={{ flexShrink: 0 }} />
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <Skeleton width="100%" height="400px" borderRadius="16px" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Skeleton */}
            <div className="pdpInfo">
              <Skeleton width="150px" height="14px" style={{ marginBottom: '16px' }} />
              <Skeleton width="90%" height="40px" style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <Skeleton width="100px" height="20px" />
                <Skeleton width="100px" height="20px" />
              </div>
              <Skeleton width="200px" height="48px" style={{ marginBottom: '32px' }} />

              <div style={{ marginBottom: '32px' }}>
                <Skeleton width="120px" height="18px" style={{ marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} width="80px" height="40px" borderRadius="20px" />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
                <Skeleton width="140px" height="56px" borderRadius="28px" />
                <Skeleton width="200px" height="56px" borderRadius="28px" />
              </div>

              <div className="pdpCommitments" style={{ border: 'none', padding: 0 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                    <Skeleton width="24px" height="24px" borderRadius="50%" />
                    <Skeleton width="80%" height="16px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) return <div className="pdpError">Product not found. <Link to="/products">Back to store</Link></div>



  const visibleFaqs: ProductFaq[] = [...(product.faqs ?? [])]
    .filter(f => f.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const visibleNews: ProductNews[] = [...(product.news ?? [])]
    .filter(n => n.is_active !== false)
    .sort((a, b) => {
      const ap = a.published_at ? Date.parse(a.published_at) : 0
      const bp = b.published_at ? Date.parse(b.published_at) : 0
      if (bp !== ap) return bp - ap
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })

  // moved above (hooks must run before early returns)

  return (
    <>
      <Helmet>
        <title>{product.name} | E-Tech Market</title>
        <meta name="description" content={product.short_description || product.description || `Mua ${product.name} giá rẻ tại E-Tech Market.`} />
        {productJsonLd ? (
          <script type="application/ld+json">
            {JSON.stringify(productJsonLd)}
          </script>
        ) : null}
      </Helmet>
      <div className="pdpPage">
        <div className="ppContainer">
          <nav className="pdpBreadcrumb">
            <Link to="/">Trang chủ</Link> / <Link to="/products">Danh sách sản phẩm</Link> / <span>{product.name}</span>
          </nav>
          <h1 className="pdpProductName">{product.name}</h1>
          <div className="pdpMainGrid">
            {/* Image/Video Gallery */}
            <div className="pdpGallery">
              <div className="pdpGalleryGrid">
                {isVideo ? (
                  <div className="pdpMainImageWrap pdpMainVideoWrap">
                    {renderVideoPlayer(selectedMediaItem?.url ?? '', selectedMediaItem?.video?.title ?? '')}
                  </div>
                ) : (
                  <div className="pdpMainImageWrap">
                    <img src={resolveImageUrl(selectedImg || product.main_image_url)} alt={product.name} className="pdpMainImage" />
                  </div>
                )}
                {mediaItems.length > 1 && (
                  <PdpThumbStrip
                    key={product.id}
                    mediaItems={mediaItems}
                    selectedImg={selectedImg || (mediaItems[0]?.url ?? null)}
                    onSelectImage={setSelectedImg}
                  />
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="pdpInfo">
              {activeFlashSale && flashTimeLeft && (
                <div className="pdpFlashSaleHeader">
                  <div className="pdpFlashSaleTitle">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>FLASH SALE ĐANG DIỄN RA</span>
                  </div>
                  <div className="pdpFlashSaleTimer">
                    <span>KẾT THÚC TRONG</span>
                    <div className="timerBox">{String(flashTimeLeft.h).padStart(2, '0')}</div>
                    <span>:</span>
                    <div className="timerBox">{String(flashTimeLeft.m).padStart(2, '0')}</div>
                    <span>:</span>
                    <div className="timerBox">{String(flashTimeLeft.s).padStart(2, '0')}</div>
                  </div>
                </div>
              )}

              

              <div className="pdpPriceRow">
                <span className="pdpPrice">
                  {activeFlashSale
                    ? `${parseFloat(activeFlashSale.flash_sale_price.toString()).toLocaleString('vi-VN')} đ`
                    : parseFloat(selectedVariant ? selectedVariant.effective_price.toString() : '0').toLocaleString('vi-VN') + ' đ'
                  }
                </span>
                {(activeFlashSale || (selectedVariant && selectedVariant.effective_price < parseFloat(selectedVariant.price))) && (
                  <span className="pdpOldPrice">
                    {activeFlashSale
                      ? `${parseFloat(selectedVariant ? selectedVariant.price : '0').toLocaleString('vi-VN')} đ`
                      : parseFloat(selectedVariant!.price).toLocaleString('vi-VN') + ' đ'
                    }
                  </span>
                )}
              </div>

              {/* Variants: facet (màu + dung lượng) hoặc danh sách gọn */}
              {product.variants && product.variants.length > 0 && (
                <div className="pdpConfigurator">
                  {showVariantFacetUi && variantFacetModel ? (
                    <PdpFacetVariantPicker
                      facet={variantFacetModel}
                      product={product}
                      selectedVariant={selectedVariant}
                      onSelectVariant={setSelectedVariant}
                    />
                  ) : (
                    <div className="pdpConfigGroup">
                      <label>Chọn phiên bản</label>
                      <div className="pdpVariantFallback">
                        {product.variants.map((v, i) => {
                          const isActive = selectedVariant?.id === v.id
                          return (
                            <button
                              key={v.id ?? i}
                              type="button"
                              className={`pdpVariantFallbackChip ${isActive ? 'is-active' : ''}`}
                              onClick={() => setSelectedVariant(v)}
                            >
                              <span className="pdpVariantFallbackChip__name">{v.variant_name}</span>
                              <span className="pdpVariantFallbackChip__meta">
                                {[variantColorLabel(v), variantStorageLabel(v)]
                                  .filter(Boolean)
                                  .join(' · ') || 'Chi tiết trong tên'}
                              </span>
                              <span className="pdpVariantFallbackChip__price">
                                {parseFloat(v.effective_price.toString()).toLocaleString('vi-VN')} đ
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="pdpShortDesc">
                {product.description}
              </p>

              <div className="pdpMeta">
                <div className="pdpMetaItem">
                  <span className="label">CATEGORY</span>
                  <span className="value">{product.category?.name || 'Electronics'}</span>
                </div>
                <div className="pdpMetaItem">
                  <span className="label">SKU</span>
                  <span className="value">{selectedVariant ? selectedVariant.sku : 'N/A'}</span>
                </div>
                <div className="pdpMetaItem">
                  <span className="label">AVAILABILITY</span>
                  <span className={`value stock ${selectedVariant && selectedVariant.stock_quantity === 0 ? 'out' : ''}`}>
                    {selectedVariant
                      ? (selectedVariant.stock_quantity > 0 ? `Còn hàng (${selectedVariant.stock_quantity})` : 'Hết hàng')
                      : 'Còn hàng'}
                  </span>
                </div>
              </div>

              <div className="pdpActions">
                <div className="pdpQtyWrap">
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    aria-label="Giảm số lượng"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    aria-label="Số lượng"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(q => q + 1)}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="pdpAddBtn"
                  onClick={() => {
                    const v = selectedVariant
                    const priceStr = v ? v.effective_price.toString() : '0'
                    const price = activeFlashSale
                      ? Number.parseFloat(activeFlashSale.flash_sale_price.toString())
                      : Number.parseFloat(priceStr)

                    const variantLabel =
                      v
                        ? [variantColorLabel(v), variantStorageLabel(v)]
                          .filter(Boolean)
                          .join(' · ') ||
                        v.variant_name
                        : null
                    addToCart(
                      {
                        product_id: product.id,
                        slug: product.slug,
                        name: product.name,
                        price: Number.isFinite(price) ? price : 0,
                        image_url: resolveImageUrl(v?.image_url || product.main_image_url),
                        variant_id: v?.id ?? null,
                        variant_label: variantLabel,
                        quantity: 1,
                      },
                      qty,
                    )
                  }}
                >
                  THÊM VÀO GIỎ
                </button>

                <button
                  type="button"
                  className={`pdpCompareBtn ${isInCompare ? 'is-active' : ''}`}
                  onClick={toggleCompare}
                  title="So sánh sản phẩm"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 3h5v5M4 20l7-7M21 3l-7 7M15 14l6 6M9 3H4v5M3 21l7-7M3 3l7 7M14 15l7 7"></path>
                  </svg>
                  <span>{isInCompare ? 'ĐÃ THÊM' : 'SO SÁNH'}</span>
                </button>
              </div>
            </div>
          </div>



          {/* Bottom Section - Two Columns */}
          <div className="pdpBottomGrid">
            <PdpSpecsSection mergedDisplaySpecs={mergedDisplaySpecs} />

            <div className="pdpSidebarSide">
              {/* Product Commitments */}
              <div className="pdpCommitments">
                <h3 className="pdpCommitTitle">Cam kết sản phẩm</h3>
                <div className="pdpCommitGrid">
                  {commitmentItems.map((item) => (
                    <div key={item.key} className="pdpCommitCard">
                      <div className="pdpCommitIcon" aria-hidden>
                        {item.icon}
                      </div>
                      <p className="pdpCommitText">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <PdpFaqSection 
                visibleFaqs={visibleFaqs} 
                openFaqId={openFaqId} 
                setOpenFaqId={setOpenFaqId} 
              />
            </div>
          </div>

          <PdpRelatedProductsSection 
            relatedProducts={relatedProducts} 
            wishSet={wishSet} 
            onToggleLike={onToggleLike} 
            title="Sản phẩm liên quan"
          />
          
          <PdpRelatedProductsSection 
            relatedProducts={recentlyViewed} 
            wishSet={wishSet} 
            onToggleLike={onToggleLike} 
            title="Sản phẩm đã xem gần đây"
          />

          <PdpRichSection product={product} visibleNews={visibleNews} />

          <ProductReviewsSection 
            product={product}
            reviewStats={reviewStats}
            filteredReviews={filteredReviews}
            reviewFilter={reviewFilter as any}
            setReviewFilter={setReviewFilter as any}
            setIsReviewModalOpen={setIsReviewModalOpen}
          />
          <ProductQnASection 
            product={product}
            shopQnas={shopQnas}
            qaQuestion={qaQuestion}
            setQaQuestion={setQaQuestion}
            qaGuestName={qaGuestName}
            setQaGuestName={setQaGuestName}
            qaSending={qaSending}
            setQaSending={setQaSending}
            qaFlash={qaFlash}
            setQaFlash={setQaFlash}
            qaError={qaError}
            setQaError={setQaError}
            buyerLoggedIn={buyerLoggedIn}
            qnaShopOpenById={qnaShopOpenById}
            setQnaShopOpenById={setQnaShopOpenById}
            refreshShopQnas={refreshShopQnas}
          />
          {isReviewModalOpen && (
            <div className="pdpReviewModalOverlay" onClick={() => setIsReviewModalOpen(false)}>
              <div className="pdpReviewModal" onClick={e => e.stopPropagation()}>
                <div className="pdpReviewModalHead">
                  <div className="pdpReviewModalTitle">Đánh giá &amp; nhận xét</div>
                  <button type="button" className="pdpReviewModalClose" onClick={() => setIsReviewModalOpen(false)}>×</button>
                </div>
                <div className="pdpReviewModalBody">
                  <div className="pdpReviewProductRow">
                    <div className="pdpReviewMascot" aria-hidden>
                      <span>★</span>
                    </div>
                    <div className="pdpReviewProductName">{product.name}</div>
                  </div>

                  <div className="pdpReviewSection">
                    <div className="pdpReviewSectionTitle">Đánh giá chung</div>
                    <RatingRow value={reviewRating} onChange={setReviewRating} />
                    <div className="pdpReviewScale">
                      <span>Rất tệ</span>
                      <span>Tệ</span>
                      <span>Bình thường</span>
                      <span>Tốt</span>
                      <span>Tuyệt vời</span>
                    </div>
                  </div>

                  <div className="pdpReviewSection">
                    <div className="pdpReviewSectionTitle">Theo trải nghiệm</div>
                    <ExperienceRow label="Hiệu năng" value={expPerformance} onChange={setExpPerformance} rightText={expPerformance >= 5 ? 'Siêu mạnh mẽ' : ratingLabel(expPerformance)} />
                    <ExperienceRow label="Thời lượng pin" value={expBattery} onChange={setExpBattery} rightText={expBattery >= 5 ? 'Cực khủng' : ratingLabel(expBattery)} />
                    <ExperienceRow label="Chất lượng camera" value={expCamera} onChange={setExpCamera} rightText={expCamera >= 5 ? 'Chụp đẹp, chuyên nghiệp' : ratingLabel(expCamera)} />
                  </div>

                  <div className="pdpReviewField">
                    <textarea
                      className="pdpReviewTextarea"
                      rows={5}
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Xin mời chia sẻ một số cảm nhận về sản phẩm (nhập tối thiểu 15 kí tự)"
                    />
                  </div>

                  <div className="pdpReviewUploadRow">
                    {/* <label className="pdpReviewUploadBtn">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={e => {
                        const files = Array.from(e.target.files || [])
                        if (files.length === 0) return
                        setReviewImages(prev => [...prev, ...files].slice(0, 5))
                        e.currentTarget.value = ''
                      }}
                    />
                    <span className="pdpReviewUploadIcon" aria-hidden>📷</span>
                    <span>Thêm hình ảnh</span>
                  </label> */}

                    {reviewImages.length > 0 && (
                      <div className="pdpReviewThumbs">
                        {reviewImages.map((f, i) => (
                          <div key={`${f.name}-${i}`} className="pdpReviewThumb">
                            <img src={URL.createObjectURL(f)} alt="" />
                            <button
                              type="button"
                              className="pdpReviewThumbRemove"
                              onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pdpReviewModalFoot">
                  <button
                    type="button"
                    className="pdpReviewSubmit"
                    onClick={async () => {
                      const token = localStorage.getItem('token')
                      if (!token) {
                        toast.showToast({ type: 'info', message: 'Vui lòng đăng nhập để đánh giá.' })
                        navigate('/login')
                        return
                      }
                      if ((reviewComment || '').trim().length < 15) {
                        toast.showToast({ type: 'info', message: 'Vui lòng nhập tối thiểu 15 kí tự.' })
                        return
                      }
                      try {
                        await apiFetch(`/api/products/${product.id}/reviews`, {
                          method: 'POST',
                          token,
                          body: JSON.stringify({
                            rating: reviewRating,
                            exp_performance: expPerformance,
                            exp_battery: expBattery,
                            exp_camera: expCamera,
                            comment: reviewComment || null,
                          }),
                        })
                        setIsReviewModalOpen(false)
                        await queryClient.invalidateQueries({ queryKey: ['productBySlug', slug, variantIdParam] })
                        toast.showToast({ type: 'success', message: 'Cảm ơn bạn đã gửi đánh giá!' })
                      } catch (e: unknown) {
                        toast.showToast({
                          type: 'error',
                          message: e instanceof Error ? e.message : 'Gửi đánh giá thất bại.',
                        })
                      }
                    }}
                  >
                    GỬI ĐÁNH GIÁ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}





function RatingRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const v = Math.round(Math.max(1, Math.min(5, value)))
  return (
    <div className="pdpRatingRow">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1
        const active = star <= v
        return (
          <button
            key={star}
            type="button"
            className={`pdpRatingStar ${active ? 'active' : ''}`}
            onClick={() => onChange(star)}
            aria-label={`${star} sao`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

function ExperienceRow({
  label,
  value,
  onChange,
  rightText,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  rightText: string
}) {
  return (
    <div className="pdpExpRow">
      <div className="pdpExpLabel">{label}</div>
      <div className="pdpExpStars">
        <RatingRow value={value} onChange={onChange} />
      </div>
      <div className="pdpExpRight">{rightText}</div>
    </div>
  )
}



