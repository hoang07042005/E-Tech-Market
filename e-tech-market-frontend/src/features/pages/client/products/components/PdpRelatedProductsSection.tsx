import { Link } from 'react-router-dom'
import type { Product } from '@/features/services/products.service'
import { resolveImageUrl } from './PdpShared'
import { HeartIcon } from '@/components/icons/HeartIcon'

export function PdpRelatedProductsSection({
  relatedProducts,
  wishSet,
  onToggleLike,
  title = "Sản phẩm liên quan",
}: {
  relatedProducts: Product[]
  wishSet: Set<number>
  onToggleLike: (productId: number) => void
  title?: string
}) {
  if (relatedProducts.length === 0) return null

  return (
    <section className="pdpRelatedSection" aria-label={title}>
      <div className="pdpRelatedHeader">
        <h3 className="pdpRelatedTitle">{title}</h3>
      </div>
      <div className="pdpRelatedGrid">
        {relatedProducts.map((rp) => (
          <div key={rp.id} className="pdpRelatedCard">
            <Link to={`/products/${rp.slug}`} className="pdpRelatedTop">
              <div className="pdpRelatedImgWrap">
                <img
                  src={resolveImageUrl(rp.main_image_url)}
                  alt={rp.name}
                  className="pdpRelatedImg"
                  loading="lazy"
                />
              </div>
            </Link>

            <div className="pdpRelatedInfo">
              <Link to={`/products/${rp.slug}`} className="pdpRelatedNameLink">
                <div className="pdpRelatedName">{rp.name}</div>
              </Link>

              {(rp.short_description || rp.description) && (
                <div className="pdpRelatedDesc">{rp.short_description || rp.description}</div>
              )}

              <button
                type="button"
                className="pdpRelatedFavBtn"
                aria-label={wishSet.has(rp.id) ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
                onClick={() => onToggleLike(rp.id)}
              >
                <span className="pdpRelatedFavIcon" aria-hidden>
                  <HeartIcon filled={wishSet.has(rp.id)} size={18} />
                </span>
                <span>{wishSet.has(rp.id) ? 'Đã yêu thích' : 'Yêu thích'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
