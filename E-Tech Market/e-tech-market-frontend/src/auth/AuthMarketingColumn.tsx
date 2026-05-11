import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

function AuthHeroArtwork() {
  return (
    <div className="authHeroVisual">
      <div className="authHeroGlow"></div>
      <div className="authHeroLines"></div>
    </div>
  )
}

type AuthMarketingColumnProps = {
  eyebrow?: string
  title: ReactNode
  description?: string
  footerBadge?: string
}

export default function AuthMarketingColumn({
  eyebrow = 'TRUY CẬP HỆ THỐNG',
  title,
  description = 'Trải nghiệm chuỗi bán lẻ công nghệ — sản phẩm được tuyển chọn cho người yêu thích sự chính xác và hiệu năng.',
  footerBadge = 'HÀNG MỚI: BỘ TITANIUM',
}: AuthMarketingColumnProps) {
  const navigate = useNavigate()

  return (
    <div className="authLeft">
      <div className="authHeroVisualContainer">
        <AuthHeroArtwork />
      </div>
      <div className="authLeftContent">
        <div className="authBrand" onClick={() => navigate('/')}>E-TECH MARKET</div>
        <span className="authEyebrow">{eyebrow}</span>
        <div className="authHeroTitleBand">
          <h1 className="authTitle">{title}</h1>
          <figure className="authMascotFig">
            <img
              src="/linh-vat.png"
              alt=""
              className="authMascotImg"
              draggable={false}
            />
          </figure>
        </div>
        <p className="authDesc">{description}</p>
        <div className="authFooterInfo">
          <span className="authIndicatorLine"></span>
          <span className="authIndicatorText">{footerBadge}</span>
        </div>
      </div>
    </div>
  )
}
