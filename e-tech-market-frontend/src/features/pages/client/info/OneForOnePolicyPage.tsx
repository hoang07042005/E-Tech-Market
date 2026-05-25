import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/OneForOnePolicyPage.css'

type StoreContactPayload = {
  store_name: string
  contact_email: string
  contact_phone: string
  warehouse_address: string
}

export default function OneForOnePolicyPage() {
  const [storeContact, setStoreContact] = useState<StoreContactPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<StoreContactPayload>('/api/store/contact')
        if (!cancelled) setStoreContact(data)
      } catch {
        if (!cancelled) setStoreContact(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const displayStoreName = storeContact?.store_name?.trim() || 'E-Tech Market'
  const displayPhone = storeContact?.contact_phone?.trim() || '1900 8181'
  const cleanPhone = (storeContact?.contact_phone || '19008181').split(/[\n/(]/)[0].replace(/\s+/g, '')

  return (
    <div className="oneForOnePage">
      <Helmet>
        <title>Chính sách 1 đổi 1 - {displayStoreName}</title>
        <meta name="description" content={`Quy định bảo hành và chính sách đổi trả 1 đổi 1 nhanh chóng, tiện lợi và uy tín tại ${displayStoreName}.`} />
      </Helmet>

      <div className="oneForOneContainer">
        {/* Breadcrumbs */}
        <nav className="oneForOneBreadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="oneForOneBreadcrumbIcon">
            <IconChevronRight size={12} />
          </span>
          <Link to="/contact">Hỗ trợ</Link>
          <span className="oneForOneBreadcrumbIcon">
            <IconChevronRight size={12} />
          </span>
          <span style={{ color: 'var(--et-primary, #904d00)' }}>Chính sách 1 đổi 1</span>
        </nav>

        {/* Hero Section */}
        <section className="oneForOneHero">
          <div className="oneForOneHeroContent">
            <div className="oneForOneEyebrow">
              Dịch vụ khách hàng
            </div>
            <h1 className="oneForOneTitle">Chính sách 1 đổi 1</h1>
            <p className="oneForOneLead">
              Tại {displayStoreName}, sự hài lòng của bạn là ưu tiên hàng đầu. Chúng tôi cam kết mang lại trải nghiệm mua sắm an tâm tuyệt đối với chính sách đổi mới sản phẩm linh hoạt, đảm bảo quyền lợi tối đa cho khách hàng.
            </p>
          </div>
          <div className="oneForOneHeroVisual">
            <img
              className="oneForOneHeroImg"
              alt="A premium retail environment showing a professional customer service desk"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkHdNyP3VcfgDVMDeTr-jCTc7poRhsDjGNEKj1-U76m-YHYwOH73x9FCmEBsaYuFm_LOp4W0ODzc2ls3_s_MUaSylc-UP5EG5r7tWZd6uTTmpEhmchh0z6lS8-OnHKNRkNkKem5LdDX6CPj6qtOc2SHNTg-D9rgv7uEqQo6yTAw3waMa6u3AiLmL7ZhpQYK0hyfZ8VyXIw8XTwz2n3g9oveNemONtMS5upGUiPZGX3CPRE2-k-oZMlHQKmoOD_qQ7PyR-O6l6Bkd0"
            />
          </div>
        </section>

        <div className="oneForOneLayout">
          {/* Main Content Area */}
          <div className="oneForOneMain">
            {/* Section 1: Eligibility */}
            <div className="oneForOneCard">
              <div className="oneForOneSectionHeader">
                <div className="oneForOneSectionIconWrap">
                  <IconVerified />
                </div>
                <h2 className="oneForOneSectionLabel">Điều kiện áp dụng</h2>
              </div>
              <div className="oneForOneEligibilityGrid">
                <div className="oneForOneEligibilityBox">
                  <IconManufacturing />
                  <h3 className="oneForOneEligibilityTitle">Lỗi từ nhà sản xuất</h3>
                  <p className="oneForOneEligibilityDesc">Áp dụng cho các lỗi kỹ thuật, phần cứng phát sinh không do tác động ngoại lực.</p>
                </div>
                <div className="oneForOneEligibilityBox">
                  <IconInventory />
                  <h3 className="oneForOneEligibilityTitle">Nguyên vẹn 100%</h3>
                  <p className="oneForOneEligibilityDesc">Sản phẩm không trầy xước, móp méo, còn nguyên tem niêm phong của hãng.</p>
                </div>
                <div className="oneForOneEligibilityBox">
                  <IconDeployedCode />
                  <h3 className="oneForOneEligibilityTitle">Đầy đủ phụ kiện</h3>
                  <p className="oneForOneEligibilityDesc">Phải có đầy đủ hộp (box), cáp sạc, sách hướng dẫn và quà tặng kèm (nếu có).</p>
                </div>
              </div>
            </div>

            {/* Section 2: Timeframe */}
            <div className="oneForOneTimeframeCard">
              <div className="oneForOneTimeframeInfo">
                <h3>Thời hạn áp dụng</h3>
                <p>An tâm trải nghiệm sản phẩm trong thời gian dài</p>
              </div>
              <div className="oneForOneTimeframeBadge">
                <strong>30 Ngày</strong>
                <span>Kể từ ngày mua hàng</span>
              </div>
            </div>

            {/* Section 3: Process */}
            <div className="oneForOneCard">
              <div className="oneForOneSectionHeader">
                <div className="oneForOneSectionIconWrap">
                  <IconAccountTree />
                </div>
                <h2 className="oneForOneSectionLabel">Quy trình đổi trả</h2>
              </div>
              <div className="oneForOneStepGrid">
                <div className="oneForOneStepCard">
                  <div className="oneForOneStepIndex">1</div>
                  <h3 className="oneForOneStepTitle">Tiếp nhận</h3>
                  <p className="oneForOneStepDesc">Liên hệ hotline hoặc ghé cửa hàng trực tiếp.</p>
                </div>
                <div className="oneForOneStepCard">
                  <div className="oneForOneStepIndex">2</div>
                  <h3 className="oneForOneStepTitle">Kiểm tra</h3>
                  <p className="oneForOneStepDesc">Kỹ thuật viên giám định tình trạng máy.</p>
                </div>
                <div className="oneForOneStepCard">
                  <div className="oneForOneStepIndex">3</div>
                  <h3 className="oneForOneStepTitle">Xác nhận</h3>
                  <p className="oneForOneStepDesc">Chốt phương án đổi mới cho khách hàng.</p>
                </div>
                <div className="oneForOneStepCard">
                  <div className="oneForOneStepIndex">4</div>
                  <h3 className="oneForOneStepTitle">Đổi mới</h3>
                  <p className="oneForOneStepDesc">Bàn giao máy mới 100% nguyên seal.</p>
                </div>
              </div>
            </div>

            {/* Section 4: Exclusions */}
            <div className="oneForOneExclusionsCard">
              <div className="oneForOneSectionHeader">
                <div className="oneForOneSectionIconWrap">
                  <IconReport />
                </div>
                <h2 className="oneForOneSectionLabel">Trường hợp từ chối</h2>
              </div>
              <div className="oneForOneExclusionsGrid">
                <div className="oneForOneExclusionItem">
                  <IconCancel />
                  <div>
                    <h3 className="oneForOneExclusionTitle">Lỗi do người dùng</h3>
                    <p className="oneForOneExclusionDesc">Sản phẩm bị vào nước, rơi vỡ, cháy nổ do sử dụng sai nguồn điện.</p>
                  </div>
                </div>
                <div className="oneForOneExclusionItem">
                  <IconCancel />
                  <div>
                    <h3 className="oneForOneExclusionTitle">Tự ý sửa chữa</h3>
                    <p className="oneForOneExclusionDesc">Sản phẩm đã bị can thiệp phần cứng hoặc mất tem bảo hành.</p>
                  </div>
                </div>
                <div className="oneForOneExclusionItem">
                  <IconCancel />
                  <div>
                    <h3 className="oneForOneExclusionTitle">Mất phụ kiện/Hộp</h3>
                    <p className="oneForOneExclusionDesc">Không còn đầy đủ phụ kiện đi kèm hoặc hộp bị rách nát, mất form.</p>
                  </div>
                </div>
                <div className="oneForOneExclusionItem">
                  <IconCancel />
                  <div>
                    <h3 className="oneForOneExclusionTitle">Biến dạng vật lý</h3>
                    <p className="oneForOneExclusionDesc">Sản phẩm trầy xước nặng, biến dạng so với tình trạng ban đầu.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <aside className="oneForOneAside">
            {/* Support Card */}
            <div className="oneForOneSupportCard">
              <div className="oneForOneAgentIconWrap">
                <IconSupportAgent />
              </div>
              <h4>Cần hỗ trợ?</h4>
              <p>Chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc của bạn 24/7.</p>
              <div className="oneForOneHotlineBox">
                <p className="oneForOneHotlineLabel">Hotline Miễn Phí</p>
                <a className="oneForOneHotlineLink" href={`tel:${cleanPhone}`}>
                  {displayPhone}
                </a>
              </div>
              <Link to="/contact">
                <button className="oneForOneSupportBtn">Gửi yêu cầu hỗ trợ</button>
              </Link>
            </div>

            {/* Related Policy Links */}
            <div className="oneForOneRelatedCard">
              <h4>Thông tin khác</h4>
              <nav className="oneForOneRelatedLinks">
                <Link to="/chinh-sach-hoan-tien">
                  <span>Chính sách hoàn tiền</span>
                  <IconChevronRight size={16} />
                </Link>
                <Link to="/chinh-sach-bao-mat">
                  <span>Chính sách bảo mật</span>
                  <IconChevronRight size={16} />
                </Link>
                <Link to="/dieu-khoan">
                  <span>Điều khoản dịch vụ</span>
                  <IconChevronRight size={16} />
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   INLINE REACT SVG ICONS
   ========================================================================== */

function IconChevronRight({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconVerified() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  )
}

function IconManufacturing() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51-1z" />
    </svg>
  )
}

function IconInventory() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function IconDeployedCode() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}

function IconAccountTree() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 15V9a4 4 0 0 0-4-4H9" />
      <path d="M6 9v6" />
    </svg>
  )
}

function IconReport() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCancel() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function IconSupportAgent() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      <path d="M12 22V12" />
    </svg>
  )
}
