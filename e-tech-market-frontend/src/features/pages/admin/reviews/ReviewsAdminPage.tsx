import { useState, useEffect, useCallback } from 'react'
import type { ChangeEvent } from 'react'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import ConfirmModal from '@/components/ConfirmModal'
import '@/styles/admin/ReviewsAdminPage.css'

type Review = {
  id: number
  product_id: number
  user_id: number
  order_id?: number | null
  rating: number
  exp_performance?: number | null
  exp_battery?: number | null
  exp_camera?: number | null
  comment: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at?: string
  media?: Array<{
    type: 'image' | 'video'
    url: string
    original_name?: string | null
  }>
  user: {
    id: number
    name: string
    avatar_url?: string | null
  }
  product: {
    id: number
    name: string
    main_image_url?: string | null
  }
}

type SortOption = 'latest' | 'oldest' | 'highest' | 'lowest'

type ReviewListResponse = {
  data: Review[]
  last_page: number
  total?: number
  meta?: {
    last_page?: number
  }
}

function resolveReviewImageUrl(url: string | null | undefined) {
  if (!url) return 'https://via.placeholder.com/48'
  const s = url.trim()
  if (!s) return 'https://via.placeholder.com/48'
  // Already absolute URL - check if hostname is accessible
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      // If hostname is 'nginx' (Docker network hostname), replace with current origin
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* keep original */
    }
    return s
  }
  const path = s.startsWith('/') ? s : `/${s}`
  if (!path.startsWith('/storage/')) return `${API_BASE_URL}/storage${path}`
  return `${API_BASE_URL}${path}`
}

function formatDateTimeVi(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN')
}

function reviewStatusText(status: Review['status']) {
  if (status === 'pending') return 'Chờ duyệt'
  if (status === 'approved') return 'Đã duyệt'
  return 'Từ chối'
}

function experienceText(value: number | null | undefined) {
  if (typeof value !== 'number') return 'Chưa có'
  return `${value}/5`
}

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('latest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  // 🔒 Token is sent via httpOnly cookie automatically
  const hasAuth = true  // Always authenticated — behind ProtectedRoute

  const fetchReviews = useCallback(
    async (
      currentPage: number,
      status: 'all' | 'pending' | 'approved' | 'rejected',
      sort: SortOption,
    ) => {
      if (!hasAuth) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        let url = `/api/admin/reviews?page=${currentPage}&limit=10`
        if (status !== 'all') {
          url += `&status=${status}`
        }
        const res = await apiFetch<ReviewListResponse>(url)
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
        const sorted = [...items].sort((a, b) => {
          if (sort === 'oldest') {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          }
          if (sort === 'highest') {
            return b.rating - a.rating
          }
          if (sort === 'lowest') {
            return a.rating - b.rating
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setReviews(sorted)
        setTotalPages(res?.last_page || res?.meta?.last_page || 1)
        setTotalReviews(Number(res.total ?? items.length) || 0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    },
    [hasAuth],
  )

  useEffect(() => {
    const loadReviews = async () => {
      if (!hasAuth) {
        setLoading(false)
        return
      }
      await fetchReviews(page, statusFilter, sortBy)
    }
    void loadReviews()
  }, [fetchReviews, page, statusFilter, sortBy, hasAuth])

  const updateStatus = async (id: number, newStatus: Review['status']) => {
    if (!hasAuth) return
    try {
      await apiFetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )
    } catch {
      alert('Lỗi cập nhật trạng thái.')
    }
  }

  const deleteReview = async (id: number) => {
    if (!hasAuth) return
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
      setReviews((prev) => prev.filter((r) => r.id !== id))
      setTotalReviews((prev) => Math.max(prev - 1, 0))
      setShowDeleteModal(false)
      setReviewToDelete(null)
    } catch {
      alert('Lỗi khi xoá.')
    }
  }

  const requestDeleteReview = (review: Review) => {
    setReviewToDelete(review)
    setShowDeleteModal(true)
  }

  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const approvedCount = reviews.filter((r) => r.status === 'approved').length
  const rejectedCount = reviews.filter((r) => r.status === 'rejected').length
  const bestReview = reviews.find((r) => r.status === 'approved')

  const applyFilters = async () => {
    setPage(1)
    await fetchReviews(1, statusFilter, sortBy)
  }

  return (
    <div className="adminPageContainer">
      <div className="reviewPageTop">
        <div>
          <h2 className="adminPageTitle">Quản lý Đánh giá</h2>
          <p className="reviewPageLead">Theo dõi, duyệt và phản hồi các đánh giá sản phẩm từ khách hàng.</p>
        </div>
      </div>

      <div className="statsGrid">
        <div className="statWidget orange">
          <div className="statIconWrap">📝</div>
          <div>
            <div className="statLabel">Tổng đánh giá</div>
            <div className="statValue">{totalReviews.toLocaleString()}</div>
            <div className="statTrend up">{approvedCount >= rejectedCount ? 'Ổn định' : 'Cần cải thiện'}</div>
          </div>
        </div>
        <div className="statWidget cyan">
          <div className="statIconWrap">⏳</div>
          <div>
            <div className="statLabel">Chờ duyệt</div>
            <div className="statValue">{pendingCount}</div>
            <div className="statTrend">Đang chờ xử lý</div>
          </div>
        </div>
        <div className="statWidget green">
          <div className="statIconWrap">✅</div>
          <div>
            <div className="statLabel">Đã duyệt</div>
            <div className="statValue">{approvedCount}</div>
            <div className="statTrend up">Tăng trưởng</div>
          </div>
        </div>
        <div className="statWidget purple">
          <div className="statIconWrap">⚠️</div>
          <div>
            <div className="statLabel">Bị từ chối</div>
            <div className="statValue">{rejectedCount}</div>
            <div className="statTrend">Cần kiểm tra</div>
          </div>
        </div>
      </div>

      <div className="reviewControls">
        <div className="reviewControlGroup">
          <label>Trạng thái</label>
          <select
            className="reviewadminSelect"
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')
              setPage(1)
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </div>

        <div className="reviewControlGroup">
          <label>Sắp xếp theo</label>
          <select
            className="reviewadminSelect"
            value={sortBy}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortOption)}
          >
            <option value="latest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="highest">Đánh giá cao</option>
            <option value="lowest">Đánh giá thấp</option>
          </select>
        </div>

        <button className="adminPrimaryBtn" onClick={applyFilters}>Lọc kết quả</button>
      </div>

      <div className="adminTableWrap">
        {loading ? (
          <table className="adminTableNew">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Người dùng</th>
                <th>Rating</th>
                <th>Bình luận</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '70%' : '90%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : reviews.length === 0 ? (
          <div className="adminEmpty">Không có đánh giá nào.</div>
        ) : (
          <table className="adminTableNew">
            <thead>
              <tr>
                {/* <th>ID</th> */}
                <th>Sản phẩm</th>
                <th>Người dùng</th>
                <th>Rating</th>
                <th>Bình luận</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  {/* <td>#{r.id}</td> */}
                  <td>
                    <div className="reviewTableProduct">
                      {r.product?.main_image_url ? (
                        <img
                          className="reviewTableProductImg"
                          src={resolveReviewImageUrl(r.product.main_image_url)}
                          alt={r.product.name}
                        />
                      ) : (
                        <div className="reviewTableProductImg" />
                      )}
                      <span className="reviewTableProductName">{r.product?.name || '—'}</span>
                    </div>
                  </td>
                  <td>{r.user?.name || '—'}</td>
                  <td>{r.rating} <svg xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#facc15">
                    <path d="M12 2L14.9 8.6L22 9.3L16.8 14L18.3 21L12 17.3L5.7 21L7.2 14L2 9.3L9.1 8.6L12 2Z" />
                  </svg></td>
                  <td className="reviewTableComment">{r.comment}</td>
                  <td>
                    <span className={`reviewStatusBadge ${r.status}`}>
                      {r.status === 'pending' ? 'Chờ duyệt' : r.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                    </span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <div className="reviewActionRow">
                      <button className="reviewActionBtn" onClick={() => setSelectedReview(r)} title="Xem chi tiết">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {r.status !== 'approved' && (
                        <button className="reviewActionBtn" onClick={() => updateStatus(r.id, 'approved')}><svg xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round">

                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 12L11 15L16 9" />

                        </svg></button>
                      )}
                      {r.status !== 'rejected' && (
                        <button className="reviewActionBtn" onClick={() => updateStatus(r.id, 'rejected')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="red"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="8" y1="8" x2="16" y2="16" />
                          <line x1="16" y1="8" x2="8" y2="16" />
                        </svg></button>
                      )}
                      <button className="reviewActionBtn danger" onClick={() => requestDeleteReview(r)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round">

                        <path d="M3 6H21" />
                        <path d="M8 6V4H16V6" />
                        <path d="M19 6L18 20H6L5 6" />
                        <path d="M10 11V17" />
                        <path d="M14 11V17" />

                      </svg></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adminPagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Trước
        </button>
        <span>Trang {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Sau
        </button>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        title="Xác nhận xoá đánh giá"
        message={
          reviewToDelete ? (
            <div>
              <p>Bạn có chắc chắn muốn xoá đánh giá này?</p>
              <p><strong>Sản phẩm:</strong> {reviewToDelete.product?.name || '—'}</p>
              <p><strong>Khách hàng:</strong> {reviewToDelete.user?.name || '—'}</p>
              <p><strong>Nội dung:</strong> {reviewToDelete.comment || 'Không có nội dung'}</p>
            </div>
          ) : 'Bạn có chắc chắn muốn xoá đánh giá này?'
        }
        onConfirm={() => {
          if (reviewToDelete) {
            deleteReview(reviewToDelete.id)
          }
        }}
        onCancel={() => {
          setShowDeleteModal(false)
          setReviewToDelete(null)
        }}
      />

      {selectedReview && (
        <div className="reviewDetailModalOverlay" onClick={() => setSelectedReview(null)}>
          <div className="reviewDetailModal" onClick={(event) => event.stopPropagation()}>
            <div className="reviewDetailHeader">
              <div>
                <div className="reviewDetailKicker">Chi tiết đánh giá</div>
                <h3>Đánh giá #{selectedReview.id}</h3>
              </div>
              <button
                type="button"
                className="reviewDetailClose"
                onClick={() => setSelectedReview(null)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="reviewDetailGrid">
              <div className="reviewDetailBlock">
                <div className="reviewDetailBlockTitle">Khách hàng</div>
                <div className="reviewDetailUser">
                  {selectedReview.user?.avatar_url ? (
                    <img src={resolveReviewImageUrl(selectedReview.user.avatar_url)} alt={selectedReview.user.name} />
                  ) : (
                    <div className="reviewDetailAvatarFallback">
                      {(selectedReview.user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong>{selectedReview.user?.name || '—'}</strong>
                    <span>ID người dùng: {selectedReview.user_id || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="reviewDetailBlock">
                <div className="reviewDetailBlockTitle">Sản phẩm</div>
                <div className="reviewDetailProduct">
                  {selectedReview.product?.main_image_url ? (
                    <img src={resolveReviewImageUrl(selectedReview.product.main_image_url)} alt={selectedReview.product.name} />
                  ) : (
                    <div className="reviewDetailProductImgFallback" />
                  )}
                  <div>
                    <strong>{selectedReview.product?.name || '—'}</strong>
                    <span>ID sản phẩm: {selectedReview.product_id || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="reviewDetailMetaGrid">
              <div>
                <span>Rating</span>
                <strong>{selectedReview.rating}/5 ★</strong>
              </div>
              <div>
                <span>Trạng thái</span>
                <strong>{reviewStatusText(selectedReview.status)}</strong>
              </div>
              <div>
                <span>Mã đơn hàng</span>
                <strong>{selectedReview.order_id || '—'}</strong>
              </div>
              <div>
                <span>Ngày tạo</span>
                <strong>{formatDateTimeVi(selectedReview.created_at)}</strong>
              </div>
            </div>

            <div className="reviewDetailExperience">
              <div>
                <span>Hiệu năng</span>
                <strong>{experienceText(selectedReview.exp_performance)}</strong>
              </div>
              <div>
                <span>Thời lượng pin</span>
                <strong>{experienceText(selectedReview.exp_battery)}</strong>
              </div>
              <div>
                <span>Camera</span>
                <strong>{experienceText(selectedReview.exp_camera)}</strong>
              </div>
            </div>

            <div className="reviewDetailCommentBox">
              <div className="reviewDetailBlockTitle">Nội dung đánh giá</div>
              <p>{selectedReview.comment || 'Khách hàng không để lại bình luận.'}</p>
            </div>

            {Array.isArray(selectedReview.media) && selectedReview.media.length > 0 && (
              <div className="reviewDetailMedia">
                <div className="reviewDetailBlockTitle">Ảnh / video đính kèm</div>
                <div className="reviewDetailMediaGrid">
                  {selectedReview.media.map((item, index) => (
                    <a
                      key={`${item.url}-${index}`}
                      className="reviewDetailMediaItem"
                      href={resolveReviewImageUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.type === 'video' ? (
                        <video src={resolveReviewImageUrl(item.url)} muted playsInline preload="metadata" />
                      ) : (
                        <img src={resolveReviewImageUrl(item.url)} alt={`Media đánh giá ${index + 1}`} />
                      )}
                      {item.type === 'video' && <span>▶</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="reviewDetailFooter">
              {selectedReview.status !== 'approved' && (
                <button
                  className="adminPrimaryBtn"
                  onClick={() => {
                    updateStatus(selectedReview.id, 'approved')
                    setSelectedReview((current) => current ? { ...current, status: 'approved' } : current)
                  }}
                >
                  Duyệt đánh giá
                </button>
              )}
              {selectedReview.status !== 'rejected' && (
                <button
                  className="reviewDetailRejectBtn"
                  onClick={() => {
                    updateStatus(selectedReview.id, 'rejected')
                    setSelectedReview((current) => current ? { ...current, status: 'rejected' } : current)
                  }}
                >
                  Từ chối
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="reviewSummaryGrid">
        <div className="reviewSummaryCard">
          <div className="reviewSummaryCardTitle">Đánh giá tốt nhất</div>
          <div className="reviewSummaryCardValue">{bestReview?.product.name || 'Chưa có đánh giá duyệt'}</div>
          <div className="reviewSummaryCardNote">Sản phẩm được đánh giá 5 sao nhiều nhất và có phản hồi tích cực.</div>
        </div>
        <div className="reviewSummaryCard">
          <div className="reviewSummaryCardTitle">Thời gian phản hồi</div>
          <div className="reviewSummaryCardValue">2.4 giờ</div>
          <div className="reviewSummaryCardNote">Mục tiêu: Dưới 2 giờ.</div>
        </div>
        <div className="reviewSummaryCard">
          <div className="reviewSummaryCardTitle">Cần chú ý</div>
          <div className="reviewSummaryCardValue">{pendingCount} đánh giá</div>
          <div className="reviewSummaryCardNote">{pendingCount > 0 ? 'Có đánh giá đang chờ xử lý. Xử lý trong hôm nay.' : 'Không có đánh giá mới cần chú ý.'}</div>
        </div>
      </div>
    </div>
  )
}
