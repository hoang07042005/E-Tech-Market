import { useNavigate } from 'react-router-dom'
import { useLegalDocToc } from '@/hooks/useLegalDocToc'
import '@/styles/pages/TermsOfServicePage.css' // We can reuse the same CSS

const TERMS_BANNER_IMAGE_URL =
  (import.meta.env.VITE_TERMS_BANNER_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1400&q=80'

const TERMS_SIDEBAR_IMAGE_URL =
  (import.meta.env.VITE_TERMS_SIDEBAR_IMAGE_URL as string | undefined)?.trim() ||
  'https://lh3.googleusercontent.com/aida/ADBb0uhHZ_5pRbpgtwJmsvqPlInCJ0xszaBAGlhnvFV6MmoprOJFk8cOzTKk363dkrBMfuuMy6C4MI6uglBXY7ngltTSXv7O-acEAv3yIOzuZZDBi9nRU0ijC77KiCNzVnjYx9Luy4rT3J2f6ImDm-jkqdlRoSidOwHQnrtPBvXCfXHoyquWt6aqNaZYmLZc-yHtwHVD-65QUJCu7EIqL917PA1C2MF2ZEkqEF1_9CwZUS9IFsKGzipaaI5CCRY'

const SECTION_IDS = ['tos-s1', 'tos-s2', 'tos-s3', 'tos-s4', 'tos-s5', 'tos-s6', 'tos-s7'] as const

const TOC = [
  { id: SECTION_IDS[0], num: '01', title: 'Giới thiệu chung' },
  { id: SECTION_IDS[1], num: '02', title: 'Quy trình đặt hàng' },
  { id: SECTION_IDS[2], num: '03', title: 'Giá cả & Thanh toán' },
  { id: SECTION_IDS[3], num: '04', title: 'Giao hàng & Vận chuyển' },
  { id: SECTION_IDS[4], num: '05', title: 'Đổi trả & Hoàn tiền' },
  { id: SECTION_IDS[5], num: '06', title: 'Bảo mật thông tin' },
  { id: SECTION_IDS[6], num: '07', title: 'Hỗ trợ khách hàng' },
] as const

export default function PurchaseTermsPage() {
  const navigate = useNavigate()
  const { activeId, scrollToId } = useLegalDocToc(SECTION_IDS)

  function acceptTerms() {
    try {
      localStorage.setItem('purchaseTermsAcceptedAt', new Date().toISOString())
    } catch {
      /* noop */
    }
    const ref = typeof document !== 'undefined' ? document.referrer : ''
    if (ref.includes(window.location.host) && window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  function downloadPdf() {
    window.print()
  }

  return (
    <main className="tosPage" id="tos-root">
      <header className="tosHero">
        <div className="tosHeroInner">
          <h1 className="tosHeroTitle">
            Điều khoản <span className="tosHeroTitleAccent">Mua hàng</span>
          </h1>
          <p className="tosHeroMeta">
            Cập nhật lần cuối: 24 tháng 10, 2026. Vui lòng đọc kỹ các điều khoản dưới đây trước khi thực hiện giao dịch để đảm bảo quyền lợi tối ưu của bạn.
          </p>
        </div>
      </header>

      <div className="tosLayoutOuter">
        <div className="tosMainGrid">
          <aside className="tosAside">
            <nav className="tosNav" aria-labelledby="tos-nav-heading">
              <p id="tos-nav-heading" className="tosAsideLabel">
                Mục lục
              </p>
              <ul className="tosToc">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={activeId === item.id ? 'location' : undefined}
                      className={
                        activeId === item.id ? 'tosTocBtn tosTocBtnActive' : 'tosTocBtn'
                      }
                      onClick={() => scrollToId(item.id)}
                    >
                      <span className="tosTocPrefix">{item.num}.</span>{' '}
                      <span className="tosTocTitle">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="tosAsidePhoto">
              <img src={TERMS_SIDEBAR_IMAGE_URL} alt="" loading="lazy" />
            </div>
          </aside>

          <article className="tosArticle">
            {/* 1. Giới thiệu chung */}
            <section id="tos-s1" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">01</span> Giới thiệu chung
              </h2>
              <div className="tosProse">
                <p>
                  Điều khoản mua hàng này quy định các nguyên tắc, quyền lợi và trách nhiệm của khách hàng khi thực hiện mua sắm tại e-tech market. Bằng việc đặt hàng, bạn xác nhận đã đọc, hiểu và đồng ý với các điều khoản này.
                </p>
                <p>
                  Chúng tôi cam kết cung cấp các sản phẩm công nghệ chính hãng, đạt chuẩn chất lượng quốc tế và luôn nỗ lực mang lại trải nghiệm mua sắm tốt nhất cho người dùng.
                </p>
              </div>
              <div className="tosBanner" role="presentation">
                <img src={TERMS_BANNER_IMAGE_URL} alt="" loading="lazy" />
                <div className="tosBannerOverlay">
                  <span className="tosBannerTag">PREMIUM HIGH TECH GEAR · E-TECH MARKET</span>
                </div>
              </div>
            </section>

            {/* 2. Quy trình đặt hàng */}
            <section id="tos-s2" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">02</span> Quy trình đặt hàng
              </h2>
              <ul className="tosIconList">
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    1
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Chọn sản phẩm</h3>
                    <p className="tosIconItemDesc">Tìm kiếm và thêm sản phẩm vào giỏ hàng cá nhân.</p>
                  </div>
                </li>
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    2
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Xác nhận thông tin</h3>
                    <p className="tosIconItemDesc">Điền thông tin giao hàng và chọn phương thức thanh toán.</p>
                  </div>
                </li>
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    3
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Hoàn tất đơn hàng</h3>
                    <p className="tosIconItemDesc">Hệ thống gửi email xác nhận và bắt đầu xử lý vận chuyển.</p>
                  </div>
                </li>
              </ul>
              <div className="tosProse" style={{ marginTop: '24px' }}>
                <p>e-tech market có quyền từ chối hoặc hủy đơn hàng nếu có dấu hiệu gian lận hoặc sai sót về giá niêm yết do lỗi hệ thống.</p>
              </div>
            </section>

            {/* 3. Giá cả & Thanh toán */}
            <section id="tos-s3" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">03</span> Giá cả & Thanh toán
              </h2>
              <ul className="tosIconList">
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    <IconCheckCircle />
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Giá cả minh bạch</h3>
                    <p className="tosIconItemDesc">
                      Tất cả giá sản phẩm đã bao gồm thuế GTGT (VAT) trừ khi có ghi chú khác.
                    </p>
                  </div>
                </li>
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    <IconCheckCircle />
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Phương thức thanh toán linh hoạt</h3>
                    <p className="tosIconItemDesc">
                      Hỗ trợ Thẻ tín dụng (Visa, Mastercard), Chuyển khoản ngân hàng và các ví điện tử phổ biến (Momo, ZaloPay, VNPay).
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            {/* 4. Giao hàng & Vận chuyển */}
            <section id="tos-s4" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">04</span> Giao hàng & Vận chuyển
              </h2>
              <div className="tosProse">
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Khu vực</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Thời gian dự kiến</th>
                      <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Phí vận chuyển</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Nội thành (Hà Nội/HCM)</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>24h - 48h</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a' }}>Miễn phí</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 16px' }}>Các tỉnh thành khác</td>
                      <td style={{ padding: '12px 16px' }}>3 - 5 ngày làm việc</td>
                      <td style={{ padding: '12px 16px' }}>Theo đơn vị vận chuyển</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ fontStyle: 'italic', fontSize: '14px', marginTop: '8px', color: '#64748b' }}>
                  * Thời gian giao hàng có thể thay đổi tùy thuộc vào điều kiện thời tiết hoặc các yếu tố khách quan từ phía đơn vị vận chuyển.
                </p>
              </div>
            </section>

            {/* 5. Đổi trả & Hoàn tiền */}
            <section id="tos-s5" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">05</span> Đổi trả & Hoàn tiền
              </h2>
              <div className="tosRiskGrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tosRiskCard" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                     <span style={{ width: '8px', height: '8px', backgroundColor: '#0f172a', borderRadius: '50%' }}></span>
                     <h3 className="tosRiskTitle" style={{ margin: 0 }}>Chính sách Đổi trả</h3>
                  </div>
                  <ul className="tosProse" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                    <li>Đổi mới trong vòng 7 ngày nếu có lỗi kỹ thuật.</li>
                    <li>Sản phẩm phải còn nguyên seal, hộp và phụ kiện.</li>
                    <li>Không áp dụng với các sản phẩm tiêu hao hoặc phần mềm.</li>
                  </ul>
                </div>
                <div className="tosRiskCard" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                     <span style={{ width: '8px', height: '8px', backgroundColor: '#0f172a', borderRadius: '50%' }}></span>
                     <h3 className="tosRiskTitle" style={{ margin: 0 }}>Chính sách Hoàn tiền</h3>
                  </div>
                  <ul className="tosProse" style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0 }}>
                    <li>Hoàn tiền 100% nếu sản phẩm không đúng mô tả.</li>
                    <li>Tiền sẽ được hoàn về phương thức thanh toán ban đầu.</li>
                    <li>Thời gian xử lý từ 3-7 ngày làm việc.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 6. Bảo mật thông tin */}
            <section id="tos-s6" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">06</span> Bảo mật thông tin
              </h2>
              <div className="tosProse">
                <p>
                  Chúng tôi coi trọng việc bảo vệ dữ liệu cá nhân của bạn. Thông tin khách hàng chỉ được sử dụng cho mục đích xác nhận đơn hàng, giao nhận và nâng cao dịch vụ chăm sóc khách hàng.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 12px', backgroundColor: '#f1f5f9', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>SSL ENCRYPTED</span>
                  <span style={{ padding: '4px 12px', backgroundColor: '#f1f5f9', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>GDPR COMPLIANT</span>
                  <span style={{ padding: '4px 12px', backgroundColor: '#f1f5f9', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>SECURE PAYMENT</span>
                </div>
              </div>
            </section>

            {/* 7. Hỗ trợ khách hàng */}
            <section id="tos-s7" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">07</span> Hỗ trợ khách hàng
              </h2>
              <div className="tosProse" style={{ marginBottom: '24px' }}>
                <p>
                  Mọi thắc mắc về điều khoản hoặc cần hỗ trợ về đơn hàng, vui lòng liên hệ với chúng tôi qua các kênh sau:
                </p>
              </div>
              <div className="tosRiskGrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tosRiskCard" style={{ padding: '24px' }}>
                  <IconPhone />
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Hotline 24/7</p>
                    <p className="tosRiskTitle" style={{ fontSize: '18px' }}>1900 8888</p>
                  </div>
                </div>
                <div className="tosRiskCard" style={{ padding: '24px' }}>
                  <IconMail />
                  <div>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Email hỗ trợ</p>
                    <p className="tosRiskTitle" style={{ fontSize: '18px' }}>support@etech.com</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="tosActions">
              <button type="button" className="tosBtnPrimary" onClick={acceptTerms}>
                Tôi đã hiểu và chấp nhận
              </button>
              <button type="button" className="tosBtnGhost" onClick={downloadPdf}>
                Tải xuống PDF
              </button>
            </div>
          </article>
        </div>
      </div>
    </main>
  )
}

function IconCheckCircle() {return (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
function IconPhone() {return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
function IconMail() {return (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
