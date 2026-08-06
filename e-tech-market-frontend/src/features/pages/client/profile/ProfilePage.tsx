import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import "@/styles/pages/ProfilePage.css";
import "@/styles/pages/ProfileTradeInHistory.css";
import {
  me as fetchMe,
  logout as apiLogout,
} from "@/features/services/auth.service";
import { API_BASE_URL, apiFetch } from "@/configs/api.config";
import Skeleton from "@/components/Skeleton";
import { clearAuthSessionExpiry } from "@/features/store/auth.store";
import { useAuthStore } from "@/features/store/useAuthStore";
import ConfirmModal from "@/components/ConfirmModal";

type TabKey =
  | "profile"
  | "orders"
  | "notifications"
  | "payments"
  | "security"
  | "coupons"
  | "loyalty"
  | "tradein";

type MeUser = {
  id?: number;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  address_line?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  avatar_url?: string | null;
  roles?: Array<{ slug?: string; name?: string }>;
};

type OrderRow = {
  id: number;
  order_code: string;
  created_at: string;
  total_amount: number | string;
  status: string;
  items?: Array<{ product?: { name?: string } | null }>;
};

const AVATAR_URL =
  (import.meta.env.VITE_PROFILE_AVATAR_URL as string | undefined)?.trim() ||
  "https://www.bing.com/images/search?view=detailV2&ccid=Dv9y%2Bpsk&id=BCDC0B0CADEE679EDDD3D170C8FAEE5070B03AE7&thid=OIP.Dv9y-pskOyCDJAhLX2i32wHaHa&mediaurl=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F020%2F911%2F740%2Foriginal%2Fuser-profile-icon-profile-avatar-user-icon-male-icon-face-icon-profile-icon-free-png.png&cdnurl=https%3A%2F%2Fth.bing.com%2Fth%2Fid%2FR.0eff72fa9b243b208324084b5f68b7db%3Frik%3D5zqwcFDu%252bshw0Q%26pid%3DImgRaw%26r%3D0&exph=1920&expw=1920&q=user&form=IRPRST&ck=54DFA9937F928AB26214895AAF49827C&selectedindex=9&itb=0&cw=1250&ch=572&ajaxhist=0&ajaxserp=0&vt=0&sim=11";

const PROMO_URL =
  (
    import.meta.env.VITE_PROFILE_PROMO_IMAGE_URL as string | undefined
  )?.trim() || "/Screenshot 2026-05-28 091249.png";

function formatMoneyVnd(v: number | string) {
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  if (!Number.isFinite(n)) return `${v} đ`;
  return `${n.toLocaleString("vi-VN")} đ`;
}

function fmtDateTimeVi(iso?: string | null) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const d = new Date(t)
  const pad = (x: number) => x.toString().padStart(2, '0')
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusMeta(status?: string | null) {
  const s = (status || '').toLowerCase()
  if (s === 'pending')    return { label: 'Chờ xác nhận', tone: 'wait'   as const }
  if (s === 'processing') return { label: 'Đã xác nhận',  tone: 'info'   as const }
  if (s === 'paid')       return { label: 'Chuẩn bị hàng', tone: 'info'  as const }
  if (s === 'shipped')    return { label: 'Đang giao',    tone: 'info'   as const }
  if (s === 'delivered')  return { label: 'Đã giao',      tone: 'ok'     as const }
  if (s === 'completed')  return { label: 'Hoàn thành',   tone: 'ok'     as const }
  if (s === 'returned')   return { label: 'Hoàn trả',     tone: 'return' as const }
  if (s === 'cancelled')  return { label: 'Đã hủy',       tone: 'bad'    as const }
  return { label: s || '—', tone: 'muted' as const }
}

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)
const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
)
const BoxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.29 7 8.71 5 8.71-5"/><path d="M12 22V12"/>
  </svg>
)

function resolveMediaUrl(maybeUrl: string | null | undefined): string | null {
  if (!maybeUrl) return null;
  const s = maybeUrl.trim();
  if (!s) return null;

  // Already absolute URL - check if hostname is accessible
  if (/^https?:\/\//i.test(s)) {
    // If hostname is 'nginx' (Docker network hostname), replace with current origin
    try {
      const urlObj = new URL(s);
      if (urlObj.hostname === "nginx" || urlObj.hostname === "localhost") {
        const path = s.replace(/^https?:\/\/[^/]+/, "");
        return window.location.origin + path;
      }
    } catch {
      /* keep original */
    }
    return s;
  }

  // Relative path - prepend current origin (nginx proxies /storage to backend)
  if (s.startsWith("/storage/") || s.startsWith("storage/")) {
    return window.location.origin + "/" + s.replace(/^\/+/, "");
  }

  // For other cases, try to construct URL
  try {
    return new URL(s, API_BASE_URL).toString();
  } catch {
    return s;
  }
}

const formatCurrencyTradeIn = (value: string | number | null) => {
  if (!value) return "0 ₫";
  return Number(value).toLocaleString("vi-VN") + " ₫";
};

const parseImagesTradeIn = (imgs: any): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs;
  if (typeof imgs === "string") {
    try { return JSON.parse(imgs); } catch { return []; }
  }
  return [];
};

const resolveMediaUrlTradeIn = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const prefix = url.startsWith("/") ? "" : "/";
  const storagePrefix = url.includes("storage") ? "" : "/storage";
  return `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${url.startsWith("/storage") ? "" : storagePrefix}${prefix}${url}`;
};

const parseInfoLinesTradeIn = (machineInfo: string) => {
  const lines = (machineInfo || "").split("\n").filter(Boolean);
  const name = lines[0]?.replace(/^Tên máy:\s*/, "") || "";
  const specs: { key: string; val: string }[] = [];
  lines.slice(1).forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > -1) {
      specs.push({ key: line.slice(0, colonIdx).trim(), val: line.slice(colonIdx + 1).trim() });
    } else {
      specs.push({ key: "", val: line.trim() });
    }
  });
  return { name, specs };
};

const TRADE_IN_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Chờ kiểm tra", cls: "pending" },
  quoted:    { label: "Đang xử lý",   cls: "quoted" },
  approved:  { label: "Đã hoàn tất",  cls: "approved" },
  rejected:  { label: "Đã từ chối",   cls: "rejected" },
  completed: { label: "Đã thu mua",   cls: "completed" },
};

const IconChevronRightTradeIn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("profile");
  const path = (location.pathname || "").toLowerCase();
  const ordersRoute = path.startsWith("/profile/orders");
  const notifsRoute = path.startsWith("/profile/notifications");
  const securityRoute = path.startsWith("/profile/security");
  const couponsRoute = path.startsWith("/profile/coupons");
  const loyaltyRoute = path.startsWith("/profile/loyalty");
  const tradeInRoute = path.startsWith("/profile/trade-in");
  const isInfoTab = new URLSearchParams(location.search).get("tab") === "info";

  const activeTab = ordersRoute
    ? "orders"
    : loyaltyRoute
      ? "loyalty"
      : notifsRoute
        ? "notifications"
        : securityRoute
          ? "security"
          : couponsRoute
            ? "coupons"
            : tradeInRoute
              ? "tradein"
              : tab;

  const isSubPage = activeTab !== "profile" || isInfoTab;

  const [twoFa] = useState(false);

  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<MeUser | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [showNotAvailable, setShowNotAvailable] = useState(false);
  const [tradeIns, setTradeIns] = useState<any[]>([]);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    email: "",
    phone: "",
    address_line: "",
    province: "",
    district: "",
    ward: "",
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(() => ({
    name: "",
    email: "",
    phone: "",
    address_line: "",
    province: "",
    district: "",
    ward: "",
  }));
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(
    null,
  );

  const userStr = useAuthStore((state) => state.userStr);

  const displayName = useMemo(() => {
    const localUser = (() => {
      try {
        if (!userStr) return null;
        return JSON.parse(userStr) as MeUser;
      } catch {
        return null;
      }
    })();
    return (
      me?.name ||
      me?.username ||
      localUser?.name ||
      localUser?.username ||
      "Khách hàng"
    );
  }, [me?.name, me?.username]);

  function openEditModal() {
    setEditDraft({
      name: (me?.name ?? me?.username ?? "").toString(),
      email: (me?.email ?? "").toString(),
      phone: (me?.phone ?? "").toString(),
      address_line: (me?.address_line ?? "").toString(),
      province: (me?.province ?? "").toString(),
      district: (me?.district ?? "").toString(),
      ward: (me?.ward ?? "").toString(),
    });
    setEditAvatarFile(null);
    setEditAvatarPreview(resolveMediaUrl(me?.avatar_url) || AVATAR_URL);
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditAvatarFile(null);
    setEditAvatarPreview(null);
  }

  async function saveFromModal() {
    setSaveError(null);
    setSaving(true);
    try {
      let updated: any = null;
      if (editAvatarFile) {
        const fd = new FormData();
        fd.append("file", editAvatarFile);
        try {
          const res = await apiFetch<{ user: MeUser }>("/me/avatar", {
            method: "POST",
            body: fd,
          });
          updated = (res as any)?.user ?? res;
        } catch {
          // ignore avatar upload failure here; continue to profile update
        }
      }

      const patchedRes = await apiFetch<{ user: MeUser }>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: editDraft.name.trim(),
          email: editDraft.email.trim(),
          phone: editDraft.phone.trim() || null,
          address_line: editDraft.address_line.trim() || null,
          province: editDraft.province.trim() || null,
          district: editDraft.district.trim() || null,
          ward: editDraft.ward.trim() || null,
        }),
      });

      const nextRaw = patchedRes?.user ?? updated ?? (await fetchMe());
      const next = (nextRaw as any)?.user ?? (nextRaw as MeUser);
      setMe(next);
      window.localStorage.setItem("user", JSON.stringify(next));
      window.dispatchEvent(new Event("auth-change"));
      closeEditModal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cập nhật thất bại.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  const [loyaltyData, setLoyaltyData] = useState<any>(null);

  useEffect(() => {
    let revoked = false;
    fetchMe()
      .then((res) => {
        if (revoked) return;
        // API returns { user: {...} } - extract the user object
        const next = (res as any)?.user ?? (res as MeUser);
        setMe(next);
        setProfileDraft({
          name: (next?.name ?? next?.username ?? "").toString(),
          email: (next?.email ?? "").toString(),
          phone: (next?.phone ?? "").toString(),
          address_line: (next?.address_line ?? "").toString(),
          province: (next?.province ?? "").toString(),
          district: (next?.district ?? "").toString(),
          ward: (next?.ward ?? "").toString(),
        });
      })
      .catch((e) => {
        if (revoked) return;
        // Only redirect if it's a 401 - user not authenticated
        if (e instanceof Error && e.message.includes("401")) {
          setMe(null);
          navigate("/login");
        }
        // Otherwise, just leave me as null and show placeholder
      });

    apiFetch<{ data: OrderRow[] }>("/orders")
      .then((res) => {
        if (revoked) return;
        setOrders(res.data ?? []);
      })
      .catch(() => {
        if (revoked) return;
        setOrders([]);
      })
      .finally(() => {
        setLoading(false);
      });

    apiFetch<any>("/api/me/loyalty")
      .then((res) => {
        if (!revoked) setLoyaltyData(res);
      })
      .catch(() => {});

    apiFetch<any>("/me/trade-in")
      .then((res) => {
        if (!revoked) setTradeIns(res.data ?? []);
      })
      .catch(() => {});

    return () => {
      revoked = true;
    };
  }, [navigate]);

  const orderCount = orders.length;

  const tier = useMemo(() => {
    if (loyaltyData?.membership_rank?.rank_name)
      return `Thành viên (${loyaltyData.membership_rank.rank_name})`;
    return "Thành viên";
  }, [loyaltyData]);

  // const etId = useMemo(() => {
  //   const n = me?.id
  //   if (!n || !Number.isFinite(n)) return 'ET-—'
  //   return `ET-${String(n).padStart(6, '0')}`
  // }, [me?.id])

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    window.localStorage.removeItem("user");
    clearAuthSessionExpiry();
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login");
  }

  return (
    <main className="pfPage">
      <div className="pfInner">
        <section
          className={`pfGrid ${isSubPage ? "pfSubPageActive" : ""}`}
          aria-label="Khu vực tài khoản"
        >
          <aside className="pfSidebar">
            {/* ── Avatar + Tên + Badge trong sidebar ── */}
            <div className="pfSideProfile">
              <div className="pfSideAvatarWrap">
                {loading ? (
                  <Skeleton width="100%" height="100%" borderRadius="50%" />
                ) : (
                  <img
                    className="pfAvatar"
                    src={resolveMediaUrl(me?.avatar_url) || AVATAR_URL}
                    alt=""
                    loading="lazy"
                  />
                )}
              </div>
              <div className="pfSideInfo">
                {loading ? (
                  <>
                    <Skeleton
                      width="120px"
                      height="20px"
                      style={{ marginBottom: "6px" }}
                    />
                    <Skeleton width="90px" height="18px" />
                  </>
                ) : (
                  <>
                    <div className="pfSideName">{displayName}</div>
                    <div className="pfSideBottomRow">
                      <div className="pfBadges">
                        <span className="pfBadge">{tier}</span>
                      </div>
                      <div className="pfSideStat">
                        <span className="pfSideStatNum">{orderCount}</span>
                        <span className="pfSideStatLabel">Đơn hàng</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="pfNavSep" />
            <button
              type="button"
              className={
                activeTab === "profile" ? "pfNavBtn pfNavBtnActive" : "pfNavBtn"
              }
              onClick={() => {
                setTab("profile");
                navigate("/profile?tab=info");
              }}
            >
              <SideIconWrap colorClass="pfSideIcon-info">
                <IconUser />
              </SideIconWrap>
              Thông tin cá nhân
            </button>
            <button
              type="button"
              className={
                activeTab === "orders" ? "pfNavBtn pfNavBtnActive" : "pfNavBtn"
              }
              onClick={() => navigate("/profile/orders")}
            >
              <SideIconWrap colorClass="pfSideIcon-orders">
                <IconReceipt />
              </SideIconWrap>
              Lịch sử đơn hàng
            </button>
            {/* <button
              type="button"
              className={activeTab === 'notifications' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => navigate('/profile/notifications')}
            >
              <SideIconWrap>
                <IconBell />
              </SideIconWrap>
              Thông báo
            </button> */}
            {/* <button
              type="button"
              className={activeTab === 'payments' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => {
                setTab('payments')
                navigate('/profile')
              }}
            >
              <SideIconWrap>
                <IconCard />
              </SideIconWrap>
              Phương thức thanh toán
            </button> */}
            <button
              type="button"
              className={
                activeTab === "security"
                  ? "pfNavBtn pfNavBtnActive"
                  : "pfNavBtn"
              }
              onClick={() => {
                setTab("security");
                navigate("/profile/security");
              }}
            >
              <SideIconWrap colorClass="pfSideIcon-security">
                <IconShield />
              </SideIconWrap>
              Bảo mật
            </button>
            <button
              type="button"
              className={
                activeTab === "coupons" ? "pfNavBtn pfNavBtnActive" : "pfNavBtn"
              }
              onClick={() => {
                setTab("coupons");
                navigate("/profile/coupons");
              }}
            >
              <SideIconWrap colorClass="pfSideIcon-coupons">
                <IconTicket />
              </SideIconWrap>
              Kho Voucher
            </button>
            <button
              type="button"
              className={
                activeTab === "loyalty" ? "pfNavBtn pfNavBtnActive" : "pfNavBtn"
              }
              onClick={() => {
                navigate("/profile/loyalty");
              }}
            >
              <SideIconWrap colorClass="pfSideIcon-loyalty">
                <IconAward />
              </SideIconWrap>
              Thẻ hội viên
            </button>
            <button
              type="button"
              className={
                activeTab === "tradein" ? "pfNavBtn pfNavBtnActive" : "pfNavBtn"
              }
              onClick={() => navigate("/profile/trade-in")}
            >
              <SideIconWrap colorClass="pfSideIcon-orders">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 200 200"
                  width="60%"
                  height="60%"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    stroke-width="13"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M 165 70 
                            L 130 35 
                            L 130 55 
                            L 90 55 
                            A 15 15 0 0 0 90 85 
                            L 130 85 
                            L 130 105 Z"
                    />
                    <path
                      d="M 35 130 
                            L 70 165 
                            L 70 145 
                            L 110 145 
                            A 15 15 0 0 0 110 115 
                            L 70 115 
                            L 70 95 Z"
                    />
                  </g>
                </svg>
              </SideIconWrap>
              Thu cũ đổi mới
            </button>
            <div className="pfNavSep" />
            <button
              type="button"
              className="pfNavBtn pfLogoutBtn pfLogoutBtnDesktop"
              onClick={logout}
            >
              <SideIconWrap colorClass="pfSideIcon-logout">
                <IconLogout />
              </SideIconWrap>
              Đăng xuất
            </button>
          </aside>

          <div className="pfContent">
            {isSubPage && (
              <button
                className="pfMobileBackBtn"
                onClick={() => {
                  setTab("profile");
                  navigate("/profile");
                }}
                style={{
                  display: "none",
                  alignItems: "center",
                  gap: "8px",
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "500",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Quay lại Menu
              </button>
            )}

            {/* ── Outlet cho Thu cũ đổi mới (giao diện full, không nằm trong pfCard) ── */}
            {tradeInRoute && <Outlet />}

            {/* ── Outlet cho các route con (orders / security / coupons / loyalty …) ── */}
            {(ordersRoute ||
              notifsRoute ||
              securityRoute ||
              couponsRoute ||
              loyaltyRoute) && (
              <section
                className="pfCard"
                aria-label="Thông tin"
                style={{
                  border: activeTab === "loyalty" ? "none" : "",
                  background: activeTab === "loyalty" ? "transparent" : "",
                  boxShadow: activeTab === "loyalty" ? "none" : "",
                }}
              >
                <div
                  className="pfCardHead"
                  style={{ display: activeTab === "loyalty" ? "none" : "flex" }}
                >
                  <h2 className="pfCardTitle">
                    {activeTab === "orders"
                      ?""
                      : activeTab === "notifications"
                        ? ""
                        : activeTab === "coupons"
                          ? ""
                          : ""}
                  </h2>
                </div>
                <Outlet />
              </section>
            )}

            {tab === "profile" &&
              !ordersRoute &&
              !loyaltyRoute &&
              !notifsRoute &&
              !securityRoute &&
              !tradeInRoute &&
              !couponsRoute && (
                <div
                  className={`pfDashGrid ${!isInfoTab ? "pfHideMobile" : ""}`}
                >
                  {/* CỘT TRÁI: Thông tin cá nhân + Đơn hàng gần đây */}
                  <div className="pfDashLeft">
                    {/* Thông tin cá nhân */}
                    <section className="pfCard" aria-label="Thông tin cá nhân">
                      <div className="pfCardHead">
                        <h2 className="pfCardTitle">Thông tin cá nhân</h2>
                        <button
                          type="button"
                          className="pfSaveBtn"
                          onClick={openEditModal}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z" />
                            <path
                              fillRule="evenodd"
                              d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"
                            />
                          </svg>
                        </button>
                      </div>
                      {saveError && (
                        <div
                          style={{
                            marginBottom: 12,
                            color: "#b91c1c",
                            fontWeight: 800,
                          }}
                        >
                          {saveError}
                        </div>
                      )}
                      <div className="pfFormGrid">
                        {loading ? (
                          Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="pfField">
                              <Skeleton
                                width="100px"
                                height="14px"
                                style={{ marginBottom: "8px" }}
                              />
                              <Skeleton
                                width="100%"
                                height="48px"
                                borderRadius="10px"
                              />
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="pfSimpleRow">
                              <div className="pfSimpleLabel">Họ và tên :</div>
                              <div className="pfSimpleValue">
                                {profileDraft.name || "—"}
                              </div>
                            </div>
                            <div className="pfSimpleRow">
                              <div className="pfSimpleLabel">Email :</div>
                              <div className="pfSimpleValue">
                                {profileDraft.email || "—"}
                              </div>
                            </div>
                            <div className="pfSimpleRow">
                              <div className="pfSimpleLabel">
                                Số điện thoại :
                              </div>
                              <div className="pfSimpleValue">
                                {profileDraft.phone || "—"}
                              </div>
                            </div>
                            <div className="pfSimpleRow">
                              <div className="pfSimpleLabel">Địa chỉ :</div>
                              <div className="pfSimpleValue">
                                {[
                                  profileDraft.address_line,
                                  profileDraft.ward,
                                  profileDraft.district,
                                  profileDraft.province,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </section>

                    {/* Đơn hàng gần đây */}
                    <section className="pfCard" aria-label="Đơn hàng gần đây">
                      <div className="pfCardHead" style={{ marginBottom: 0 }}>
                        <h3 className="pfCardTitle">Đơn hàng gần đây</h3>
                        <button
                          type="button"
                          onClick={() => navigate("/profile/orders")}
                          style={{
                            fontWeight: 900,
                            color: "var(--et-primary-hover)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Xem tất cả
                        </button>
                      </div>

                      <div className="pfOrdersWrapper">
                        {orders.length === 0 ? (
                          <div
                            style={{
                              padding: 14,
                              color: "var(--et-text-muted)",
                            }}
                          >
                            Chưa có đơn hàng nào.
                          </div>
                        ) : (
                          <div className="pfOdhList" style={{ padding: 0 }}>
                            {orders.slice(0, 6).map((o) => {
                              const meta = statusMeta(o.status);
                              const total = typeof o.total_amount === 'string' ? Number(o.total_amount) : (o.total_amount ?? 0);
                              
                              const imgs = (o.items ?? []).map(it => {
                                const p = (it as any)?.product as any;
                                const candidates = [
                                  (it as any)?.variant?.image_url,
                                  (it as any)?.image,
                                  p?.image, p?.image_url, p?.main_image_url,
                                  p?.main_image, p?.thumbnail,
                                  Array.isArray(p?.images) ? p.images[0] : null,
                                  Array.isArray(p?.media) ? (p.media[0]?.url ?? p.media[0]) : null,
                                  (it as any)?.product?.main_image_url,
                                ];
                                let img: any = null;
                                for (const c of candidates) {
                                  if (!c) continue;
                                  if (typeof c === 'string') { img = c; break; }
                                  if (typeof c === 'object') {
                                    if (typeof c.url === 'string') { img = c.url; break; }
                                    if (typeof c.src === 'string') { img = c.src; break; }
                                    if (typeof c.path === 'string') { img = c.path; break; }
                                  }
                                }
                                return resolveMediaUrl(img ?? null) || null;
                              }).filter(Boolean) as string[];

                              const names = (o.items ?? []).map(it => {
                                const p = (it as any)?.product as any;
                                return (p?.name || (it as any)?.product_name_snapshot || '').toString();
                              }).filter(Boolean);

                              const itemCount = o.items?.length ?? 0;
                              const payMethod = (o as any).payment_method || 'Chuyển khoản';
                              const estDelivery = (o as any).estimated_delivery || null;

                              return (
                                <div key={o.id} className="pfOdRow">
                                  {/* LEFT */}
                                  <div className="pfOdRowLeft">
                                    <Link className="pfOdRowCode" to={`/profile/orders/${o.id}`}>
                                      #{o.order_code}
                                    </Link>
                                    <div className="pfOdRowDate">{fmtDateTimeVi(o.created_at)}</div>
                                    <span className={`pfOdStatus pfTone-${meta.tone}`}>{meta.label}</span>
                                    <div className="pfOdRowPayment">Thanh toán: {payMethod}</div>
                                  </div>

                                  {/* MIDDLE */}
                                  <div className="pfOdRowMid">
                                    <div className="pfOdRowCount">{itemCount} sản phẩm</div>
                                    <div className={`pfOdRowProducts ${itemCount > 1 ? 'pfOdRowProducts--multi' : ''}`}>
                                      {/* Thumbnails — up to 3 */}
                                      {imgs.length > 0 && (
                                        <div className="pfOdThumbStrip">
                                          {imgs.slice(0, 3).map((src, i) => (
                                            <img key={i} className="pfOdThumb" src={src} alt="" loading="lazy" />
                                          ))}
                                        </div>
                                      )}
                                      {imgs.length === 0 && (
                                        <div className="pfOdThumbStrip">
                                          <div className="pfOdThumbPlaceholder">
                                            <BoxIcon />
                                          </div>
                                        </div>
                                      )}

                                      {/* Name list */}
                                      <div className="pfOdNameList">
                                        {names.slice(0, 3).map((name, i) => {
                                          const qty = o.items?.[i] ? ((o.items[i] as any)?.quantity ?? 1) : 1;
                                          return (
                                            <div key={i} className="pfOdNameRow">
                                              <span className="pfOdNameText">{name}</span>
                                              <span className="pfOdNameQty">x{qty}</span>
                                            </div>
                                          )
                                        })}
                                        {names.length > 3 && (
                                          <div className="pfOdNameMore">+ {names.length - 3} sản phẩm khác</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* RIGHT */}
                                  <div className="pfOdRowRight">
                                    <div className="pfOdRowDelivery">
                                      {estDelivery ? (
                                        <>
                                          <strong>Giao hàng:</strong>
                                          {fmtDateTimeVi(estDelivery)}
                                        </>
                                      ) : (
                                        <span />
                                      )}
                                    </div>

                                    <div className="pfOdRowTotalWrap">
                                      <span className="pfOdRowTotalLabel">Tổng tiền:</span>
                                      <div className="pfOdRowTotal">{formatMoneyVnd(total)}</div>
                                    </div>

                                    <div className="pfOdRowActions">
                                      <Link className="pfOdDetailBtn" to={`/profile/orders/${o.id}`}>
                                        Xem chi tiết <ChevronIcon />
                                      </Link>
                                      <button type="button" className="pfOdMenuBtn" aria-label="Tùy chọn">
                                        <DotsIcon />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                  {/* end pfDashLeft */}

                  {/* Modal chỉnh sửa thông tin */}
                  {editOpen && (
                    <div
                      className="pfModalOverlay"
                      role="dialog"
                      aria-modal="true"
                    >
                      <div className="pfModal">
                        <div className="pfModalHeader">
                          <h3 className="pfModalTitle">Chỉnh sửa thông tin</h3>
                          <button
                            type="button"
                            className="pfModalClose"
                            onClick={closeEditModal}
                            aria-label="Đóng"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="pfModalBody">
                          <aside className="pfModalSidebar">
                            <div className="pfModalAvatarWrap">
                              <img
                                src={editAvatarPreview || AVATAR_URL}
                                alt=""
                                className="pfAvatar"
                              />
                              <input
                                id="pf-avatar-input"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={(e) => {
                                  const f = e.currentTarget.files?.[0] ?? null;
                                  setEditAvatarFile(f);
                                  if (f)
                                    setEditAvatarPreview(
                                      URL.createObjectURL(f),
                                    );
                                }}
                                style={{ display: "none" }}
                              />
                              <label
                                htmlFor="pf-avatar-input"
                                className="pfFileBtn"
                              >
                                Chọn ảnh
                              </label>
                            </div>
                          </aside>
                          <div className="pfModalContent">
                            <div className="pfFormGrid">
                              <div className="pfField">
                                <label className="pfLabel">Họ và tên</label>
                                <input
                                  className="pfInput"
                                  value={editDraft.name}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      name: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="pfField">
                                <label className="pfLabel">Số điện thoại</label>
                                <input
                                  className="pfInput"
                                  value={editDraft.phone}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      phone: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="pfField">
                                <label className="pfLabel">Email</label>
                                <input
                                  className="pfInput"
                                  value={editDraft.email}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      email: e.target.value,
                                    }))
                                  }
                                  type="email"
                                />
                              </div>
                              <div
                                className="pfField"
                                style={{ gridColumn: "1 / -1" }}
                              >
                                <label className="pfLabel">Địa chỉ</label>
                                <input
                                  className="pfInput"
                                  value={editDraft.address_line}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      address_line: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="pfField">
                                <label className="pfLabel">Phường/Xã</label>
                                <input
                                  className="pfInput"
                                  value={editDraft.ward}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      ward: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="pfField">
                                <label className="pfLabel">Quận/Huyện</label>
                                <input
                                  className="pfInput"
                                  value={editDraft.district}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      district: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="pfField">
                                <label className="pfLabel">
                                  Tỉnh/Thành phố
                                </label>
                                <input
                                  className="pfInput"
                                  value={editDraft.province}
                                  onChange={(e) =>
                                    setEditDraft((s) => ({
                                      ...s,
                                      province: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="pfModalActions">
                              <button
                                type="button"
                                className="pfBtn pfBtnPrimary"
                                onClick={saveFromModal}
                                disabled={saving}
                              >
                                {saving ? "Đang lưu..." : "Lưu"}
                              </button>
                              <button
                                type="button"
                                className="pfBtn"
                                onClick={closeEditModal}
                                disabled={saving}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CỘT PHẢI: Bảo mật + Ưu đãi */}
                  <div className="pfDashRight">
                    <section className="pfMiniCard" aria-label="Bảo mật">
                      <h3 className="pfMiniTitle">Bảo mật</h3>
                      <div className="pfMiniTopRow">
                        <div style={{ maxWidth: "calc(100% - 60px)" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: 4,
                              fontSize: 15,
                            }}
                          >
                            Xác thực 2 yếu tố (2FA)
                          </div>
                          <div className="pfToggleText">
                            Tăng cường bảo mật cho tài khoản của bạn.
                          </div>
                        </div>
                        <button
                          type="button"
                          className={twoFa ? "pfSwitch pfSwitchOn" : "pfSwitch"}
                          onClick={() => setShowNotAvailable(true)}
                          aria-label="Bật tắt 2FA"
                        >
                          <span className="pfSwitchKnob" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="pfToggleRow pfToggleRowBtn"
                        onClick={() => {
                          setTab("security");
                          navigate("/profile/security");
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              marginTop: 4,
                              marginBottom: 4,
                              fontSize: 15,
                            }}
                          >
                            Thay đổi mật khẩu
                          </div>
                          <div className="pfToggleText">
                            Cập nhật mật khẩu để an toàn hơn.
                          </div>
                        </div>
                        <span className="pfChevron" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    </section>

                    {tradeIns.length > 0 && (
                      <section className="pfMiniCard pfMiniCard-tradein" aria-label="Yêu cầu thu cũ gần đây">
                        <div className="pfMiniHeader">
                          <h3 className="pfMiniTitle">Yêu cầu thu cũ gần đây</h3>
                          <Link to="/profile/trade-in" className="pfMiniViewAll">Xem tất cả</Link>
                        </div>
                        <div className="ptih-list">
                          {tradeIns.slice(0, 2).map(req => {
                            const d        = new Date(req.created_at);
                            const dateStr  = d.toLocaleDateString("vi-VN");
                            const imgs     = parseImagesTradeIn(req.images);
                            const thumb    = imgs.length > 0 ? resolveMediaUrlTradeIn(imgs[0]) : null;
                            const { name, specs } = parseInfoLinesTradeIn(req.machine_info);
                            const statusInfo = TRADE_IN_STATUS_MAP[req.status] ?? { label: req.status, cls: "gray" };
                            
                            return (
                              <Link
                                to="/profile/trade-in"
                                key={req.id}
                                className="ptih-card"
                              >
                                {/* Status badge */}
                                <div className={`ptih-card-badge ptih-badge-${statusInfo.cls}`}>
                                  {statusInfo.label}
                                </div>

                                <div className="ptih-card-body">
                                  {/* Left: thumb + info */}
                                  <div className="ptih-card-top-row">
                                    <div className="ptih-thumb">
                                      {thumb ? (
                                        <img src={thumb} alt="thumb" />
                                      ) : (
                                        <div className="ptih-thumb-placeholder">
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                                            <circle cx="8.5" cy="8.5" r="1.5"/>
                                            <polyline points="21 15 16 10 5 21"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>

                                    <div className="ptih-card-info">
                                      <div className="ptih-device-name">{name || req.category?.name || "Thiết bị"}</div>
                                      <div className="ptih-specs-list">
                                        {specs.map((s: {key: string, val: string}, idx: number) => (
                                          <div key={idx} className="ptih-spec-item">
                                            <span className="ptih-spec-key">{s.key}:</span> {s.val}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="ptih-meta-row-auto">
                                        <span className="ptih-meta-code">Mã: <strong>#{req.request_code}</strong></span>
                                        <span className="ptih-meta-date">{dateStr}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Middle: Conditions */}
                                  <div className="ptih-card-mid-row">
                                    {req.conditions && req.conditions.length > 0 ? (
                                      <div className="ptih-condition-cards">
                                        {req.conditions.slice(0, 3).map((c: any, idx: number) => {
                                          const parts = c.name.split(':');
                                          const title = parts.length > 1 ? parts.slice(1).join(':').trim() : c.name.trim();
                                          return (
                                            <div key={idx} className="ptih-cond-card">
                                              <span className="ptih-cond-title">{title}</span>
                                            </div>
                                          );
                                        })}
                                        {req.conditions.length > 3 && (
                                          <div className="ptih-cond-card more">
                                            +{req.conditions.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>

                                  {/* Row 2: price + arrow */}
                                  <div className="ptih-card-right ptih-card-right-auto">
                                    {(req.final_price || req.estimated_price) ? (
                                      <div className="ptih-card-price-wrap">
                                        {req.estimated_price && (
                                          <div className="price-col">
                                            <span className="ptih-card-price-label">Giá dự kiến</span>
                                            <span className={`price-est ${req.final_price ? 'strike' : 'active'}`}>
                                              {formatCurrencyTradeIn(req.estimated_price)}
                                            </span>
                                          </div>
                                        )}
                                        {req.estimated_price && req.final_price && (
                                          <div className="price-sep">|</div>
                                        )}
                                        {req.final_price && (
                                          <div className="price-col">
                                            <span className="ptih-card-price-label">Giá thu chính thức</span>
                                            <span className="price-final">
                                              {formatCurrencyTradeIn(req.final_price)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : <div />}
                                    <span className="ptih-card-arrow">
                                      <IconChevronRightTradeIn />
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    <section className="pfPromo" aria-label="Ưu đãi">
                      <img
                        className="pfPromoImg"
                        src={PROMO_URL}
                        alt=""
                        loading="lazy"
                      />
                      <div className="pfPromoTint" aria-hidden="true" />
                      <div className="pfPromoContent">
                        <h3 className="pfPromoTitle">Ưu đãi Platinum</h3>
                        <p className="pfPromoSub">
                          Nâng cấp tài khoản để nhận ưu đãi vận chuyển miễn phí
                          và hoàn tiền 5% cho mọi linh kiện.
                        </p>
                        <button
                          type="button"
                          className="pfPromoBtn"
                          onClick={() => navigate("/products")}
                        >
                          Tìm hiểu thêm
                        </button>
                      </div>
                    </section>
                  </div>
                  {/* end pfDashRight */}
                </div>
              )}
          </div>

          {!isSubPage && (
            <button
              type="button"
              className="pfLogoutBtnMobile"
              onClick={logout}
            >
              <SideIconWrap>
                <IconLogout />
              </SideIconWrap>
              Đăng xuất
            </button>
          )}
        </section>
      </div>

      <ConfirmModal
        open={showNotAvailable}
        title="Tính năng này hiện chưa được phát triển"
        message="Chúng tôi đang trong quá trình triển khai nhằm tăng cường bảo mật cho tài khoản. Vui lòng quay lại trong các bản cập nhật sắp tới."
        confirmLabel="Đã hiểu"
        cancelLabel="Đóng"
        onConfirm={() => setShowNotAvailable(false)}
        onCancel={() => setShowNotAvailable(false)}
      />
    </main>
  );
}

function SideIconWrap({
  children,
  colorClass,
}: {
  children: React.ReactNode;
  colorClass?: string;
}) {
  return (
    <span aria-hidden="true" className={`pfSideIcon ${colorClass || ""}`}>
      {children}
    </span>
  );
}
function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1V2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 7h6M9 11h6M9 15h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.2l1.6 1.6 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 17 21 12 16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12H9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 5v2M13 11v2M13 17v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconAward() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="8"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
