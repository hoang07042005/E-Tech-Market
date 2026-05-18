import { useNavigate } from 'react-router-dom'
import { useLegalDocToc } from '@/hooks/useLegalDocToc'
import '@/styles/pages/TermsOfServicePage.css'

/** Ảnh banner mục 01: `.env` → `VITE_TERMS_BANNER_IMAGE_URL` */
const TERMS_BANNER_IMAGE_URL =
  (import.meta.env.VITE_TERMS_BANNER_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1400&q=80'

/** Ảnh trang trí sidebar: `.env` → `VITE_TERMS_SIDEBAR_IMAGE_URL` */
const TERMS_SIDEBAR_IMAGE_URL =
  (import.meta.env.VITE_TERMS_SIDEBAR_IMAGE_URL as string | undefined)?.trim() ||
  'https://lh3.googleusercontent.com/aida/ADBb0uhHZ_5pRbpgtwJmsvqPlInCJ0xszaBAGlhnvFV6MmoprOJFk8cOzTKk363dkrBMfuuMy6C4MI6uglBXY7ngltTSXv7O-acEAv3yIOzuZZDBi9nRU0ijC77KiCNzVnjYx9Luy4rT3J2f6ImDm-jkqdlRoSidOwHQnrtPBvXCfXHoyquWt6aqNaZYmLZc-yHtwHVD-65QUJCu7EIqL917PA1C2MF2ZEkqEF1_9CwZUS9IFsKGzipaaI5CCRY'

const SECTION_IDS = ['tos-s1', 'tos-s2', 'tos-s3', 'tos-s4', 'tos-s5'] as const

const TOC = [
  { id: SECTION_IDS[0], num: '01', title: 'Giới thiệu' },
  { id: SECTION_IDS[1], num: '02', title: 'Trách nhiệm tài khoản' },
  { id: SECTION_IDS[2], num: '03', title: 'Sở hữu trí tuệ' },
  { id: SECTION_IDS[3], num: '04', title: 'Giới hạn trách nhiệm' },
  { id: SECTION_IDS[4], num: '05', title: 'Luật áp dụng' },
] as const

function IconCheckCircle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.85" />
      <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
    </svg>
  )
}

function IconXCircle() {
  return (
    <svg className="tosRiskIcon" width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="#dc2626" strokeWidth="1.65" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="#dc2626" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  )
}

export default function TermsOfServicePage() {
  const navigate = useNavigate()
  const { activeId, scrollToId } = useLegalDocToc(SECTION_IDS)

  function acceptTerms() {
    try {
      localStorage.setItem('termsAcceptedAt', new Date().toISOString())
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
            Điều khoản <span className="tosHeroTitleAccent">Dịch vụ</span>
          </h1>
          <p className="tosHeroMeta">
            Cập nhật lần cuối: 24 tháng 10, 2026. Vui lòng đọc kỹ các điều khoản này trước khi sử dụng nền tảng E-TECH MARKET.
          </p>
        </div>
      </header>

      <div className="tosLayoutOuter">
        <div className="tosMainGrid">
          <aside className="tosAside">
            <nav className="tosNav" aria-labelledby="tos-nav-heading">
              <p id="tos-nav-heading" className="tosAsideLabel">
                Điều hướng
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
            <section id="tos-s1" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">01</span> Giới thiệu
              </h2>
              <div className="tosProse">
                <p>
                  E-TECH MARKET vận hành cửa hàng trực tuyến và các kênh dịch vụ liên quan nhằm cung cấp sản
                  phẩm công nghệ và trải nghiệm mua sắm rõ ràng, minh bạch cho người dùng. Khi truy cập hoặc
                  đặt hàng qua website, bạn đồng ý tuân thủ các điều khoản dịch vụ này cùng chính sách bảo
                  mật đi kèm.
                </p>
                <p>
                  Để tiếp tục, bạn được giả định đã đủ năng lực pháp lý và năng lực hành vi dân sự theo quy định
                  hiện hành. Nếu bạn là người dùng đại diện cho tổ chức, bạn khẳng định mình được ủy quyền ràng buộc
                  tổ chức đó với các điều khoản dưới đây.
                </p>
              </div>
              <div className="tosBanner" role="presentation">
                <img src={TERMS_BANNER_IMAGE_URL} alt="" loading="lazy" />
                <div className="tosBannerOverlay">
                  <span className="tosBannerTag">PREMIUM HIGH TECH GEAR · E-TECH MARKET</span>
                </div>
              </div>
            </section>

            <section id="tos-s2" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">02</span> Trách nhiệm tài khoản
              </h2>
              <ul className="tosIconList">
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    <IconCheckCircle />
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Tính chính xác của thông tin</h3>
                    <p className="tosIconItemDesc">
                      Thông tin đăng ký, địa chỉ giao hàng và liên lạc cần trung thực. Sai lệch có thể ảnh hưởng
                      đến xử lý đơn hàng, hoàn tiền hoặc bảo hành.
                    </p>
                  </div>
                </li>
                <li className="tosIconItem">
                  <span className="tosIconBadge" aria-hidden="true">
                    <IconLock />
                  </span>
                  <div>
                    <h3 className="tosIconItemTitle">Tiêu chuẩn bảo mật</h3>
                    <p className="tosIconItemDesc">
                      Bạn chịu trách nhiệm bảo mật phiên đăng nhập, mật khẩu và thông tin xác thực của mình,
                      không chia sẻ cho bên thứ ba. Hãy thông báo cho chúng tôi ngay khi có dấu hiệu chiếm dụng
                      tài khoản trái phép.
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            <section id="tos-s3" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">03</span> Sở hữu trí tuệ
              </h2>
              <div className="tosQuotePanel">
                <blockquote>&ldquo;Sự chính xác là nền tảng của bản sắc thương hiệu chúng tôi.&rdquo;</blockquote>
                <div className="tosProse">
                  <p>
                    Mọi nội dung hiển thị — bao gồm nhãn hiệu, giao diện, logo, ảnh sản phẩm được chọn lọc, mô
                    tả bố cục trang và tài nguyên số — đều thuộc quyền sở hữu của E-TECH MARKET hoặc bên được
                    cấp phép phù hợp. Không được sao chép, hiểu sai lệch là tài nguyên thương mại tự do nếu
                    không có văn bản đồng ý của chúng tôi.
                  </p>
                </div>
              </div>
            </section>

            <section id="tos-s4" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">04</span> Giới hạn trách nhiệm
              </h2>
              <div className="tosProse">
                <p>
                  Trong giới hạn pháp luật cho phép, chúng tôi không chịu trách nhiệm với các tổn thất gián tiếp
                  hay hệ quả (ví dụ mất dữ liệu, gián đoạn kinh doanh) phát sinh từ việc ngắt kết nối mạng, thiết
                  bị kết cuối, hoặc hành vi của bệ phóng và dịch vụ bên thứ ba tích hợp không do chúng tôi trực
                  tiếp kiểm soát.
                </p>
              </div>
              <div className="tosRiskGrid">
                <div className="tosRiskCard">
                  <IconXCircle />
                  <div>
                    <p className="tosRiskTitle">Truy cập hệ thống trái phép</p>
                  </div>
                </div>
                <div className="tosRiskCard">
                  <IconXCircle />
                  <div>
                    <p className="tosRiskTitle">Hành vi nền tảng của bên thứ ba</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="tos-s5" className="tosSection">
              <h2 className="tosSectionHead">
                <span className="tosSectionNum">05</span> Luật áp dụng
              </h2>
              <div className="tosProse">
                <p>
                  Các điều khoản này được giải thích và điều chỉnh theo luật pháp Việt Nam. Tranh chấp (nếu có)
                  ưu tiên được giải quyết thông qua đối thoại và thương lượng; trường hợp không đạt, thẩm quyền
                  giải quyết thuộc tòa án có thẩm quyền theo quy định.
                </p>
              </div>
            </section>

            <div className="tosActions">
              <button type="button" className="tosBtnPrimary" onClick={acceptTerms}>
                Tôi chấp nhận Điều khoản
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
