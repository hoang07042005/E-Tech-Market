import { useEffect, useState } from 'react'
import { Stars, ratingLabel, timeAgoVi, resolveImageUrl, avatarInitial } from './PdpShared'
import type { ProductReview, Product, ReviewMediaItem } from '@/features/services/products.service'

type ProductReviewsSectionProps = {
  product: Product;
  reviewStats: any;
  filteredReviews: ProductReview[];
  reviewFilter: string;
  setReviewFilter: (filter: 'all' | 'with_images' | 'verified' | 'star_5' | 'star_4' | 'star_3' | 'star_2' | 'star_1') => void;
  setIsReviewModalOpen: (open: boolean) => void;
};

export function ProductReviewsSection({
  product,
  reviewStats,
  filteredReviews,
  reviewFilter,
  setReviewFilter,
  setIsReviewModalOpen
}: ProductReviewsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(10)
  const [selectedMedia, setSelectedMedia] = useState<ReviewMediaItem | null>(null)

  useEffect(() => {
    setVisibleCount(10)
  }, [reviewFilter, product?.id])

  const visibleReviews = filteredReviews.slice(0, visibleCount)
  const hasMoreReviews = filteredReviews.length > visibleCount

  return (
    <section className="pdpReviewsSection" aria-label="Đánh giá sản phẩm">
            <div className="pdpReviewsHeader">
              <h3 className="pdpReviewsTitle">Đánh giá {product.name}</h3>
            </div>

            <div className="pdpReviewsSummary">
              <div className="pdpReviewsScore">
                <div className="pdpScoreBig">
                  {reviewStats.avg ? reviewStats.avg.toFixed(1) : '0.0'}
                  <span className="pdpScoreSmall">/5</span>
                </div>
                <div className="pdpStarsRow">
                  <Stars value={reviewStats.avg} />
                </div>
                <div className="pdpReviewsCount">{reviewStats.total} lượt đánh giá</div>
                <button type="button" className="pdpWriteReviewBtn" onClick={() => setIsReviewModalOpen(true)}>
                  Viết đánh giá
                </button>
              </div>

              <div className="pdpReviewsBars">
                {[5, 4, 3, 2, 1].map(star => {
                  const s = star as 1 | 2 | 3 | 4 | 5
                  const count = reviewStats.counts[s]
                  const pct = reviewStats.total ? (count / reviewStats.total) * 100 : 0
                  return (
                    <div key={star} className="pdpBarRow">
                      <span className="pdpBarLabel">{star}</span>
                      <span className="pdpBarStar">★</span>
                      <div className="pdpBarTrack">
                        <div className="pdpBarFill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="pdpBarCount">{count} đánh giá</span>
                    </div>
                  )
                })}
              </div>

              <div className="pdpReviewsExp">
                <div className="pdpReviewsExpTitle">Đánh giá theo trải nghiệm</div>
                <div className="pdpReviewsExpList">
                  <div className="pdpExpStatRow">
                    <div className="pdpExpStatLabel">Hiệu năng</div>
                    <div className="pdpExpStatStars"><Stars value={reviewStats.exp.performance.avg} /></div>
                    <div className="pdpExpStatRight">
                      {reviewStats.exp.performance.count ? `${reviewStats.exp.performance.avg.toFixed(0)}/5` : '0/5'}
                      <span className="pdpExpStatMeta">({reviewStats.exp.performance.count} đánh giá)</span>
                    </div>
                  </div>
                  <div className="pdpExpStatRow">
                    <div className="pdpExpStatLabel">Thời lượng pin</div>
                    <div className="pdpExpStatStars"><Stars value={reviewStats.exp.battery.avg} /></div>
                    <div className="pdpExpStatRight">
                      {reviewStats.exp.battery.count ? `${reviewStats.exp.battery.avg.toFixed(0)}/5` : '0/5'}
                      <span className="pdpExpStatMeta">({reviewStats.exp.battery.count} đánh giá)</span>
                    </div>
                  </div>
                  <div className="pdpExpStatRow">
                    <div className="pdpExpStatLabel">Chất lượng camera</div>
                    <div className="pdpExpStatStars"><Stars value={reviewStats.exp.camera.avg} /></div>
                    <div className="pdpExpStatRight">
                      {reviewStats.exp.camera.count ? `${reviewStats.exp.camera.avg.toFixed(0)}/5` : '0/5'}
                      <span className="pdpExpStatMeta">({reviewStats.exp.camera.count} đánh giá)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pdpReviewsFilters" aria-label="Lọc đánh giá theo">
              <div className="pdpReviewsFiltersLabel">Lọc đánh giá theo</div>
              <div className="pdpReviewChips">
                <button type="button" className={`pdpChip ${reviewFilter === 'all' ? 'active' : ''}`} onClick={() => setReviewFilter('all')}>Tất cả</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'with_images' ? 'active' : ''}`} onClick={() => setReviewFilter('with_images')}>Có ảnh/video</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'verified' ? 'active' : ''}`} onClick={() => setReviewFilter('verified')}>Đã mua hàng</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'star_5' ? 'active' : ''}`} onClick={() => setReviewFilter('star_5')}>5 sao</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'star_4' ? 'active' : ''}`} onClick={() => setReviewFilter('star_4')}>4 sao</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'star_3' ? 'active' : ''}`} onClick={() => setReviewFilter('star_3')}>3 sao</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'star_2' ? 'active' : ''}`} onClick={() => setReviewFilter('star_2')}>2 sao</button>
                <button type="button" className={`pdpChip ${reviewFilter === 'star_1' ? 'active' : ''}`} onClick={() => setReviewFilter('star_1')}>1 sao</button>
              </div>
            </div>

            <div className="pdpReviewsList">
              {filteredReviews.length === 0 ? (
                <div className="pdpNoReviews">Chưa có đánh giá nào.</div>
              ) : (
                visibleReviews.map(r => (
                  <div key={r.id} className="pdpReviewItem">
                    <div className="pdpReviewLeft">
                      <div className="pdpReviewAvatar" aria-hidden>
                        {r.user?.avatar_url ? (
                          <img
                            className="pdpAvatarImg"
                            src={resolveImageUrl(r.user.avatar_url)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          avatarInitial(r.user?.name || 'U')
                        )}
                      </div>
                      <div className="pdpReviewName">{r.user?.name || 'Người dùng'}</div>
                    </div>
                    <div className="pdpReviewRight">
                      <div className="pdpReviewStars">
                        <Stars value={r.rating} />
                        <span className="pdpReviewLabel">{ratingLabel(r.rating)}</span>
                      </div>
                      <div className="pdpReviewPills">
                        {typeof r.exp_performance === 'number' && (
                          <span className="pdpReviewPill">Hiệu năng {r.exp_performance >= 5 ? 'Siêu mạnh mẽ' : ratingLabel(r.exp_performance)}</span>
                        )}
                        {typeof r.exp_battery === 'number' && (
                          <span className="pdpReviewPill">Thời lượng pin {r.exp_battery >= 5 ? 'Cực khủng' : ratingLabel(r.exp_battery)}</span>
                        )}
                        {typeof r.exp_camera === 'number' && (
                          <span className="pdpReviewPill">Chất lượng camera {r.exp_camera >= 5 ? 'Chụp đẹp, chuyên nghiệp' : ratingLabel(r.exp_camera)}</span>
                        )}
                        {!!r.order_id && <span className="pdpReviewPill verified">Đã mua hàng</span>}
                      </div>
                      {r.comment && <div className="pdpReviewComment">{r.comment}</div>}
                      {Array.isArray(r.media) && r.media.length > 0 && (
                        <div className="pdpReviewMediaRow">
                          {r.media.map((item, idx) => (
                            <button
                              key={`${item.url}-${idx}`}
                              type="button"
                              className="pdpReviewMediaItem"
                              onClick={() => {
                                setSelectedMedia(item)
                              }}
                            >
                              {item.type === 'image' ? (
                                <img
                                  className="pdpReviewMediaImage"
                                  src={resolveImageUrl(item.url)}
                                  alt={`Ảnh đánh giá ${idx + 1}`}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="pdpReviewMediaVideoWrap">
                                  <video
                                    className="pdpReviewMediaVideoPreview"
                                    src={resolveImageUrl(item.url)}
                                    muted
                                    playsInline
                                    loop
                                    preload="metadata"
                                  />
                                  <span className="pdpReviewMediaVideoBadge" aria-hidden>
                                    ▶
                                  </span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="pdpReviewTime">
                        <span className="pdpReviewClock" aria-hidden>🕒</span>
                        Đánh giá đã đăng vào {timeAgoVi(r.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {hasMoreReviews ? (
              <div className="pdpReviewsMore">
                <button type="button" className="pdpSeeAll" onClick={() => setVisibleCount((current) => current + 10)}>
                  Xem thêm {Math.min(filteredReviews.length - visibleCount, 10)} đánh giá
                </button>
              </div>
            ) : null}

            {selectedMedia && (
              <div className="pdpReviewMediaModalOverlay" onClick={() => setSelectedMedia(null)}>
                <div
                  className="pdpReviewMediaModal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="pdpReviewMediaModalClose"
                    onClick={() => setSelectedMedia(null)}
                    aria-label="Đóng"
                  >
                    ×
                  </button>
                  <div className="pdpReviewMediaModalContent">
                    {selectedMedia.type === 'image' ? (
                      <img
                        src={resolveImageUrl(selectedMedia.url)}
                        alt="Ảnh đánh giá"
                      />
                    ) : (
                      <video
                        src={resolveImageUrl(selectedMedia.url)}
                        controls
                        autoPlay
                        className="pdpReviewMediaModalVideo"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          
  )
}
