import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import '@/styles/pages/HomePage.css'
import '@/styles/pages/ProductsPage.css'

import {
  fetchProducts,
  fetchCategories,
  type Product as ApiProduct,
  type Category as ApiCategory,
} from '@/features/services/products.service'
import { API_BASE_URL } from '@/configs/api.config'
import { HeartIcon } from '@/components/icons/HeartIcon'
import { addToCompare, getCompareList, removeFromCompare } from '@/features/services/compare.service'
import { useWishlistQuery, useWishlistMutation, useCartMutation } from '@/features/services/mutations'
import Skeleton from '@/components/Skeleton'
import { useAuthStore } from '@/features/store/useAuthStore'

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000

function isNewWithinTenDays(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return false
  return Date.now() - t <= TEN_DAYS_MS
}

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
  // Ensure we have /storage/ prefix if it's a local path
  const path = s.startsWith('/') ? s : `/${s}`
  if (!path.startsWith('/storage/')) {
    return `${API_BASE_URL}/storage${path}`
  }
  return `${API_BASE_URL}${path}`
}

function categoryTreeHasSelected(category: ApiCategory, selectedId: number | null): boolean {
  if (selectedId == null) return false
  if (category.id === selectedId) return true
  const children = category.children
  if (!children || children.length === 0) return false
  return children.some((c) => categoryTreeHasSelected(c, selectedId))
}

function CategoryItem({
  category,
  selectedId,
  onSelect
}: {
  category: ApiCategory,
  selectedId: number | null,
  onSelect: (id: number | null) => void
}) {
  const hasChildren = category.children && category.children.length > 0
  const shouldOpen = hasChildren && categoryTreeHasSelected(category, selectedId)
  const [isOpen, setIsOpen] = useState(() => shouldOpen)

  useEffect(() => {
    if (!shouldOpen) return
    queueMicrotask(() => setIsOpen(true))
  }, [shouldOpen])

  return (
    <div className="ppCatItemWrap">
      <div className="ppCatItemHeader">
        {!hasChildren ? (
          <label className="ppCheckboxItem">
            <input
              type="checkbox"
              checked={selectedId === category.id}
              onChange={() => onSelect(selectedId === category.id ? null : category.id)}
            />
            <span>{category.name}</span>
          </label>
        ) : (
          <div className={`ppCatParentName ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
            <span className="ppCatFolderIcon">{isOpen ? '📂' : '📁'}</span>
            <span>{category.name}</span>
          </div>
        )}
        {hasChildren && (
          <button className={`ppCatToggle ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
            ▾
          </button>
        )}
      </div>
      {hasChildren && isOpen && (
        <div className="ppCatChildren">
          {category.children?.map(child => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
  liked,
  onToggleLike,
}: {
  product: ApiProduct
  liked: boolean
  onToggleLike: (productId: number) => void
}) {
  const brand = product.brand || 'TECH'
  const { addToCart } = useCartMutation()

  // Handle image URL
  const imageUrl = resolveImageUrl(product.main_image_url)
  // Calculate display price and old price based on variants (uses backend effective_price)
  const { displayPrice, displayOldPrice, discountPercent } = useMemo(() => {
    const activeVariants = (product.variants || []).filter(v => v.is_active)
    if (activeVariants.length > 0) {
      // Sort by effective_price (already computed by backend with discount logic)
      const sorted = [...activeVariants].sort((a, b) => a.effective_price - b.effective_price)
      const lowest = sorted[0]
      const highest = sorted[sorted.length - 1]

      const originalPrice = Number.parseFloat(lowest.price)
      const finalPrice = lowest.effective_price
      const hasDiscount = finalPrice < originalPrice

      return {
        displayPrice: finalPrice,
        displayOldPrice: hasDiscount ? originalPrice : null,
        hasMultiplePrices: lowest.effective_price !== highest.effective_price,
        discountPercent: hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0,
        variantId: lowest.id,
        variantLabel: [variantColorLabel(lowest), variantStorageLabel(lowest)].filter(Boolean).join(' · ') || lowest.variant_name
      }
    }
    // Fallback: no variants → 0
    const basePrice = 0
    return {
      displayPrice: basePrice,
      displayOldPrice: null,
      hasMultiplePrices: false,
      discountPercent: 0,
      variantId: null,
      variantLabel: null
    }
  }, [product.variants])

  const isNew = isNewWithinTenDays(product.created_at)
  const { avgRating, ratingCount } = useMemo(() => {
    // Ưu tiên số liệu tổng hợp từ API list
    const count = typeof product.reviews_count === 'number' ? product.reviews_count : 0
    // Laravel withAvg trả về avg_rating hoặc reviews_avg_rating
    const avgRaw = product.avg_rating ?? product.reviews_avg_rating
    const avgFromApi =
      typeof avgRaw === 'number'
        ? avgRaw
        : typeof avgRaw === 'string'
          ? Number.parseFloat(avgRaw)
          : NaN
    if (Number.isFinite(avgFromApi) && count >= 0) {
      return { avgRating: Math.min(5, Math.max(0, avgFromApi)), ratingCount: count }
    }

    // Fallback: nếu API có trả reviews (thường chỉ ở trang chi tiết)
    const reviews = product.reviews ?? []
    const approved = reviews.filter((r) => r.status === 'approved' && Number.isFinite(r.rating))
    if (approved.length === 0) return { avgRating: 0, ratingCount: 0 }
    const sum = approved.reduce((acc, r) => acc + r.rating, 0)
    const avg = sum / approved.length
    return { avgRating: Math.min(5, Math.max(0, avg)), ratingCount: approved.length }
  }, [product.avg_rating, product.reviews_avg_rating, product.reviews, product.reviews_count])

  const stars = useMemo(() => {
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

  const isInCompare = useMemo(() => {
    return getCompareList().some(p => p.id === product.id)
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

  function variantColorLabel(v: any): string {
    const c = (v.color ?? '').trim()
    return c || ''
  }
  function variantStorageLabel(v: any): string {
    const cfg = (v.configuration ?? '').trim()
    return cfg || ''
  }

  return (
    <div className="ppCardNew">
      <Link to={`/products/${product.slug}${displayOldPrice && displayOldPrice > displayPrice ? `?variant=${(product.variants || []).find(v => v.effective_price === displayPrice)?.id}` : ''}`} className="ppCardImageWrap">
        <img src={imageUrl} alt={product.name} className="ppCardImg" />
        <button
          type="button"
          className={liked ? 'ppWishBtn ppWishBtn--active' : 'ppWishBtn'}
          aria-label={liked ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
          onClick={(e) => {
            e.preventDefault()
            onToggleLike(product.id)
          }}
        >
          <HeartIcon filled={liked} size={16} />
        </button>
        <button
          type="button"
          className={`ppCompareBtn ${isInCompare ? 'ppCompareBtn--active' : ''}`}
          onClick={toggleCompare}
          aria-label={isInCompare ? 'Xoá khỏi so sánh' : 'Thêm vào so sánh'}
          title="So sánh sản phẩm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20l7-7M21 3l-7 7M15 14l6 6M9 3H4v5M3 21l7-7M3 3l7 7M14 15l7 7"></path>
          </svg>
        </button>
        {(isNew || product.is_featured || discountPercent > 0) && (
          <div className="ppCardBadges">
            {product.is_featured && <span className="ppCardBadge ppCardBadge--featured">NỔI BẬT</span>}
            {isNew && <span className="ppCardBadge ppCardBadge--new">MỚI</span>}
            {discountPercent > 0 && <span className="ppCardBadge ppCardBadge--discount">-{discountPercent}%</span>}
          </div>
        )}
      </Link>
      <div className="ppCardContent">
        <div className="ppCardTopRow">
          <span className="ppCardBrand">{brand.toUpperCase()}</span>
          <span className="ppCardRating" aria-label={`Đánh giá ${avgRating.toFixed(1)} trên 5`}>
            <span className="ppCardStars" aria-hidden="true">
              {stars.map((t, idx) => (
                <span
                  key={idx}
                  className={`ppStar ${t === 'full' ? 'ppStar--full' : t === 'half' ? 'ppStar--half' : 'ppStar--empty'}`}
                >
                  ★
                </span>
              ))}
            </span>
            {ratingCount > 0 && <span className="ppCardRatingText"> ({ratingCount})</span>}
          </span>
        </div>
        <Link to={`/products/${product.slug}`} className="ppCardTitleLink">
          <h3 className="ppCardTitle">{product.name}</h3>
        </Link>
        <div className="ppCardPriceRow">
          <span className="ppCardPrice">
            {displayPrice.toLocaleString('vi-VN')} đ
          </span>
          {displayOldPrice && displayOldPrice > displayPrice && (
            <span className="ppCardOldPrice">{displayOldPrice.toLocaleString('vi-VN')} đ</span>
          )}
        </div>

        <p className="ppCardDesc">
          {product.short_description || product.description || 'Chưa có mô tả.'}
        </p>

        <button
          type="button"
          className="ppCardAddBtn"
          onClick={() => {
            const lowestVariant = (product.variants || []).sort((a, b) => a.effective_price - b.effective_price)[0]
            addToCart({
              item: {
                product_id: product.id,
                slug: product.slug,
                name: product.name,
                price: displayPrice,
                image_url: imageUrl,
                variant_id: lowestVariant?.id ?? null,
                variant_label: lowestVariant ? [variantColorLabel(lowestVariant), variantStorageLabel(lowestVariant)].filter(Boolean).join(' · ') : null,
                quantity: 1,
              },
              qty: 1
            })
          }}
        >
          THÊM VÀO GIỎ
        </button>
      </div>
    </div>
  )
}

const sortOptions = [
  { value: 'default', label: 'Mặc định' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price-asc', label: 'Giá: Thấp → Cao' },
  { value: 'price-desc', label: 'Giá: Cao → Thấp' },
]

function ProductCardSkeleton() {
  return (
    <div className="ppCardNew">
      <div className="ppCardImageWrap">
        <Skeleton height="220px" borderRadius="12px" />
      </div>
      <div className="ppCardContent">
        <div className="ppCardTopRow">
          <Skeleton width="60px" height="14px" />
          <Skeleton width="40px" height="14px" />
          <Skeleton width="80px" height="14px" />
        </div>
        <Skeleton width="100%" height="22px" style={{ margin: '12px 0 8px' }} />
        <Skeleton width="100%" height="40px" style={{ marginBottom: '16px' }} />
        <Skeleton width="100%" height="48px" borderRadius="10px" />
      </div>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="ppCheckboxList">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ marginBottom: '12px' }}>
          <Skeleton width="90%" height="18px" />
        </div>
      ))}
    </div>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const searchQueryParam = (searchParams.get('search') ?? '').trim()

  const [products, setProducts] = useState<ApiProduct[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState(() => searchQueryParam)
  const [sort, setSort] = useState<string>('default')
  const [maxPrice, setMaxPrice] = useState(100000000)
  const [minPrice, setMinPrice] = useState(0)
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [priceTouched, setPriceTouched] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [perPage, setPerPage] = useState(20) // Sẽ được cập nhật từ API
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Pagination constants
  const PAGE_SIZE = 20
  const userStr = useAuthStore((state) => state.userStr)
  const hasAuth = !!userStr

  const { data: wishlistData } = useWishlistQuery(hasAuth)
  const wishSet = useMemo(() => new Set(wishlistData?.map((i) => i.product_id) || []), [wishlistData])
  const wishlistMutation = useWishlistMutation()

  const sortRef = useRef<HTMLDivElement>(null)
  const [sortOpen, setSortOpen] = useState(false)

  // Pagination computation (matches admin ProductPage pattern)
  const safePage = Math.min(Math.max(1, page), lastPage)
  const pageStart = totalItems > 0 ? (safePage - 1) * perPage + 1 : 0
  const pageEnd = totalItems > 0 ? Math.min(totalItems, safePage * perPage) : 0

  const pageNumbers = useMemo(() => {
    const maxBtns = 7
    const half = Math.floor(maxBtns / 2)
    let start = Math.max(1, safePage - half)
    const end = Math.min(lastPage, start + maxBtns - 1)
    start = Math.max(1, end - maxBtns + 1)
    const arr: number[] = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [safePage, lastPage])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setQuery((current) => (current === searchQueryParam ? current : searchQueryParam))
    setPage(1)
  }, [searchQueryParam])

  async function onToggleLike(productId: number) {
    if (!hasAuth) {
      navigate('/login')
      return
    }
    wishlistMutation.mutate(productId)
  }

  const brands = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      const b = (p.brand ?? '').trim()
      if (b) set.add(b)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [products])

  const selectedCatId = useMemo(() => {
    const catParam = (searchParams.get('category') ?? '').trim()
    if (!catParam) return null

    const n = parseInt(catParam, 10)
    if (!Number.isNaN(n)) return n

    const targetSlug = catParam.toLowerCase()
    const stack: ApiCategory[] = [...categories]
    while (stack.length) {
      const c = stack.shift()!
      if ((c.slug ?? '').toLowerCase() === targetSlug) return c.id
      if (c.children?.length) stack.push(...c.children)
    }
    return null
  }, [categories, searchParams])

  useEffect(() => {
    fetchCategories('product').then(setCategories).catch(console.error)
  }, [])

  useEffect(() => {
    queueMicrotask(() => setLoading(true))
    console.log('[ProductsPage] Fetching with params:', { query, selectedCatId, sort, page, maxPrice, selectedBrand })
    const params: Record<string, unknown> = {
      search: query || undefined,
      page,
      // KHÔNG truyền limit để backend dùng giá trị từ settings (products_per_page)
    }

    if (priceTouched) {
      if (useCustomPrice) {
        // send both bounds
        params.min_price = Math.max(0, minPrice)
        params.max_price = Math.max(0, maxPrice)
      } else {
        params.max_price = maxPrice
      }
    }

    if (selectedCatId) params.category_id = selectedCatId
    if (selectedBrand) params.brand = selectedBrand

    if (sort === 'price-asc') { params.sort = 'price'; params.order = 'asc' }
    if (sort === 'price-desc') { params.sort = 'price'; params.order = 'desc' }
    if (sort === 'newest') { params.sort = 'created_at'; params.order = 'desc' }
    if (sort === 'oldest') { params.sort = 'created_at'; params.order = 'asc' }

    fetchProducts(params)
      .then(res => {
        console.log('[ProductsPage] API Response:', res)
        // Backend returns pagination in meta object, fallback to root level for compatibility
        const meta = res.meta
        setProducts(res.data)
        setLastPage(meta?.last_page ?? res.last_page ?? 1)
        setTotalItems(meta?.total ?? res.total ?? 0)
        // per_page từ settings (products_per_page)
        setPerPage(meta?.per_page ?? res.per_page ?? 20)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [query, selectedCatId, sort, page, maxPrice, selectedBrand, priceTouched, minPrice, useCustomPrice])

  function selectCategory(id: number | null) {
    const nextParams = new URLSearchParams(searchParams)
    if (id === null) {
      nextParams.delete('category')
    } else {
      nextParams.set('category', id.toString())
    }
    setSearchParams(nextParams, { replace: true })
    setPage(1)
  }

  return (
    <div className="ppPageNew">
      {showMobileFilters && <div className="ppSidebarOverlay" onClick={() => setShowMobileFilters(false)} />}
      <div className="ppContainer">
        <div className="ppMainGrid">
          <aside className={`ppSidebarNew ${showMobileFilters ? 'ppSidebarNew--open' : ''}`}>
            <div className="ppSidebarClose" onClick={() => setShowMobileFilters(false)}>✕</div>
            <div className="ppSidebarSection">
              <h2 className="ppSidebarLabel">BỘ LỌC</h2>

              <div className="ppFilterGroup">
                <h3 className="ppFilterTitle">DANH MỤC</h3>
                <div className="ppCheckboxList">
                  {loading ? (
                    <SidebarSkeleton />
                  ) : (
                    <>
                      <label className="ppCheckboxItem">
                        <input
                          type="checkbox"
                          checked={selectedCatId === null}
                          onChange={() => selectCategory(null)}
                        />
                        <span>Tất cả sản phẩm</span>
                      </label>
                      {categories.map(cat => (
                        <CategoryItem
                          key={cat.id}
                          category={cat}
                          selectedId={selectedCatId}
                          onSelect={selectCategory}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="ppFilterGroup">
                <div className="ppFilterTitleRow">
                  <h3 className="ppFilterTitle">MỨC GIÁ</h3>
                  <label className="ppPriceToggle">
                    <span>Nhập khoảng giá</span>
                    <input
                      type="checkbox"
                      checked={useCustomPrice}
                      onChange={(e) => {
                        setUseCustomPrice(e.target.checked)
                        if (!e.target.checked) {
                          setMinPrice(0)
                          setMaxPrice(100000000)
                          setPage(1)
                          setPriceTouched(false)
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="ppPriceRangeWrap">
                  {!useCustomPrice ? (
                    <>
                      <input
                        type="range"
                        className="ppPriceRange"
                        min="0"
                        max="100000000"
                        step="500000"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(parseInt(e.target.value))
                          setPriceTouched(true)
                        }}
                      />
                      <div className="ppPriceLabels">
                        <span>0 đ</span>
                        <span>Tối đa {maxPrice.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </>
                  ) : (
                    <div className="ppPriceCustomInputs">
                      <div>
                        <label className="ppPriceInputLabel">Từ (đ)</label>
                        <input
                          type="number"
                          className="ppPriceInput"
                          min={0}
                          step={1000}
                          value={minPrice}
                          onChange={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0)
                              setMinPrice(v)
                              setPage(1)
                              setPriceTouched(true)
                            }}
                        />
                      </div>
                      <div>
                        <label className="ppPriceInputLabel">Đến (đ)</label>
                        <input
                          type="number"
                          className="ppPriceInput"
                          min={0}
                          step={1000}
                          value={maxPrice}
                          onChange={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0)
                              setMaxPrice(v)
                              setPage(1)
                              setPriceTouched(true)
                            }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ppFilterGroup">
                <h3 className="ppFilterTitle">HÃNG</h3>
                <div className="ppBrandGrid">
                  {brands.length === 0 ? (
                    <div className="ppSidebarLabel" style={{ marginBottom: 0 }}>
                      Chưa có dữ liệu hãng.
                    </div>
                  ) : (
                    brands.map((b) => (
                      <button
                        type="button"
                        key={b}
                        className={`ppBrandBtn ${selectedBrand === b ? 'ppBrandBtn--active' : ''}`}
                        onClick={() => {
                          setSelectedBrand(selectedBrand === b ? null : b)
                          setPage(1)
                        }}
                      >
                        {b.toUpperCase()}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="ppContentNew">
            <header className="ppHeaderNew">
              <div className="ppHeaderLeft">
                <h1 className="ppCategoryHeading">
                  {selectedCatId ? 'SẢN PHẨM THEO DANH MỤC' : 'TẤT CẢ SẢN PHẨM'}
                </h1>
                <p className="ppCategorySub">Thiết bị công nghệ tuyển chọn với chất lượng chính hãng, hiệu năng ổn định và thiết kế hiện đại. Đáp ứng tốt nhu cầu học tập, làm việc, giải trí và gaming hằng ngày.</p>
              </div>
              <div className="ppHeaderRight">
                <div className="ppSearchWrap">
                  <input
                    type="text"
                    className="ppSearchInput"
                    placeholder="Tìm kiếm…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setPage(1)
                    }}
                  />
                  <svg className="ppSearchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>

                <div className="ppControlsRow">
                  <div className="ppSortWrap" ref={sortRef}>
                    <span className="ppSortText">SẮP XẾP:</span>
                    <div className={`ppSortDropdownNew ${sortOpen ? 'ppSortDropdownNew--open' : ''}`}>
                      <button
                        type="button"
                        className="ppSortTriggerNew"
                        onClick={() => setSortOpen(!sortOpen)}
                        aria-label="Chọn kiểu sắp xếp"
                      >
                        <span>{sortOptions.find(o => o.value === sort)?.label || 'Mặc định'}</span>
                        <svg className="ppSortArrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
                          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {sortOpen && (
                        <div className="ppSortOptionsListNew">
                          {sortOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`ppSortOptionItemNew ${sort === opt.value ? 'ppSortOptionItemNew--active' : ''}`}
                              onClick={() => {
                                setSort(opt.value)
                                setPage(1)
                                setSortOpen(false)
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="ppMobileFilterBtn"
                    onClick={() => setShowMobileFilters(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"></line>
                      <line x1="4" y1="10" x2="4" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12" y2="3"></line>
                      <line x1="20" y1="21" x2="20" y2="16"></line>
                      <line x1="20" y1="12" x2="20" y2="3"></line>
                      <line x1="1" y1="14" x2="7" y2="14"></line>
                      <line x1="9" y1="8" x2="15" y2="8"></line>
                      <line x1="17" y1="16" x2="23" y2="16"></line>
                    </svg>
                    BỘ LỌC
                  </button>
                </div>
              </div>
            </header>

            {loading ? (
              <div className="ppProductGridNew">
                {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <div className="ppEmpty">Không có sản phẩm phù hợp bộ lọc của bạn.</div>
            ) : (
              <div className="ppProductGridNew">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    liked={wishSet.has(p.id)}
                    onToggleLike={onToggleLike}
                  />
                ))}
              </div>
            )}

            {!loading && totalItems > 0 && (
              <div className="ppPagination">
                <div className="ppPaginationInfo">
                  Hiển thị <b>{pageStart}</b>–<b>{pageEnd}</b> / <b>{totalItems}</b>
                </div>
                <div className="ppPaginationBtns">
                  <button
                    type="button"
                    className="ppPagBtn"
                    disabled={safePage <= 1}
                    onClick={() => setPage(s => Math.max(1, s - 1))}
                  >
                    &lt;
                  </button>

                  {pageNumbers[0] > 1 && (
                    <>
                      <button type="button" className="ppPagBtn" onClick={() => setPage(1)}>1</button>
                      {pageNumbers[0] > 2 && <span className="ppPageDots">…</span>}
                    </>
                  )}

                  {pageNumbers.map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`ppPagBtn ${n === safePage ? 'ppPagBtn--active' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}

                  {pageNumbers[pageNumbers.length - 1] < lastPage && (
                    <>
                      {pageNumbers[pageNumbers.length - 1] < lastPage - 1 && <span className="ppPageDots">…</span>}
                      <button type="button" className="ppPagBtn" onClick={() => setPage(lastPage)}>{lastPage}</button>
                    </>
                  )}

                  <button
                    type="button"
                    className="ppPagBtn"
                    disabled={safePage >= lastPage}
                    onClick={() => setPage(s => Math.min(lastPage, s + 1))}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
