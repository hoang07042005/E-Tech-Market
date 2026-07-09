import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import { apiFetch, API_BASE_URL } from "@/configs/api.config";
import ConfirmModal from "@/components/ConfirmModal";
import "@/styles/admin/ReviewsAdminPage.css";

type Review = {
  id: number;
  product_id: number;
  user_id: number;
  order_id?: number | null;
  rating: number;
  exp_performance?: number | null;
  exp_battery?: number | null;
  exp_camera?: number | null;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at?: string;
  media?: Array<{ type: "image" | "video"; url: string }>;
  user: { id: number; name: string; avatar_url?: string | null };
  product: { id: number; name: string; main_image_url?: string | null };
};

type SortOption = "latest" | "oldest" | "highest" | "lowest";

type ReviewListResponse = {
  data: Review[];
  last_page: number;
  total?: number;
  meta?: { last_page?: number };
};

function resolveReviewImageUrl(url: string | null | undefined) {
  if (!url) return "https://via.placeholder.com/48";
  const s = url.trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s);
      if (urlObj.hostname === "nginx" || urlObj.hostname === "localhost") {
        return window.location.origin + s.replace(/^https?:\/\/[^/]+/, "");
      }
    } catch {
      return s;
    }
    return s;
  }
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${API_BASE_URL}${path.startsWith("/storage/") ? "" : "/storage"}${path}`;
}

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const fetchReviews = useCallback(
    async (currentPage: number, status: string, sort: SortOption) => {
      setLoading(true);
      try {
        let url = `/api/admin/reviews?page=${currentPage}&limit=10`;
        if (status !== "all") url += `&status=${status}`;

        const res = await apiFetch<ReviewListResponse>(url);
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        const sorted = [...items].sort((a, b) => {
          if (sort === "oldest")
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );
          if (sort === "highest") return b.rating - a.rating;
          if (sort === "lowest") return a.rating - b.rating;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        setReviews(sorted);
        setTotalPages(res?.last_page || res?.meta?.last_page || 1);
        setTotalReviews(Number(res.total ?? items.length) || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchReviews(page, statusFilter, sortBy);
  }, [fetchReviews, page, statusFilter, sortBy]);

  const handleStatusUpdate = async (
    id: number,
    newStatus: Review["status"],
  ) => {
    try {
      await apiFetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      );
      if (selectedReview?.id === id) {
        setSelectedReview((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    } catch {
      alert("Lỗi cập nhật trạng thái.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotalReviews((prev) => Math.max(prev - 1, 0));
      setShowDeleteModal(false);
      setReviewToDelete(null);
    } catch {
      alert("Lỗi khi xoá.");
    }
  };

  const stats = {
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="adminContainer">
      {/* Header Panel */}
      <header className="pageHeader">
        <div className="pageHeaderLeft">
          <h2>Quản lý Đánh giá</h2>
          <p>
            Hệ thống giám sát, phê duyệt và phân tích phản hồi từ khách hàng mua
            sắm.
          </p>
        </div>
      </header>

      {/* Grid Thống kê Tối giản */}
      <section className="statsGrid">
        <div className="statCard orange">
          <div className="statCardInfo">
            <span className="statLabel">Tổng đánh giá</span>
            <span className="statValue">{totalReviews.toLocaleString()}</span>
          </div>
          <div className="statCardIcon">📝</div>
        </div>
        <div className="statCard cyan">
          <div className="statCardInfo">
            <span className="statLabel">Chờ xử lý</span>
            <span className="statValue">{stats.pending}</span>
          </div>
          <div className="statCardIcon">⏳</div>
        </div>
        <div className="statCard green">
          <div className="statCardInfo">
            <span className="statLabel">Đã phê duyệt</span>
            <span className="statValue">{stats.approved}</span>
          </div>
          <div className="statCardIcon">✅</div>
        </div>
        <div className="statCard purple">
          <div className="statCardInfo">
            <span className="statLabel">Bị từ chối</span>
            <span className="statValue">{stats.rejected}</span>
          </div>
          <div className="statCardIcon">⚠️</div>
        </div>
      </section>

      {/* FORM TOOLBAR */}
      <section className="filterToolbar">
        <div className="toolbarFormGroups">
          <div className="formGroupInline">
            <label htmlFor="statusFilter">Trạng thái duyệt</label>
            <select
              id="statusFilter"
              className="modernSelect"
              value={statusFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Bị từ chối</option>
            </select>
          </div>

          <div className="formGroupInline">
            <label htmlFor="sortBy">Thứ tự hiển thị</label>
            <select
              id="sortBy"
              className="modernSelect"
              value={sortBy}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setSortBy(e.target.value as SortOption);
                setPage(1);
              }}
            >
              <option value="latest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="highest">Đánh giá cao</option>
              <option value="lowest">Đánh giá thấp</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bảng Quản trị Trung tâm */}
      <section className="tableCard">
        <table className="premiumTable">
          <thead>
            <tr>
              <th>Sản phẩm phản hồi</th>
              <th>Khách hàng</th>
              <th>Điểm số</th>
              <th>Nội dung bình luận</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th style={{ textAlign: "right", paddingRight: "1rem" }}>
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="skeletonLine" />
                  </td>
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "var(--admin-txt-muted)",
                  }}
                >
                  Không có dữ liệu đánh giá nào trùng khớp.
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="productCell">
                      <img
                        className="productImg"
                        src={resolveReviewImageUrl(r.product?.main_image_url)}
                        alt=""
                      />
                      <div className="productMeta">
                        <span className="pName" title={r.product?.name}>
                          {r.product?.name || "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="userCellName">{r.user?.name || "—"}</span>
                  </td>
                  <td>
                    <div className="starRatingBox">
                      <span>{r.rating}</span>
                      <span>★</span>
                    </div>
                  </td>
                  <td>
                    <p className="commentCellText" title={r.comment || ""}>
                      {r.comment || "—"}
                    </p>
                  </td>
                  <td>
                    <span className={`statusBadgeDot ${r.status}`}>
                      {r.status === "pending"
                        ? "Chờ duyệt"
                        : r.status === "approved"
                          ? "Đã duyệt"
                          : "Từ chối"}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      // Đọc cả 2 trường hợp đặt tên biến phổ biến để chống lỗi lệch tên biến với API
                      const rawDate = r.created_at || (r as any).createdAt;

                      if (!rawDate) return "—";

                      const s = String(rawDate).trim();

                      // Chuẩn hóa để parse ISO-8601 ổn định:
                      // Ví dụ DB: "2026-07-02 11:01:35+00"
                      // -> "2026-07-02T11:01:35+00:00"
                      const normalized = s
                        .replace(/\s+/, "T") // đổi khoảng trắng đầu giữa date/time thành T
                        .replace(
                          /([+-]\d{2})$/,
                          "$1:00", // +00 -> +00:00 ; -05 -> -05:00
                        );

                      const dt = new Date(normalized);
                      const timestamp = dt.getTime();

                      return !isNaN(timestamp)
                        ? dt.toLocaleDateString("vi-VN")
                        : "—";
                    })()}
                  </td>

                  <td>
                    <div className="rowActions">
                      <button
                        className="iconActionBtn detail"
                        onClick={() => setSelectedReview(r)}
                        title="Xem chi tiết"
                      >
                        <DetailIcon />
                      </button>
                      {r.status !== "approved" && (
                        <button
                          className="iconActionBtn approve"
                          onClick={() => handleStatusUpdate(r.id, "approved")}
                          title="Phê duyệt"
                        >
                          <ApproveIcon /> 
                        </button>
                      )}
                      {r.status !== "rejected" && (
                        <button
                          className="iconActionBtn reject"
                          onClick={() => handleStatusUpdate(r.id, "rejected")}
                          title="Từ chối"
                        >
                          <RejectIcon />
                        </button>
                      )}
                      <button
                        className="iconActionBtn delete"
                        onClick={() => {
                          setReviewToDelete(r);
                          setShowDeleteModal(true);
                        }}
                        title="Xoá vĩnh viễn"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Phân trang */}
        <div className="tablePagination">
          <span className="paginationInfo">
            Hiển thị trang số {page} trên tổng {totalPages}
          </span>
          <div className="paginationCtrls">
            <button
              className="btnPageLink"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </button>
            <button
              className="btnPageLink"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {/* Modal xác nhận xóa */}
      <ConfirmModal
        open={showDeleteModal}
        title="Xác nhận xoá đánh giá"
        message={
          reviewToDelete && (
            <div style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>
              <p>
                Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa đánh
                giá của khách hàng <strong>{reviewToDelete.user?.name}</strong>?
              </p>
            </div>
          )
        }
        onConfirm={() => {
          if (reviewToDelete) {
            void handleDelete(reviewToDelete.id);
          }
        }}
        onCancel={() => {
          setShowDeleteModal(false);
          setReviewToDelete(null);
        }}
      />

      {/* SIDE-DRAWER PANEL CHUYÊN NGHIỆP */}
      {selectedReview && (
        <div className="drawerOverlay" onClick={() => setSelectedReview(null)}>
          <div className="drawerPanel" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHeader">
              <h3>Thông tin Đánh giá chi tiết</h3>
              <button
                className="drawerCloseBtn"
                onClick={() => setSelectedReview(null)}
              >
                ×
              </button>
            </div>

            <div className="drawerBody">
              <div>
                <span className="drawerSectionLabel">Khách hàng phản hồi</span>
                <div className="drawerProfileCard">
                  {selectedReview.user?.avatar_url ? (
                    <img
                      className="drawerAvatar"
                      src={resolveReviewImageUrl(
                        selectedReview.user.avatar_url,
                      )}
                      alt=""
                    />
                  ) : (
                    <div className="drawerAvatarFallback">
                      {(selectedReview.user?.name || "U").charAt(0)}
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                      {selectedReview.user?.name || "—"}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "var(--admin-txt-muted)",
                      }}
                    >
                      Mã tài khoản: #{selectedReview.user_id}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <span className="drawerSectionLabel">Sản phẩm liên kết</span>
                <div className="drawerProfileCard">
                  <img
                    className="productImg"
                    src={resolveReviewImageUrl(
                      selectedReview.product?.main_image_url,
                    )}
                    alt=""
                    style={{ borderRadius: "6px" }}
                  />
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.9rem" }}>
                      {selectedReview.product?.name || "—"}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "var(--admin-txt-muted)",
                      }}
                    >
                      Mã sản phẩm: #{selectedReview.product_id}
                    </p>
                  </div>
                </div>
              </div>

              <div className="drawerMiniGrid">
                <div className="drawerMiniCard">
                  <span>Điểm đánh giá</span>
                  <strong>{selectedReview.rating} / 5 ★</strong>
                </div>
                <div className="drawerMiniCard">
                  <span>Trạng thái duyệt</span>
                  <strong
                    style={{
                      color:
                        selectedReview.status === "approved"
                          ? "#16a34a"
                          : selectedReview.status === "rejected"
                            ? "#dc2626"
                            : "#ca8a04",
                    }}
                  >
                    {selectedReview.status === "pending"
                      ? "Chờ duyệt"
                      : selectedReview.status === "approved"
                        ? "Đã duyệt"
                        : "Từ chối"}
                  </strong>
                </div>
              </div>

              <div
                className="drawerMiniGrid"
                style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
              >
                <div className="drawerMiniCard">
                  <span>Hiệu năng</span>
                  <strong>{selectedReview.exp_performance ?? "—"}/5</strong>
                </div>
                <div className="drawerMiniCard">
                  <span>Thời lượng pin</span>
                  <strong>{selectedReview.exp_battery ?? "—"}/5</strong>
                </div>
                <div className="drawerMiniCard">
                  <span>Camera</span>
                  <strong>{selectedReview.exp_camera ?? "—"}/5</strong>
                </div>
              </div>

              <div>
                <span className="drawerSectionLabel">Nội dung text</span>
                <div className="drawerCommentBox">
                  <p>
                    {selectedReview.comment ||
                      "Khách hàng không điền nội dung chữ."}
                  </p>
                </div>
              </div>

              {Array.isArray(selectedReview.media) &&
                selectedReview.media.length > 0 && (
                  <div>
                    <span className="drawerSectionLabel">Tệp đính kèm</span>
                    <div className="drawerGallery">
                      {selectedReview.media.map((med, idx) => (
                        <a
                          key={idx}
                          href={resolveReviewImageUrl(med.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            className="drawerMediaThumb"
                            src={resolveReviewImageUrl(med.url)}
                            alt=""
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="drawerFooter">
              {selectedReview.status !== "approved" && (
                <button
                  className="drawerBtn primary"
                  onClick={() =>
                    handleStatusUpdate(selectedReview.id, "approved")
                  }
                >
                  Phê duyệt
                </button>
              )}
              {selectedReview.status !== "rejected" && (
                <button
                  className="drawerBtn secondary"
                  onClick={() =>
                    handleStatusUpdate(selectedReview.id, "rejected")
                  }
                >
                  Từ chối
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




function DetailIcon() {return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>)}
function TrashIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>)}
function RejectIcon() {return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>)}
function ApproveIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>)}