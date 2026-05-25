import { useEffect, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/RefundPolicyPage.css'

type StoreContactPayload = {
  store_name: string
  contact_email: string
  contact_phone: string
  warehouse_address: string
}


const eligibleItems = [
  'Thời hạn yêu cầu trong vòng 07 ngày kể từ ngày nhận hàng.',
  'Sản phẩm còn nguyên vẹn, đầy đủ tem mác, hộp và phụ kiện.',
  'Lỗi kỹ thuật từ nhà sản xuất hoặc hư hại trong quá trình vận chuyển.',
  'Có hóa đơn mua hàng hoặc email xác nhận đơn hàng hợp lệ.',
]

const excludedItems = [
  {
    title: 'Phần mềm & Key',
    desc: 'Các loại mã kích hoạt đã được gửi hoặc sử dụng.',
    icon: 'apps',
  },
  {
    title: 'Thiết bị vệ sinh cá nhân',
    desc: 'Tai nghe in-ear đã bóc seal để đảm bảo vệ sinh.',
    icon: 'earbuds',
  },
]



const paymentTable = [
  ['Thẻ tín dụng/Ghi nợ', '7 - 14 ngày làm việc (Tùy ngân hàng)'],
  ['Ví điện tử (Momo, ZaloPay)', '24 - 48 giờ làm việc'],
  ['Chuyển khoản ngân hàng', '3 - 5 ngày làm việc'],
]

function BreadcrumbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="refundIcon" aria-hidden="true">
      <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function RefundPolicyPage() {
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
  const displayPhone = storeContact?.contact_phone?.trim() || '1900 8181 (8:00 - 21:00)'
  const displayEmail = storeContact?.contact_email?.trim() || 'support@etechmarket.vn'

  const processSteps = [
    {
      title: 'Gửi yêu cầu',
      desc: 'Liên hệ bộ phận CSKH qua email hoặc Hotline để thông báo tình trạng sản phẩm.',
    },
    {
      title: 'Gửi hàng về trung tâm',
      desc: `Đóng gói cẩn thận và gửi sản phẩm về địa chỉ kiểm định của ${displayStoreName}.`,
    },
    {
      title: 'Kiểm định sản phẩm',
      desc: 'Kỹ thuật viên sẽ kiểm tra lỗi trong vòng 48 giờ làm việc kể từ khi nhận hàng.',
    },
    {
      title: 'Xác nhận & Hoàn tiền',
      desc: 'Sau khi duyệt, chúng tôi sẽ tiến hành hoàn tiền theo phương thức bạn chọn.',
    },
  ]

  return (
    <main className="refundPage">
      <div className="refundContainer">
        <nav className="refundBreadcrumb" aria-label="Breadcrumb">
          <a href="/">Trang chủ</a>
          <BreadcrumbIcon />
          <span>Chính sách hoàn tiền</span>
        </nav>

        <div className="refundHero">
          <p className="refundEyebrow">Chính sách &amp; hỗ trợ khách hàng</p>
          <h1 className="refundTitle">Chính sách hoàn tiền</h1>
          <p className="refundLead">
            Cập nhật lần cuối: 24 tháng 5, 2024. {displayStoreName} cam kết hỗ trợ khách hàng một cách minh bạch, nhanh chóng và rõ ràng.
          </p>

          <div className="refundHeroStats">
            <div>
              <strong>07 ngày</strong>
              <span>thời hạn yêu cầu hoàn tiền</span>
            </div>
            <div>
              <strong>48 giờ</strong>
              <span>thời gian kiểm định sản phẩm</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>hỗ trợ khách hàng liên tục</span>
            </div>
          </div>
        </div>

        <div className="refundLayout">
          <div className="refundMain">
            <section className="sectionCard">
              <div className="sectionHeader">
                <span className="sectionIconWrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
                <div>
                  <p className="sectionLabel">1. Điều kiện hoàn tiền</p>
                  <h2>Điều kiện áp dụng</h2>
                </div>
              </div>

              <p className="sectionText">
                Chúng tôi cam kết mang lại sự hài lòng tuyệt đối. Bạn có thể yêu cầu hoàn tiền nếu đáp ứng các tiêu chí sau:
              </p>

              <ul className="sectionList">
                {eligibleItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="sectionCard">
              <div className="sectionHeader">
                <span className="sectionIconWrap muted">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="sectionLabel">2. Sản phẩm không được hoàn tiền</p>
                  <h2>Sản phẩm không áp dụng</h2>
                </div>
              </div>

              <p className="sectionText">
                Một số mặt hàng đặc thù sẽ không được áp dụng chính sách hoàn tiền trừ khi có lỗi kỹ thuật nghiêm trọng:
              </p>

              <div className="excludedGrid">
                {excludedItems.map((item) => (
                  <div className="excludedCard" key={item.title}>
                    <span className="excludedIcon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d={item.icon === 'apps' ? 'M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 11h4v4H4zM10 11h4v4h-4zM16 11h4v4h-4zM4 17h4v4H4zM10 17h4v4h-4zM16 17h4v4h-4z' : 'M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M17 9h4M3 15h4M17 15h4'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <ul className="sectionList compact">
                <li>Sản phẩm khuyến mãi (Clearance Sale) có ghi chú không đổi trả.</li>
                <li>Hư hỏng do người dùng sử dụng sai cách hoặc tự ý can thiệp phần cứng.</li>
              </ul>
            </section>

            <section className="sectionCard">
              <div className="sectionHeader">
                <span className="sectionIconWrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M3 12h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p className="sectionLabel">3. Quy trình hoàn tiền</p>
                  <h2>Quy trình thực hiện</h2>
                </div>
              </div>

              <div className="timeline">
                {processSteps.map((step, index) => (
                  <div className="timelineItem" key={step.title}>
                    <div className="timelineStep">{index + 1}</div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="sectionCard">
              <div className="sectionHeader">
                <span className="sectionIconWrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 9h10M7 13h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <p className="sectionLabel">4. Phương thức và thời gian</p>
                  <h2>Bảng thời gian hoàn tiền</h2>
                </div>
              </div>

              <div className="refundTableWrap">
                <table className="refundTable">
                  <thead>
                    <tr>
                      <th>Phương thức hoàn tiền</th>
                      <th>Thời gian xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentTable.map(([method, time]) => (
                      <tr key={method}>
                        <td>{method}</td>
                        <td>{time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="refundAside">
            <div className="supportCard">
              <p className="supportLabel">Cần hỗ trợ ngay?</p>
              <h2>Đội ngũ kỹ thuật sẵn sàng hỗ trợ</h2>
              <p>
                Đội ngũ của chúng tôi luôn sẵn sàng giải đáp mọi thắc mắc về quy trình hoàn tiền, đổi trả và các vấn đề liên quan.
              </p>
              <div className="supportList">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IconPhone />
                  <span style={{ whiteSpace: 'pre-line' }}>{displayPhone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IconMail />
                  <span style={{ whiteSpace: 'pre-line' }}>{displayEmail}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IconChat />
                  <span>Chat trực tuyến 24/7</span>
                </div>
              </div>
              <button type="button" className="supportBtn">Gửi Ticket Hỗ Trợ</button>
            </div>

            <div className="relatedCard">
              <h2>Chính sách liên quan</h2>
              <div className="relatedLinks">
                <a href="/dieu-khoan">Điều khoản dịch vụ <span>→</span></a>
                <a href="/chinh-sach-bao-mat">Bảo mật thanh toán <span>→</span></a>
                <a href="/chinh-sach-bao-mat-thanh-toan">Chính sách bảo hành <span>→</span></a>
              </div>
            </div>

            <div className="imageCard">
              <div className="imageCardOverlay">
                <p>Customer Service Center</p>
                <span>Chăm sóc khách hàng chuyên nghiệp, tận tâm và đáng tin cậy.</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

/* ==========================================================================
   INLINE REACT SVG ICONS FOR REFUND POLICY
   ========================================================================= */

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--et-primary, #904d00)' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--et-primary, #904d00)' }}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--et-primary, #904d00)' }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
