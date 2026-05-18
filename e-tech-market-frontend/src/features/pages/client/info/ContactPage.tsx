import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/ContactPage.css'

const CONTACT_BANNER_URL =
  (import.meta.env.VITE_CONTACT_BANNER_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80'

const CONTACT_MAP_IMAGE_URL =
  (import.meta.env.VITE_CONTACT_MAP_IMAGE_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80'

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

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-5.97-5.97A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.6 2.62a2 2 0 0 1-.45 2.11L8.1 9.6a16 16 0 0 0 6.3 6.3l1.15-1.13a2 2 0 0 1 2.11-.45c.84.28 1.72.48 2.62.6A2 2 0 0 1 22 16.9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 6l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
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
    subject: 'Hỗ trợ kỹ thuật',
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
          <div className="ctHeroTopTag">PREMIUM HIGH-TECH GEAR</div>
          <div className="ctHeroContent">
            <h1 className="ctHeroTitle">Liên hệ với chúng tôi</h1>
            <p className="ctHeroLead">
              Đội ngũ chuyên gia của {displayStoreName} luôn sẵn sàng giải đáp mọi thắc mắc của bạn về sản phẩm
              &amp; dịch vụ công nghệ hàng đầu.
            </p>
          </div>
        </section>

        <section className="ctGrid" aria-label="Biểu mẫu và thông tin liên hệ">
          <div className="ctCard">
            <div className="ctCardPad">
              <h2 className="ctCardTitle">Gửi tin nhắn cho chúng tôi</h2>
              <p className="ctCardSub">Hãy để lại thông tin, chúng tôi sẽ phản hồi bạn trong vòng 24 giờ làm việc.</p>

              <form onSubmit={onSubmit}>
                <div className="ctFormGrid">
                  <div className="ctField">
                    <label className="ctLabel">Họ và tên</label>
                    <input
                      className="ctInput"
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  <div className="ctField">
                    <label className="ctLabel">Địa chỉ Email</label>
                    <input
                      className="ctInput"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="example@email.com"
                      type="email"
                      required
                    />
                  </div>

                  <div className="ctField">
                    <label className="ctLabel">Số điện thoại</label>
                    <input
                      className="ctInput"
                      value={form.phone}
                      onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="0901 234 567"
                      required
                    />
                  </div>
                  <div className="ctField">
                    <label className="ctLabel">Chủ đề</label>
                    <select
                      className="ctSelect"
                      value={form.subject}
                      onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                    >
                      <option>Hỗ trợ kỹ thuật</option>
                      <option>Đổi trả / Bảo hành</option>
                      <option>Thanh toán / Đơn hàng</option>
                      <option>Hợp tác / Doanh nghiệp</option>
                    </select>
                  </div>

                  <div className="ctField ctFieldFull">
                    <label className="ctLabel">Nội dung tin nhắn</label>
                    <textarea
                      className="ctTextarea"
                      value={form.message}
                      onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                      placeholder="Bạn cần chúng tôi giúp điều gì?"
                      required
                    />
                  </div>
                </div>

                <button className="ctBtn" type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
                </button>

                {submitted && <div className="ctSuccess">Đã gửi yêu cầu. Chúng tôi sẽ liên hệ bạn sớm.</div>}
                {submitError && <div className="ctSuccess" style={{ color: '#b91c1c', borderColor: 'rgba(239,68,68,.25)', background: 'rgba(239,68,68,.08)' }}>{submitError}</div>}
              </form>
            </div>
          </div>

          <div className="ctInfoStack">
            <div className="ctCard">
              <div className="ctCardPad">
                <h2 className="ctCardTitle">Thông tin liên hệ</h2>
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

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, marginTop: 12 }}>
                  <p className="ctInfoKey" style={{ marginBottom: 10 }}>
                    Kết nối với chúng tôi
                  </p>
                  <div className="ctSocialRow" aria-label="Liên kết mạng xã hội">
                    <button type="button" className="ctSocialBtn" aria-label="Facebook">
                      f
                    </button>
                    <button type="button" className="ctSocialBtn" aria-label="Zalo">
                      z
                    </button>
                    <button type="button" className="ctSocialBtn" aria-label="Chat">
                      …
                    </button>
                    <button type="button" className="ctSocialBtn" aria-label="Mail">
                      @
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="ctMap" aria-label="Bản đồ">
              <img className="ctMapImg" src={CONTACT_MAP_IMAGE_URL} alt="" loading="lazy" />
              <div className="ctMapPill">
                <span className="ctMapDot" aria-hidden="true" />
                Tìm đường đến {displayStoreName}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

