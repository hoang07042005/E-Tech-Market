import { useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/ComplaintPolicyPage.css'

type StoreContactPayload = {
  store_name: string
  contact_email: string
  contact_phone: string
  warehouse_address: string
}



const commitmentItems = [
  {
    title: 'Công bằng',
    desc: 'Xem xét mọi vấn đề dựa trên thực tế và quyền lợi chính đáng của khách hàng.',
  },
  {
    title: 'Minh bạch',
    desc: 'Thông báo rõ ràng các bước xử lý và kết quả xác minh.',
  },
  {
    title: 'Trách nhiệm',
    desc: 'Luôn đứng ra giải quyết đến khi đạt được sự thống nhất tối ưu.',
  },
]

const processSteps = [
  {
    title: 'Bước 1',
    subtitle: 'Tiếp nhận yêu cầu',
    desc: 'Qua Hotline, Email hoặc Trực tuyến.',
    icon: 'contact_support',
  },
  {
    title: 'Bước 2',
    subtitle: 'Xác minh thông tin',
    desc: 'Phân tích dữ liệu trong 24-48 giờ.',
    icon: 'rule_folder',
  },
  {
    title: 'Bước 3',
    subtitle: 'Đề xuất phương án',
    desc: 'Đưa ra giải pháp hỗ trợ tốt nhất.',
    icon: 'lightbulb',
  },
  {
    title: 'Bước 4',
    subtitle: 'Hoàn tất & Chăm sóc',
    desc: 'Thực hiện cam kết và hậu mãi.',
    icon: 'volunteer_activism',
  },
]

function BreadcrumbIcon() {
  return (
    <svg className="complaintBreadcrumbIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Icon({ name }: { name: string }) {
  const iconMap: Record<string, ReactNode> = {
    contact_support: (
      <path d="M17 9a4 4 0 1 0-8 0 4 4 0 0 0 4 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    rule_folder: (
      <path d="M4 4h6l2 2h8v12H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    lightbulb: (
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.9V16h8v-2.1A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    volunteer_activism: (
      <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    verified_user: (
      <path d="M12 3l7 3v5c0 4.2-2.8 8-7 9-4.2-1-7-4.8-7-9V6l7-3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    schedule: (
      <path d="M12 7v5l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    engineering: (
      <path d="M7 17l4-4 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    phone_in_talk: (
      <path d="M5 5a2 2 0 0 1 2-2h1.4a1 1 0 0 1 .95.68l1 2.8a1 1 0 0 1-.28.96L8 9s.9 2 2 3l1.6-1.6a1 1 0 0 1 .96-.28l2.8 1a1 1 0 0 1 .68.95V17a2 2 0 0 1-2 2h-1c-4.9 0-9-4.1-9-9v-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    mail: (
      <>
        <path d="M4 7h16v10H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m4 8 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    forum: (
      <path d="M6 8h12M6 12h8M6 16h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
    check_circle: (
      <path d="M7 12l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" className="complaintIconSvg">{iconMap[name]}</svg>
}

export default function ComplaintPolicyPage() {
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
  const displayEmail = storeContact?.contact_email?.trim() || 'support@etechmarket.vn'

  const activeChannels = [
    {
      icon: 'phone_in_talk',
      label: 'Hotline 24/7',
      value: displayPhone,
    },
    {
      icon: 'mail',
      label: 'Email hỗ trợ',
      value: displayEmail,
    },
    {
      icon: 'forum',
      label: 'Trò chuyện trực tiếp',
      value: 'Live Chat trên Website',
    },
  ]

  return (
    <main className="complaintPage">
      <div className="complaintContainer">
        <section className="complaintHeroCard">
          <div className="complaintHeroContent">
            <nav className="complaintBreadcrumb" aria-label="Breadcrumb">
              <a href="/">Trang chủ</a>
              <BreadcrumbIcon />
              <span>Chính sách khiếu nại</span>
            </nav>

            <div className="complaintEyebrow">Cam kết &amp; hỗ trợ khách hàng</div>
            <h1 className="complaintTitle">Giải quyết khiếu nại</h1>
            <p className="complaintLead">
              Tại {displayStoreName}, sự hài lòng của bạn là ưu tiên hàng đầu. Chúng tôi cam kết lắng nghe và giải quyết mọi vướng mắc một cách công bằng, nhanh chóng và minh bạch nhất.
            </p>
            <div className="complaintUpdatePill">
              <span className="complaintUpdateIcon">update</span>
              <span>Cập nhật lần cuối: 24/05/2024</span>
            </div>
          </div>

          <div className="complaintHeroVisual">
            <img
              alt="Hỗ trợ khách hàng"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-rTYHvZbrIal1c9ZKagseMS-RxDkYEld0VxMBvyWRszbnXezI0Sh5x6TDISDD2aoy4FX7J17LVowEQkGr081oRvV81iUEaKHcbyfciVHRpRjGOZ2N_Agv59mbNQet1UJvZbo9YwsW5nOTiiH1e2AyCym70sQVZBv3KTBABEWZQyU6dqsrEVEtsEwBFA_WjITRVgAFngUqSchNmmdRkfmscbpNdFJ8wJIvP8qtrU4II5PagoIWbPk_6YxcEUAyqyVygL02VEm8vjg"
            />
          </div>
        </section>

        <div className="complaintLayout">
          <div className="complaintMain">
            <section className="complaintCard">
              <div className="complaintSectionHeader">
                <div className="complaintSectionIconWrap">
                  <Icon name="verified_user" />
                </div>
                <div>
                  <p className="complaintSectionLabel">Cam kết tiếp nhận</p>
                  <h2>Thấu hiểu và Đồng hành</h2>
                </div>
              </div>

              <p className="complaintText">
                {displayStoreName} luôn coi trọng mọi ý kiến đóng góp và khiếu nại từ khách hàng. Chúng tôi hiểu rằng trong quá trình vận hành các thiết bị công nghệ phức tạp, đôi khi sẽ có những trải nghiệm không mong muốn xảy ra.
              </p>

              <div className="complaintCommitmentList">
                {commitmentItems.map((item) => (
                  <div className="complaintCommitmentItem" key={item.title}>
                    <div className="complaintCommitmentIcon">
                      <Icon name="check_circle" />
                    </div>
                    <div>
                      <strong>{item.title}:</strong> {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="complaintCard">
              <div className="complaintSectionHeader centered">
                <div>
                  <p className="complaintSectionLabel">Quy trình giải quyết</p>
                  <h2>Quy trình giải quyết khiếu nại</h2>
                </div>
              </div>

              <div className="complaintStepGrid">
                {processSteps.map((step, index) => (
                  <div className="complaintStepCard" key={step.title}>
                    <div className="complaintStepIcon">
                      <Icon name={step.icon} />
                    </div>
                    <div className="complaintStepIndex">{index + 1}</div>
                    <h3>{step.title}</h3>
                    <p className="complaintStepSubtitle">{step.subtitle}</p>
                    <p className="complaintStepDesc">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="complaintCard complaintTimelineCard">
              <div className="complaintSectionHeader">
                <div className="complaintSectionIconWrap">
                  <Icon name="schedule" />
                </div>
                <div>
                  <p className="complaintSectionLabel">Thời gian xử lý</p>
                  <h2>Thời gian xử lý</h2>
                </div>
              </div>

              <p className="complaintText">
                Mọi khiếu nại thông thường sẽ được xử lý dứt điểm trong vòng <strong>3 đến 7 ngày làm việc</strong>. Đối với các trường hợp phức tạp liên quan đến nhà sản xuất quốc tế hoặc lỗi kỹ thuật sâu, chúng tôi sẽ thông báo cụ thể lộ trình xử lý cho quý khách.
              </p>
            </section>
          </div>

          <aside className="complaintAside">
            <div className="complaintSidebarCard">
              <p className="complaintSectionLabel">Kênh tiếp nhận chính thức</p>
              <h2>Kênh tiếp nhận chính thức</h2>
              <div className="complaintChannelList">
                {activeChannels.map((channel) => (
                  <div className="complaintChannelItem" key={channel.label}>
                    <div className="complaintChannelIcon">
                      <Icon name={channel.icon} />
                    </div>
                    <div>
                      <p>{channel.label}</p>
                      <strong style={{ whiteSpace: 'pre-line' }}>{channel.value}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="complaintSidebarCard complaintNeedHelpCard">
              <h2>Cần hỗ trợ ngay?</h2>
              <p className="complaintText">
                Hãy gửi yêu cầu chi tiết để chúng tôi có thể giúp đỡ bạn nhanh nhất.
              </p>
              <button type="button" className="complaintSupportButton">
                Gửi yêu cầu hỗ trợ ngay
                <span className="complaintButtonArrow">→</span>
              </button>
              <p className="complaintHint">Phản hồi trung bình: 15 phút</p>
            </div>

            <div className="complaintBentoCard">
              <div className="complaintBentoGlow">
                <Icon name="engineering" />
              </div>
              <p className="complaintBentoLabel">Bảo hành chính hãng</p>
              <h3>Bảo hành chính hãng</h3>
              <p>Chúng tôi liên kết trực tiếp với các trung tâm bảo hành từ Apple, Samsung, Dell...</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
