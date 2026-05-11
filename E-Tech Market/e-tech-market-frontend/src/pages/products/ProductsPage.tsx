import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import '../css_pages/HomePage.css'
import '../css_pages/ProductsPage.css'

import {
  fetchProducts,
  fetchCategories,
  type Product as ApiProduct,
  type Category as ApiCategory,
} from '../../lib/products'
import { API_BASE_URL } from '../../lib/api'
import { addToCart } from '../../lib/cart'
import { fetchWishlist, toggleWishlist } from '../../lib/wishlist'
import { HeartIcon } from '../../components/icons/HeartIcon'

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000

function isNewWithinTenDays(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false
  const t = Date.parse(createdAt)
  if (!Number.isFinite(t)) return false
  return Date.now() - t <= TEN_DAYS_MS
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/400'
  if (url.startsWith('http')) return url
  // Ensure we have /storage/ prefix if it's a local path
  const path = url.startsWith('/') ? url : `/${url}`
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
        <label className="ppCheckboxItem">
          <input 
            type="checkbox" 
            checked={selectedId === category.id}
            onChange={() => onSelect(selectedId === category.id ? null : category.id)}
          />
          <span>{category.name}</span>
        </label>
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
  
  // Handle image URL
  const imageUrl = resolveImageUrl(product.main_image_url)
  const price = Number.parseFloat(product.price)
  const isNew = isNewWithinTenDays(product.created_at)
  const { avgRating, ratingCount } = useMemo(() => {
    // Ưu tiên số liệu tổng hợp từ API list
    const count = typeof product.reviews_count === 'number' ? product.reviews_count : 0
    const avgRaw = product.avg_rating
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
  }, [product.avg_rating, product.reviews, product.reviews_count])

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

  return (
    <div className="ppCardNew">
      <Link to={`/products/${product.slug}`} className="ppCardImageWrap">
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
        {isNew && <span className="ppCardBadge">MỚI</span>}
        {product.is_featured && <span className="ppCardBadge ppCardBadge--limited">NỔI BẬT</span>}
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
            <span className="ppCardRatingText">
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              {ratingCount > 0 ? ` (${ratingCount})` : ''}
            </span>
          </span>
          <span className="ppCardPrice">{Number.isFinite(price) ? price.toLocaleString('vi-VN') : '0'} đ</span>
        </div>
        <Link to={`/products/${product.slug}`} className="ppCardTitleLink">
          <h3 className="ppCardTitle">{product.name}</h3>
        </Link>
        
        <p className="ppCardDesc">
          {product.short_description || product.description || 'Chưa có mô tả.'}
        </p>
        
        <button
          type="button"
          className="ppCardAddBtn"
          onClick={() =>
            addToCart(
              {
                product_id: product.id,
                slug: product.slug,
                name: product.name,
                price: Number.isFinite(price) ? price : 0,
                image_url: imageUrl,
                variant_id: null,
                variant_label: null,
                quantity: 1,
              },
              1,
            )
          }
        >
          THÊM VÀO GIỎ
        </button>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [products, setProducts] = useState<ApiProduct[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<string>('default')
  const [maxPrice, setMaxPrice] = useState(100000000)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [wishSet, setWishSet] = useState<Set<number>>(() => new Set())
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const hasAuth = !!token

  useEffect(() => {
    if (!hasAuth) {
      return
    }
    fetchWishlist(token)
      .then((items) => setWishSet(new Set(items.map((i) => i.product_id))))
      .catch(() => setWishSet(new Set()))
  }, [hasAuth, token])

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
    fetchCategories().then(setCategories).catch(console.error)
  }, [])

  useEffect(() => {
    queueMicrotask(() => setLoading(true))
    const params: Record<string, unknown> = {
      search: query || undefined,
      page,
      limit: 12,
      max_price: maxPrice,
    }
    if (selectedCatId) params.category_id = selectedCatId
    if (selectedBrand) params.brand = selectedBrand
    
    if (sort === 'price-asc') { params.sort = 'price'; params.order = 'asc' }
    if (sort === 'price-desc') { params.sort = 'price'; params.order = 'desc' }

    fetchProducts(params)
      .then(res => {
        setProducts(res.data)
        setLastPage(res.last_page)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [query, selectedCatId, sort, page, maxPrice, selectedBrand])

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
      <div className="ppContainer">
        <div className="ppMainGrid">
          <aside className="ppSidebarNew">
            <div className="ppSidebarSection">
              <h2 className="ppSidebarLabel">BỘ LỌC</h2>
              
              <div className="ppFilterGroup">
                <h3 className="ppFilterTitle">DANH MỤC</h3>
                <div className="ppCheckboxList">
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
                </div>
              </div>

              <div className="ppFilterGroup">
                <h3 className="ppFilterTitle">MỨC GIÁ</h3>
                <div className="ppPriceRangeWrap">
                  <input 
                    type="range" 
                    className="ppPriceRange" 
                    min="0" 
                    max="100000000" 
                    step="500000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                  />
                  <div className="ppPriceLabels">
                    <span>0 đ</span>
                    <span>Tối đa {maxPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
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
                <p className="ppCategorySub">Thiết bị công nghệ được tuyển chọn, phục vụ công việc và đời sống hiện đại.</p>
              </div>
              <div className="ppHeaderRight">
                <div className="ppSearchWrap">
                  <input 
                    type="text" 
                    className="ppSearchInput" 
                    placeholder="Tìm kiếm sản phẩm…" 
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

                <div className="ppSortWrap">
                  <span className="ppSortText">SẮP XẾP:</span>
                  <select className="ppSortSelectNew" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="default">Nổi bật</option>
                    <option value="price-asc">Giá: thấp → cao</option>
                    <option value="price-desc">Giá: cao → thấp</option>
                  </select>
                </div>
              </div>
            </header>

            {loading ? (
              <div className="ppLoading">Đang tải sản phẩm…</div>
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

            <div className="ppPagination">
              <button 
                className="ppPagBtn" 
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >&lt;</button>
              
              {[...Array(lastPage)].map((_, i) => (
                <button 
                  key={i} 
                  className={`ppPagBtn ${page === i + 1 ? 'ppPagBtn--active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {(i + 1).toString().padStart(2, '0')}
                </button>
              ))}

              <button 
                className="ppPagBtn"
                disabled={page >= lastPage}
                onClick={() => setPage(p => p + 1)}
              >&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
