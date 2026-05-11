import { useNavigate } from 'react-router-dom'
import '../css_pages/AboutPage.css'

const ABOUT_HERO_BANNER_URL =
  (import.meta.env.VITE_ABOUT_HERO_BANNER_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1800&q=80'

const ABOUT_STORY_IMAGE_URL =
  (import.meta.env.VITE_ABOUT_STORY_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80'

function IconSpark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l1.2 6.2L19 10l-5.8 1.8L12 18l-1.2-6.2L5 10l5.8-1.8L12 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 12.2l1.6 1.6 3.6-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconCpu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <main className="abPage">
      <div className="abInner">
        <section className="abHero" aria-label="Giới thiệu E-Tech Market">
          <img className="abHeroImg" src={ABOUT_HERO_BANNER_URL} alt="" loading="lazy" />
          <div className="abHeroTint" aria-hidden="true" />
          <div className="abHeroTopTag">PREMIUM HIGH-TECH GEAR</div>
          <div className="abHeroContent">
            <h1 className="abHeroTitle">Tầm Nhìn &amp; Sứ Mệnh</h1>
            <p className="abHeroLead">
              E-Tech Market hướng tới việc trở thành thương hiệu dẫn đầu trong ngành công nghệ, mang đến giải pháp mua
              sắm tiện lợi, tin cậy và tối ưu chi phí cho người tiêu dùng Việt Nam. Chúng tôi không chỉ bán sản phẩm,
              chúng tôi cung cấp trải nghiệm.
            </p>
            <div className="abHeroActions">
              <button type="button" className="abBtnPrimary" onClick={() => navigate('/products')}>
                Khám phá sản phẩm
              </button>
              <button type="button" className="abBtnGhost" onClick={() => navigate('/contact')}>
                Liên hệ chúng tôi
              </button>
            </div>
          </div>
        </section>

        <section className="abSection" aria-label="Câu chuyện thương hiệu">
          <div className="abStoryGrid">
            <div>
              <h2 className="abSectionTitle">Câu Chuyện Thương Hiệu</h2>
              <div className="abProse">
                <p>
                  E-Tech Market được sinh ra từ niềm đam mê công nghệ và khát khao mang trải nghiệm mua sắm minh bạch,
                  chính xác đến với khách hàng. Chúng tôi tuyển chọn sản phẩm theo tiêu chí hiệu năng – độ bền – giá trị
                  sử dụng thực tế.
                </p>
                <p>
                  Chúng tôi tin rằng công nghệ không chỉ là thiết bị, mà là cách cuộc sống trở nên thuận tiện hơn. Mỗi
                  sản phẩm trên kệ E-Tech Market đều được chọn để giải quyết một nhu cầu rõ ràng, tối ưu cho từng nhóm
                  người dùng.
                </p>
              </div>
            </div>
            <figure className="abStoryMedia">
              <img src={ABOUT_STORY_IMAGE_URL} alt="" loading="lazy" />
            </figure>
          </div>
        </section>

        <section className="abSection" aria-label="Giá trị cốt lõi">
          <div className="abValuesWrap">
            <h2 className="abSectionTitle" style={{ marginBottom: 10 }}>
              Giá Trị Cốt Lõi
            </h2>
            <p className="abValuesSub">Những nguyên tắc định hình bản sắc và cách chúng tôi phục vụ khách hàng.</p>

            <div className="abValuesGrid">
              <div className="abValueCard">
                <div className="abValueIcon" aria-hidden="true">
                  <IconSpark />
                </div>
                <h3 className="abValueTitle">Chất Lượng</h3>
                <p className="abValueDesc">
                  Chúng tôi ưu tiên sản phẩm bền bỉ, hiệu năng ổn định và có nguồn gốc rõ ràng.
                </p>
              </div>

              <div className="abValueCard">
                <div className="abValueIcon" aria-hidden="true">
                  <IconShield />
                </div>
                <h3 className="abValueTitle">Uy Tín</h3>
                <p className="abValueDesc">
                  Minh bạch giá, chính sách, hỗ trợ và chăm sóc sau bán hàng để bạn yên tâm lâu dài.
                </p>
              </div>

              <div className="abValueCard">
                <div className="abValueIcon" aria-hidden="true">
                  <IconCpu />
                </div>
                <h3 className="abValueTitle">Công Nghệ</h3>
                <p className="abValueDesc">
                  Luôn cập nhật xu hướng, tối ưu trải nghiệm số và chọn giải pháp phù hợp nhất cho bạn.
                </p>
              </div>
            </div>
          </div>

          <div className="abStatsBand" aria-label="Thống kê">
            <div className="abStatsInner">
              <div className="abStat">
                <p className="abStatNum">500k+</p>
                <p className="abStatLabel">Khách hàng tin dùng</p>
              </div>
              <div className="abStat">
                <p className="abStatNum">10k+</p>
                <p className="abStatLabel">Sản phẩm chính hãng</p>
              </div>
              <div className="abStat">
                <p className="abStatNum">50+</p>
                <p className="abStatLabel">Đối tác chiến lược</p>
              </div>
              <div className="abStat">
                <p className="abStatNum">99%</p>
                <p className="abStatLabel">Đánh giá hài lòng</p>
              </div>
            </div>
          </div>
        </section>

        <section className="abCta" aria-label="Kêu gọi hành động">
          <h2 className="abCtaTitle">Bạn đã sẵn sàng nâng cấp trải nghiệm công nghệ?</h2>
          <p className="abCtaSub">
            Đồng hành cùng E-Tech Market để khám phá những thiết bị công nghệ đỉnh cao của thế hệ mới.
          </p>
          <div className="abCtaActions">
            <button type="button" className="abBtnPrimary" onClick={() => navigate('/products')}>
              Mua sắm ngay
            </button>
            <button type="button" className="abBtnGhost" onClick={() => navigate('/contact')}>
              Liên hệ chúng tôi
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

