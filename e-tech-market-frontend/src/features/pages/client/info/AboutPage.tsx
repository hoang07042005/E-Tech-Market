import { useNavigate } from "react-router-dom";
import "@/styles/pages/AboutPage.css";

const ABOUT_HERO_BANNER_URL =
  (import.meta.env.VITE_ABOUT_HERO_BANNER_URL as string | undefined)?.trim() ||
  "https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1800&q=80";

const ABOUT_STORY_IMAGE_URL =
  (import.meta.env.VITE_ABOUT_STORY_IMAGE_URL as string | undefined)?.trim() ||
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80";

const ABOUT_WHY_CHOOSE_US_IMAGE =
  "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80";

const TEAM_MEMBERS = [
  {
    name: "Nguyễn Hoàng Nam",
    role: "CEO & Founder",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Trần Minh Quân",
    role: "Giám đốc Kỹ thuật",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Lê Thu Hương",
    role: "Trưởng phòng CSKH",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Phạm Quốc Bảo",
    role: "Trưởng phòng Marketing",
    image:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=400&q=80",
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <main className="abPage">
      {/* 1. HERO SECTION (DESKTOP LIKE IMAGE) */}
      <section className="abHero" aria-label="Giới thiệu E-Tech Market">
        <img
          className="abHeroImg"
          src={ABOUT_HERO_BANNER_URL}
          alt=""
          loading="lazy"
        />
        <div className="abHeroTint" aria-hidden="true" />

        <div className="abHeroContainer">
          <div className="abHeroContent">
            <div className="abHeroTopTag">Viễn tạo trải Market</div>
            <h1 className="abHeroTitle">
              Kiến tạo trải nghiệm
              <br />
              công nghệ hiện đại
            </h1>
            <p className="abHeroLead">
              Chúng tôi mang đến những sản phẩm công nghệ chính hãng, chất lượng
              cao cùng dịch vụ tận tâm, giúp khách hàng bắt kịp xu hướng và nâng
              tầm trải nghiệm số.
            </p>
            <div className="abHeroActions">
              <button
                type="button"
                className="abBtnPrimary"
                onClick={() => navigate("/products")}
              >
                Khám phá sản phẩm
              </button>
              <button
                type="button"
                className="abBtnGhost"
                onClick={() => navigate("/contact")}
              >
                Liên hệ tư vấn
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="abInner">
        {/* 2. CÂU CHUYỆN THƯƠNG HIỆU */}
        <section className="abSection" aria-label="Câu chuyện thương hiệu">
          <div className="abStoryGrid">
            <figure className="abStoryMedia">
              <img src={ABOUT_STORY_IMAGE_URL} alt="" loading="lazy" />
            </figure>
            <div className="abStoryContent">
              <p className="abEyebrow">CÂU CHUYỆN THƯƠNG HIỆU</p>
              <h2 className="abSectionTitle">Chúng tôi là ai?</h2>
              <div className="abProse">
                <p>
                  E-Tech Market được thành lập với mục tiêu mang đến hệ sinh
                  thái công nghệ chính hãng dành cho mọi khách hàng. Chúng tôi
                  không chỉ cung cấp sản phẩm mà còn mang đến giải pháp, dịch vụ
                  và trải nghiệm mua sắm hiện đại.
                </p>
                <p>
                  Với đội ngũ trẻ trung, đam mê và giàu kinh nghiệm, chúng tôi
                  luôn đặt uy tín và sự hài lòng của khách hàng làm kim chỉ nam
                  cho mọi hoạt động.
                </p>
              </div>
              <div className="abStoryFeatures">
                <div className="abStoryFeat">
                  <span className="abStoryFeatIcon">
                    <IconCheckCircle />
                  </span>
                  <span className="abStoryFeatText">Chính hãng 100%</span>
                </div>
                <div className="abStoryFeat">
                  <span className="abStoryFeatIcon">
                    <IconShieldCheck />
                  </span>
                  <span className="abStoryFeatText">Bảo hành toàn quốc</span>
                </div>
                <div className="abStoryFeat">
                  <span className="abStoryFeatIcon">
                    <IconTag />
                  </span>
                  <span className="abStoryFeatText">Giá cả minh bạch</span>
                </div>
                <div className="abStoryFeat">
                  <span className="abStoryFeatIcon">
                    <IconUserHeadset />
                  </span>
                  <span className="abStoryFeatText">Hỗ trợ tận tâm</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HÀNH TRÌNH PHÁT TRIỂN */}
        <section className="abJourney">
          <h2 className="abSectionTitleCenter">HÀNH TRÌNH PHÁT TRIỂN</h2>
          <div className="abJourneyTimeline">
            <div className="abJourneyLine"></div>
            {[
              {
                year: "2022",
                title: "Thành lập E-Tech Market",
                icon: <IconRocket />,
              },
              {
                year: "2023",
                title: "Mở rộng danh mục hơn 3000 sản phẩm",
                icon: <IconBox />,
              },
              {
                year: "2024",
                title: "Đạt mốc 50.000+ khách hàng tin tưởng",
                icon: <IconUsers />,
              },
              {
                year: "2025",
                title: "Trở thành đối tác của nhiều thương hiệu lớn",
                icon: <IconHandshake />,
              },
              {
                year: "Tương lai",
                title: "Không ngừng đổi mới và phát triển",
                icon: <IconTarget />,
              },
            ].map((step, idx) => (
              <div key={idx} className="abJourneyStep">
                <div className="abJourneyCard">
                  <h3 className="abJourneyYear">{step.year}</h3>
                  <p className="abJourneyText">{step.title}</p>
                </div>
                <div className="abJourneyDot">
                  <div className="abJourneyDotInner"></div>
                </div>
                <div className="abJourneyIcon">{step.icon}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. GIÁ TRỊ CỐT LÕI */}
        <section className="abValuesWrap">
          <h2 className="abSectionTitleCenter">GIÁ TRỊ CỐT LÕI</h2>
          <div className="abValuesGrid">
            {[
              {
                title: "Chất lượng",
                desc: "Cam kết cung cấp sản phẩm chính hãng, chất lượng cao, đảm bảo hiệu năng và độ bền.",
                icon: <IconSpark />,
              },
              {
                title: "Uy tín",
                desc: "Đặt chữ tín lên hàng đầu, minh bạch trong mọi giao dịch, xây dựng niềm tin bền vững.",
                icon: <IconShield />,
              },
              {
                title: "Đổi mới",
                desc: "Không ngừng cập nhật công nghệ mới, đa dạng sản phẩm để phục vụ mọi nhu cầu.",
                icon: <IconCpu />,
              },
              {
                title: "Khách hàng là trung tâm",
                desc: "Lắng nghe, thấu hiểu và mang đến trải nghiệm mua sắm tốt nhất cho từng khách hàng.",
                icon: <IconHeart />,
              },
              {
                title: "Chính hãng",
                desc: "100% sản phẩm có nguồn gốc rõ ràng, đầy đủ chứng từ và bảo hành chính hãng.",
                icon: <IconCertificate />,
              },
              {
                title: "Phát triển bền vững",
                desc: "Hướng đến sự phát triển lâu dài, trách nhiệm với cộng đồng và môi trường.",
                icon: <IconLeaf />,
              },
            ].map((val, idx) => (
              <div key={idx} className="abValueCard">
                <div className="abValueIcon" aria-hidden="true">
                  {val.icon}
                </div>
                <h3 className="abValueTitle">{val.title}</h3>
                <p className="abValueDesc">{val.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. VÌ SAO CHỌN E-TECH MARKET? */}
        <section className="abWhyWrap">
          <h2 className="abSectionTitle" style={{ marginBottom: 32 }}>
            VÌ SAO CHỌN E-TECH MARKET?
          </h2>
          <div className="abWhyGrid">
            <div className="abWhyList">
              {[
                {
                  title: "100% sản phẩm chính hãng",
                  desc: "Cam kết nguồn gốc rõ ràng, bảo hành đầy đủ.",
                  icon: <IconCheckCircle />,
                },
                {
                  title: "Thanh toán linh hoạt",
                  desc: "Nhiều phương thức thanh toán an toàn, tiện lợi.",
                  icon: <IconCreditCard />,
                },
                {
                  title: "Đổi trả dễ dàng",
                  desc: "Hỗ trợ đổi trả trong 7 ngày nếu có lỗi từ nhà sản xuất.",
                  icon: <IconRefresh />,
                },
                {
                  title: "Giao hàng toàn quốc",
                  desc: "Giao hàng nhanh chóng ở mọi nơi.",
                  icon: <IconTruck />,
                },
                {
                  title: "Bảo hành điện tử",
                  desc: "Tra cứu và quản lý bảo hành dễ dàng, nhanh chóng.",
                  icon: <IconShieldCheck />,
                },
                {
                  title: "Hỗ trợ 24/7",
                  desc: "Đội ngũ kỹ thuật và CSKH luôn sẵn sàng hỗ trợ bạn.",
                  icon: <IconUserHeadset />,
                },
              ].map((item, idx) => (
                <div key={idx} className="abWhyItem">
                  <div className="abWhyIcon">{item.icon}</div>
                  <div className="abWhyText">
                    <h4 className="abWhyItemTitle">{item.title}</h4>
                    <p className="abWhyItemDesc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="abWhyMedia">
              <img
                src={ABOUT_WHY_CHOOSE_US_IMAGE}
                alt="Laptop"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* 6. STATS BAND */}
        <section className="abStatsBand">
          <div className="abStatsInner">
            {[
              {
                num: "500K+",
                label: "Khách hàng\ntin tưởng",
                icon: <IconUsers />,
              },
              { num: "10K+", label: "Sản phẩm\nchính hãng", icon: <IconBox /> },
              {
                num: "50+",
                label: "Đối tác\nchiến lược",
                icon: <IconHandshake />,
              },
              {
                num: "99%",
                label: "Khách hàng\nhài lòng",
                icon: <IconThumbUp />,
              },
              {
                num: "24/7",
                label: "Hỗ trợ\nkhách hàng",
                icon: <IconUserHeadset />,
              },
              {
                num: "15+",
                label: "Thương hiệu\nđối tác",
                icon: <IconCertificate />,
              },
            ].map((stat, idx) => (
              <div key={idx} className="abStat">
                <div className="abStatIcon">{stat.icon}</div>
                <div className="abStatContent">
                  <p className="abStatNum">{stat.num}</p>
                  <p className="abStatLabel">
                    {stat.label.split("\n").map((l, i) => (
                      <span key={i}>
                        {l}
                        <br />
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. PARTNERS */}
        <section className="abPartners">
          <h2 className="abSectionTitleCenter">ĐỐI TÁC THƯƠNG HIỆU</h2>
          <div className="abPartnersGrid">
            {[
              "ASUS",
              "MSI",
              "DELL",
              "HP",
              "LENOVO",
              "ACER",
              "SAMSUNG",
              "APPLE",
              "INTEL",
              "AMD",
              "NVIDIA",
              "LOGITECH",
            ].map((brand, idx) => (
              <div key={idx} className="abPartnerLogo">
                <span>{brand}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 8. TEAM */}
        <section className="abTeam">
          <h2 className="abSectionTitleCenter">ĐỘI NGŨ CỦA CHÚNG TÔI</h2>
          <div className="abTeamGrid">
            {TEAM_MEMBERS.map((member, idx) => (
              <div key={idx} className="abTeamMember">
                <div className="abTeamImgWrap">
                  <img src={member.image} alt={member.name} loading="lazy" />
                </div>
                <div className="abTeamInfo">
                  <h3 className="abTeamName">{member.name}</h3>
                  <p className="abTeamRole">{member.role}</p>
                  <div className="abTeamSocial">
                    <span className="abTeamSocialIcon">
                      <IconFacebook />
                    </span>
                    <span className="abTeamSocialIcon">
                      <IconLinkedIn />
                    </span>
                    <span className="abTeamSocialIcon">
                      <IconMailSolid />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. PROCESS */}
        <section className="abProcess">
          <h2 className="abSectionTitleCenter">QUY TRÌNH PHỤC VỤ</h2>
          <div className="abProcessFlow">
            {[
              {
                step: 1,
                title: "Tiếp nhận yêu cầu",
                desc: "Lắng nghe nhu cầu của khách hàng",
                icon: <IconHeadset />,
              },
              {
                step: 2,
                title: "Tư vấn giải pháp",
                desc: "Đề xuất sản phẩm phù hợp",
                icon: <IconLightbulb />,
              },
              {
                step: 3,
                title: "Đặt hàng",
                desc: "Xác nhận đơn hàng và thanh toán",
                icon: <IconCart />,
              },
              {
                step: 4,
                title: "Đóng gói",
                desc: "Sản phẩm được kiểm tra và đóng gói cẩn thận",
                icon: <IconBoxOpen />,
              },
              {
                step: 5,
                title: "Giao hàng",
                desc: "Giao hàng nhanh chóng toàn quốc",
                icon: <IconTruck />,
              },
              {
                step: 6,
                title: "Hỗ trợ sau bán",
                desc: "Đồng hành và hỗ trợ khách hàng 24/7",
                icon: <IconUserHeadset />,
              },
            ].map((p, idx) => (
              <div key={idx} className="abProcessStep">
                <div className="abProcessIconWrap">
                  <div className="abProcessIconInner">{p.icon}</div>
                </div>
                <h4 className="abProcessTitle">
                  <span>{p.step}. </span>
                  {p.title}
                </h4>
                <p className="abProcessDesc">{p.desc}</p>
                {idx < 5 && (
                  <div className="abProcessArrow">
                    <IconArrowRight />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 10. COMMITMENT */}
        <section className="abCommitment">
          <h2 className="abCommitmentTitle">CAM KẾT CỦA CHÚNG TÔI</h2>
          <div className="abCommitmentGrid">
            {[
              { title: "Hàng chính hãng 100%", icon: <IconShieldCheck /> },
              { title: "Giá cạnh tranh minh bạch", icon: <IconCoin /> },
              {
                title: "Hoàn tiền nếu lỗi do nhà sản xuất",
                icon: <IconRefresh />,
              },
              { title: "Bảo mật thông tin khách hàng", icon: <IconLock /> },
              { title: "Hỗ trợ kỹ thuật 24/7", icon: <IconUserHeadset /> },
            ].map((c, idx) => (
              <div key={idx} className="abCommitItem">
                <div className="abCommitIcon">{c.icon}</div>
                <h4 className="abCommitItemTitle">{c.title}</h4>
              </div>
            ))}
          </div>
        </section>

        {/* 11. CTA */}
        <section className="abCta" aria-label="Kêu gọi hành động">
          <div className="abCtaContent">
            <h2 className="abCtaTitle">
              Bạn đã sẵn sàng nâng cấp trải nghiệm công nghệ?
            </h2>
            <p className="abCtaSub">
              Khám phá hàng nghìn sản phẩm công nghệ chính hãng tại E-Tech
              Market
            </p>
            <div className="abCtaActions">
              <button
                type="button"
                className="abBtnPrimary"
                onClick={() => navigate("/products")}
              >
                Mua sắm ngay
              </button>
              <button
                type="button"
                className="abBtnGhost"
                onClick={() => navigate("/contact")}
              >
                Liên hệ tư vấn
              </button>
            </div>
          </div>
          <div className="abCtaImage">
            <img
              src="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=600&q=80"
              alt="Devices"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

// ================= ICONS =================
function IconSpark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l1.2 6.2L19 10l-5.8 1.8L12 18l-1.2-6.2L5 10l5.8-1.8L12 2Z" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z" />
    </svg>
  );
}
function IconCpu() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="14" x2="23" y2="14"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="14" x2="4" y2="14"></line>
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
function IconShieldCheck() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  );
}
function IconTag() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
      <line x1="7" y1="7" x2="7.01" y2="7"></line>
    </svg>
  );
}
function IconUserHeadset() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a8 8 0 0 0-8 8v2a4 4 0 0 0 4 4h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H4"></path>
      <path d="M20 10v2a4 4 0 0 1-4 4h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h5"></path>
      <path d="M12 20a4 4 0 0 0 4-4"></path>
    </svg>
  );
}
function IconRocket() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
    </svg>
  );
}
function IconBox() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}
function IconHandshake() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.827 16.379l-4.242-4.242a2 2 0 0 1 0-2.828l.707-.707a2 2 0 0 1 2.828 0l4.242 4.242"></path>
      <path d="M14.364 12.843l2.121-2.121a2 2 0 0 1 2.828 0l.707.707a2 2 0 0 1 0 2.828l-2.121 2.121"></path>
      <path d="M15.071 9.307l2.828-2.828a2 2 0 0 1 2.828 0l.707.707a2 2 0 0 1 0 2.828l-2.828 2.828"></path>
      <path d="M19.314 5.064l2.121-2.121a2 2 0 0 1 2.828 0l.707.707a2 2 0 0 1 0 2.828l-2.121 2.121"></path>
      <path d="M17.192 10.722l-7.778 7.778a4 4 0 0 1-5.657 0l-.707-.707a4 4 0 0 1 0-5.657l7.778-7.778"></path>
    </svg>
  );
}
function IconTarget() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  );
}
function IconHeart() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );
}
function IconCertificate() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="7"></circle>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
      <line x1="2" y1="22" x2="11" y2="13"></line>
    </svg>
  );
}
function IconCreditCard() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  );
}
function IconTruck() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  );
}
function IconThumbUp() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function IconMailSolid() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}
function IconHeadset() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
    </svg>
  );
}
function IconLightbulb() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6"></path>
      <path d="M10 22h4"></path>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 12 3a4.65 4.65 0 0 0-4.5 4.5c0 1.74.9 3.2 2.31 4.09"></path>
    </svg>
  );
}
function IconCart() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  );
}
function IconBoxOpen() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}
function IconCoin() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="9" y1="12" x2="15" y2="12"></line>
    </svg>
  );
}
function IconLock() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}
