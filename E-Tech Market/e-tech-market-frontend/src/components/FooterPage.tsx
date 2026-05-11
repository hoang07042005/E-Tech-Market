import { Link } from 'react-router-dom'
import './HeaderFooter.css'

function GlobeIcon() {
  return (
    <svg className="hfFooterSmallIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 2c2.6 2.7 4 6.2 4 10s-1.4 7.3-4 10c-2.6-2.7-4-6.2-4-10s1.4-7.3 4-10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="hfFooterSmallIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 5a3 3 0 1 0-2.83-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 15.5 17.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="hfFooterSmallIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 6l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export default function FooterPage() {
  return (
    <footer className="hfFooter">
      <div className="hfFooterInner">
        <div className="hfFooterTopGrid">
          <div id="footer-gioi-thieu">
            <img className="hfFooterLogoImg" src="/logo.png" alt="E-TECH MARKET" decoding="async" />
            <div className="hfFooterTagline">
              Chuỗi bán lẻ công nghệ tinh gọn — chọn lọc sản phẩm khác biệt, đáng tin cậy trong kỷ nguyên số.
            </div>
          </div>

          <div>
            <div className="hfFooterColTitle">Điều hướng</div>
            <div className="hfFooterLinks" aria-label="Liên kết footer">
              <a className="hfFooterLink" href="/contact">
                Hỗ trợ
              </a>
              <a className="hfFooterLink" href="#">
                Bảo hành
              </a>
              <a className="hfFooterLink" href="#">
                Đổi trả
              </a>
              <Link className="hfFooterLink" to="/chinh-sach-bao-mat">
                Chính sách bảo mật
              </Link>
              <Link className="hfFooterLink" to="/dieu-khoan">
                Điều khoản dịch vụ
              </Link>
            </div>
          </div>

          <div>
            <div className="hfFooterColTitle">Kết nối</div>
            <div className="hfFooterConnectIcons" aria-label="Liên kết mạng xã hội">
              <GlobeIcon />
              <ShareIcon />
              <MailIcon />
            </div>
          </div>

          <div id="footer-lien-he">
            <div className="hfFooterColTitle">Liên hệ</div>
            <div className="hfFooterAddr">
              KHU CÔNG NGHỆ CAO
              <br />
              SỐ 10 ĐẠI LỘ ĐỔI MỚI
              <br />
              TP. HỒ CHÍ MINH, VIỆT NAM
            </div>
          </div>
        </div>

        <div className="hfFooterDivider" />

        <div className="hfFooterBottomRow">
          <div>© 2026 E-TECH MARKET. ĐỒNG HÀNH CÙNG KHÁCH HÀNG.</div>
          <div className="hfFooterSystemStatus">Trạng thái hệ thống: Bình thường</div>
        </div>
      </div>
    </footer>
  )
}
