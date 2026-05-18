import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '@/styles/pages/ProductsPage.css'
import '@/styles/pages/WishlistPage.css'
import { fetchWishlist, toggleWishlist, type WishlistItem } from '@/features/services/wishlist.service'
import { API_BASE_URL } from '@/configs/api.config'
import type { Product } from '@/features/services/products.service'
import Skeleton from '@/components/Skeleton'

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/400'
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  if (!path.startsWith('/storage/')) return `${API_BASE_URL}/storage${path}`
  return `${API_BASE_URL}${path}`
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 14h10l1-14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 6h15l-2 9H8L7 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M7 6 6 3H2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function WishlistCard({
  product,
  onRemove,
}: {
  product: Product
  onRemove: (productId: number) => void
}) {
  const imageUrl = resolveImageUrl(product.main_image_url)
  const price = useMemo(() => {
    const activeVariants = (product.variants || []).filter(v => v.is_active)
    if (activeVariants.length > 0) {
      return Math.min(...activeVariants.map(v => v.effective_price))
    }
    return 0
  }, [product.variants])

  return (
    <div className="wlCard">
      <Link to={`/products/${product.slug}`} className="wlCardImgWrap">
        <img src={imageUrl} alt={product.name} className="wlCardImg" loading="lazy" />
        <button
          type="button"
          className="wlCardRemove"
          aria-label="Xóa khỏi yêu thích"
          onClick={(e) => {
            e.preventDefault()
            onRemove(product.id)
          }}
        >
          <TrashIcon />
        </button>
      </Link>

      <div className="wlCardBody">
        <div className="wlCardTop">
          <span className="wlCardBrand">{(product.brand || 'TECH').toUpperCase()}</span>
          <span className="wlCardPrice">{Number.isFinite(price) ? price.toLocaleString('vi-VN') : '0'} đ</span>
        </div>
        <Link to={`/products/${product.slug}`} className="wlCardTitleLink">
          <h3 className="wlCardTitle">{product.name}</h3>
        </Link>
        <p className="wlCardDesc">{product.short_description || product.description || 'Chưa có mô tả.'}</p>

        <button type="button" className="wlCardAddBtn">
          <CartIcon />
          Thêm vào giỏ
        </button>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCatId, setSelectedCatId] = useState<string>('all')
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const hasAuth = !!token

  useEffect(() => {
    if (!hasAuth) {
      navigate('/login')
      return
    }
    fetchWishlist(token)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [hasAuth, navigate, token])

  const products = useMemo(() => items.map((i) => i.product).filter(Boolean) as Product[], [items])

  const categoryFacets = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const p of products) {
      const catId = p.category?.id != null ? String(p.category.id) : 'other'
      const name = (p.category?.name ?? 'Khác').trim() || 'Khác'
      const prev = map.get(catId)
      if (prev) prev.count += 1
      else map.set(catId, { id: catId, name, count: 1 })
    }
    const facets = Array.from(map.values())
      .filter((f) => f.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    return [{ id: 'all', name: 'Tất cả', count: products.length }, ...facets]
  }, [products])

  const filtered = useMemo(() => {
    if (selectedCatId === 'all') return products
    if (selectedCatId === 'other') return products.filter((p) => !p.category?.id)
    const idNum = Number.parseInt(selectedCatId, 10)
    if (!Number.isFinite(idNum)) return products
    return products.filter((p) => p.category?.id === idNum)
  }, [products, selectedCatId])

  async function remove(productId: number) {
    if (!token) return
    try {
      await toggleWishlist(token, productId)
      setItems((prev) => prev.filter((x) => x.product_id !== productId))
    } catch {
      // noop
    }
  }

  async function clearAll() {
    if (!token) return
    const ids = items.map((i) => i.product_id)
    setItems([])
    try {
      await Promise.allSettled(ids.map((id) => toggleWishlist(token, id)))
    } catch {
      // noop
    }
  }

  function WishlistSkeleton() {
    return (
      <div className="wlCard">
        <div className="wlCardImgWrap">
          <Skeleton width="100%" height="180px" borderRadius="12px" />
        </div>
        <div className="wlCardBody">
          <div className="wlCardTop">
            <Skeleton width="60px" height="14px" />
            <Skeleton width="100px" height="18px" />
          </div>
          <Skeleton width="100%" height="22px" style={{ margin: '12px 0 8px' }} />
          <Skeleton width="100%" height="40px" style={{ marginBottom: '16px' }} />
          <Skeleton width="100%" height="48px" borderRadius="10px" />
        </div>
      </div>
    )
  }

  return (
    <main className="wlPage">
      <div className="wlInner">
        <div className="wlBreadcrumb">Trang chủ &rsaquo; Sản phẩm yêu thích</div>

        <div className="wlHeader">
          <div>
            <h1 className="wlTitle">Danh sách yêu thích</h1>
            <p className="wlSub">
              Bạn có <b>{products.length}</b> sản phẩm được lưu trong danh sách.
            </p>
          </div>
          <button type="button" className="wlClearBtn" onClick={clearAll} disabled={products.length === 0}>
            <TrashIcon />
            Xóa tất cả
          </button>
        </div>

        {loading ? (
          <div className="wlGrid">
            <aside className="wlSidebar">
              <div className="wlSideCard">
                <Skeleton width="120px" height="18px" style={{ marginBottom: '20px' }} />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <Skeleton width="100%" height="40px" borderRadius="8px" />
                  </div>
                ))}
              </div>
            </aside>
            <div className="wlCards">
              <div className="wlCardsGrid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <WishlistSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="wlEmpty">
            Chưa có sản phẩm yêu thích. Hãy bấm tim ở danh sách sản phẩm để lưu lại.
          </div>
        ) : (
          <>
            <div className="wlGrid">
              <aside className="wlSidebar">
                <div className="wlSideCard">
                  <div className="wlSideTitle">PHÂN LOẠI</div>
                  {categoryFacets.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={selectedCatId === f.id ? 'wlCatBtn wlCatBtn--active' : 'wlCatBtn'}
                      onClick={() => setSelectedCatId(f.id)}
                    >
                      <span>{f.name}</span>
                      <span className="wlCatCount">{f.count}</span>
                    </button>
                  ))}
                </div>

                <div className="wlPromo">
                  <div className="wlPromoTitle">Ưu đãi hôm nay</div>
                  <div className="wlPromoText">Giảm thêm 500k khi mua từ 2 sản phẩm yêu thích.</div>
                  <Link className="wlPromoLink" to="/products">
                    Xem chi tiết
                  </Link>
                </div>
              </aside>

              <div className="wlCards">
                <div className="wlCardsGrid">
                  {filtered.map((p) => (
                    <WishlistCard key={p.id} product={p} onRemove={remove} />
                  ))}
                </div>
              </div>
            </div>

            <div className="wlBottomBar">
              <div>
                <div className="wlBottomTitle">Bạn đang có một bộ sưu tập tuyệt vời!</div>
                <div className="wlBottomSub">Các sản phẩm trong danh sách này được cập nhật giá tự động khi có chương trình giảm giá.</div>
              </div>
              <div className="wlBottomActions">
                <button type="button" className="wlShareBtn">Chia sẻ danh sách</button>
                <Link to="/products" className="wlContinueBtn">Tiếp tục mua sắm</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

