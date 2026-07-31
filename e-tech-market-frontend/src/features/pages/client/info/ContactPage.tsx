import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/ContactPage.css'

const CONTACT_BANNER_URL =
  (import.meta.env.VITE_CONTACT_BANNER_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80'

/** Embed src cho Google Maps – có thể override bằng env nếu cần */
const CONTACT_MAP_EMBED_URL =
  (import.meta.env.VITE_CONTACT_MAP_EMBED_URL as string | undefined)?.trim() || ''

/** Khi không tải được API hoặc trường trống trong cài đặt admin */
const FALLBACK_ADDRESS =
  'Số 123 Đường Công Nghệ, Phường Bến Nghé,\nQuận 1, TP. Hồ Chí Minh'
const FALLBACK_PHONE = '1900 8888 (24/7)\n028 7300 1234'
const FALLBACK_EMAIL = 'support@etechmarket.vn\ncontact@etechmarket.vn'
const FALLBACK_STORE_NAME = 'E-Tech Market'

type StoreContactPayload = {
  store_name: string
  contact_email: string
  contact_phone: string
  warehouse_address: string
}

export default function ContactPage() {
  const [storeContact, setStoreContact] = useState<StoreContactPayload | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.phone.trim().length > 0 &&
      form.message.trim().length > 0
    )
  }, [form])

  useEffect(() => {
    let cancelled = false
      ; (async () => {
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

  const displayStoreName = storeContact?.store_name?.trim() || FALLBACK_STORE_NAME
  const displayAddress = storeContact?.warehouse_address?.trim() || FALLBACK_ADDRESS
  const displayPhone = storeContact?.contact_phone?.trim() || FALLBACK_PHONE
  const displayEmail = storeContact?.contact_email?.trim() || FALLBACK_EMAIL

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiFetch('/contact/messages', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      })
      setSubmitted(true)
      window.setTimeout(() => setSubmitted(false), 4200)
      setForm((s) => ({ ...s, message: '' }))
    } catch (e2) {
      setSubmitError(e2 instanceof Error ? e2.message : 'Gửi liên hệ thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="ctPage">
      <div className="ctInner">
        <section className="ctHero" aria-label="Liên hệ E-Tech Market">
          <img className="ctHeroImg" src={CONTACT_BANNER_URL} alt="" loading="lazy" />
          <div className="ctHeroTint" aria-hidden="true" />
          <div className="ctHeroTopTag">
            <span style={{ color: '#f97316', marginRight: 8, fontSize: '1.2em' }}>➢</span>
            LIÊN HỆ VỚI E-TECH MARKET
          </div>
          <div className="ctHeroContent">
            <h1 className="ctHeroTitle">Chúng tôi luôn sẵn sàng<br/>hỗ trợ bạn!</h1>
            <p className="ctHeroLead">
              Đội ngũ chuyên nghiệp của {displayStoreName} luôn sẵn sàng giải đáp mọi thắc mắc của bạn và cung cấp dịch vụ tốt nhất.
            </p>
          </div>
        </section>
        

        <section className="ctGrid" aria-label="Biểu mẫu và thông tin liên hệ">
          <div className="ctCard">
            <div className="ctCardPad">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ color: '#f97316' }}><IconPaperPlane /></span>
                <h2 className="ctCardTitle" style={{ margin: 0 }}>Gửi tin nhắn cho chúng tôi</h2>
              </div>
              <p className="ctCardSub">Hãy để lại thông tin, chúng tôi sẽ phản hồi bạn trong vòng 24 giờ làm việc.</p>

              <form onSubmit={onSubmit}>
                <div className="ctFormGrid">
                  <div className="ctField">
                    <label className="ctLabel">Họ và tên <span className="ctRequired">*</span></label>
                    <div className="ctInputWrapper">
                      <span className="ctInputIcon"><IconUser /></span>
                      <input
                        className="ctInput hasIcon"
                        value={form.name}
                        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Nhập họ và tên"
                        required
                      />
                    </div>
                  </div>
                  <div className="ctField">
                    <label className="ctLabel">Địa chỉ email <span className="ctRequired">*</span></label>
                    <div className="ctInputWrapper">
                      <span className="ctInputIcon"><IconMailForm /></span>
                      <input
                        className="ctInput hasIcon"
                        value={form.email}
                        onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                        placeholder="example@email.com"
                        type="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="ctField">
                    <label className="ctLabel">Số điện thoại <span className="ctRequired">*</span></label>
                    <div className="ctInputWrapper">
                      <span className="ctInputIcon"><IconPhoneForm /></span>
                      <input
                        className="ctInput hasIcon"
                        value={form.phone}
                        onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                        placeholder="0901 234 567"
                        required
                      />
                    </div>
                  </div>
                  <div className="ctField">
                    <label className="ctLabel">Chủ đề <span className="ctRequired">*</span></label>
                    <div className="ctInputWrapper">
                      <select
                        className="ctSelect"
                        value={form.subject}
                        onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                      >
                        <option value="" disabled hidden>Chọn chủ đề</option>
                        <option>Hỗ trợ kỹ thuật</option>
                        <option>Đổi trả / Bảo hành</option>
                        <option>Thanh toán / Đơn hàng</option>
                        <option>Hợp tác / Doanh nghiệp</option>
                      </select>
                    </div>
                  </div>

                  <div className="ctField ctFieldFull">
                    <label className="ctLabel">Nội dung tin nhắn <span className="ctRequired">*</span></label>
                    <textarea
                      className="ctTextarea"
                      value={form.message}
                      onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                      placeholder="Bạn cần chúng tôi giúp điều gì?"
                      required
                    />
                  </div>
                </div>

                <div className="ctFormFooter">
                  <div className="ctSecurityNote">
                    <IconShield />
                    <span>Thông tin của bạn được bảo mật tuyệt đối.</span>
                  </div>
                  <button className="ctBtn" type="submit" disabled={!canSubmit || submitting}>
                    <IconPaperPlaneBtn /> {submitting ? 'ĐANG GỬI…' : 'GỬI YÊU CẦU'}
                  </button>
                </div>

                {submitted && <div className="ctSuccess">Đã gửi yêu cầu. Chúng tôi sẽ liên hệ bạn sớm.</div>}
                {submitError && <div className="ctSuccess" style={{ color: '#b91c1c', borderColor: 'rgba(239,68,68,.25)', background: 'rgba(239,68,68,.08)' }}>{submitError}</div>}
              </form>
            </div>
          </div>

          <div className="ctInfoStack">
            <div className="ctCard">
              <div className="ctCardPad">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ color: '#f97316' }}><IconContactBook /></span>
                  <h2 className="ctCardTitle" style={{ margin: 0 }}>Thông tin liên hệ</h2>
                </div>
                <div className="ctInfoRow">
                  <span className="ctInfoIcon" aria-hidden="true">
                    <IconPin />
                  </span>
                  <div>
                    <p className="ctInfoKey">Địa chỉ trụ sở</p>
                    <p className="ctInfoVal" style={{ whiteSpace: 'pre-line' }}>
                      {displayAddress}
                    </p>
                  </div>
                </div>
                <div className="ctInfoRow">
                  <span className="ctInfoIcon" aria-hidden="true">
                    <IconPhone />
                  </span>
                  <div>
                    <p className="ctInfoKey">Số hotline</p>
                    <p className="ctInfoVal" style={{ whiteSpace: 'pre-line' }}>
                      {displayPhone}
                    </p>
                  </div>
                </div>
                <div className="ctInfoRow">
                  <span className="ctInfoIcon" aria-hidden="true">
                    <IconMail />
                  </span>
                  <div>
                    <p className="ctInfoKey">Email hỗ trợ</p>
                    <p className="ctInfoVal" style={{ whiteSpace: 'pre-line' }}>
                      {displayEmail}
                    </p>
                  </div>
                </div>
                <div className="ctInfoRow">
                  <span className="ctInfoIcon" aria-hidden="true">
                    <IconClock />
                  </span>
                  <div>
                    <p className="ctInfoKey">Giờ làm việc</p>
                    <p className="ctInfoVal">
                      Thứ 2 - Chủ nhật: 8:00 - 22:00
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, marginTop: 12 }}>
                  <p className="ctInfoKey" style={{ marginBottom: 10 }}>
                    Kết nối với chúng tôi
                  </p>
                  <div className="ctSocialRow" aria-label="Liên kết mạng xã hội">
                    <button type="button" className="ctSocialBtn" aria-label="Facebook">
                      <IconFacebook />
                    </button>
                    <button type="button" className="ctSocialBtn" aria-label="Zalo">
                      <IconZalo />
                    </button>
                    <button type="button" className="ctSocialBtn" aria-label="YouTube">
                      <IconYouTube />
                    </button>
                    <button type="button" className="ctSocialBtn" aria-label="TikTok">
                      <IconTikTok />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ctMapSection" aria-label="Bản đồ vị trí cửa hàng">
          <div className="ctMap">
            <iframe
              className="ctMapFrame"
              src={
                CONTACT_MAP_EMBED_URL ||
                `https://maps.google.com/maps?q=${encodeURIComponent(displayAddress)}&output=embed&z=15`
              }
              title="Bản đồ vị trí E-Tech Market"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            
            <div className="ctMapOverlayCard">
              <div className="ctMapOverlayContent">
                <span className="ctMapOverlayIcon">
                  <IconLocationMarker />
                </span>
                <div>
                  <h3 className="ctMapOverlayTitle">{displayStoreName}</h3>
                  <p className="ctMapOverlayAddress">{displayAddress}</p>
                </div>
              </div>
              <a
                className="ctMapOverlayBtn"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chỉ đường <IconArrowRight />
              </a>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}




function IconPin() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"stroke="currentColor"strokeWidth="1.7"/><path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"stroke="currentColor"strokeWidth="1.7"/></svg>)}
function IconPhone() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-5.97-5.97A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.6 2.62a2 2 0 0 1-.45 2.11L8.1 9.6a16 16 0 0 0 6.3 6.3l1.15-1.13a2 2 0 0 1 2.11-.45c.84.28 1.72.48 2.62.6A2 2 0 0 1 22 16.9Z"stroke="currentColor"strokeWidth="1.7"strokeLinejoin="round"/></svg>)}
function IconMail() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="1.7" /><path d="M4 6l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>)}

function IconPaperPlane() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>; }
function IconUser() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>; }
function IconMailForm() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>; }
function IconPhoneForm() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>; }
function IconShield() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>; }
function IconPaperPlaneBtn() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>; }
function IconContactBook() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><path d="M8 7h6"></path><path d="M8 11h8"></path></svg>; }
function IconClock() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>; }
function IconLocationMarker() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>; }
function IconArrowRight() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>; }

function IconFacebook() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>; }
function IconZalo() { return <span style={{fontWeight: 'bold', fontSize: '12px'}}>Z</span>; }
function IconYouTube() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>; }
function IconTikTok() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.25-.13 2.54-.69 3.69-.97 1.98-2.92 3.42-5.12 3.8-2.22.38-4.6-.04-6.39-1.44-2.15-1.67-3.23-4.52-2.61-7.18.57-2.45 2.45-4.51 4.88-5.3 1.34-.44 2.82-.48 4.2-.18V12.7c-1.13-.19-2.31.02-3.24.69-1.2.85-1.83 2.37-1.61 3.82.2 1.25.99 2.4 2.1 3.01 1.2.66 2.7.67 3.91.07 1.35-.67 2.18-2.13 2.18-3.66V0h3.84zM12.525.02"/></svg>; }
