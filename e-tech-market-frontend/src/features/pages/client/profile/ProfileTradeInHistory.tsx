import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/configs/api.config";
import "@/styles/pages/ProfileTradeInHistory.css";

interface TradeInRequest {
  id: number;
  request_code: string;
  category: { name: string; slug?: string };
  machine_info: string;
  images: string[] | string;
  status: string;
  estimated_price: string | null;
  final_price?: string | null;
  admin_note: string | null;
  created_at: string;
  conditions?: { name: string; type?: string; description?: string }[];
  serial_number?: string | null;
}

const formatCurrency = (value: string | number | null) => {
  if (!value) return "0 ₫";
  return Number(value).toLocaleString("vi-VN") + " ₫";
};

const parseImages = (imgs: any): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs;
  if (typeof imgs === "string") {
    try {
      return JSON.parse(imgs);
    } catch {
      return [];
    }
  }
  return [];
};

const resolveMediaUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const prefix = url.startsWith("/") ? "" : "/";
  const storagePrefix = url.includes("storage") ? "" : "/storage";
  return `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}${url.startsWith("/storage") ? "" : storagePrefix}${prefix}${url}`;
};

const parseInfoLines = (machineInfo: string) => {
  const lines = (machineInfo || "").split("\n").filter(Boolean);
  const name = lines[0]?.replace(/^Tên máy:\s*/, "") || "";
  const specs: { key: string; val: string }[] = [];
  lines.slice(1).forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > -1) {
      specs.push({
        key: line.slice(0, colonIdx).trim(),
        val: line.slice(colonIdx + 1).trim(),
      });
    } else {
      specs.push({ key: "", val: line.trim() });
    }
  });
  return { name, specs };
};

const STATUS_MAP: Record<
  string,
  { label: string; cls: string; filterKey: string }
> = {
  pending: { label: "Chờ kiểm tra", cls: "pending", filterKey: "pending" },
  quoted: { label: "Đang xử lý", cls: "quoted", filterKey: "processing" },
  approved: { label: "Đã hoàn tất", cls: "approved", filterKey: "completed" },
  rejected: { label: "Đã từ chối", cls: "rejected", filterKey: "rejected" },
  completed: { label: "Đã thu mua", cls: "completed", filterKey: "completed" },
};

const FILTERS = [
  { key: "all", label: "Tất cả yêu cầu" },
  { key: "pending", label: "Chờ kiểm tra" },
  { key: "processing", label: "Đang xử lý" },
  { key: "completed", label: "Đã hoàn tất" },
  { key: "rejected", label: "Đã từ chối" },
];

const PAGE_SIZE = 4;

/* ── Icons ── */
const IconDevice = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M12 18h.01" />
  </svg>
);
const IconCondition = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <path d="M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" />
  </svg>
);
const IconImage = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconPrice = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const IconNote = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconCheck = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconWarning = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconChevronRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconClose = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function ProfileTradeInHistory() {
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<TradeInRequest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = (await apiFetch("/me/trade-in")) as any;
      if (data.status === "success") setRequests(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (id: number) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xác nhận mức giá dự kiến này không?",
      )
    )
      return;
    try {
      setIsAccepting(true);
      const res = (await apiFetch(`/me/trade-in/${id}/accept`, {
        method: "POST",
      })) as any;
      if (res.status === "success") {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
        );
        setSelectedReq((prev) =>
          prev?.id === id ? { ...prev, status: "approved" } : prev,
        );
      }
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra!");
    } finally {
      setIsAccepting(false);
    }
  };

  /* filter */
  const filtered = requests.filter((r) => {
    if (activeFilter === "all") return true;
    const info = STATUS_MAP[r.status];
    return info?.filterKey === activeFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (key: string) => {
    setActiveFilter(key);
    setPage(1);
    setSelectedReq(null);
  };

  /* ── Loading ── */
  if (loading)
    return (
      <div className="ptih-container">
        <div className="ptih-header">
          <div>
            <h1 className="ptih-title">Thu cũ đổi mới</h1>
            <p className="ptih-subtitle">
              Thu máy cũ giá tốt – Lên đời dễ dàng – Trợ giá hấp dẫn
            </p>
          </div>
        </div>
        <div className="ptih-loading">
          <div className="ptih-loading-spinner" />
          Đang tải dữ liệu...
        </div>
      </div>
    );

  /* ── Main render ── */
  return (
    <div className={`ptih-container ${selectedReq ? "ptih-has-detail" : ""}`}>
      {/* Header */}
      <div className="ptih-header">
        <div>
          <h1 className="ptih-title">Thu cũ đổi mới</h1>
          <p className="ptih-subtitle">
            Thu máy cũ giá tốt – Lên đời dễ dàng – Trợ giá hấp dẫn
          </p>
        </div>
        <Link to="/trade-in" className="ptih-btn-new">
          + Gửi yêu cầu mới
        </Link>
      </div>

      {/* Layout wrapper */}
      <div className="ptih-layout">
        {/* ── LEFT: List panel ── */}
        <div className="ptih-left-panel">
          {/* Filter tabs */}
          <div className="ptih-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`ptih-tab ${activeFilter === f.key ? "ptih-tab-active" : ""}`}
                onClick={() => handleFilterChange(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Empty */}
          {filtered.length === 0 ? (
            <div className="ptih-empty">
              <div className="ptih-empty-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 200 200"
                  width="60%"
                  height="60%"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 165 70 L 130 35 L 130 55 L 90 55 A 15 15 0 0 0 90 85 L 130 85 L 130 105 Z" />
                    <path d="M 35 130 L 70 165 L 70 145 L 110 145 A 15 15 0 0 0 110 115 L 70 115 L 70 95 Z" />
                  </g>
                </svg>
              </div>
              <p>
                {activeFilter === "all"
                  ? "Bạn chưa gửi yêu cầu thu cũ đổi mới nào."
                  : "Không có yêu cầu nào trong mục này."}
              </p>
              {activeFilter === "all" && (
                <Link to="/trade-in" className="ptih-btn-new">
                  Định giá thiết bị ngay
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Cards */}
              <div className="ptih-list">
                {paginated.map((req) => {
                  const d = new Date(req.created_at);
                  const dateStr = d.toLocaleDateString("vi-VN");
                  const timeStr = d.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const imgs = parseImages(req.images);
                  const thumb =
                    imgs.length > 0 ? resolveMediaUrl(imgs[0]) : null;
                  const { name, specs } = parseInfoLines(req.machine_info);
                  const statusInfo = STATUS_MAP[req.status] ?? {
                    label: req.status,
                    cls: "gray",
                    filterKey: "",
                  };
                  const condNames =
                    req.conditions?.map((c) => {
                      const parts = c.name.split(":");
                      return parts.length > 1
                        ? parts.slice(1).join(":").trim()
                        : c.name.trim();
                    }) || [];
                  const shortSpec = specs.map((s) => s.val).join(" • ");
                  const condSpec = condNames.join(" • ");
                  const isSelected = selectedReq?.id === req.id;

                  return (
                    <div
                      key={req.id}
                      className={`ptih-card ${isSelected ? "ptih-card-selected" : ""}`}
                      onClick={() => setSelectedReq(isSelected ? null : req)}
                    >
                      {/* Status badge */}
                      <div
                        className={`ptih-card-badge ptih-badge-${statusInfo.cls}`}
                      >
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
                                <svg
                                  width="28"
                                  height="28"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#cbd5e1"
                                  strokeWidth="1.5"
                                >
                                  <rect
                                    x="3"
                                    y="3"
                                    width="18"
                                    height="18"
                                    rx="2"
                                  />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="ptih-card-info">
                            <div className="ptih-device-name">
                              {name || req.category?.name || "Thiết bị"}
                            </div>
                            <div className="ptih-specs-list">
                              {specs.map((s, idx) => (
                                <div key={idx} className="ptih-spec-item">
                                  <span className="ptih-spec-key">
                                    {s.key}:
                                  </span>{" "}
                                  {s.val}
                                </div>
                              ))}
                            </div>
                            <div className="ptih-meta-row-auto">
                              <span className="ptih-meta-code">
                                Mã yêu cầu: <strong>#{req.request_code}</strong>
                              </span>
                              <span className="ptih-meta-date">
                                Ngày gửi: {dateStr} • {timeStr}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Conditions */}
                        <div className="ptih-card-mid-row">
                          {req.conditions && req.conditions.length > 0 ? (
                            <div className="ptih-condition-cards">
                              {req.conditions.map((c, idx) => {
                                const parts = c.name.split(":");
                                const title =
                                  parts.length > 1
                                    ? parts.slice(1).join(":").trim()
                                    : c.name.trim();
                                return (
                                  <div key={idx} className="ptih-cond-card">
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#ea580c"
                                      strokeWidth="1.5"
                                      className="ptih-cond-icon"
                                    >
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="8" x2="12" y2="12" />
                                      <line
                                        x1="12"
                                        y1="16"
                                        x2="12.01"
                                        y2="16"
                                      />
                                    </svg>
                                    <span className="ptih-cond-title">
                                      {title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="ptih-cond-empty">
                              Chưa có tình trạng
                            </div>
                          )}
                        </div>

                        {/* Row 2: price + arrow */}
                        <div className="ptih-card-right ptih-card-right-auto">
                          {(req.final_price || req.estimated_price) && (
                            <div className="ptih-card-price-wrap">
                              <span className="ptih-card-price-label">
                                {req.final_price
                                  ? "Giá thu chính thức"
                                  : "Giá dự kiến"}
                              </span>
                              <span
                                className={`ptih-card-price-val ${req.final_price ? "text-green" : ""}`}
                              >
                                {formatCurrency(
                                  req.final_price || req.estimated_price,
                                )}
                              </span>
                            </div>
                          )}
                          <span className="ptih-card-arrow">
                            <IconChevronRight />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="ptih-pagination">
                  <span className="ptih-page-info">
                    Hiển thị {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} trong{" "}
                    {filtered.length} yêu cầu
                  </span>
                  <div className="ptih-page-controls">
                    <button
                      className="ptih-page-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          className={`ptih-page-btn ${p === page ? "ptih-page-btn-active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      className="ptih-page-btn"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Detail panel ── */}
        {selectedReq &&
          (() => {
            const { name, specs } = parseInfoLines(selectedReq.machine_info);
            const imgs = parseImages(selectedReq.images);
            const statusInfo = STATUS_MAP[selectedReq.status] ?? {
              label: selectedReq.status,
              cls: "gray",
              filterKey: "",
            };
            const hasPrice = !!selectedReq.estimated_price;
            const hasNote = !!selectedReq.admin_note;
            const SHOW_MAX = 5;
            const extraCount =
              imgs.length > SHOW_MAX ? imgs.length - SHOW_MAX : 0;

            return (
              <div className="ptih-detail-panel">
                {/* Panel header */}
                <div className="ptih-detail-header">
                  <h3 className="ptih-detail-title">Chi tiết yêu cầu</h3>
                  <button
                    className="ptih-detail-close"
                    onClick={() => setSelectedReq(null)}
                  >
                    <IconClose />
                  </button>
                </div>

                {/* Status badge */}
                <div className="ptih-detail-status-bar">
                  <span
                    className={`ptih-status-badge-large ptih-badge-${statusInfo.cls}`}
                  >
                    <IconCheck /> {statusInfo.label}
                  </span>
                </div>

                {/* Scrollable body */}
                <div className="ptih-detail-body">
                  {/* 1. Thông tin thiết bị */}
                  <div className="ptih-detail-section">
                    <div className="ptih-section-heading">
                      <span className="ptih-section-icon blue">
                        <IconDevice />
                      </span>
                      Thông tin thiết bị
                    </div>
                    <div className="ptih-info-table">
                      {name && (
                        <div className="ptih-info-row">
                          <span className="ptih-info-key">Thiết bị</span>
                          <span className="ptih-info-val ptih-info-val-strong">
                            {name}
                          </span>
                        </div>
                      )}
                      <div className="ptih-info-row">
                        <span className="ptih-info-key">Mã yêu cầu</span>
                        <span className="ptih-info-val ptih-code-val">
                          #{selectedReq.request_code}
                        </span>
                      </div>
                      {selectedReq.serial_number && (
                        <div className="ptih-info-row">
                          <span className="ptih-info-key">S/N</span>
                          <span className="ptih-info-val">
                            {selectedReq.serial_number}
                          </span>
                        </div>
                      )}
                      {specs
                        .filter((s) => s.key)
                        .map((s, i) => (
                          <div key={i} className="ptih-info-row">
                            <span className="ptih-info-key">{s.key}</span>
                            <span className="ptih-info-val">{s.val}</span>
                          </div>
                        ))}
                      <div className="ptih-info-row">
                        <span className="ptih-info-key">Ngày gửi</span>
                        <span className="ptih-info-val">
                          {new Date(selectedReq.created_at).toLocaleDateString(
                            "vi-VN",
                          )}{" "}
                          •{" "}
                          {new Date(selectedReq.created_at).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Tình trạng thiết bị */}
                  {selectedReq.conditions &&
                    selectedReq.conditions.length > 0 && (
                      <div className="ptih-detail-section">
                        <div className="ptih-section-heading">
                          <span className="ptih-section-icon orange">
                            <IconCondition />
                          </span>
                          Tình trạng thiết bị
                        </div>
                        <div className="ptih-conditions-grid">
                          {selectedReq.conditions.map((c, i) => (
                            <div key={i} className="ptih-cond-row">
                              <span className="ptih-cond-check">
                                <IconCheck />
                              </span>
                              <span className="ptih-cond-label">
                                {c.name.split(":")[0]?.trim()}
                              </span>
                              {c.name.includes(":") && (
                                <span className="ptih-cond-val">
                                  {c.name.split(":").slice(1).join(":").trim()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* 3. Hình ảnh thiết bị */}
                  <div className="ptih-detail-section">
                    <div className="ptih-section-heading">
                      <span className="ptih-section-icon green">
                        <IconImage />
                      </span>
                      Hình ảnh thiết bị
                    </div>
                    {imgs.length > 0 ? (
                      <div className="ptih-img-grid">
                        {imgs.slice(0, SHOW_MAX).map((img, i) => (
                          <div
                            key={i}
                            className={`ptih-img-cell ${i === SHOW_MAX - 1 && extraCount > 0 ? "ptih-img-cell-more" : ""}`}
                            onClick={() => setLightbox(resolveMediaUrl(img))}
                          >
                            <img
                              src={resolveMediaUrl(img)}
                              alt={`Hình ${i + 1}`}
                            />
                            {i === SHOW_MAX - 1 && extraCount > 0 && (
                              <div className="ptih-img-overlay">
                                +{extraCount}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ptih-no-image-text">
                        Không có hình ảnh đính kèm.
                      </p>
                    )}
                  </div>

                  {/* 4. Giá thu */}
                  <div className="ptih-detail-section">
                    <div className="ptih-section-heading">
                      <span className="ptih-section-icon purple">
                        <IconPrice />
                      </span>
                      Giá thu
                    </div>
                    {selectedReq.final_price || hasPrice ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          marginTop: "12px",
                        }}
                      >
                        {selectedReq.final_price && (
                          <div
                            className="ptih-price-box final"
                            style={{ flex: 1, marginTop: 0 }}
                          >
                            <div className="ptih-price-box-label">
                              Giá chốt thực tế
                            </div>
                            <div className="ptih-price-box-value text-green">
                              {formatCurrency(selectedReq.final_price)}
                            </div>
                          </div>
                        )}
                        {hasPrice && (
                          <div
                            className="ptih-price-box"
                            style={{
                              flex: 1,
                              marginTop: 0,
                              opacity: selectedReq.final_price ? 0.4 : 1,
                              textDecoration: selectedReq.final_price
                                ? "line-through"
                                : "none",
                            }}
                          >
                            <div className="ptih-price-box-label">
                              Giá dự kiến
                            </div>
                            <div className="ptih-price-box-value">
                              {formatCurrency(selectedReq.estimated_price!)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="ptih-no-image-text">Chưa có giá đề xuất.</p>
                    )}
                  </div>

                  {/* 5. Ghi chú từ cửa hàng */}
                  {hasNote && (
                    <div className="ptih-detail-section">
                      <div className="ptih-section-heading">
                        <span className="ptih-section-icon amber">
                          <IconNote />
                        </span>
                        Ghi chú từ cửa hàng
                      </div>
                      <div className="ptih-note-box">
                        {selectedReq.admin_note}
                      </div>
                    </div>
                  )}

                  {/* 6. Action area */}
                  {selectedReq.status === "quoted" && (
                    <div className="ptih-detail-section ptih-action-section">
                      <div className="ptih-notice-box">
                        <span className="ptih-notice-icon">
                          <IconWarning />
                        </span>
                        <span>
                          <strong>Lưu ý:</strong> Mức giá trên chỉ là dự kiến
                          dựa vào mô tả của bạn. Vui lòng mang máy ra{" "}
                          <strong>cửa hàng gần nhất</strong> để nhân viên kiểm
                          tra thực tế.
                        </span>
                      </div>
                      <button
                        className="ptih-btn-accept"
                        onClick={() => handleAcceptQuote(selectedReq.id)}
                        disabled={isAccepting}
                      >
                        <IconCheck />
                        {isAccepting
                          ? "Đang xử lý..."
                          : "Xác nhận đồng ý mức giá dự kiến"}
                      </button>
                    </div>
                  )}

                  {selectedReq.status === "approved" && (
                    <div className="ptih-detail-section">
                      <div className="ptih-notice-success">
                        <IconCheck />
                        Bạn đã xác nhận mức giá. Vui lòng{" "}
                        <strong>mang máy ra cửa hàng</strong> để hoàn tất thu
                        mua.
                      </div>
                    </div>
                  )}

                  {selectedReq.status === "completed" && (
                    <div className="ptih-detail-section">
                      <div className="ptih-notice-completed">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Giao dịch đã hoàn tất thành công. Cảm ơn bạn đã tin
                        tưởng E-Tech Market!
                      </div>
                    </div>
                  )}

                  {selectedReq.status === "rejected" && (
                    <div className="ptih-detail-section">
                      <div className="ptih-notice-rejected">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Yêu cầu này đã bị từ chối.
                        {hasNote
                          ? " Vui lòng xem ghi chú từ cửa hàng ở trên."
                          : ""}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Preview"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: 8,
              objectFit: "contain",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
            }}
          >
            <IconClose />
          </button>
        </div>
      )}
    </div>
  );
}
