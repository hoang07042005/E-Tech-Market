import { useEffect, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/PolicyPage.css'

type StoreContactPayload = {
  store_name: string
  contact_email: string
  contact_phone: string
  warehouse_address: string
}


export default function PaymentSecurityPolicyPage() {
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
  const displayPhone = storeContact?.contact_phone?.trim() || '1900 8888'
  const displayEmail = storeContact?.contact_email?.trim() || 'support@etechmarket.vn'

  const cleanPhone = (storeContact?.contact_phone || '19008888').split(/[\n/(]/)[0].replace(/\s+/g, '')
  const cleanEmail = (storeContact?.contact_email || 'support@etechmarket.vn').split(/[\n,;]/)[0].trim()

  return (
    <div className="policyPage">
      <div className="policyCard">
        <div className="policyHeader">
          <h1 className="policyTitle">Chính sách bảo mật thanh toán</h1>
          <div className="policyUpdate">Cập nhật lần cuối: 25 tháng 5, 2026</div>
        </div>
        <div className="policySection">
          <div className="policySectionTitle"><span className="policySectionNum">1.</span> Cam kết bảo mật</div>
          <div className="policySectionBody">
            <p>Tại {displayStoreName}, chúng tôi nỗ lực trong mọi tình huống để quyền lợi của quý khách luôn được giữ an toàn. Chúng tôi cam kết không chia sẻ thông tin thanh toán của khách hàng cho bất kỳ bên thứ ba nào, ngoại trừ các đối tác thanh toán được cấp phép.</p>
            <p>Mọi giao dịch đều được mã hóa và bảo vệ bằng các tiêu chuẩn bảo mật cao nhất hiện nay.</p>
          </div>
        </div>
        <div className="policySection">
          <div className="policySectionTitle"><span className="policySectionNum">2.</span> Phương thức thanh toán an toàn</div>
          <div className="policySectionBody">
            <div className="policyPaymentGrid">
              <div className="policyPaymentBox">
                <div className="policyPaymentTitle">Cổng thanh toán Momo</div>
                <div className="policyPaymentDesc">Mã hóa đa lớp, xác thực OTP, bảo vệ tuyệt đối thông tin tài khoản.</div>
              </div>
              <div className="policyPaymentBox">
                <div className="policyPaymentTitle">Tiêu chuẩn 3D Secure</div>
                <div className="policyPaymentDesc">Áp dụng cho thẻ Visa/Master/JCB. Xác thực chủ thẻ qua OTP hoặc Smart OTP.</div>
              </div>
            </div>
            <div className="policyPaymentNote">Đối tác thanh toán uy tín: <span className="policyPaymentTag">Momo</span> <span className="policyPaymentTag">VNPAY</span> <span className="policyPaymentTag">Banking/InternetBanking</span></div>
          </div>
        </div>
        <div className="policySection">
          <div className="policySectionTitle"><span className="policySectionNum">3.</span> Thu thập và Xử lý thông tin</div>
          <div className="policySectionBody">
            <p>Trong quá trình thanh toán, chúng tôi chỉ thu thập các thông tin sau:</p>
            <ul className="policyList">
              <li>Họ tên chủ thẻ/thông tin tài khoản ví điện tử</li>
              <li>Số điện thoại liên hệ xác thực</li>
              <li>Chi tiết giao dịch (mã đơn hàng, số tiền, thời gian...)</li>
            </ul>
            <div className="policyAlert">
              <b>Lưu ý:</b> E-Tech Market không lưu trữ thông tin thẻ (số thẻ, CVV/CVC) của khách hàng trên hệ thống. Mọi dữ liệu nhạy cảm được xử lý trực tiếp qua cổng thanh toán bảo mật của đối tác.
            </div>
          </div>
        </div>
        <div className="policySection">
          <div className="policySectionTitle"><span className="policySectionNum">4.</span> Quyền và Trách nhiệm của khách hàng</div>
          <div className="policySectionBody">
            <ul className="policyList">
              <li>Khách hàng cần kiểm tra kỹ thông tin trước khi xác nhận thanh toán.</li>
              <li>Không chia sẻ mã OTP, thông tin thẻ cho bất kỳ ai kể cả nhân viên {displayStoreName}.</li>
              <li>Thông báo ngay cho {displayStoreName} khi phát hiện giao dịch bất thường qua hotline hoặc email bảo mật bên dưới.</li>
            </ul>
          </div>
        </div>
        <div className="policyContactBox">
          <div className="policyContactTitle">Liên hệ hỗ trợ an ninh</div>
          <div className="policyContactGrid">
            <div>
              <div className="policyContactLabel">Hotline bảo mật</div>
              <a href={`tel:${cleanPhone}`} className="policyContactValue" style={{ whiteSpace: 'pre-line' }}>{displayPhone}</a>
            </div>
            <div>
              <div className="policyContactLabel">Email Chuyên Trách</div>
              <a href={`mailto:${cleanEmail}`} className="policyContactValue" style={{ whiteSpace: 'pre-line' }}>{displayEmail}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
