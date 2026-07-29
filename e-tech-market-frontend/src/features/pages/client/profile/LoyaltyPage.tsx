import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/configs/api.config";
import { useAuthStore } from "@/features/store/useAuthStore";
import { toast } from "@/utils/toast";

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
           try { localStorage.setItem("user", JSON.stringify(latestUser)); } catch {}
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
        <div className="pfCardBody" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
          
          {loading && <div className="pfLoading">Đang tải thông tin thẻ...</div>}

          {!loading && !isMember && (

            <div style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "#64748b", marginBottom: "20px" }}>Bạn chưa đăng ký thẻ hội viên.</p>
              <button
                onClick={async () => {
                  try {
                    const { registerLoyaltyCard } = await import('@/features/services/auth.service');
                    await registerLoyaltyCard();
                    toast.success("Đăng ký thẻ hội viên thành công!");
                    window.location.reload();
                  } catch (error: any) {
                    toast.error("Lỗi: " + error.message);
                  }
                }}
                style={{
                  background: 'linear-gradient(to right, #e9c400, #ffe16d)',
                  color: '#1e293b',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(233, 196, 0, 0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(233, 196, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(233, 196, 0, 0.4)';
                }}
              >
                Đăng Ký Ngay
              </button>
            </div>

          )}

          {!loading && isMember && loyaltyData && (
             <div style={{ width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <section
                        className="pfCard glass-card shimmer-effect group"
                        aria-label="Thẻ thành viên"
                        style={{
                          position: "relative",
                          width: "100%",
                          maxWidth: "580px",
                          aspectRatio: "1.6 / 1",
                          borderRadius: "5px",
                          padding: "55px",
                          overflow: "hidden",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          borderLeft: "1px solid rgba(255,255,255,0.05)",
                          cursor: "default",
                        }}
                      >
                        {/* Lớp hình nền mờ ảo kết hợp overlay tối chuẩn theo ảnh mẫu */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            overflow: "hidden",
                            borderRadius: "5px",
                            zIndex: 0,
                          }}
                        >
                          <img
                            alt="Premium background"
                            src="/public/screen1.png"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              opacity: 0.4,
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(to top, rgba(7, 20, 36, 0.9) 0%, rgba(7, 20, 36, 0.4) 100%)",
                            }}
                          />
                        </div>

                        {/* Nội dung chính xử lý bằng dữ liệu thực tế */}
                        <div
                          className="relative z-10 h-full"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: "100%",
                          }}
                        >
                          {/* Phần Header: Tên Hệ Sinh Thái & Tiêu Đề */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "Manrope, sans-serif",
                                  fontSize: "12px",
                                  lineHeight: "1.1",
                                  letterSpacing: "0.08em",
                                  fontWeight: 600,
                                  color: "#d0c6ab",
                                  textTransform: "uppercase",
                                  marginBottom: "4px",
                                }}
                              >
                                E-TECH ECOSYSTEM
                              </span>
                              <h2
                                className="pfCardTitle"
                                style={{
                                  fontFamily: "Manrope, sans-serif",
                                  fontSize: "24px",
                                  lineHeight: "1.3",
                                  fontWeight: 700,
                                  color: "#ffffff",
                                }}
                              >
                                Thẻ Thành Viên E-Tech
                              </h2>
                            </div>

                            {/* Điểm tích lũy thực tế của user */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                backgroundColor: "rgba(42, 53, 71, 0.4)",
                                backdropFilter: "blur(12px)",
                                padding: "8px 8px",
                                borderRadius: "8px",
                                border: "1px solid rgba(255, 225, 109, 0.2)",
                              }}
                            >
                              <span
                                className="metallic-text"
                                style={{
                                  fontFamily: "Manrope, sans-serif",
                                  fontSize: "28px",
                                  lineHeight: "1.2",
                                  letterSpacing: "-0.01em",
                                  fontWeight: 800,
                                  color:  "#e3b707ff"
                                }}
                              >
                                {loyaltyData.current_points}
                              </span>
                              <span
                                style={{
                                  fontFamily: "Manrope, sans-serif",
                                  fontSize: "12px",
                                  lineHeight: "1.1",
                                  letterSpacing: "0.08em",
                                  fontWeight: 600,
                                  color: "#ffe16d",
                                  marginTop: "4px",
                                }}
                              >
                                Điểm
                              </span>
                            </div>
                          </div>

                          {/* Phần Giữa: Tên Hạng Thành Viên & Chi tiêu thực tế */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <h1
                              className="metallic-text gold-glow"
                              style={{
                                fontFamily: "Manrope, sans-serif",
                                fontSize: "32px",
                                lineHeight: "1.2",
                                letterSpacing: "-0.02em",
                                fontWeight: 700,
                                color:  "#e3b707ff"
                              }}  
                            >
                              {loyaltyData.membership_rank?.rank_name
                                ? `Thành viên (${loyaltyData.membership_rank.rank_name})`
                                : "Thành viên"}
                            </h1>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "Manrope, sans-serif",
                                  fontSize: "16px",
                                  lineHeight: "1.6",
                                  fontWeight: 400,
                                  color: "#d0c6ab",
                                }}
                              >
                                Chi tiêu tích lũy:
                              </span>
                              <span
                                style={{
                                  fontFamily: "Manrope, sans-serif",
                                  fontSize: "24px",
                                  lineHeight: "1.3",
                                  fontWeight: 700,
                                  color: "#ffffff",
                                }}
                              >
                                {formatMoneyVnd(loyaltyData.total_spent)}
                              </span>
                            </div>
                          </div>

                          {/* Phần Footer: Thanh Tiến độ & Thông báo trạng thái */}
                          <div
                            style={{ paddingTop: "8px" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                              }}
                            >
                              {/* Thanh progress bar: Tự động tính % dựa trên chi tiêu thực tế */}
                              <div
                                style={{
                                  width: "100%",
                                  height: "6px",
                                  backgroundColor: "rgba(31, 43, 60, 1)",
                                  borderRadius: "9999px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    background:
                                      "linear-gradient(to right, #e9c400, #ffe16d)",
                                    borderRadius: "9999px",
                                    boxShadow:
                                      "0 0 10px rgba(233, 196, 0, 0.4)",
                                    // Nếu chưa max rank thì tính %, nếu đã đạt rank cao nhất thì tự lấp đầy thanh 100% giống ảnh mẫu
                                    width: loyaltyData.next_rank
                                      ? `${Math.min(100, Math.max(0, (loyaltyData.total_spent / loyaltyData.next_rank.min_spend) * 100))}%`
                                      : "100%",
                                  }}
                                />
                              </div>

                              {/* Xử lý Logic hiển thị thông báo theo Rank thực tế */}
                              {loyaltyData.next_rank ? (
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "Manrope, sans-serif",
                                      fontSize: "14px",
                                      color: "#d0c6ab",
                                    }}
                                  >
                                    Tiến trình thăng hạng{" "}
                                    {loyaltyData.next_rank.rank_name}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "Manrope, sans-serif",
                                      fontSize: "14px",
                                      color: "#ffe16d",
                                    }}
                                  >
                                    Cần thêm{" "}
                                    {formatMoneyVnd(
                                      loyaltyData.next_rank.min_spend -
                                        loyaltyData.total_spent,
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <p
                                  style={{
                                    fontFamily: "Manrope, sans-serif",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    fontWeight: 400,
                                    color: "rgba(208, 198, 171, 0.8)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    margin: 0,
                                  }}
                                >
                                  {/* Sử dụng Icon verified của Material Symbols tương tự file mẫu */}
                                  <span
                                    className="material-symbols-outlined"
                                    style={{
                                      fontSize: "14px",
                                      color: "#ffe16d",
                                      fontVariationSettings:
                                        "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                                    }}
                                  >
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
                                  Bạn đã đạt hạng thẻ cao nhất! Tiếp tục mua sắm
                                  để duy trì thẻ.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Icon Kim Cương trang trí chìm ở góc phải (Chỉ hiển thị biểu tượng nếu là Kim Cương hoặc Max Rank) */}
                          <div
                            className="opacity-20 group-hover:opacity-40"
                            style={{
                              position: "absolute",
                              bottom: 0,
                              right: 0,
                              transition: "opacity 700ms",
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: "64px",
                                fontWeight: 100,
                                color: "#ffe16d",
                                fontVariationSettings: "'FILL' 1",
                              }}
                            >
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
                                {/* Các nét cắt tạo hình viên kim cương */}
                                <path d="M6 3h12l4 6-10 12L2 9z" />
                                <path d="M11 3 8 9l4 12 4-12-3-6" />
                                <path d="M2 9h20" />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </section>

                      <button
                        onClick={async () => {
                          if (window.confirm('Bạn có chắc chắn muốn hủy thẻ hội viên? Toàn bộ điểm tích lũy và đặc quyền có thể sẽ bị ảnh hưởng.')) {
                            try {
                              const { cancelLoyaltyCard } = await import('@/features/services/auth.service');
                              await cancelLoyaltyCard();
                              window.location.reload();
                            } catch (error: any) {
                              alert('Lỗi: ' + error.message);
                            }
                          }
                        }}
                        style={{
                          marginTop: '20px',
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          padding: '8px 24px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          alignSelf: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        Hủy thẻ hội viên
                      </button>
                    </div>
                  )}

                  {isMember && loyaltyData?.point_history && loyaltyData.point_history.length > 0 && (
                    <div style={{ width: '100%', maxWidth: '800px', marginTop: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingLeft: '8px', borderLeft: '4px solid #f59e0b' }}>Lịch sử điểm thưởng</h3>
                      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Thời gian</th>
                              <th style={{ padding: '12px 16px', fontWeight: '600' }}>Nội dung</th>
                              <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Thay đổi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loyaltyData.point_history.map((history: any) => (
                              <tr key={history.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '16px', color: '#475569', whiteSpace: 'nowrap' }}>
                                  {new Date(history.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td style={{ padding: '16px', color: '#1e293b' }}>
                                  {history.description || (history.action_type === 'earn' ? 'Tích lũy điểm' : 'Tiêu điểm')}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: history.points_changed > 0 ? '#10b981' : '#ef4444' }}>
                                  {history.points_changed > 0 ? '+' : ''}{history.points_changed}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

        </div>
      </section>
    </div>
  );
}
