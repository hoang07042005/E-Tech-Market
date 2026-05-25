import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/configs/api.config'
import '@/styles/components/HeaderFooter.css'

type StoreContactPayload = {
  store_name: string
  contact_email: string
  contact_phone: string
  warehouse_address: string
}

export default function FooterPage() {
  const [storeContact, setStoreContact] = useState<StoreContactPayload | null>(null)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const [paymentsConfig, setPaymentsConfig] = useState<{
    momo: { enabled: boolean }
    vnpay: { enabled: boolean }
    cod: { enabled: boolean }
  } | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const contactData = await apiFetch<StoreContactPayload>('/api/store/contact')
        if (!cancelled) setStoreContact(contactData)
      } catch {
        // ignore
      }
      try {
        const configData = await apiFetch<{ maintenance_mode: boolean; chat: any }>('/api/store/config')
        if (!cancelled) setMaintenanceMode(!!configData.maintenance_mode)
      } catch {
        // ignore
      }
      try {
        const paymentsData = await apiFetch<{
          momo: { enabled: boolean }
          vnpay: { enabled: boolean }
          cod: { enabled: boolean }
        }>('/api/store/payments')
        if (!cancelled) setPaymentsConfig(paymentsData)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const displayAddress = storeContact?.warehouse_address?.trim() || 'KHU CÔNG NGHỆ CAO\nSỐ 10 ĐẠI LỘ ĐỔI MỚI\nTP. HỒ CHÍ MINH, VIỆT NAM'
  const displayStoreName = storeContact?.store_name?.trim() || 'E-Tech Market'

  return (
    <footer className="hfFooter">
      <div className="hfFooterInner">
        <div className="hfFooterTopGrid">
          
          {/* Cột 1: Giới thiệu & Kết nối */}
          <div id="footer-gioi-thieu">
            <img className="hfFooterLogoImg" src={darkMode ? '/logo-trang.png' : '/logo.png'} alt="E-TECH MARKET" decoding="async" />
            <div className="hfFooterTagline">
              Chuỗi bán lẻ công nghệ cao cấp tinh gọn. Chúng tôi cam kết tuyển chọn những thiết bị công nghệ chọn lọc độc đáo, chuẩn mực chất lượng và mang đến dịch vụ chăm sóc hậu mãi hoàn hảo nhất.
            </div>
            
            <div className="hfFooterConnectIcons">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                title="Theo dõi E-Tech Market trên Facebook" 
                className="hfFooterSocialBtn"
              >
                <svg className="hfFooterSmallIcon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                title="Đăng ký kênh Youtube của chúng tôi" 
                className="hfFooterSocialBtn"
              >
                <svg className="hfFooterSmallIcon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967-.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>

              <a 
                href={`mailto:${storeContact?.contact_email || 'support@etechmarket.vn'}`}
                title="Gửi thư hỗ trợ" 
                className="hfFooterSocialBtn"
              >
                <svg className="hfFooterSmallIcon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Cột 2: Danh mục sản phẩm */}
          <div>
            <div className="hfFooterColTitle">Danh mục mua sắm</div>
            <div className="hfFooterLinks">
              <Link className="hfFooterLink" to="/products?category=phone">Điện thoại di động</Link>
              <Link className="hfFooterLink" to="/products?category=laptop">Máy tính xách tay</Link>
              <Link className="hfFooterLink" to="/products?category=pc">Máy tính để bàn (PC)</Link>
              <Link className="hfFooterLink" to="/products?category=monitor">Màn hình máy tính</Link>
              <Link className="hfFooterLink" to="/products?category=printer">Máy in & Thiết bị phụ trợ</Link>
            </div>
          </div>

          {/* Cột 3: Hỗ trợ khách hàng */}
          <div>
            <div className="hfFooterColTitle">Hỗ trợ khách hàng</div>
            <div className="hfFooterLinks">
              <Link className="hfFooterLink" to="/contact">Liên hệ trực tuyến</Link>
              <Link className="hfFooterLink" to="/quy-dinh-bao-hanh-1-doi-1">Quy định bảo hành 1-đổi-1</Link>
              <Link className="hfFooterLink" to="/chinh-sach-hoan-tien">Chính sách hoàn tiền</Link>
            </div>
          </div>

          {/* Cột 4: Chính sách chung */}
          <div>
            <div className="hfFooterColTitle">Điều khoản & Pháp lý</div>
            <div className="hfFooterLinks">
              <Link className="hfFooterLink" to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>
              <Link className="hfFooterLink" to="/dieu-khoan">Điều khoản dịch vụ</Link>
              <Link className="hfFooterLink" to="/chinh-sach-bao-mat-thanh-toan">Chính sách bảo mật thanh toán</Link>
              <Link className="hfFooterLink" to="/giai-quyet-khieu-nai">Giải quyết khiếu nại</Link>
            </div>
          </div>

          {/* Cột 5: Thông tin liên hệ thực tế */}
          <div id="footer-lien-he">
            <div className="hfFooterColTitle">Liên hệ mua hàng</div>
            <div className="hfFooterAddr">
              <div className="hfFooterContactBlock">
                <span className="hfFooterContactLabel">Tổng đài hỗ trợ (24/7)</span>
                <a href={`tel:${storeContact?.contact_phone || '19008888'}`} className="hfFooterPhoneLink">
                  {storeContact?.contact_phone || '1900 8888'}
                </a>
              </div>
              <div className="hfFooterContactBlock">
                <span className="hfFooterContactLabel">Địa chỉ văn phòng</span>
                <p className="hfFooterAddressText">
                  {displayAddress}
                </p>
              </div>
              <div className="hfFooterContactBlock">
                <span className="hfFooterContactLabel">Hợp tác doanh nghiệp</span>
                <a href={`mailto:${storeContact?.contact_email || 'support@etechmarket.vn'}`} className="hfFooterMailLink">
                  {storeContact?.contact_email || 'support@etechmarket.vn'}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="hfFooterDivider" />

        <div className="hfFooterBottomRow">
          <div>© 2026 {displayStoreName.toUpperCase()}. MUA SẮM TIỆN LỢI — DỊCH VỤ VƯỢT TRỘI.</div>
          
          {/* Cổng thanh toán được chấp nhận */}
          <div className="hfFooterPayments">
            <span className="hfFooterPaymentsLabel">Thanh toán:</span>
            {(!paymentsConfig || paymentsConfig.momo?.enabled) && (
              <span className="hfFooterPaymentBadge">MOMO</span>
            )}
            {(!paymentsConfig || paymentsConfig.vnpay?.enabled) && (
              <span className="hfFooterPaymentBadge">VNPAY</span>
            )}
            {(!paymentsConfig || paymentsConfig.cod?.enabled) && (
              <span className="hfFooterPaymentBadge">COD</span>
            )}
          </div>

          <div className={`hfFooterSystemStatus ${maintenanceMode ? 'hfMaintenance' : ''}`}>
            {maintenanceMode ? 'Trạng thái hệ thống: Bảo trì' : 'Trạng thái hệ thống: Bình thường'}
          </div>
        </div>
      </div>
    </footer>
  )
}
