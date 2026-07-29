import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/configs/api.config";
import { useAuthStore } from "@/features/store/useAuthStore";
import { toast } from "@/utils/toast";
import "@/styles/pages/LoyaltyPage.css";

export default function LoyaltyPage() {
  const userStr = useAuthStore((state) => state.userStr);
  const me = useMemo(() => {
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, [userStr]);

  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isMember, setIsMember] = useState(me?.is_loyalty_member);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Luôn fetch /me để cập nhật trạng thái mới nhất từ server
        const meRes = await apiFetch<any>("/me");
        const latestUser = meRes.user || meRes;

        if (latestUser) {
          try {
            localStorage.setItem("user", JSON.stringify(latestUser));
          } catch {}
          setIsMember(latestUser.is_loyalty_member);

          if (latestUser.is_loyalty_member) {
            const res = await apiFetch("/me/loyalty");
            setLoyaltyData(res);
          }
        }
      } catch (err: any) {
        toast.error("Failed to fetch loyalty data: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatMoneyVnd = (val: string | number | undefined) => {
    if (!val) return "0đ";
    return Number(val).toLocaleString("vi-VN") + "đ";
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <section className="pfCard" aria-label="Thẻ hội viên">
        <div className="pfCardHead">
          <h2 className="pfCardTitle">Thẻ Hội Viên / Điểm Thưởng</h2>
        </div>
        <div
          className="pfCardBody"
          style={{
            padding: "0",
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            alignItems: "center",
          }}
        >
          {loading && (
            <div className="pfLoading">Đang tải thông tin thẻ...</div>
          )}

          {!loading && !isMember && (
            <div className="loyalty-register-wrapper">
              <div className="loyalty-hero-icon">
                <div className="loyalty-hero-icon-inner">
                  <svg
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="loyalty-hero-icon-border"></div>
              </div>

              <div className="loyalty-text-container">
                <h3 className="loyalty-title">
                  Trở thành Hội viên{" "}
                  <span className="loyalty-title-highlight">E-Tech</span>
                </h3>
                <p className="loyalty-subtitle">
                  Mở khóa hàng ngàn đặc quyền thượng lưu, mua sắm thả ga với mức
                  giá ưu đãi và nhận quà tặng bất ngờ. Đăng ký hoàn toàn miễn
                  phí!
                </p>
              </div>

              <div className="loyalty-features-container">
                {[
                  {
                    icon: (
                      <svg
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="8" cy="8" r="6" />
                        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                        <path d="M7 6h1v4" />
                        <path d="m16.71 13.88.49-.98a1 1 0 0 0-.66-1.37l-2.76-.9" />
                      </svg>
                    ),
                    title: "Tích Điểm Tự Động",
                    desc: "Nhận điểm thưởng cho mỗi đơn hàng giao thành công",
                    color: "#3b82f6",
                    bg: "rgba(59, 130, 246, 0.1)",
                  },
                  {
                    icon: (
                      <svg
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="8" width="18" height="4" rx="1" />
                        <path d="M12 8v13" />
                        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                        <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
                      </svg>
                    ),
                    title: "Đổi Thưởng Hấp Dẫn",
                    desc: "Dùng điểm để thanh toán hoặc đổi voucher độc quyền",
                    color: "#ef4444",
                    bg: "rgba(239, 68, 68, 0.1)",
                  },
                  {
                    icon: (
                      <svg
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                      </svg>
                    ),
                    title: "Đặc Quyền Hạng Thẻ",
                    desc: "Lên hạng thẻ càng cao, chiết khấu và ưu đãi càng lớn",
                    color: "#e9c400",
                    bg: "rgba(233, 196, 0, 0.1)",
                  },
                ].map((item, i) => (
                  <div key={i} className="loyalty-feature-card">
                    <div
                      className="loyalty-feature-icon-wrap"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <div className="loyalty-feature-icon-inner">
                        {item.icon}
                      </div>
                    </div>
                    <h4 className="loyalty-feature-title">{item.title}</h4>
                    <p className="loyalty-feature-desc">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="loyalty-btn-container">
                <button
                  className="loyalty-btn"
                  onClick={async () => {
                    try {
                      const { registerLoyaltyCard } =
                        await import("@/features/services/auth.service");
                      await registerLoyaltyCard();
                      toast.success("Đăng ký thẻ hội viên thành công!");
                      window.location.reload();
                    } catch (error: any) {
                      toast.error("Lỗi: " + error.message);
                    }
                  }}
                >
                  <span>Mở Thẻ Ngay - Hoàn Toàn Miễn Phí</span>
                  <div className="loyalty-btn-icon">
                    <svg
                      width="1em"
                      height="1em"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}

          {!loading && isMember && loyaltyData && (
            <div className="loyalty-member-card-wrapper">
              <section
                className="pfCard glass-card shimmer-effect group loyalty-member-card"
                aria-label="Thẻ thành viên"
              >
                <div className="absolute inset-0 z-0">
                  <img
                    src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop"
                    alt="abstract dark background"
                    className="loyalty-member-bg-img"
                  />
                  <div className="loyalty-member-bg-gradient" />
                </div>

                {/* Nội dung chính xử lý bằng dữ liệu thực tế */}
                <div className="loyalty-member-content relative z-10">
                  {/* Phần Header: Tên Hệ Sinh Thái & Tiêu Đề */}
                  <div className="loyalty-member-header">
                    <div className="loyalty-member-header-left">
                      <span className="loyalty-member-eyebrow">
                        E-TECH ECOSYSTEM
                      </span>
                      <h2 className="pfCardTitle loyalty-member-card-title">
                        Thẻ Thành Viên E-Tech
                      </h2>
                    </div>

                    {/* Điểm tích lũy thực tế của user */}
                    <div className="loyalty-member-points-wrapper">
                      <span className="metallic-text loyalty-member-points-value">
                        {loyaltyData.current_points}
                      </span>
                      <span className="loyalty-member-points-label">Điểm</span>
                    </div>
                  </div>

                  {/* Phần Giữa: Tên Hạng Thành Viên & Chi tiêu thực tế */}
                  <div className="loyalty-member-middle">
                    <h1 className="metallic-text gold-glow loyalty-member-rank">
                      {loyaltyData.membership_rank?.rank_name
                        ? `Thành viên (${loyaltyData.membership_rank.rank_name})`
                        : "Thành viên"}
                    </h1>
                    <div className="loyalty-member-spent-wrapper">
                      <span className="loyalty-member-spent-label">
                        Chi tiêu tích lũy:
                      </span>
                      <span className="loyalty-member-spent-value">
                        {formatMoneyVnd(loyaltyData.total_spent)}
                      </span>
                    </div>
                  </div>

                  {/* Phần Footer: Thanh Tiến độ & Thông báo trạng thái */}
                  <div className="loyalty-member-footer">
                    <div className="loyalty-member-progress-wrapper">
                      {/* Thanh progress bar: Tự động tính % dựa trên chi tiêu thực tế */}
                      <div className="loyalty-member-progress-bg">
                        <div
                          className="loyalty-member-progress-bar"
                          style={{
                            // Nếu chưa max rank thì tính %, nếu đã đạt rank cao nhất thì tự lấp đầy thanh 100% giống ảnh mẫu
                            width: loyaltyData.next_rank
                              ? `${Math.min(100, Math.max(0, (loyaltyData.total_spent / loyaltyData.next_rank.min_spend) * 100))}%`
                              : "100%",
                          }}
                        />
                      </div>

                      {/* Xử lý Logic hiển thị thông báo theo Rank thực tế */}
                      {loyaltyData.next_rank ? (
                        <div className="loyalty-member-progress-text-wrapper">
                          <span className="loyalty-member-progress-text-left">
                            Tiến trình thăng hạng{" "}
                            {loyaltyData.next_rank.rank_name}
                          </span>
                          <span className="loyalty-member-progress-text-right">
                            Cần thêm{" "}
                            {formatMoneyVnd(
                              loyaltyData.next_rank.min_spend -
                                loyaltyData.total_spent,
                            )}
                          </span>
                        </div>
                      ) : (
                        <p className="loyalty-member-max-rank-text">
                          {/* Sử dụng Icon verified của Material Symbols tương tự file mẫu */}
                          <span className="material-symbols-outlined loyalty-member-max-rank-icon">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              style={{ flexShrink: 0 }}
                            >
                              <path
                                d="M12 2l2.4 1.3 2.7-.4.6 2.7 2.4 1.3-.7 2.6 1.7 2.1-1.7 2.1.7 2.6-2.4 1.3-.6 2.7-2.7-.4L12 22l-2.4-1.3-2.7.4-.6-2.7-2.4-1.3.7-2.6-1.7-2.1 1.7-2.1-.7-2.6 2.4-1.3.6-2.7 2.7.4Z"
                                stroke="#ffe16d"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="m9 11.5 2 2 4-4"
                                stroke="#ffe16d"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          Bạn đã đạt hạng thẻ cao nhất! Tiếp tục mua sắm để duy
                          trì thẻ.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Icon Kim Cương trang trí chìm ở góc phải (Chỉ hiển thị biểu tượng nếu là Kim Cương hoặc Max Rank) */}
                  <div className="opacity-20 group-hover:opacity-40 loyalty-member-bg-icon-wrapper">
                    <span className="material-symbols-outlined loyalty-member-bg-icon">
                      <svg
                        width="44"
                        height="44"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffe16d"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 3h12l4 6-10 12L2 9z" />
                        <path d="M11 3 8 9l4 12 4-12-3-6" />
                        <path d="M2 9h20" />
                      </svg>
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {isMember &&
            loyaltyData?.point_history &&
            loyaltyData.point_history.length > 0 && (
              <div className="loyalty-history-wrapper">
                <h3 className="loyalty-history-title">Lịch sử điểm thưởng</h3>
                <div className="loyalty-history-list">
                  {loyaltyData.point_history.map((history: any) => (
                    <div key={history.id} className="loyalty-history-item">
                      <div className="loyalty-history-item-left">
                        <span className="loyalty-history-item-title">
                          {history.description ||
                            (history.action_type === "earn"
                              ? "Tích lũy điểm"
                              : "Tiêu điểm")}
                        </span>
                        <span className="loyalty-history-item-date">
                          {new Date(history.created_at).toLocaleDateString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      <div
                        className="loyalty-history-item-points"
                        style={{
                          color:
                            history.points_changed > 0 ? "#10b981" : "#ef4444",
                        }}
                      >
                        {history.points_changed > 0 ? "+" : ""}
                        {history.points_changed}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {isMember && loyaltyData && (
            <div className="loyalty-cancel-btn-wrapper">
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      "Bạn có chắc chắn muốn hủy thẻ hội viên? Toàn bộ điểm tích lũy và đặc quyền có thể sẽ bị ảnh hưởng.",
                    )
                  ) {
                    try {
                      const { cancelLoyaltyCard } =
                        await import("@/features/services/auth.service");
                      await cancelLoyaltyCard();
                      window.location.reload();
                    } catch (error: any) {
                      alert("Lỗi: " + error.message);
                    }
                  }
                }}
                className="loyalty-cancel-btn"
              >
                Hủy thẻ hội viên
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
