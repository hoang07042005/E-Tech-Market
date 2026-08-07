import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import "@/styles/pages/OrderDetailPage.css";
import { API_BASE_URL, apiFetch } from "@/configs/api.config";
import Skeleton from "@/components/Skeleton";
import ConfirmModal from "@/components/ConfirmModal";
import { useAuthStore } from "@/features/store/useAuthStore";

type OrderDetail = {
  id: number;
  order_code: string;
  status: string;
  payment_status?: string | null;
  currency?: string | null;
  subtotal_amount?: number | string;
  discount_amount?: number | string;
  points_discount?: number | string;
  shipping_fee?: number | string;
  total_amount?: number | string;
  created_at?: string | null;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address_line?: string | null;
  shipping_province?: string | null;
  shipping_district?: string | null;
  shipping_ward?: string | null;
  payment?: {
    method?: string | null;
    status?: string | null;
    transaction_code?: string | null;
    paid_at?: string | null;
  } | null;
  return_request?: {
    id?: number;
    status: "pending" | "approved" | "rejected" | "refunded" | string;
    content?: string | null;
    media?: Array<{
      type?: "image" | "video" | string;
      url?: string | null;
    }> | null;
    admin_note?: string | null;
    refund_proof?: Array<{
      type?: "image" | "video" | string;
      url?: string | null;
    }> | null;
    approved_at?: string | null;
    refunded_at?: string | null;
    customer_confirmed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  status_history?: Array<{
    id: number;
    from_status?: string | null;
    to_status: string;
    from_label?: string | null;
    to_label: string;
    note?: string | null;
    changed_at?: string | null;
    changed_by?: {
      id: number;
      name: string;
      avatar_url?: string | null;
    } | null;
  }>;
  items: Array<{
    id?: number;
    product_id: number;
    product_name_snapshot?: string | null;
    quantity: number;
    unit_price: number | string;
    total_price: number | string;
    product?: { name?: string | null; main_image_url?: string | null } | null;
  }>;
};

function fmtVnd(n: number) {
  return Math.round(n).toLocaleString("vi-VN");
}

/** Parse ISO string from backend (naive = treated as +07:00, UTC Z = kept as-is). */
function parseDateString(iso: string) {
  const raw = iso.trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const naiveTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(
    normalized,
  );
  if (naiveTimestamp) {
    // Backend stores local Vietnam time as naive strings → tag +07:00 explicitly
    const d = new Date(normalized + "+07:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a backend date string to Vietnam local time (HH:mm:ss DD/MM/YYYY). */
function fmtViTime(iso?: string | null) {
  const d = iso ? parseDateString(iso) : null;
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

function fmtDateTimeVi(iso?: string | null) {
  const d = iso ? parseDateString(iso) : null;
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

function resolveUrl(url?: string | null) {
  if (!url) return null;
  const s = url.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
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
  return `${API_BASE_URL}${s.startsWith("/") ? s : `/${s}`}`;
}

function payLabel(raw?: string | null) {
  const s = (raw || "").toLowerCase();
  if (s === "cod") return "Thanh toán khi nhận hàng (COD)";
  if (s === "momo") return "Ví MoMo";
  if (s === "vnpay") return "VNPAY";
  return raw ? raw.toString() : "—";
}

function statusMeta(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "pending")
    return { label: "Chờ xác nhận", tone: "wait" as const, step: 1 };
  if (s === "processing")
    return { label: "Đã xác nhận", tone: "purple" as const, step: 2 };
  if (s === "paid")
    return { label: "Chuẩn bị hàng", tone: "info" as const, step: 3 };
  if (s === "shipped")
    return { label: "Đang giao", tone: "teal" as const, step: 4 };
  if (s === "delivered")
    return { label: "Đã giao", tone: "ok" as const, step: 5 };
  if (s === "completed")
    return { label: "Hoàn thành", tone: "ok" as const, step: 6 };
  if (s === "returned")
    return { label: "Hoàn trả", tone: "return" as const, step: 7 };
  if (s === "cancelled") return { label: "Hủy", tone: "bad" as const, step: 0 };
  return { label: s || "—", tone: "muted" as const, step: 1 };
}

const ORDER_STATUS_STEPS: Array<{
  value: string;
  label: string;
  step: number;
}> = [
  { value: "pending", label: "Chờ xác nhận", step: 1 },
  { value: "processing", label: "Đã xác nhận", step: 2 },
  { value: "paid", label: "Chuẩn bị hàng", step: 3 },
  { value: "shipped", label: "Đang giao", step: 4 },
  { value: "delivered", label: "Đã giao", step: 5 },
  { value: "completed", label: "Hoàn thành", step: 6 },
  { value: "returned", label: "Hoàn trả", step: 7 },
  { value: "cancelled", label: "Hủy", step: 0 },
];

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const userStr = useAuthStore((state) => state.userStr);
  const hasAuth = !!userStr;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmReceivedModal, setShowConfirmReceivedModal] =
    useState(false);
  const [showConfirmReturnSubmit, setShowConfirmReturnSubmit] = useState(false);
  const [showConfirmRefundReceived, setShowConfirmRefundReceived] =
    useState(false);
  const [returnContent, setReturnContent] = useState("");
  const [returnFiles, setReturnFiles] = useState<File[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!showReturnForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowReturnForm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [showReturnForm]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen]);

  function openLightbox(u: string) {
    setLightboxUrl(u);
    setLightboxOpen(true);
  }

  useEffect(() => {
    if (!hasAuth) {
      navigate("/login");
      return;
    }
    if (!id) return;
    let cancelled = false;
    setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    }, 0);
    apiFetch<OrderDetail>(`/orders/${id}`)
      .then((d) => {
        if (!cancelled) setOrder(d);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Không tải được chi tiết đơn.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, hasAuth]);

  const meta = useMemo(() => statusMeta(order?.status), [order?.status]);
  const address = useMemo(() => {
    if (!order) return "—";
    const parts = [
      order.shipping_address_line,
      order.shipping_ward,
      order.shipping_district,
      order.shipping_province,
    ]
      .map((s) => (s || "").toString().trim())
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }, [order]);

  if (loading) {
    return (
      <div className="oudPage">
        <div className="oudTopRow">
          <Skeleton width="150px" height="14px" />
        </div>
        <div className="oudHead">
          <Skeleton
            width="300px"
            height="40px"
            style={{ marginBottom: "8px" }}
          />
          <Skeleton width="200px" height="14px" />
        </div>
        <div className="oudGrid">
          <div className="oudLeft">
            <div className="oudCard">
              <Skeleton width="100%" height="100px" />
            </div>
            <div className="oudCard">
              <Skeleton width="100%" height="300px" />
            </div>
          </div>
          <div className="oudRight">
            <div className="oudCard">
              <Skeleton width="100%" height="120px" />
            </div>
            <div className="oudCard">
              <Skeleton width="100%" height="150px" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error)
    return (
      <div className="odPage">
        <div className="odEmpty">{error}</div>
      </div>
    );
  if (!order)
    return (
      <div className="odPage">
        <div className="odEmpty">Không có dữ liệu.</div>
      </div>
    );

  const subtotal = Number(order.subtotal_amount ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  const pointsDiscount = Number(order.points_discount ?? 0);
  const shipping = Number(order.shipping_fee ?? 0);
  const total = Number(order.total_amount ?? 0);
  const inProfile = (location.pathname || "")
    .toLowerCase()
    .startsWith("/profile/");
  const status = (order.status || "").toLowerCase();
  // UI rules:
  // - Button "Hủy đơn hàng": chỉ hiển thị trước khi vào trạng thái "Đang giao"
  // - Buttons "Xác nhận đã nhận hàng" & "Yêu cầu hoàn trả": chỉ hiển thị khi đã ở trạng thái "Đã giao" hoặc "Hoàn thành"
  const showCancel =
    status === "pending" || status === "processing" || status === "paid";
  // "Yêu cầu hoàn trả" chỉ hiển thị khi đã giao, và sẽ ẩn sau khi user xác nhận nhận hàng (completed)
  const hasReturnRequest = !!order.return_request;
  // Nếu đã tạo yêu cầu hoàn trả thì không cho xác nhận đã nhận hàng nữa.
  const isCodOrder =
    (order.payment?.method || "").toString().toLowerCase() === "cod";
  const showConfirmReceived = status === "delivered" && !hasReturnRequest;
  const canConfirmReceived =
    showConfirmReceived && (!isCodOrder || order.payment?.status === "paid");
  const showRequestReturn = status === "delivered" && !hasReturnRequest;
  const hasAdminResponse =
    !!order.return_request?.admin_note ||
    (Array.isArray(order.return_request?.refund_proof) &&
      order.return_request!.refund_proof!.length > 0) ||
    ["approved", "rejected", "refunded"].includes(
      (order.return_request?.status || "").toString().toLowerCase(),
    );

  function rrStatusLabel(s?: string | null) {
    const x = (s || "").toLowerCase();
    if (x === "pending") return "Đang chờ admin phê duyệt";
    if (x === "approved") return "Đã phê duyệt • Chờ hoàn tiền";
    if (x === "rejected") return "Bị từ chối";
    if (x === "refunded") return "Đã hoàn tiền";
    return x || "—";
  }

  async function onCancelOrder() {
    if (!order || !hasAuth) return;
    // perform cancel (called from modal confirm)
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await apiFetch<OrderDetail>(
        `/orders/${order.id}/cancel`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      setOrder(updated);
      setShowConfirmCancel(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Hủy đơn thất bại.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onConfirmReceived() {
    if (!order || !hasAuth) return;
    // called from modal confirm
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await apiFetch<OrderDetail>(
        `/orders/${order.id}/confirm-received`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      setOrder(updated);
      setShowConfirmReceivedModal(false);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Xác nhận nhận hàng thất bại.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function onSubmitReturnRequest() {
    // performs submission (called from modal confirm)
    if (!order || !hasAuth) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const fd = new FormData();
      fd.set("content", returnContent.trim());
      returnFiles.forEach((f) => fd.append("media[]", f));
      const updated = await apiFetch<OrderDetail>(
        `/orders/${order.id}/return-request`,
        {
          method: "POST",
          body: fd,
        },
      );
      setOrder(updated);
      setShowReturnForm(false);
      setReturnContent("");
      setReturnFiles([]);
      setShowConfirmReturnSubmit(false);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Gửi yêu cầu hoàn trả thất bại.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  function requestSubmitReturnRequest() {
    if (!order || !hasAuth) return;
    if (!returnContent.trim() || returnContent.trim().length < 5) {
      setActionError("Vui lòng nhập nội dung yêu cầu (tối thiểu 5 ký tự).");
      return;
    }
    setShowConfirmReturnSubmit(true);
  }

  async function onConfirmRefundReceived() {
    if (!order || !hasAuth) return;
    // called from modal confirm
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await apiFetch<OrderDetail>(
        `/orders/${order.id}/return-request/confirm-refund`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      setOrder(updated);
      setShowConfirmRefundReceived(false);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Xác nhận nhận tiền hoàn thất bại.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function onConfirmPayment() {
    if (!order || !hasAuth) return;
    if (order.payment?.status === "paid") return;
    // This function is invoked by modal confirm — proceed with API call
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await apiFetch<OrderDetail>(
        `/orders/${order.id}/confirm-payment`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      setOrder(updated);
      setShowConfirmPayment(false);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Xác nhận thanh toán thất bại.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="oudPage">
      <div className="oudTopRow">
        <Link
          className="oudBack"
          to={inProfile ? "/profile/orders" : "/orders"}
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <div className="oudHead">
        <div>
          <h1 className="oudTitle">Đơn hàng #{order.order_code}</h1>
          <div className="oudSub">
            Ngày đặt hàng: {fmtDateTimeVi(order.created_at)}
          </div>
        </div>
      </div>

      <section className="oudCard">
        <div className="oudCardTitle">Trạng thái đơn hàng</div>
        <div
          className={`oudSteps ${hasReturnRequest ? "oudSteps--has-return" : ""}`}
        >
          {(() => {
            const showReturnStep =
              status === "returned" ||
              order.return_request?.status === "approved" ||
              order.return_request?.status === "refunded";

            const baseSteps =
              status === "cancelled"
                ? [{ value: "cancelled", label: "Hủy", step: 0 }]
                : ORDER_STATUS_STEPS.filter(
                    (s) =>
                      s.value !== "cancelled" &&
                      (s.value !== "returned" || showReturnStep),
                  );

            const steps = showReturnStep
              ? baseSteps
                  .map((s) => {
                    if (s.value === "returned") return { ...s, step: 6 };
                    if (s.value === "completed") return { ...s, step: 7 };
                    return s;
                  })
                  .sort((a, b) => a.step - b.step)
              : baseSteps;

            // Build map: to_status → changed_at from history
            const historyMap = new Map(
              (order.status_history ?? []).map((h) => [
                h.to_status,
                h.changed_at ?? null,
              ]),
            );

            const effectiveStep =
              status === "cancelled"
                ? 0
                : order.return_request?.status === "refunded"
                  ? 7
                  : status === "returned" ||
                      order.return_request?.status === "approved"
                    ? 6
                    : meta.step;

            return steps.map((s, idx) => {
              const isCancel = s.step === 0;
              const done = isCancel
                ? status === "cancelled"
                : s.step <= effectiveStep;
              const active = isCancel
                ? status === "cancelled"
                : s.step === effectiveStep;
              const historyTime = historyMap.get(s.value);
              const time = historyTime
                ? fmtViTime(historyTime)
                : s.value === "pending"
                  ? fmtViTime(order.created_at)
                  : s.value === "returned" &&
                      order.return_request?.status === "approved"
                    ? fmtViTime(order.return_request.approved_at)
                    : s.value === "completed" &&
                        order.return_request?.status === "refunded"
                      ? fmtViTime(order.return_request.refunded_at)
                      : null;
              const label =
                s.value === "completed" && showReturnStep
                  ? "Hoàn thành (hoàn trả)"
                  : s.label;
              return (
                <div
                  key={`${s.value}-${s.step}`}
                  className={`oudStep ${done ? "done" : ""} ${active ? "active" : ""}`}
                >
                  <div className="oudStepDot" aria-hidden>
                    {done ? "✓" : idx + 1}
                  </div>
                  <div>
                    <div className="oudStepLabel">{label}</div>
                    {time ? <div className="oudStepTime">{time}</div> : null}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      <div className="oudGrid">
        <div className="oudLeft">
          <section className="oudCard oudCardSoft">
            <div className="oudCardHeadRow">
              <div className="oudCardTitle">
                Sản phẩm ({order.items.length})
              </div>
            </div>
            <div className="oudItems">
              {order.items.map((it, idx) => {
                const img = resolveUrl(
                  (it as any)?.variant?.image_url ||
                    it.product?.main_image_url ||
                    null,
                );
                const name = (
                  it.product?.name ||
                  it.product_name_snapshot ||
                  "—"
                ).toString();
                const unit = Number(it.unit_price ?? 0);
                const line = Number(
                  it.total_price ?? unit * (it.quantity ?? 0),
                );
                const variantLabel =
                  [
                    (it as any)?.variant?.color,
                    (it as any)?.variant?.configuration,
                  ]
                    .filter(Boolean)
                    .join(" - ") || null;

                return (
                  <div key={`${it.product_id}-${idx}`} className="oudItem">
                    {img ? (
                      <img
                        className="oudItemImg"
                        src={img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="oudItemImg ph" aria-hidden />
                    )}
                    <div className="oudItemInfo">
                      <div className="oudItemName">{name}</div>
                      {variantLabel && (
                        <div
                          className="oudItemSub"
                          style={{ color: "var(--et-text)", fontWeight: 600 }}
                        >
                          {variantLabel}
                        </div>
                      )}
                      <div className="oudItemSub">Số lượng: {it.quantity}</div>
                    </div>
                    <div className="oudItemPrice">{fmtVnd(line)}đ</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="oudCard">
            <div className="oudCardTitle">Lịch sử chuyển đổi trạng thái</div>
            {(() => {
              const history = [...(order.status_history || [])];

              if (order.return_request?.status === "refunded") {
                history.unshift({
                  id: 999999,
                  from_status: "returned",
                  from_label: "Hoàn trả",
                  to_status: "completed",
                  to_label: "Hoàn thành (hoàn trả)",
                  changed_at:
                    order.return_request.refunded_at ||
                    order.return_request.updated_at ||
                    null,
                  changed_by: null,
                  note: "Hoàn tiền thành công",
                });
              }

              if (!history.length) {
                return (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--et-text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    Chưa có lịch sử.
                  </div>
                );
              }

              return (
                <div className="oudTimeline">
                  {history.map((h, i) => {
                    const isLast = i === history.length - 1;
                    const fromLabel =
                      h.from_label || statusMeta(h.from_status || null).label;
                    const toLabel =
                      h.to_label || statusMeta(h.to_status || null).label;

                    return (
                      <div key={h.id} className="oudTimelineItem">
                        <div className="oudTimelineTrack">
                          <div className="oudTimelineDot" />
                          {!isLast && <div className="oudTimelineLine" />}
                        </div>
                        <div className="oudTimelineContent">
                          <div className="oudTimelineHeader">
                            <div className="oudTimelineTitle">
                              {fromLabel ? (
                                <>
                                  <span style={{ color: "#94a3b8" }}>
                                    {fromLabel}
                                  </span>
                                  <span
                                    style={{
                                      margin: "0 8px",
                                      color: "#cbd5e1",
                                    }}
                                  >
                                    →
                                  </span>
                                  <span
                                    className={`oudStatusBadge tone-${statusMeta(h.to_status).tone}`}
                                  >
                                    {toLabel}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className={`oudStatusBadge tone-${statusMeta(h.to_status).tone}`}
                                >
                                  {toLabel}
                                </span>
                              )}
                            </div>
                            <div className="oudTimelineTime">
                              {fmtDateTimeVi(h.changed_at)}
                            </div>
                          </div>
                          {h.changed_by?.name && (
                            <div className="oudTimelineActor">
                              Bởi: {h.changed_by.name}
                            </div>
                          )}
                          {h.note && (
                            <div className="oudTimelineNote">{h.note}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>
        </div>

        <div className="oudRight">
          <section className="oudCard">
            <div className="oudCardMiniHead">ĐỊA CHỈ NHẬN HÀNG</div>
            <div className="oudAddrRow">
              <span className="oudAddrIco" aria-hidden>
                <IconPin />
              </span>
              <div className="oudAddrInfo">
                <div className="oudAddrName">{order.shipping_name || "—"}</div>
                <div className="oudAddrSub">{order.shipping_phone || "—"}</div>
                <div className="oudAddrSub">{address}</div>
              </div>
            </div>
          </section>

          <section className="oudCard">
            <div className="oudCardMiniHead">PHƯƠNG THỨC THANH TOÁN</div>
            <div className="oudPayBox">
              <div className="oudPayMethod">
                {payLabel(order.payment?.method || null)}
              </div>
              {(order.payment?.method || "").toLowerCase() === "cod" ? (
                <>
                  <div className="oudPaySub">
                    Vui lòng thanh toán khi nhận hàng
                  </div>
                  <label
                    className={`oudPayToggle ${order.payment?.status !== "paid" ? "is-clickable" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={order.payment?.status === "paid"}
                      onChange={() => {
                        if (order.payment?.status !== "paid") {
                          // open modal to confirm payment instead of native confirm
                          setShowConfirmPayment(true);
                        }
                      }}
                      disabled={actionBusy || order.payment?.status === "paid"}
                    />
                    <span className="oudPayToggleText">
                      Xác nhận đã thanh toán
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <div
                    style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}
                  >
                    Mã giao dịch:{" "}
                    <span style={{ color: "#334155", fontWeight: 600 }}>
                      {order.payment?.transaction_code || "-"}
                    </span>
                  </div>
                  <div
                    style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}
                  >
                    Trạng thái:{" "}
                    <span
                      style={{
                        color:
                          order.payment?.status === "paid"
                            ? "#10b981"
                            : order.payment?.status === "failed"
                              ? "#ef4444"
                              : "#f59e0b",
                        fontWeight: 600,
                      }}
                    >
                      {order.payment?.status === "paid"
                        ? "Đã thanh toán"
                        : order.payment?.status === "failed"
                          ? "Thất bại"
                          : "Chưa thanh toán"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="oudCard">
            <div className="oudCardTitle">Tổng kết đơn hàng</div>
            <div className="oudSumRow">
              <span>Tạm tính</span>
              <span>{fmtVnd(subtotal)}đ</span>
            </div>
            <div className="oudSumRow">
              <span>Phí vận chuyển</span>
              <span>{fmtVnd(shipping)}đ</span>
            </div>
            {discount > 0 && (
              <div className="oudSumRow">
                <span>Giảm giá khuyến mãi</span>
                <span className="neg">-{fmtVnd(discount)}đ</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="oudSumRow">
                <span>Giảm giá (Điểm thưởng)</span>
                <span className="neg">-{fmtVnd(pointsDiscount)}đ</span>
              </div>
            )}
            <div className="oudSumDivider" />
            <div className="oudSumTotal">
              <span>Tổng cộng</span>
              <span>{fmtVnd(total)}đ</span>
            </div>
            <div className="oudSumVat">Đã bao gồm VAT</div>

            <div className="oudActions">
              {showConfirmReceived && (
                <button
                  type="button"
                  className="oudBtn primary full"
                  disabled={actionBusy || !canConfirmReceived}
                  onClick={() => setShowConfirmReceivedModal(true)}
                >
                  Xác nhận đã nhận hàng
                </button>
              )}
              {showConfirmReceived && !canConfirmReceived && isCodOrder ? (
                <div
                  style={{
                    marginTop: 10,
                    color: "var(--et-text-muted)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Với đơn COD, vui lòng tích vào "Xác nhận đã thanh toán" trước
                  khi xác nhận đã nhận hàng.
                </div>
              ) : null}
              {showCancel && (
                <button
                  type="button"
                  className="oudBtn ghost full"
                  disabled={actionBusy}
                  onClick={() => setShowConfirmCancel(true)}
                >
                  Hủy đơn hàng
                </button>
              )}
              {showRequestReturn && (
                <button
                  type="button"
                  className="oudBtn outline full"
                  disabled={actionBusy}
                  onClick={() => setShowReturnForm(true)}
                >
                  Yêu cầu hoàn trả
                </button>
              )}
            </div>
            {actionError ? (
              <div
                style={{
                  marginTop: 10,
                  color: "#b91c1c",
                  fontWeight: 900,
                  fontSize: 12,
                }}
              >
                {actionError}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {order.return_request && (
        <div className="oudReturnGrid">
          {/* Left Column */}
          <section className="oudReturnCard">
            <div className="oudReturnHeader">
              <div className="oudReturnHeaderIcon">
                <IconMailReturn />
              </div>
              <div>
                <div className="oudReturnHeaderTitle">Yêu cầu hoàn trả</div>
                <div className="oudReturnHeaderStatus">
                  Trạng thái:{" "}
                  <span
                    style={{
                      color:
                        order.return_request.status === "refunded"
                          ? "#10b981"
                          : "inherit",
                    }}
                  >
                    {rrStatusLabel(order.return_request.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="oudReturnContentBox">
              <div className="oudReturnContentHeader">
                <span className="oudReturnContentIcon">
                  <IconMessage />
                </span>
                <div className="oudReturnContentTitle">Nội dung yêu cầu</div>
              </div>
              <div className="oudReturnContentText">
                {order.return_request.content || "Không có ghi chú."}
              </div>
            </div>
            <hr className="oudReturnDivider" />

            <div>
              <div className="oudReturnContentHeader">
                <span className="oudReturnContentIcon">
                  <IconInfo />
                </span>
                <div className="oudReturnContentTitle">
                  Thông tin sản phẩm tham khảo
                </div>
              </div>
              <div
                className="oudReturnContentText"
                style={{ marginBottom: 16 }}
              >
                {order.items.length > 0
                  ? order.items[0].product_name_snapshot ||
                    order.items[0].product?.name ||
                    "Sản phẩm hoàn trả"
                  : "Sản phẩm hoàn trả"}
              </div>

              {Array.isArray(order.return_request.media) &&
                order.return_request.media.length > 0 && (
                  <div className="oudReturnMediaGrid">
                    {order.return_request.media.slice(0, 4).map((m, i) => {
                      const u = resolveUrl(m?.url || null);
                      if (!u) return null;
                      const isVideo =
                        (m?.type || "").toString().toLowerCase() === "video";
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openLightbox(u)}
                          className="oudReturnMediaBtn"
                        >
                          {isVideo ? (
                            <video
                              src={u}
                              className="oudReturnMediaImg video"
                            />
                          ) : (
                            <img src={u} alt="" className="oudReturnMediaImg" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              <div className="oudReturnMediaHint">
                * Hình ảnh do khách hàng cung cấp
              </div>
            </div>
          </section>

          {/* Right Column */}
          <section className="oudReturnCard">
            <div className="oudReturnHeader">
              <div className="oudReturnHeaderIcon">
                <IconHeadset />
              </div>
              <div className="oudReturnHeaderTitle">
                Phản hồi từ admin / Hoàn tiền
              </div>
            </div>

            <div className="oudReturnContentBox no-margin">
              <div className="oudReturnContentHeader">
                <span className="oudReturnContentIcon mt-2">
                  <IconAdminUser />
                </span>
                <div className="oudReturnContentTitle">
                  Phản hồi admin:{" "}
                  <span>
                    {order.return_request.admin_note || "Admin chưa phản hồi."}
                  </span>
                </div>
              </div>

              <hr className="oudReturnDividerDashed" />

              <div
                className="oudReturnContentHeader"
                style={{ marginBottom: 16 }}
              >
                <span className="oudReturnContentIcon">
                  <IconReceipt />
                </span>
                <div className="oudReturnContentTitle">Chứng từ hoàn tiền</div>
              </div>

              <div className="oudReturnReceiptGrid">
                {Array.isArray(order.return_request.refund_proof) &&
                order.return_request.refund_proof.length > 0 ? (
                  <div style={{ width: 140, flexShrink: 0 }}>
                    {order.return_request.refund_proof
                      .slice(0, 1)
                      .map((m, i) => {
                        const u = resolveUrl(m?.url || null);
                        if (!u) return null;
                        const isVideo =
                          (m?.type || "").toString().toLowerCase() === "video";
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openLightbox(u)}
                            className="oudReturnMediaBtn"
                          >
                            {isVideo ? (
                              <video
                                src={u}
                                className="oudReturnMediaImg portrait video"
                              />
                            ) : (
                              <img
                                src={u}
                                alt=""
                                className="oudReturnMediaImg portrait"
                              />
                            )}
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="oudReturnReceiptEmpty">Chưa có</div>
                )}

                <div className="oudReturnReceiptDetails">
                  <div className="oudReturnReceiptRow">
                    <div className="oudReturnReceiptLabel">
                      Phương thức hoàn tiền
                    </div>
                    <div className="oudReturnReceiptValue">
                      {order.payment?.method === "vnpay"
                        ? "VNPAY"
                        : "Ví E-Tech Market"}
                    </div>
                  </div>
                  <div className="oudReturnReceiptRow">
                    <div className="oudReturnReceiptLabel">Số tiền hoàn</div>
                    <div className="oudReturnReceiptValue green">
                      {fmtVnd(Number(order.total_amount) || 0)} đ
                    </div>
                  </div>
                  <div className="oudReturnReceiptRow">
                    <div className="oudReturnReceiptLabel">Thời gian hoàn</div>
                    <div className="oudReturnReceiptValue">
                      {order.return_request.refunded_at
                        ? fmtDateTimeVi(order.return_request.refunded_at)
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(order.return_request.status || "").toString().toLowerCase() ===
              "refunded" && (
              <div style={{ marginTop: 16 }}>
                {order.return_request.customer_confirmed_at ? (
                  <div className="oudReturnSuccessBox">
                    <span style={{ display: "flex" }}>
                      <IconCheckCircle />
                    </span>
                    <span className="oudReturnSuccessText">
                      Bạn đã xác nhận đã nhận tiền hoàn.
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="oudBtn primary"
                    style={{ width: "100%", marginTop: 8 }}
                    disabled={actionBusy}
                    onClick={() => void onConfirmRefundReceived()}
                  >
                    Xác nhận đã nhận tiền hoàn
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {showReturnForm ? (
        <div
          className="oudModalOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowReturnForm(false);
          }}
        >
          <div className="oudModal">
            <div className="oudModalHead">
              <div>
                <div className="oudModalTitle">Gửi yêu cầu hoàn trả</div>
                <div className="oudModalSub">
                  Nhập nội dung và đính kèm ảnh/video để admin phê duyệt.
                </div>
              </div>
              <button
                type="button"
                className="oudModalClose"
                onClick={() => setShowReturnForm(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="oudModalBody">
              <div className="oudModalLabel">Nội dung yêu cầu</div>
              <textarea
                className="oudModalTextarea"
                value={returnContent}
                onChange={(e) => setReturnContent(e.target.value)}
                rows={5}
                placeholder="Nhập nội dung yêu cầu (lý do, tình trạng sản phẩm...)"
              />

              <div className="oudModalLabel" style={{ marginTop: 10 }}>
                Ảnh / Video
              </div>
              <input
                className="oudModalFile"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) =>
                  setReturnFiles(Array.from(e.target.files || []))
                }
              />
              <div className="oudModalHint">
                Tối đa 8 file (ảnh và/hoặc video).
              </div>
              {returnFiles.length ? (
                <div className="oudModalFiles">
                  {returnFiles.slice(0, 8).map((f) => (
                    <div
                      key={`${f.name}-${f.size}-${f.lastModified}`}
                      className="oudModalFilePill"
                    >
                      {f.name}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="oudModalActions">
              <button
                type="button"
                className="oudBtn ghost"
                disabled={actionBusy}
                onClick={() => setShowReturnForm(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="oudBtn outline"
                disabled={actionBusy}
                onClick={() => requestSubmitReturnRequest()}
              >
                {actionBusy ? "Đang gửi…" : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        open={showConfirmPayment}
        title="Xác nhận thanh toán"
        message="Xác nhận bạn đã thanh toán cho đơn hàng này?"
        confirmLabel="Xác nhận"
        cancelLabel="Huỷ"
        onConfirm={() => void onConfirmPayment()}
        onCancel={() => setShowConfirmPayment(false)}
      />
      <ConfirmModal
        open={showConfirmCancel}
        title="Xác nhận huỷ đơn"
        message="Bạn có chắc muốn hủy đơn hàng này không?"
        confirmLabel="Huỷ đơn"
        cancelLabel="Không"
        onConfirm={() => void onCancelOrder()}
        onCancel={() => setShowConfirmCancel(false)}
      />

      <ConfirmModal
        open={showConfirmReceivedModal}
        title="Xác nhận đã nhận hàng"
        message="Xác nhận bạn đã nhận được hàng? Trạng thái sẽ chuyển sang Hoàn thành."
        confirmLabel="Đã nhận"
        cancelLabel="Huỷ"
        onConfirm={() => void onConfirmReceived()}
        onCancel={() => setShowConfirmReceivedModal(false)}
      />

      <ConfirmModal
        open={showConfirmReturnSubmit}
        title="Gửi yêu cầu hoàn trả"
        message="Gửi yêu cầu hoàn trả cho admin phê duyệt?"
        confirmLabel="Gửi"
        cancelLabel="Huỷ"
        onConfirm={() => void onSubmitReturnRequest()}
        onCancel={() => setShowConfirmReturnSubmit(false)}
      />

      <ConfirmModal
        open={showConfirmRefundReceived}
        title="Xác nhận đã nhận tiền hoàn"
        message="Xác nhận bạn đã nhận được tiền hoàn?"
        confirmLabel="Xác nhận"
        cancelLabel="Huỷ"
        onConfirm={() => void onConfirmRefundReceived()}
        onCancel={() => setShowConfirmRefundReceived(false)}
      />
      {lightboxOpen && lightboxUrl ? (
        <div
          className="imageLightboxOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="imageLightboxContent">
            <img src={lightboxUrl} alt="" />
            <button
              className="imageLightboxClose"
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconPin() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 22s7-4.5 7-12a7 7 0 1 0-14 0c0 7.5 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
function IconMailReturn() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  );
}
function IconMessage() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}
function IconBox() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}
function IconCheckCircle() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
function IconInfo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}
function IconHeadset() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
    </svg>
  );
}
function IconAdminUser() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}
