import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "@/styles/pages/OrdersPage.css";
import { apiFetch, API_BASE_URL } from "@/configs/api.config";
import Skeleton from "@/components/Skeleton";
import { useAuthStore } from "@/features/store/useAuthStore";

type OrderListRow = {
  id: number;
  order_code: string;
  created_at?: string | null;
  total_amount?: number | string;
  status?: string | null;
  payment_method?: string | null;
  estimated_delivery?: string | null;
  items?: Array<
    | {
        product_name_snapshot?: string | null;
        main_image_url?: string | null;
        quantity?: number;
      }
    | {
        product?: {
          name?: string | null;
          main_image_url?: string | null;
        } | null;
        quantity?: number;
      }
    | null
  >;
};

type OrdersIndexResponse = {
  data: OrderListRow[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

function fmtVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

function fmtDateTimeVi(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusMeta(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return { label: "Chờ xác nhận", tone: "wait" as const };
  if (s === "processing")
    return { label: "Đã xác nhận", tone: "info" as const };
  if (s === "paid") return { label: "Chuẩn bị hàng", tone: "info" as const };
  if (s === "shipped") return { label: "Đang giao", tone: "info" as const };
  if (s === "delivered") return { label: "Đã giao", tone: "ok" as const };
  if (s === "completed") return { label: "Hoàn thành", tone: "ok" as const };
  if (s === "returned") return { label: "Hoàn trả", tone: "return" as const };
  if (s === "cancelled") return { label: "Đã hủy", tone: "bad" as const };
  return { label: s || "—", tone: "muted" as const };
}

function resolveMediaUrl(maybeUrl?: string | null): string | null {
  if (!maybeUrl) return null;
  const s = String(maybeUrl).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  try {
    return new URL(s, API_BASE_URL || window.location.origin).toString();
  } catch {
    return s;
  }
}

function getItemImages(items: OrderListRow["items"]): string[] {
  return (items ?? [])
    .map((it) => {
      if (!it) return null;
      const p = (it as any)?.product as any;
      const candidates = [
        (it as any)?.variant?.image_url,
        (it as any)?.image,
        p?.image,
        p?.image_url,
        p?.main_image_url,
        p?.main_image,
        p?.thumbnail,
        Array.isArray(p?.images) ? p.images[0] : null,
        (it as any)?.product?.main_image_url,
      ];
      for (const c of candidates) {
        if (!c) continue;
        if (typeof c === "string") return resolveMediaUrl(c);
        if (typeof c === "object") {
          const url = c?.url ?? c?.src ?? c?.path;
          if (typeof url === "string") return resolveMediaUrl(url);
        }
      }
      return null;
    })
    .filter(Boolean) as string[];
}

function getItemNames(items: OrderListRow["items"]): string[] {
  return (items ?? [])
    .map((it) => {
      if (!it) return "";
      const p = (it as any)?.product as any;
      return (p?.name || (it as any)?.product_name_snapshot || "").toString();
    })
    .filter(Boolean);
}

function getItemQty(
  it: NonNullable<NonNullable<OrderListRow["items"]>[number]>,
): number {
  return (it as any)?.quantity ?? 1;
}

// ── Icons ──────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const ChevronIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const SortIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16H3M17 8H7M13 12H3" />
  </svg>
);
const DotsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);
const BoxIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.29 7 8.71 5 8.71-5" />
    <path d="M12 22V12" />
  </svg>
);
const TruckIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
  </svg>
);
const CheckIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);
const WalletIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
const ClockIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = useAuthStore((state) => state.userStr);
  const hasAuth = !!userStr;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<OrdersIndexResponse | null>(null);
  const [page, setPage] = useState(1);

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  const pager = useMemo(
    () => ({
      last: res?.last_page ?? 1,
      cur: res?.current_page ?? 1,
    }),
    [res?.current_page, res?.last_page],
  );

  useEffect(() => {
    if (!hasAuth) {
      navigate("/login");
      return;
    }
    let cancelled = false;
    setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    }, 0);
    apiFetch<OrdersIndexResponse>(`/orders?page=${page}`)
      .then((d) => {
        if (!cancelled) setRes(d);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Không tải được đơn hàng.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, page, hasAuth]);

  const rows = useMemo(() => res?.data ?? [], [res?.data]);

  const filteredRows = useMemo(() => {
    const current = now;
    let result = rows.filter((r) => {
      if (q.trim()) {
        const hay = (
          (r.order_code || "") +
          " " +
          getItemNames(r.items).join(" ")
        ).toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      if (
        statusFilter !== "all" &&
        (r.status || "").toLowerCase() !== statusFilter
      )
        return false;
      if (timeRange !== "all") {
        if (timeRange === "custom") {
          if (customFrom && customTo && r.created_at) {
            const t = Date.parse(r.created_at);
            if (
              !Number.isFinite(t) ||
              t < Date.parse(customFrom) ||
              t > Date.parse(customTo)
            )
              return false;
          }
        } else {
          const days = Number.parseInt(timeRange, 10);
          if (Number.isFinite(days) && r.created_at) {
            const t = Date.parse(r.created_at);
            if (!Number.isFinite(t)) return false;
            if (current != null && (current - t) / (1000 * 60 * 60 * 24) > days)
              return false;
          }
        }
      }
      return true;
    });
    if (sortOrder === "oldest") result = [...result].reverse();
    return result;
  }, [rows, q, statusFilter, timeRange, customFrom, customTo, sortOrder, now]);

  const inProfile = (location.pathname || "")
    .toLowerCase()
    .startsWith("/profile/");
  const detailHref = (id: number) =>
    inProfile ? `/profile/orders/${id}` : `/orders/${id}`;
  const backHref = "/profile";

  // KPI data
  const kpis = useMemo(() => {
    const total = res?.total ?? rows.length;
    const pending = rows.filter(
      (r) => (r.status || "").toLowerCase() === "pending",
    ).length;
    const shipping = rows.filter(
      (r) => (r.status || "").toLowerCase() === "shipped",
    ).length;
    const completed = rows.filter((r) =>
      ["completed", "delivered"].includes((r.status || "").toLowerCase()),
    ).length;
    const spend = rows.reduce((acc, r) => {
      const n =
        typeof r.total_amount === "string"
          ? Number(r.total_amount)
          : (r.total_amount ?? 0);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    return { total, pending, shipping, completed, spend };
  }, [res?.total, rows]);

  // Skeleton
  const SkeletonRow = () => (
    <div
      className="odRow"
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 20px",
        alignItems: "center",
      }}
    >
      <Skeleton width="120px" height="14px" />
      <Skeleton width="200px" height="14px" />
      <Skeleton width="100px" height="14px" />
    </div>
  );

  const content = loading ? (
    <div className="odhList">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  ) : error ? (
    <div className="od-empty-state">
      <div className="od-empty-icon">⚠️</div>
      <h3 className="od-empty-title">Có lỗi xảy ra</h3>
      <p className="od-empty-desc">{error}</p>
    </div>
  ) : !rows.length ? (
    <div className="od-empty-state">
      <div className="od-empty-icon">
        <BoxIcon />
      </div>
      <h3 className="od-empty-title">Bạn chưa có đơn hàng nào</h3>
      <p className="od-empty-desc">
        Hãy khám phá các sản phẩm tuyệt vời của E-Tech ngay hôm nay!
      </p>
      <Link to="/products" className="od-empty-btn">
        Mua sắm ngay
      </Link>
    </div>
  ) : filteredRows.length === 0 ? (
    <div className="od-empty-state">
      <div className="od-empty-icon">
        <SearchIcon />
      </div>
      <h3 className="od-empty-title">Không tìm thấy đơn hàng</h3>
      <p className="od-empty-desc">
        Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
      </p>
    </div>
  ) : (
    <div className="odhList">
      {filteredRows.map((o) => {
        const meta = statusMeta(o.status);
        const total =
          typeof o.total_amount === "string"
            ? Number(o.total_amount)
            : (o.total_amount ?? 0);
        const imgs = getItemImages(o.items);
        const names = getItemNames(o.items);
        const itemCount = o.items?.length ?? 0;
        const pm = (o as any).payment?.method || (o as any).payment_method;
        const payMethod =
          pm === "cod"
            ? "Thanh toán khi nhận hàng"
            : pm === "vnpay"
              ? " VNPay"
              : pm === "momo"
                ? "Ví MoMo"
                : "Chuyển khoản";
        const estDelivery = (o as any).estimated_delivery || null;

        return (
          <div key={o.id} className="odRow">
            {/* LEFT */}
            <div className="odRowLeft">
              <Link className="odRowCode" to={detailHref(o.id)}>
                #{o.order_code}
              </Link>
              <div className="odRowDate">{fmtDateTimeVi(o.created_at)}</div>
              <span className={`odStatus tone-${meta.tone}`}>{meta.label}</span>
              <div className="odRowPayment">Thanh toán: {payMethod}</div>
            </div>

            {/* MIDDLE */}
            <div className="odRowMid">
              <div className="odRowCount">{itemCount} sản phẩm</div>
              <div
                className={`odRowProducts ${itemCount > 1 ? "odRowProducts--multi" : ""}`}
              >
                {/* Thumbnails — up to 3 */}
                {imgs.length > 0 && (
                  <div className="odThumbStrip">
                    {imgs.slice(0, 3).map((src, i) => (
                      <img
                        key={i}
                        className="odThumb"
                        src={src}
                        alt=""
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
                {imgs.length === 0 && (
                  <div className="odThumbStrip">
                    <div className="odThumbPlaceholder">
                      <BoxIcon />
                    </div>
                  </div>
                )}

                {/* Name list */}
                <div className="odNameList">
                  {names.slice(0, 3).map((name, i) => {
                    const qty = o.items?.[i] ? getItemQty(o.items[i]!) : 1;
                    return (
                      <div key={i} className="odNameRow">
                        <span className="odNameText">{name}</span>
                        <span className="odNameQty">x{qty}</span>
                      </div>
                    );
                  })}
                  {names.length > 3 && (
                    <div className="odNameMore">
                      + {names.length - 3} sản phẩm khác
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="odRowRight">
              <div className="odRowDelivery">
                {estDelivery ? (
                  <>
                    <strong>Giao hàng:</strong>
                    {fmtDateTimeVi(estDelivery)}
                  </>
                ) : (
                  <span />
                )}
              </div>

              <div className="odRowTotalWrap">
                <span className="odRowTotalLabel">Tổng tiền:</span>
                <div className="odRowTotal">{fmtVnd(total)}đ</div>
              </div>

              <div className="odRowActions">
                <Link className="odDetailBtn" to={detailHref(o.id)}>
                  Xem chi tiết <ChevronIcon />
                </Link>
                <button
                  type="button"
                  className="odMenuBtn"
                  aria-label="Tùy chọn"
                >
                  <DotsIcon />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Page number buttons
  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const { last, cur } = pager;
    if (last <= 7) {
      for (let i = 1; i <= last; i++) nums.push(i);
    } else {
      nums.push(1);
      if (cur > 3) nums.push(-1); // ellipsis
      for (let i = Math.max(2, cur - 1); i <= Math.min(last - 1, cur + 1); i++)
        nums.push(i);
      if (cur < last - 2) nums.push(-2); // ellipsis
      nums.push(last);
    }
    return nums;
  }, [pager]);

  const mainContent = (
    <>
      {/* KPI */}
      {!loading && !error && rows.length > 0 && (
        <div className="odhKpis">
          <div className="odhKpi">
            <div className="odhKpiIcon odhKpiIcon-orange">
              <BoxIcon />
            </div>
            <div className="odhKpiBody">
              <div className="odhKpiLabel">Tổng đơn hàng</div>
              <div className="odhKpiValue">{kpis.total}</div>
              <span className="odhKpiUnit">đơn hàng</span>
            </div>
          </div>
          <div className="odhKpi">
            <div className="odhKpiIcon odhKpiIcon-yellow">
              <ClockIcon />
            </div>
            <div className="odhKpiBody">
              <div className="odhKpiLabel">Chờ xác nhận</div>
              <div className="odhKpiValue">{kpis.pending}</div>
              <span className="odhKpiUnit">đơn hàng</span>
            </div>
          </div>
          <div className="odhKpi">
            <div className="odhKpiIcon odhKpiIcon-blue">
              <TruckIcon />
            </div>
            <div className="odhKpiBody">
              <div className="odhKpiLabel">Đang giao</div>
              <div className="odhKpiValue">{kpis.shipping}</div>
              <span className="odhKpiUnit">đơn hàng</span>
            </div>
          </div>
          <div className="odhKpi">
            <div className="odhKpiIcon odhKpiIcon-green">
              <CheckIcon />
            </div>
            <div className="odhKpiBody">
              <div className="odhKpiLabel">Hoàn thành</div>
              <div className="odhKpiValue">{kpis.completed}</div>
              <span className="odhKpiUnit">đơn hàng</span>
            </div>
          </div>
          <div className="odhKpi odhKpi-highlight">
            <div className="odhKpiIcon odhKpiIcon-red">
              <WalletIcon />
            </div>
            <div className="odhKpiBody">
              <div className="odhKpiLabel">Tổng tền mua</div>
              <div className="odhKpiValue" style={{ fontSize: 15 }}>
                {fmtVnd(kpis.spend)}đ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading KPIs */}
      {loading && (
        <div className="odhKpis">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="odhKpi">
              <Skeleton width="40px" height="40px" borderRadius="10px" />
              <div style={{ flex: 1 }}>
                <Skeleton
                  width="90px"
                  height="12px"
                  style={{ marginBottom: 6 }}
                />
                <Skeleton width="50px" height="22px" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="odFilters">
        <div className="odSearchWrap">
          <SearchIcon />
          <input
            className="odSearch"
            placeholder="Tìm mã đơn hàng, tên sản phẩm..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="odFilterDivider" />
        <select
          className="odSelect"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="processing">Đã xác nhận</option>
          <option value="paid">Chuẩn bị hàng</option>
          <option value="shipped">Đang giao</option>
          <option value="delivered">Đã giao</option>
          <option value="completed">Hoàn thành</option>
          <option value="returned">Hoàn trả</option>
          <option value="cancelled">Đã hủy</option>
        </select>
        <select
          className="odSelect"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="all">Tất cả thời gian</option>
          <option value="7">7 ngày qua</option>
          <option value="15">15 ngày qua</option>
          <option value="30">30 ngày qua</option>
          <option value="custom">Tùy chọn</option>
        </select>
        {timeRange === "custom" && (
          <div className="odCustomRange">
            <input
              type="date"
              className="odDate"
              value={customFrom ?? ""}
              onChange={(e) => setCustomFrom(e.target.value || null)}
            />
            <span>—</span>
            <input
              type="date"
              className="odDate"
              value={customTo ?? ""}
              onChange={(e) => setCustomTo(e.target.value || null)}
            />
          </div>
        )}
        <button
          type="button"
          className="odSortBtn"
          onClick={() =>
            setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))
          }
        >
          <SortIcon />
          Sắp xếp: {sortOrder === "newest" ? "Mới nhất" : "Cũ nhất"}
        </button>
      </div>

      {/* Order list */}
      {content}

      {/* Pagination */}
      {!loading && !error && rows.length > 0 && pager.last > 1 && (
        <div className="odPager">
          <button
            type="button"
            className="odPageBtn"
            disabled={pager.cur <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹
          </button>

          {pageNumbers.map((n, i) =>
            n < 0 ? (
              <span key={`ellipsis-${i}`} className="odPageInfo">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                className={`odPageNum${n === pager.cur ? " odPageNum-active" : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ),
          )}

          <button
            type="button"
            className="odPageBtn"
            disabled={pager.cur >= pager.last}
            onClick={() => setPage((p) => Math.min(pager.last, p + 1))}
          >
            ›
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className={inProfile ? "odhWrap" : "odPage"}>
      {/* Header */}
      <div className={inProfile ? "odhTop" : "odTop"}>
        <div>
          <h1 className={inProfile ? "odhTitle" : "odTitle"}>
            Lịch sử đơn hàng
          </h1>
          <div className={inProfile ? "odhSub" : "odSub"}>
            Nơi lưu trữ toàn bộ đơn hàng của bạn. Dễ dàng kiểm tra tiến trình
            giao hàng, xem chi tiết hóa đơn, gửi yêu cầu đổi trả hoặc mua lại
            sản phẩm chỉ với vài thao tác.
          </div>
        </div>
        <div className="odHeaderImage" aria-hidden>
          <img src="/lichSDH.png" alt="" />
        </div>
      </div>

      {mainContent}
    </div>
  );
}
