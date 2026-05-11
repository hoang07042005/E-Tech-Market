import { useLegalDocToc } from '../../lib/useLegalDocToc'
import '../css_pages/PrivacyPolicyPage.css'

/** Banner hero: `.env` → `VITE_PRIVACY_BANNER_IMAGE_URL` */
const PP_BANNER_IMAGE_URL =
  (import.meta.env.VITE_PRIVACY_BANNER_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80'

/** Ảnh mục cookie (chia cột): `.env` → `VITE_PRIVACY_SPLIT_IMAGE_URL` */
const PP_SPLIT_IMAGE_URL =
  (import.meta.env.VITE_PRIVACY_SPLIT_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=720&q=80'

const PP_SECTION_IDS = ['pp-s1', 'pp-s2', 'pp-s3', 'pp-s4', 'pp-s5'] as const

const TOC = [
  { id: PP_SECTION_IDS[0], num: '01', title: 'Thu thập dữ liệu' },
  { id: PP_SECTION_IDS[1], num: '02', title: 'Sử dụng thông tin' },
  { id: PP_SECTION_IDS[2], num: '03', title: 'Giao thức cookie' },
  { id: PP_SECTION_IDS[3], num: '04', title: 'Tiết lộ bên thứ ba' },
  { id: PP_SECTION_IDS[4], num: '05', title: 'Quyền của người dùng' },
] as const

function IconDatabase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="7.5" ry="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.5 6.5v11c0 2 15 2 15 0v-11" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4.5 12h15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconFingerprint() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4a14 14 0 0 1 14 14M12 7a11 11 0 0 1 11 11M12 10a8 8 0 0 1 8 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 21a15 15 0 0 1-9-13M6 21a12 12 0 0 1-6-10"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function PrivacyPolicyPage() {
  const { activeId, scrollToId } = useLegalDocToc(PP_SECTION_IDS)

  return (
    <main className="ppPage" id="privacy-root">
      <header className="ppHero">
        <div className="ppHeroInner">
          <div className="ppHeroKicker">
            <span className="ppHeroLine" aria-hidden="true" />
            <p className="ppHeroEyebrow">An ninh &amp; quyền riêng tư</p>
          </div>

          <h1 className="ppHeroTitle">
            Chính sách <span className="ppHeroAccent">bảo mật</span>
          </h1>

          <p className="ppHeroLead">
            E-TECH MARKET cam kết đảm bảo tính toàn vẹn và minh bạch đối với dữ liệu của bạn. Chính sách này
            mô tả cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân khi bạn sử dụng website và
            dịch vụ của chúng tôi.
          </p>

          <div className="ppHeroBanner">
            <img src={PP_BANNER_IMAGE_URL} alt="" loading="lazy" />
            <div className="ppHeroBannerTint" aria-hidden="true" />
            <span className="ppHeroBannerTopTag">PREMIUM HIGH-TECH GEAR</span>
            <span className="ppHeroBadge">Cập nhật lần cuối: tháng 5, 2026</span>
          </div>
        </div>
      </header>

      <div className="ppLayoutOuter">
        <div className="ppMainGrid">
          <aside className="ppAside">
            <nav className="ppNav" aria-labelledby="pp-nav-heading">
              <p id="pp-nav-heading" className="ppNavLabel">
                Điều hướng
              </p>
              <ul className="ppToc">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={activeId === item.id ? 'location' : undefined}
                      className={
                        activeId === item.id ? 'ppTocBtn ppTocBtnActive' : 'ppTocBtn'
                      }
                      onClick={() => scrollToId(item.id)}
                    >
                      {item.num}. {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="ppCtaOrange">
              <h2 className="ppCtaTitle">Cần giải đáp?</h2>
              <p className="ppCtaText">
                Đội ngũ hỗ trợ của chúng tôi sẵn sàng giải đáp thắc mắc về quyền riêng tư và dữ liệu cá nhân.
              </p>
              <a className="ppCtaLink" href="#footer-lien-he">
                Liên hệ đội ngũ
              </a>
            </div>
          </aside>

          <article className="ppArticle">
            <section id="pp-s1" className="ppSection">
              <h2 className="ppSectionHead">
                <span className="ppSecNum">01.</span>{' '}
                <span className="ppSecHeading">Thu thập dữ liệu</span>
              </h2>
              <div className="ppProse">
                <p>
                  Chúng tôi chỉ thu thập các loại thông tin cần thiết để cung cấp dịch vụ cửa hàng: xử lý đơn
                  hàng, giao nhận, hỗ trợ khách hàng và cải thiện trải nghiệm. Dữ liệu không được thu thập với
                  mục đích không rõ hoặc vượt ngoài mục tiêu nêu tại đây.
                </p>
              </div>
              <div className="ppCardGrid2">
                <div className="ppInfoCard">
                  <span className="ppInfoIcon" aria-hidden="true">
                    <IconFingerprint />
                  </span>
                  <div>
                    <h3 className="ppInfoCardTitle">Dữ liệu trực tiếp</h3>
                    <p className="ppInfoCardDesc">
                      Họ tên, email, số điện thoại, địa chỉ giao hàng và các thông tin bạn chủ động cung cấp khi
                      đăng ký, đặt hàng hoặc liên hệ hỗ trợ.
                    </p>
                  </div>
                </div>
                <div className="ppInfoCard">
                  <span className="ppInfoIcon" aria-hidden="true">
                    <IconDatabase />
                  </span>
                  <div>
                    <h3 className="ppInfoCardTitle">Dữ liệu kỹ thuật</h3>
                    <p className="ppInfoCardDesc">
                      Địa chỉ IP, loại thiết bị, trình duyệt, múi giờ và nhật ký giao tiếp cơ bản với server để đảm
                      bảo bảo mật, chống lạm dụng và tối ưu hiệu năng.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="pp-s2" className="ppSection">
              <h2 className="ppSectionHead">
                <span className="ppSecNum">02.</span>{' '}
                <span className="ppSecHeading">Sử dụng thông tin</span>
              </h2>
              <div className="ppProse">
                <p>
                  Thông tin được xử lý trên nguyên tắc tối thiểu hóa, đúng mục đích và được bảo vệ bằng các biện
                  pháp kỹ thuật, tổ chức hợp lý trong phạm vi cho phép của pháp luật.
                </p>
              </div>
              <div className="ppMutedBox">
                <ul className="ppBulletList">
                  <li>Xác nhận và hoàn thiện giao dịch mua sắm, vận chuyển, hóa đơn hoặc bảo hành.</li>
                  <li>Trao đổi tiếp nhận yêu cầu và thông báo liên quan đến tài khoản hoặc đơn đặt hàng của bạn.</li>
                  <li>Đo lường lỗi, bảo trì và cải thiện tốc độ, thiết kế trải nghiệm trên nền tảng của chúng tôi.</li>
                  <li>Tuân thủ nghĩa vụ pháp định, trả lời cơ quan có thẩm quyền khi có căn cứ hợp pháp.</li>
                </ul>
              </div>
            </section>

            <section id="pp-s3" className="ppSection">
              <h2 className="ppSectionHead">
                <span className="ppSecNum">03.</span>{' '}
                <span className="ppSecHeading">Giao thức cookie</span>
              </h2>
              <div className="ppSplit">
                <div className="ppProse">
                  <p>
                    Chúng tôi có thể sử dụng cookie và công nghệ tương tự để ghi nhớ phiên làm việc (ví dụ giỏ
                    hàng, trạng thái đăng nhập) và để đối chiếu lưu vực không nhận biết cá nhân. Trình duyệt của
                    bạn cho phép giới hạn hoặc xóa cookie; một số tính năng của site có thể bị ảnh hưởng nhẹ.
                  </p>
                  <p>
                    Cookie phân tích (nếu có) chỉ được bật khi phù hợp và có thể tắt qua banner hoặc cài đặt
                    trong trình duyệt. Chúng tôi không bán định danh cá nhân của bạn.
                  </p>
                </div>
                <figure className="ppSplitFig">
                  <img src={PP_SPLIT_IMAGE_URL} alt="" loading="lazy" />
                </figure>
              </div>
            </section>

            <section id="pp-s4" className="ppSection">
              <h2 className="ppSectionHead">
                <span className="ppSecNum">04.</span>{' '}
                <span className="ppSecHeading">Tiết lộ bên thứ ba</span>
              </h2>
              <div className="ppProse">
                <p>
                  Việc chia sẻ dữ liệu với nhà cung cấp dịch vụ chỉ diễn ra khi thực sự cần cho luồng giao dịch
                  hoặc vận hành và theo thoả thuận bảo vệ ngang bằng với mức tối thiểu ghi nhận tại đây.
                </p>
              </div>
              <div className="ppTableWrap">
                <table className="ppTable">
                  <thead>
                    <tr>
                      <th scope="col">Danh mục đối tác</th>
                      <th scope="col">Mục đích</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Đơn vị vận chuyển</th>
                      <td>Tạo và theo dõi vận đơn giao nhận, thông báo trạng thái đến khách.</td>
                    </tr>
                    <tr>
                      <th scope="row">Cổng thanh toán</th>
                      <td>Xử lý giao dịch thẻ / ví đã được chứng nhận; chúng tôi không lưu chi tiết thẻ nguyên bản.</td>
                    </tr>
                    <tr>
                      <th scope="row">Hạ tầng &amp; bảo trì</th>
                      <td>Lưu trữ và vận hành máy chủ, nhật ký an ninh và sao lưu dự phòng an toàn.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="pp-s5" className="ppSection">
              <h2 className="ppSectionHead">
                <span className="ppSecNum">05.</span>{' '}
                <span className="ppSecHeading">Quyền của người dùng</span>
              </h2>
              <div className="ppProse">
                <p>
                  Bạn có thể liên hệ chúng tôi để thực hiện các quyền sau trong phạm vi luật hiện hành và tính
                  khả thi kỹ thuật.
                </p>
              </div>
              <div className="ppRightsGrid">
                <div className="ppRightsCell">
                  <h3>Khả năng di chuyển dữ liệu</h3>
                  <p>Yêu cầu một bản dữ liệu bạn cung cấp ở định dạng có cấu trúc và phù hợp nếu quy định cho phép.</p>
                </div>
                <div className="ppRightsCell">
                  <h3>Quyền được xóa bỏ</h3>
                  <p>Được xử lý yêu cầu xóa dữ liệu không cần thiết, trừ trường hợp pháp luật yêu cầu lưu giữ.</p>
                </div>
                <div className="ppRightsCell">
                  <h3>Quyền chỉnh sửa &amp; làm rõ</h3>
                  <p>Cập nhật sai sót trong hồ sơ cá nhân hoặc bổ sung thông tin còn chưa đầy đủ.</p>
                </div>
                <div className="ppRightsCell">
                  <h3>Quyền khiếu nại</h3>
                  <p>Phản ánh các vấn đề xử lý không phù hợp; chúng tôi sẽ kiểm tra và phản hồi theo luồng hỗ trợ có sẵn.</p>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>
    </main>
  )
}
