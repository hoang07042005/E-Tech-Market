import '../css_pages/HomePage.css'
import heroImg from '../../assets/banner.jpg'
import customerImg from '../../assets/customer.png'
import cpuImg from '../../assets/unnamed.png'
import headphonesImg from '../../assets/headphones.png'
import smarthomeImg from '../../assets/smarthome.png'

import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProducts, type Product as ApiProduct } from '../../lib/products'
import { API_BASE_URL, apiFetch } from '../../lib/api'
import { addToCart } from '../../lib/cart'
import FlashSaleSection from './FlashSaleSection'

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/400'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function formatPriceVnd(price: string) {
  const n = Number.parseFloat(price)
  if (!Number.isFinite(n)) return `${price} đ`
  return `${n.toLocaleString('vi-VN')} đ`
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  )
}

function ProductCard({ product }: { product: ApiProduct }) {
  const imageUrl = resolveImageUrl(product.main_image_url)
  const price = Number.parseFloat(product.price)

  return (
    <div className="hpProductCard">
      <Link to={`/products/${product.slug}`} className="hpProductImageWrap">
        <img src={imageUrl} alt={product.name} className="hpProductImage" />
        {product.is_new && <span className="hpBadge hpBadgeNew">MỚI</span>}
        {product.is_featured && <span className="hpBadge hpBadgeDiscount">NỔI BẬT</span>}
      </Link>
      <div className="hpProductInfo">
        <Link to={`/products/${product.slug}`} className="hpProductNameLink">
          <h3 className="hpProductName">{product.name}</h3>
        </Link>
        <div className="hpProductPriceRow">
          <div className="hpPriceGroup">
            <span className="hpProductPrice">{formatPriceVnd(product.price)}</span>
            {product.old_price && (
              <span className="hpProductOldPrice">{formatPriceVnd(product.old_price)}</span>
            )}
          </div>
          <button
            type="button"
            className="hpAddToCartIcon"
            aria-label="Thêm vào giỏ"
            onClick={() => {
              addToCart(
                {
                  product_id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: Number.isFinite(price) ? price : 0,
                  image_url: imageUrl,
                  variant_id: null,
                  variant_label: null,
                  quantity: 1, // ignored by addToCart (overwritten)
                },
                1,
              )
              window.dispatchEvent(new Event('toast', { bubbles: false }))
            }}
          >
            <CartIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  )
}

function ShippingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  )
}

function WarrantyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  )
}

function SupportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
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

export default function HomePage() {
  const navigate = useNavigate()
  const [featuredProducts, setFeaturedProducts] = useState<ApiProduct[]>([])
  const [activeCoupons, setActiveCoupons] = useState<CouponPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetchProducts({ limit: 4, is_featured: 1 }),
      apiFetch<CouponPublic[]>('/api/coupons?exclude_saved=true', { token: localStorage.getItem('token') })
    ])
      .then(([prodRes, couponRes]) => {
        if (active) {
          setFeaturedProducts(prodRes.data)
          if (Array.isArray(couponRes)) setActiveCoupons(couponRes.slice(0, 4))
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

  const saveCoupon = async (code: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('Vui lòng đăng nhập để lưu mã giảm giá!')
      navigate('/login')
      return
    }

    try {
      const res = await apiFetch<{ message: string }>('/api/me/coupons/save', {
        method: 'POST',
        token,
        body: JSON.stringify({ code })
      })
      alert(res.message)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Có lỗi xảy ra khi lưu mã.')
    }
  }

  const onNewsletterSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <div className="hpPage">
      <main className="hpMain">
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

        {activeCoupons.length > 0 && (
          <section className="hpCouponSection">
            <div className="hpContainer">
              <div className="hpCouponHeader">
                <h2 className="hpCouponSectionTitle">🎁 Ưu đãi độc quyền dành cho bạn</h2>
              </div>
              <div className="hpCouponGrid">
                {activeCoupons.map((c) => (
                  <div key={c.id} className="hpCouponCard">
                    <div className="hpCouponCardLeft">
                      <div className="hpCouponValue">
                        {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatPriceVnd(c.value.toString())}`}
                      </div>
                      {c.min_order_amount && (
                        <div className="hpCouponMin">Đơn tối thiểu {formatPriceVnd(c.min_order_amount.toString())}</div>
                      )}
                      <div className="hpCouponCodeBox">{c.code}</div>
                    </div>
                    <div className="hpCouponCardRight">
                      <button 
                        className="hpCouponCopyBtn"
                        onClick={() => saveCoupon(c.code)}
                      >
                        Lưu Mã
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="hpCuratedSection">
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
              <div className="hpCuratedCard hpCuratedCard--wide">
                <img src={customerImg} alt="Máy tính" className="hpCuratedImg" />
                <div className="hpCuratedOverlay">
                  <h3 className="hpCuratedName">Máy tính</h3>
                  <p className="hpCuratedDesc">Hiệu năng đẳng cấp workstation</p>
                </div>
              </div>

              <div className="hpCuratedCard">
                <img src={headphonesImg} alt="Âm thanh" className="hpCuratedImg" />
                <div className="hpCuratedOverlay">
                  <h3 className="hpCuratedName">Âm thanh</h3>
                </div>
              </div>

              <div className="hpCuratedCard">
                <img src={smarthomeImg} alt="Nhà thông minh" className="hpCuratedImg" />
                <div className="hpCuratedOverlay">
                  <h3 className="hpCuratedName">Nhà thông minh</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FlashSaleSection />

        <section className="hpFutureSection">
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

        <section className="hpFeaturedSection">
          <div className="hpContainer">
            <div className="hpSectionHeaderNew">
              <h1 className="hpSectionTitleNew text-center mb-5">Hàng mới &amp; Nổi bật</h1>
              <div className="hpTabs">
                <button type="button" className="hpTab active">
                  Tất cả
                </button>
                <button type="button" className="hpTab">
                  Laptop
                </button>
                <button type="button" className="hpTab">
                  Âm thanh
                </button>
              </div>
            </div>
            <div className="hpProductGrid">
              {loading ? (
                <div className="hpStatusText">Đang tải sản phẩm…</div>
              ) : featuredProducts.length === 0 ? (
                <div className="hpStatusText">Chưa có sản phẩm nổi bật.</div>
              ) : (
                featuredProducts.map((prod) => <ProductCard key={prod.id} product={prod} />)
              )}
            </div>
          </div>
        </section>

        <section className="hpWhyUsSection">
          <div className="hpContainer">
            <div className="hpWhyUsGrid">
              <div className="hpWhyUsItem">
                <div className="hpWhyIcon">
                  <ShippingIcon />
                </div>
                <h3>Miễn phí vận chuyển</h3>
                <p>Áp dụng đơn từ 12 triệu đồng</p>
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

        <section className="hpNewsletterSection">
          <div className="hpContainer">
            <div className="hpNewsletterBox">
              <h2 className="hpNewsletterTitle">Luôn cập nhật tin tức</h2>
              <p className="hpNewsletterDesc">
                Tham gia cộng đồng ưu tiên: ưu đãi sớm cho phiên bản giới hạn và tài liệu kỹ thuật chọn lọc.
              </p>
              <form className="hpNewsletterForm" onSubmit={onNewsletterSubmit}>
                <input type="email" placeholder="ĐỊA CHỈ EMAIL" className="hpNewsletterInput" />
                <button type="submit" className="hpNewsletterBtn">
                  ĐĂNG KÝ
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}