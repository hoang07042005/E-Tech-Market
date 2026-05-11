import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../css_pages/CartPage.css'
import { API_BASE_URL } from '../../lib/api'
import { fetchProducts, type Product as ApiProduct } from '../../lib/products'

import {
  cartCount,
  cartTotal,
  getCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  type CartState,
} from '../../lib/cart'

function formatVnd(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`
}

function resolveImageUrl(url: string | null | undefined) {
  if (!url) return 'https://via.placeholder.com/400'
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  if (!path.startsWith('/storage/')) return `${API_BASE_URL}/storage${path}`
  return `${API_BASE_URL}${path}`
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 6l1 16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-16" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 11v7M14 11v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 7V6a6 6 0 0 1 12 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 7.5h15l-1.2 14a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8l-1.2-14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 11v0.01M15 11v0.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartState>(() => getCart())
  const [suggested, setSuggested] = useState<ApiProduct[]>([])

  useEffect(() => {
    const onChange = () => setCart(getCart())
    window.addEventListener('cart-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('cart-change', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchProducts({ page: 1, per_page: 6 })
      .then((res) => {
        if (!cancelled) setSuggested(Array.isArray(res.data) ? res.data.slice(0, 6) : [])
      })
      .catch(() => {
        if (!cancelled) setSuggested([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totalQty = useMemo(() => cartCount(cart), [cart])
  const totalPrice = useMemo(() => cartTotal(cart), [cart])

  return (
    <div className="cartPage">
      <div className="cartContainer">
        <div className="cartHeader">
          <div>
            <div className="cartBreadcrumb">
              <Link to="/products">Sản phẩm</Link>
              <span className="sep">/</span>
              <span>Giỏ hàng</span>
            </div>
            <h1 className="cartTitle">Giỏ hàng</h1>
            <div className="cartSub">Kiểm tra lại sản phẩm trước khi thanh toán.</div>
          </div>
          <div className="cartHeaderRight">
            <span className="cartMeta">{totalQty} sản phẩm</span>
            {cart.items.length > 0 && (
              <button type="button" className="cartClearBtn" onClick={() => clearCart()}>
                <TrashIcon /> Xoá tất cả
              </button>
            )}
          </div>
        </div>

        {cart.items.length === 0 ? (
          <>
            <div className="cartEmpty">
              <div className="cartEmptyIcon" aria-hidden="true">
                <BagIcon />
              </div>
              <div className="cartEmptyTitle">Giỏ hàng của bạn đang trống</div>
              <div className="cartEmptyDesc">
                Hãy chọn thêm sản phẩm bạn yêu thích. Gợi ý bên dưới có thể phù hợp với bạn.
              </div>
              <Link to="/products" className="cartEmptyBtn">Quay lại cửa hàng</Link>
            </div>

            <section className="cartSuggest">
              <div className="cartSuggestHead">
                <h2 className="cartSuggestTitle">Sản phẩm gợi ý</h2>
                <Link to="/products" className="cartSuggestLink">Xem thêm</Link>
              </div>
              <div className="ppProductGridNew cartSuggestGrid">
                {suggested.slice(0, 6).map((p) => (
                  <div key={p.id} className="ppCardNew">
                    <Link to={`/products/${p.slug}`} className="ppCardImageWrap">
                      <img
                        className="ppCardImg"
                        src={resolveImageUrl(p.main_image_url)}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>
                    <div className="ppCardContent">
                      <div className="ppCardTopRow">
                        <span className="ppCardBrand">{(p.brand || 'TECH').toUpperCase()}</span>
                        <span className="ppCardPrice">{formatVnd(Number.parseFloat(p.price || '0'))}</span>
                      </div>
                      <Link to={`/products/${p.slug}`} className="ppCardTitleLink">
                        <h3 className="ppCardTitle">{p.name}</h3>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="cartGrid">
              <div className="cartList">
              <div className="cartListHead">
                <div className="hideMd">Ảnh</div>
                <div className="hideMd">Sản phẩm</div>
                <div className="hideSm">Đơn giá</div>
                <div className="hideMd">Số lượng</div>
                <div className="hideSm">Thành tiền</div>
                <div className="hideMd">Xoá</div>
              </div>
              {cart.items.map((it) => (
                <div key={it.key} className="cartItem">
                  <div className="cartItemImgWrap">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.name} className="cartItemImg" />
                    ) : (
                      <div className="cartItemImgPlaceholder" />
                    )}
                  </div>

                  <div className="cartItemBody">
                    <Link to={`/products/${it.slug}`} className="cartItemName">
                      {it.name}
                    </Link>
                    {it.variant_label && <div className="cartItemVariant">{it.variant_label}</div>}
                    <div className="cartItemPriceSm">{formatVnd(it.price)}</div>
                  </div>

                  <div className="cartUnit hideSm">{formatVnd(it.price)}</div>

                  <div className="cartQty">
                    <button
                      type="button"
                      className="cartQtyBtn"
                      onClick={() => updateCartQuantity(it.key, it.quantity - 1)}
                      disabled={it.quantity <= 1}
                      aria-label="Giảm số lượng"
                    >
                      <MinusIcon />
                    </button>
                    <input
                      className="cartQtyInput"
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => updateCartQuantity(it.key, Number(e.target.value))}
                      aria-label="Số lượng"
                    />
                    <button
                      type="button"
                      className="cartQtyBtn"
                      onClick={() => updateCartQuantity(it.key, it.quantity + 1)}
                      aria-label="Tăng số lượng"
                    >
                      <PlusIcon />
                    </button>
                  </div>

                  <div className="cartLine hideSm">{formatVnd(it.price * it.quantity)}</div>

                  <button type="button" className="cartRemoveBtn" onClick={() => removeFromCart(it.key)} aria-label="Xoá sản phẩm">
                    <TrashIcon />
                  </button>
                </div>
              ))}
                <div className="cartFooterBar">
                  <div className="cartFooterLeft">
                    <span className="cartFooterLabel">Tổng tiền</span>
                    <span className="cartFooterValue">{formatVnd(totalPrice)}</span>
                  </div>
                  <div className="cartFooterRight">
                    <Link to="/products" className="cartBackLinkSmall"> ← Quay lại cửa hàng</Link>
                    <button type="button" className="cartCheckoutBtn" onClick={() => navigate('/checkout')}>
                      Thanh toán
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <section className="cartSuggest">
              <div className="cartSuggestHead">
                <h2 className="cartSuggestTitle">Sản phẩm gợi ý</h2>
                <Link to="/products" className="cartSuggestLink">Xem thêm</Link>
              </div>
              <div className="ppProductGridNew cartSuggestGrid">
                {suggested.slice(0, 6).map((p) => (
                  <div key={p.id} className="ppCardNew">
                    <Link to={`/products/${p.slug}`} className="ppCardImageWrap">
                      <img
                        className="ppCardImg"
                        src={resolveImageUrl(p.main_image_url)}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>
                    <div className="ppCardContent">
                      <div className="ppCardTopRow">
                        <span className="ppCardBrand">{(p.brand || 'TECH').toUpperCase()}</span>
                        <span className="ppCardPrice">{formatVnd(Number.parseFloat(p.price || '0'))}</span>
                      </div>
                      <Link to={`/products/${p.slug}`} className="ppCardTitleLink">
                        <h3 className="ppCardTitle">{p.name}</h3>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

