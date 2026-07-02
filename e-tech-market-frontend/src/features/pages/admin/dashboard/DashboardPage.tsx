import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, API_BASE_URL } from "@/configs/api.config";
import { fetchDashboardStats } from "@/features/services/admin/api.admin.service";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  RevenueIcon,
  CartIcon,
  BoxIcon,
  UserGroupIcon,
  GridIcon,
  AlertIcon,
  PencilIcon,
  BoxSmallIcon,
  HeadsetIcon,
  ReturnIcon,
  ReviewChatIcon,
  MedalIcon,
  PlusIcon,
} from "../AdminIcons";
import "@/styles/admin/DashboardPage.css";
import { useAuthStore } from "@/features/store/useAuthStore";

const fmtMoneyTooltip = (v: number) => {
  if (!Number.isFinite(v)) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

const formatHoverLabel = (label: string) => {
  if (!label || !label.includes("/")) return label;
  const parts = label.split("/");
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return `Ngày ${day} Thg ${month}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dayLabel = formatHoverLabel(label || "");
    const rev = typeof data.value === "number" ? data.value : 0;
    const ord = typeof data.orders === "number" ? data.orders : 0;
    const items = typeof data.items_sold === "number" ? data.items_sold : 0;
    return (
      <div className="admChartTooltip adm-dash-style-1">
        <div className="adm-dash-style-2">{dayLabel}</div>
        <div className="adm-dash-style-3">
          <div className="adm-dash-style-4">
            <span className="adm-dash-style-5" />
            <span>Doanh thu: </span>
            <strong className="adm-dash-style-6">
              {fmtMoneyTooltip(rev)} đ
            </strong>
          </div>
          <div className="adm-dash-style-7">
            <span className="adm-dash-style-8" />
            <span>Đơn hàng: </span>
            <strong className="adm-dash-style-9">{ord}</strong>
          </div>
          <div className="adm-dash-style-10">
            <span className="adm-dash-style-11" />
            <span>SP bán ra: </span>
            <strong className="adm-dash-style-12">{items}</strong>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function DashboardPage({
  onCreateProduct,
}: { onCreateProduct?: () => void } = {}) {
  const navigate = useNavigate();
  // 🔒 Token is sent via httpOnly cookie automatically
  const userStr = useAuthStore((state) => state.userStr);
  const [analyticsRange, setAnalyticsRange] = useState<
    "7d" | "30d" | "month" | "custom"
  >("month");
  const [resolution, setResolution] = useState<"day" | "week" | "month">("day");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${month}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  });
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeData, setActiveData] = useState<any>(null);

  const dateRangeText = useMemo(() => {
    let start = new Date();
    const end = new Date();
    if (analyticsRange === "7d") {
      start.setDate(end.getDate() - 6);
    } else if (analyticsRange === "30d") {
      start.setDate(end.getDate() - 29);
    } else if (analyticsRange === "month") {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (analyticsRange === "custom") {
      const parseLocal = (s: string) => {
        if (!s) return new Date();
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
      };
      return `${parseLocal(customStartDate).toLocaleDateString("vi-VN")} - ${parseLocal(customEndDate).toLocaleDateString("vi-VN")}`;
    }
    const fmt = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  }, [analyticsRange, customStartDate, customEndDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowRangeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const rangeLabels: Record<"7d" | "30d" | "month" | "custom", string> = {
    month: "Tháng này",
    "7d": "7 ngày",
    "30d": "30 ngày",
    custom: "Tùy chọn ngày",
  };

  const [openOrderMenuId, setOpenOrderMenuId] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<null | {
    id: number;
    order_code: string;
    customer_name: string;
    customer_avatar_url?: string | null;
    product: string;
    total_amount: number;
    created_date?: string;
    status_label: string;
    status_tone: "ok" | "wait" | "bad";
  }>(null);

  type DashStats = {
    kpi: {
      revenue_30d: number;
      current_orders: number;
      total_products: number;
      new_customers_7d: number;
      avg_order_value_30d: number;
      low_stock_variants: number;
      low_stock_threshold: number;
      paid_orders_30d?: number;
      orders_today?: number;
    };
    quick_tasks?: {
      pending_reviews: number;
      low_stock_products: number;
      pending_support: number;
      pending_return_requests?: number;
    };
    recent_activities?: Array<{
      dot: "ok" | "info" | "warn";
      title: string;
      desc: string;
      time: string;
    }>;
    top_rated_products?: Array<{
      id: number;
      name: string;
      slug: string;
      main_image_url?: string | null;
      avg_rating: number;
      reviews_count: number;
    }>;
    analytics?: {
      range?: "7d" | "30d" | "month";
      revenue_7d: Array<{
        date: string;
        label: string;
        value: number;
        orders?: number;
      }>;
      top_categories_30d: Array<{ name: string; pct: number }>;
    };
    recent_orders?: Array<{
      id: number;
      order_code: string;
      customer_name: string;
      customer_avatar_url?: string | null;
      product: string;
      total_amount: number;
      created_at?: string | null;
      created_date?: string;
      status?: string;
      status_label: string;
      status_tone: "ok" | "wait" | "bad";
    }>;
    recent_reviews?: Array<{
      id: number;
      user_name: string;
      user_avatar_url?: string | null;
      rating: number;
      comment: string;
      time: string;
    }>;
    top_customers?: Array<{
      user_id: number;
      name: string;
      avatar_url?: string | null;
      spent: number;
      orders_count: number;
      vip_label: string;
      vip_tone: "gold" | "silver" | "bronze";
    }>;
  };

  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [dash, setDash] = useState<DashStats | null>(null);
  const [prevDash, setPrevDash] = useState<DashStats | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [lowStockProducts, setLowStockProducts] = useState<
    Array<{
      id: number;
      sku?: string | null;
      product_name: string;
      variant_name?: string | null;
      category?: { name?: string } | null;
      price?: string | null;
      stock_quantity?: number | null;
    }>
  >([]);
  const [restockDraft, setRestockDraft] = useState<Record<number, string>>({});
  const [restockBusyId, setRestockBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userStr) {
        setDashLoading(false);
        setDashError("Chưa đăng nhập admin.");
        return;
      }
      setDashLoading(true);
      setDashError(null);
      try {
        const now = new Date();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const fmt = (d: Date) => {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${d.getFullYear()}-${mm}-${dd}`;
        };
        const [res, productsRes, prevRes] = await Promise.all([
          // 🔒 Token is sent via httpOnly cookie automatically
          fetchDashboardStats<DashStats>(
            analyticsRange,
            customStartDate,
            customEndDate,
            resolution,
          ),
          apiFetch<any>("/api/admin/products?per_page=100"),
          fetchDashboardStats<DashStats>('custom', fmt(prevMonthStart), fmt(prevMonthEnd), resolution),
        ]);
        if (cancelled) return;
        setDash(res);
        setPrevDash(prevRes);

        const products = Array.isArray(productsRes?.data)
          ? productsRes.data
          : Array.isArray(productsRes)
            ? productsRes
            : [];
        // Low stock list for table (best-effort, depends on API fields)
        const threshold = res?.kpi?.low_stock_threshold ?? 10;
        setLowStockThreshold(threshold);
        const flat = (products ?? []).flatMap((row: any) => {
          const p =
            row && typeof row === "object"
              ? (row as Record<string, unknown>)
              : {};
          const base = {
            id: typeof p.id === "number" ? p.id : Number.NaN,
            name: typeof p.name === "string" ? p.name : "—",
            sku: typeof p.sku === "string" ? p.sku : null,
            category:
              p.category && typeof p.category === "object"
                ? (p.category as { name?: string } | null)
                : null,
            price: typeof p.price === "string" ? p.price : null,
            stock_quantity:
              typeof p.stock_quantity === "number" ? p.stock_quantity : null,
            variants: Array.isArray(p.variants)
              ? (p.variants as unknown[])
              : [],
          };
          // If variants exist, use their stock_quantity too
          if (base.variants.length === 0) {
            return [
              {
                id: base.id,
                product_name: base.name,
                variant_name: null,
                sku: base.sku,
                category: base.category,
                price: base.price,
                stock_quantity: base.stock_quantity,
              },
            ];
          }
          return base.variants.map((vRow, idx) => {
            const v =
              vRow && typeof vRow === "object"
                ? (vRow as Record<string, unknown>)
                : {};
            const vid = typeof v.id === "number" ? v.id : Number.NaN;
            const vname =
              typeof v.variant_name === "string" ? v.variant_name : "";
            const vsku = typeof v.sku === "string" ? v.sku : null;
            const vprice = typeof v.price === "string" ? v.price : null;
            const vstock =
              typeof v.stock_quantity === "number" ? v.stock_quantity : null;
            return {
              id: Number.isFinite(vid) ? vid : Number(`${base.id}${idx}`),
              product_name: base.name,
              variant_name: vname || null,
              sku: vsku ?? base.sku,
              category: base.category,
              price: vprice ?? base.price,
              stock_quantity: vstock,
            };
          });
        });

        const low = flat
          .filter(
            (x: any) =>
              typeof x.stock_quantity === "number" &&
              x.stock_quantity <= threshold,
          )
          .sort(
            (a: any, b: any) =>
              (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0),
          )
          .slice(0, 6);
        setLowStockProducts(low);
      } catch (e: unknown) {
        if (cancelled) return;
        setDashError(
          e instanceof Error ? e.message : "Không tải được dữ liệu dashboard.",
        );
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userStr, analyticsRange, customStartDate, customEndDate, resolution]);

  const restockVariant = async (variantId: number) => {
    if (!userStr) return;
    const raw = (restockDraft[variantId] ?? "").trim();
    const add = Number.parseInt(raw, 10);
    if (!Number.isFinite(add) || add <= 0) return;

    setRestockBusyId(variantId);
    try {
      await apiFetch(`/api/admin/product-variants/${variantId}/restock`, {
        method: "PATCH",
        body: JSON.stringify({ add }),
      });
      setRestockDraft((p) => {
        const next = { ...p };
        delete next[variantId];
        return next;
      });
      setLowStockProducts((p) => {
        const next = p
          .map((row) =>
            row.id === variantId
              ? {
                  ...row,
                  stock_quantity:
                    (typeof row.stock_quantity === "number"
                      ? row.stock_quantity
                      : 0) + add,
                }
              : row,
          )
          .filter(
            (row) =>
              typeof row.stock_quantity === "number" &&
              row.stock_quantity <= lowStockThreshold,
          );
        return next;
      });
    } finally {
      setRestockBusyId(null);
    }
  };

  const kpi = dash?.kpi;
  const fmtMoneyShort = (v: number) => {
    if (!Number.isFinite(v)) return "—";
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
  };

  const quickTasks = useMemo(() => {
    const qt = dash?.quick_tasks;
    return [
      {
        key: "review",
        label: `Duyệt ${qt?.pending_reviews ?? 0} đánh giá mới`,
        icon: <PencilIcon />,
      },
      {
        key: "stock",
        label: `Nhập kho ${qt?.low_stock_products ?? 0} mặt hàng sắp hết`,
        icon: <BoxSmallIcon />,
      },
      {
        key: "support",
        label: `Phản hồi ${qt?.pending_support ?? 0} yêu cầu hỗ trợ`,
        icon: <HeadsetIcon />,
      },
      {
        key: "returns",
        label: `Duyệt ${qt?.pending_return_requests ?? 0} yêu cầu hoàn trả`,
        icon: <ReturnIcon />,
      },
    ];
  }, [dash?.quick_tasks]);

  type KpiCard = {
    key: string;
    label: string;
    value: string;
    sub: string;
    badge: string;
    icon: ReactNode;
    tone: "orange" | "blue" | "green" | "purple" | "cyan";
  };

  const pctChange = (curr: number, prev: number) => {
    if (!prev) return null;
    const pct = ((curr - prev) / prev) * 100;
    return pct;
  };
  const fmtPct = (pct: number | null) => {
    if (pct === null) return '';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };
  const prevKpi = prevDash?.kpi;

  const kpis: KpiCard[] = [
    {
      key: "rev",
      label: "Tổng doanh thu",
      value: kpi ? `${fmtMoneyShort(kpi.revenue_30d)} đ` : "—",
      sub: prevKpi ? `Tháng trước: ${fmtMoneyShort(prevKpi.revenue_30d)} đ` : "",
      badge: fmtPct(pctChange(kpi?.revenue_30d ?? 0, prevKpi?.revenue_30d ?? 0)) || "+0%",
      icon: <RevenueIcon />,
      tone: "orange" as const,
    },
    {
      key: "orders",
      label: "Đơn hàng hiện tại",
      value: kpi ? String(kpi.current_orders) : "—",
      sub: prevKpi ? `Tháng trước: ${prevKpi.current_orders}` : "",
      badge: fmtPct(pctChange(kpi?.current_orders ?? 0, prevKpi?.current_orders ?? 0)) || "0%",
      icon: <CartIcon />,
      tone: "blue" as const,
    },
    {
      key: "products",
      label: "Tổng số sản phẩm",
      value: kpi ? String(kpi.total_products) : "—",
      sub: "",
      badge: "Kho",
      icon: <BoxIcon />,
      tone: "green" as const,
    },
    {
      key: "newCus",
      label: "Khách hàng mới",
      value: kpi ? `+${kpi.new_customers_7d}` : "—",
      sub: prevKpi ? `Tháng trước: +${prevKpi.new_customers_7d}` : "",
      badge: fmtPct(pctChange(kpi?.new_customers_7d ?? 0, prevKpi?.new_customers_7d ?? 0)) || "+0%",
      icon: <UserGroupIcon />,
      tone: "purple" as const,
    },
    {
      key: "avg",
      label: "Giá trị đơn hàng TB",
      value: kpi ? `${fmtMoneyShort(kpi.avg_order_value_30d)} đ` : "—",
      sub: prevKpi ? `Tháng trước: ${fmtMoneyShort(prevKpi.avg_order_value_30d)} đ` : "",
      badge: fmtPct(pctChange(kpi?.avg_order_value_30d ?? 0, prevKpi?.avg_order_value_30d ?? 0)) || "+0%",
      icon: <GridIcon />,
      tone: "cyan" as const,
    },
  ];

  const recentActivities = dash?.recent_activities ?? [];
  const topRated = dash?.top_rated_products ?? [];
  const revenue7d = dash?.analytics?.revenue_7d ?? [];
  const topCats30d = dash?.analytics?.top_categories_30d ?? [];
  // Build KPI list with compact sparkline series (use real analytics when available)
  const kpisWithSpark = kpis.map((kp) => {
    const baseDigits = String(kp.value || "").replace(/[^0-9]/g, "");
    const base = baseDigits ? Number(baseDigits.slice(0, 6)) : 10;
    const pts = revenue7d.length
      ? revenue7d.map((pt) =>
          kp.key === "rev" ? pt.value || 0 : pt.orders || 0,
        )
      : Array.from({ length: 7 }).map((_, i) =>
          Math.max(0, Math.round(base * (0.7 + Math.sin(i) * 0.15))),
        );
    let chartType: "area" | "bars" | "donut" | "line" | "thinArea" | "slope" = "line";
    if (kp.key === "rev") chartType = "line";
    else if (kp.key === "orders") chartType = "line";
    else if (kp.key === "products") chartType = "donut";
    else if (kp.key === "newCus") chartType = "bars";
    else if (kp.key === "avg") chartType = "slope";

    // For products donut: show total_products as the label inside donut
    const donutTotal = kp.key === "products" ? (kpi?.total_products ?? 0) : 0;
    // Still compute pct for the arc (use stock fullness, fallback 85%)
    let donutPct = 0;
    if (chartType === "donut") {
      donutPct = 85; // fallback: show mostly-filled ring
    }

    return { ...(kp as any), sparkline: pts, chartType, donutPct, donutTotal };
  });
  const resolveAdminImg = (url?: string | null) => {
    if (!url) return "/logo.png";
    const s = url.trim();
    if (!s) return "/logo.png";
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
  };

  const colorOfTone = (t: KpiCard["tone"]) => {
    switch (t) {
      case "orange":
        return "#fb923c";
      case "blue":
        return "#3b82f6";
      case "green":
        return "#10b981";
      case "purple":
        return "#8b5cf6";
      case "cyan":
        return "#06b6d4";
      default:
        return "#3b82f6";
    }
  };

  const fmtVnd = (n: number) => n.toLocaleString("vi-VN");
  const initialsOf = (name: string) => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    const a = parts[0]?.[0] ?? "";
    const b =
      parts.length > 1
        ? (parts[parts.length - 1]?.[0] ?? "")
        : (parts[0]?.[1] ?? "");
    return (a + b).toUpperCase();
  };
  const avatarToneOf = (s: string) => {
    const x = Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5;
    return (["beige", "blue", "peach", "sand", "gray"] as const)[x];
  };
  const recentOrders = (dash?.recent_orders ?? []).slice(0, 10);
  const recentReviews = (dash?.recent_reviews ?? []).slice(0, 2);
  const topCustomers = (dash?.top_customers ?? []);
  const resolveUserAvatar = (url?: string | null) => {
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
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest(".admOrdersMenuWrap")) return;
      setOpenOrderMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Tiny inline sparkline renderer used in KPI cards
  // Small inline chart renderers for KPI cards
  const renderLine = (values: number[] = [], stroke = "#3b82f6") => {
    if (!values || values.length === 0) return null;
    const w = 120;
    const h = 30;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map(
      (v, i) =>
        `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`,
    );
    return (
      <svg
        className="admKpiSparkline"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const renderSlopeLine = (values: number[] = [], stroke = "#3b82f6") => {
    if (!values || values.length === 0) return null;
    const w = 120;
    const h = 36;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map((v, i) => ({
      x: i * step,
      y: h - 8 - ((v - min) / range) * (h - 16),
    }));
    const points = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    return (
      <svg
        className="admKpiSparkline"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={1.7} fill={stroke} />
        ))}
      </svg>
    );
  };

  const renderArea = (
    values: number[] = [],
    stroke = "#10b981",
    fill = "rgba(16,185,129,0.12)",
  ) => {
    if (!values || values.length === 0) return null;
    const w = 120;
    const h = 56;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map((v, i) => ({
      x: i * step,
      y: h - 6 - ((v - min) / range) * (h - 12),
    }));
    // Build smooth path using simple quadratic Bezier chaining
    const buildPath = () => {
      if (!pts.length) return "";
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const cx = ((prev.x + cur.x) / 2).toFixed(2);
        d += ` Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${cx} ${((prev.y + cur.y) / 2).toFixed(2)}`;
      }
      // Close path to bottom
      d += ` L ${w} ${h} L 0 ${h} Z`;
      return d;
    };
    const path = buildPath();
    return (
      <svg
        className="admKpiSparkline admKpiArea"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={path} fill={fill} stroke="none" />
        <path
          d={path.replace(/ L .* Z$/, "")}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Specialized revenue sparkline to match reference style (simple green line)
  const renderRevenueArea = (values: number[] = [], stroke = "#10b981") => {
    if (!values || values.length === 0) return null;
    const w = 140;
    const h = 72;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map((v, i) => ({
      x: i * step,
      y: h - 12 - ((v - min) / range) * (h - 24),
    }));
    const buildSmooth = () => {
      if (!pts.length) return "";
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const cx = ((prev.x + cur.x) / 2).toFixed(2);
        d += ` Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${cx} ${((prev.y + cur.y) / 2).toFixed(2)}`;
      }
      return d;
    };
    const linePath = buildSmooth();
    return (
      <svg
        className="admKpiSparkline admKpiRevenue"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.length > 0 &&
          (() => {
            const p = pts[pts.length - 1];
            return (
              <g transform={`translate(${p.x}, ${p.y})`}>
                <circle r={3} fill="#fff" stroke={stroke} strokeWidth={1.5} />
              </g>
            );
          })()}
      </svg>
    );
  };

  // Thin area for avg order value (light blue fill, thin stroke)
  const renderThinArea = (values: number[] = [], stroke = "#3b82f6") => {
    if (!values || values.length === 0) return null;
    const w = 120;
    const h = 44;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const pts = values.map((v, i) => ({
      x: i * step,
      y: h - 8 - ((v - min) / range) * (h - 16),
    }));
    const buildSmooth = () => {
      if (!pts.length) return "";
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const cx = ((prev.x + cur.x) / 2).toFixed(2);
        d += ` Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${cx} ${((prev.y + cur.y) / 2).toFixed(2)}`;
      }
      return d;
    };
    const linePath = buildSmooth();
    const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
    return (
      <svg
        className="admKpiSparkline admKpiThinArea"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="thinGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#thinGrad)" stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Purple column style for New Customers KPI (highlight last column)
  const renderPurpleColumns = (
    values: number[] = [],
    base = "#c4b5fd",
    accent = "#7c3aed",
  ) => {
    if (!values || values.length === 0) return null;
    const w = 84;
    const h = 56;
    const gap = 6;
    const maxBars = Math.max(1, values.length);
    const barW = Math.max(10, (w - gap * (maxBars - 1)) / maxBars);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const totalBarsWidth = values.length * barW + (values.length - 1) * gap;
    const startX = Math.max(0, (w - totalBarsWidth) / 2);
    return (
      <svg
        className="admKpiBarChart admKpiPurpleBars"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <line
          x1={6}
          x2={w - 6}
          y1={h - 12}
          y2={h - 12}
          stroke="#f1effa"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {values.map((v, i) => {
          const bw = Math.max(6, barW);
          const bh = Math.max(3, Math.round(((v - min) / range) * (h - 22)));
          const x = startX + i * (bw + gap);
          const y = h - bh - 14;
          const isLast = i === values.length - 1;
          const fill = isLast ? accent : base;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx={bw / 2}
              fill={fill}
            />
          );
        })}
      </svg>
    );
  };

  const renderBars = (values: number[] = [], color = "#7c3aed") => {
    if (!values || values.length === 0) return null;
    // make a compact vertical column chart similar to reference
    const w = 84;
    const h = 56;
    const gap = 6;
    const maxBars = Math.max(1, values.length);
    const barW = Math.max(8, (w - gap * (maxBars - 1)) / maxBars);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const totalBarsWidth = values.length * barW + (values.length - 1) * gap;
    const startX = Math.max(0, (w - totalBarsWidth) / 2);
    return (
      <svg
        className="admKpiBarChart"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* baseline */}
        <line
          x1={6}
          x2={w - 6}
          y1={h - 12}
          y2={h - 12}
          stroke="#e6eef6"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {values.map((v, i) => {
          const bw = Math.max(1, barW);
          const bh = Math.max(3, Math.round(((v - min) / range) * (h - 20)));
          const x = startX + i * (bw + gap);
          const y = h - bh - 14;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx={bw / 2}
              fill={color}
            />
          );
        })}
      </svg>
    );
  };

  const renderDonut = (pct = 0, color = "#10b981", size = 56, label?: string) => {
    const r = size / 2 - 6;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - Math.max(0, Math.min(1, pct / 100)));
    return (
      <svg
        className="admKpiDonut"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#edf2f7"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={label && label.length > 3 ? 9 : 11}
          fontWeight={700}
          fill="#111"
        >{label ?? `${pct}%`}</text>
      </svg>
    );
  };

  const renderStockBlocks = (count = 0) => {
    const total = 5;
    const filled = Math.max(
      0,
      Math.min(
        total,
        Math.ceil((count / Math.max(1, lowStockThreshold)) * total),
      ),
    );
    return (
      <div className="admKpiBlocks" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`admKpiBlock ${i < filled ? "filled" : ""}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="dashboardFadeIn">
      <div className="admDashWrap">
        <div className="admDashTop">
          <div>
            <h2 className="admDashTitle">Tổng quan hệ thống</h2>
            <div className="admDashSub">
              Chào mừng trở lại, bạn có lịch trình 1 ngày rất bận rộn.
            </div>
          </div>
          <div className="admDashTopActions">
            {/* <button type="button" className="admBtn admBtnGhost">
              <DownloadIcon /> Xuất báo cáo
            </button> */}
            <button
              type="button"
              className="admBtn admBtnPrimary"
              onClick={
                onCreateProduct || (() => navigate("/admin/products?create=1"))
              }
            >
              <PlusIcon /> Thêm sản phẩm
            </button>
          </div>
        </div>

        <div className="admKpiGrid">
          {kpisWithSpark.map((k) => {
            const badgeStr = String(k.badge || '');
            const isPositive = badgeStr.startsWith('+');
            const isNegative = badgeStr.startsWith('-');
            const badgeTone = isPositive ? 'admKpiBadge--up' : isNegative ? 'admKpiBadge--down' : '';
            return (
              <div
                key={k.key}
                className={`admKpiCard2 tone-${k.tone} ${(k as any).key === "rev" ? "admKpiCard2--chartCenter" : ""}`}
              >
                <div className="admKpiTop">
                  <div className="admKpiIcon2" aria-hidden>
                    {k.icon}
                  </div>
                  <div className={`admKpiBadge ${badgeTone}`} aria-hidden>
                    {k.badge}
                  </div>
                </div>
                <div className="admKpiLabel2">{k.label}</div>
                <div className="admKpiValue2">{k.value}</div>
                {k.sub && (
                  <div className="admKpiSubPrev">{k.sub}</div>
                )}
                <div className="admKpiSparkWrap">
                  {(() => {
                    const kt = (k as any).chartType as string;
                    const keyColorMap: Record<string, string> = {
                      rev: "#10b981",
                      orders: "#3b82f6",
                      products: "#10b981",
                      newCus: "#8b5cf6",
                      avg: "#3b82f6",
                    };
                    const color = keyColorMap[(k as any).key] || colorOfTone((k as any).tone);
                    if ((k as any).key === "rev")
                      return renderRevenueArea((k as any).sparkline || [], color);
                    if ((k as any).key === "orders")
                      return renderLine((k as any).sparkline || [], color);
                    if ((k as any).key === "avg")
                      return renderSlopeLine((k as any).sparkline || [], color);
                    if ((k as any).key === "newCus")
                      return renderPurpleColumns((k as any).sparkline || [], "#d8c7ff", "#7c3aed");
                    if (kt === "area")
                      return renderArea((k as any).sparkline || [], color);
                    if (kt === "thinArea")
                      return renderThinArea((k as any).sparkline || [], color);
                    if (kt === "slope")
                      return renderSlopeLine((k as any).sparkline || [], color);
                    if (kt === "bars")
                      return renderBars((k as any).sparkline || [], color);
                    if (kt === "donut")
                      return renderDonut(
                        (k as any).donutPct || 0,
                        color,
                        56,
                        (k as any).donutTotal ? String((k as any).donutTotal) : undefined,
                      );
                    return renderLine((k as any).sparkline || [], color);
                  })()}
                </div>
              </div>
            );
          })}
          <div className="admKpiCard2 tone-red">
            <div className="admKpiTop">
              <div className="admKpiIcon2" aria-hidden>
                <AlertIcon />
              </div>
              <div className="admKpiBadge" aria-hidden>
                {kpi ? `${kpi.low_stock_variants}` : "—"} sản phẩm
              </div>
            </div>
            <div className="admKpiLabel2">Cảnh báo tồn kho</div>
            <div className="admKpiValue2">Sắp hết hàng</div>
            <div className="admKpiSparkWrap">
              {renderStockBlocks(kpi?.low_stock_variants ?? 0)}
            </div>
            <div className="admKpiSub2"></div>
          </div>
        </div>

        <div className="admDashGrid2 admDashGrid2--triple">
          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Nhiệm vụ nhanh</h3>
            </div>
            <div className="admQuickList2">
              {quickTasks.map((t) => (
                <button key={t.key} type="button" className="admQuickRow">
                  <span className="admQuickRowIcon" aria-hidden>
                    {t.icon}
                  </span>
                  <span className="admQuickRowText">{t.label}</span>
                  <span className="admQuickRowChevron" aria-hidden>
                    ›
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Hoạt động gần đây</h3>
            </div>
            <div className="admActivityList2">
              {(recentActivities.length
                ? recentActivities
                : [
                    {
                      dot: "info" as const,
                      title: "—",
                      desc: "Chưa có dữ liệu",
                      time: "",
                    },
                  ]
              )
                .slice(0, 3)
                .map((a, idx) => (
                  <div key={`${a.title}-${idx}`} className="admActivityRow">
                    <span className={`admActivityDot ${a.dot}`} aria-hidden />
                    <div className="admActivityRowBody">
                      <div className="admActivityRowText">
                        <b>{a.title}</b> {a.desc}
                      </div>
                      {a.time && (
                        <div className="admActivityRowTime">{a.time}</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Top sản phẩm đánh giá cao</h3>
            </div>
            <div className="admTopRatedList">
              {(topRated.length
                ? topRated
                : [
                    {
                      id: 0,
                      name: "Chưa có dữ liệu",
                      slug: "",
                      main_image_url: null,
                      avg_rating: 0,
                      reviews_count: 0,
                    },
                  ]
              )
                .slice(0, 3)
                .map((p) => (
                  <div key={p.id || p.name} className="admTopRatedRow">
                    <div className="admTopRatedLeft">
                      <img
                        className="admTopRatedThumb"
                        src={resolveAdminImg(p.main_image_url)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="admTopRatedRight">
                      <div className="admTopRatedName">{p.name}</div>
                      <div className="admTopRatedMeta">
                        <span
                          className="admTopRatedStars"
                          aria-label={`${p.avg_rating} sao`}
                        >
                          {"★".repeat(
                            Math.max(0, Math.min(5, Math.round(p.avg_rating))),
                          )}
                          <span className="admTopRatedStarsMuted">
                            {"★".repeat(
                              Math.max(0, 5 - Math.round(p.avg_rating)),
                            )}
                          </span>
                        </span>
                        <span className="admTopRatedScore">
                          {p.avg_rating ? p.avg_rating.toFixed(1) : "—"}
                        </span>
                        <span className="admTopRatedCount">
                          ({p.reviews_count || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        <section className="admCard admAnalyticsCard">
          <div className="admAnalyticsHeader">
            <div className="admCardHead adm-dash-style-13">
              <div>
                <h3 className="admCardTitle adm-dash-style-14">
                  Phân tích & Thống kê
                </h3>
                <div className="admCardSub adm-dash-style-15">
                  Hiệu suất doanh thu và số lượng giao dịch đơn hàng
                </div>
              </div>
            </div>
            <div className="admAnalyticsLegend">
              <div className="adm-dash-style-21">
                <span className="adm-dash-style-22">
                  <span className="adm-dash-style-23" />
                </span>
                <span>Doanh thu</span>
              </div>
              <div className="adm-dash-style-24">
                <span className="adm-dash-style-25">
                  <span className="adm-dash-style-26" />
                </span>
                <span>Số đơn hàng</span>
              </div>
              <div className="adm-dash-style-27">
                <span className="adm-dash-style-28">
                  <span className="adm-dash-style-29" />
                </span>
                <span>SP bán ra</span>
              </div>
            </div>
          </div>

          <div className="admAnalyticsChart adm-dash-style-16">
            {(() => {
              const pts = (
                revenue7d.length
                  ? revenue7d
                  : [
                      {
                        date: "—",
                        label: "Th 2",
                        value: 3400000,
                        orders: 12,
                        items_sold: 18,
                      },
                      {
                        date: "—",
                        label: "Th 3",
                        value: 5800000,
                        orders: 24,
                        items_sold: 35,
                      },
                      {
                        date: "—",
                        label: "Th 4",
                        value: 4100000,
                        orders: 18,
                        items_sold: 22,
                      },
                      {
                        date: "—",
                        label: "Th 5",
                        value: 7200000,
                        orders: 35,
                        items_sold: 51,
                      },
                      {
                        date: "—",
                        label: "Th 6",
                        value: 9100000,
                        orders: 48,
                        items_sold: 67,
                      },
                      {
                        date: "—",
                        label: "Th 7",
                        value: 6500000,
                        orders: 29,
                        items_sold: 40,
                      },
                      {
                        date: "—",
                        label: "CN",
                        value: 8400000,
                        orders: 42,
                        items_sold: 58,
                      },
                    ]
              ).map((pt: any) => {
                const val = pt.value || 0;
                const ords =
                  pt.orders !== undefined &&
                  pt.orders !== null &&
                  pt.orders !== 0
                    ? pt.orders
                    : val > 0
                      ? Math.max(1, Math.round(val / 180000))
                      : 0;
                const items = pt.items_sold || 0;
                return {
                  ...pt,
                  value: val,
                  orders: ords,
                  items_sold: items,
                };
              });

              return (
                <div className="adm-dash-style-17">
                  <div className="admAnalyticsAxisRow">
                    <div className="adm-dash-style-19">VND in Million</div>
                    <div className="admAnalyticsAxisRight">Số đơn hàng</div>
                  </div>

                  <div className="adm-dash-style-30">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={pts}
                        margin={{ top: 12, right: 18, left: 10, bottom: 8 }}
                        onMouseMove={(state: any) => {
                          if (
                            state &&
                            state.activePayload &&
                            state.activePayload.length > 0
                          ) {
                            setActiveData(state.activePayload[0].payload);
                          } else {
                            setActiveData(null);
                          }
                        }}
                        onMouseLeave={() => {
                          setActiveData(null);
                        }}
                      >
                        <defs>
                          <linearGradient
                            id="admAreaFillBlue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#3b82f6"
                              stopOpacity={0.16}
                            />
                            <stop
                              offset="100%"
                              stopColor="#3b82f6"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                          <linearGradient
                            id="admAreaFillOrange"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#fb923c"
                              stopOpacity={0.14}
                            />
                            <stop
                              offset="100%"
                              stopColor="#fb923c"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <defs>
                          <linearGradient
                            id="admAreaFillGreen"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10b981"
                              stopOpacity={0.14}
                            />
                            <stop
                              offset="100%"
                              stopColor="#10b981"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148, 163, 184, 0.12)"
                          vertical={true}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={true}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                          tickFormatter={(v) =>
                            v >= 1_000_000
                              ? `${(v / 1_000_000).toFixed(0)}M`
                              : v
                          }
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dx={10}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{
                            stroke: "rgba(59, 130, 246, 0.1)",
                            strokeWidth: 1,
                          }}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="value"
                          name="Doanh thu"
                          stroke="#3b82f6"
                          strokeWidth={2.8}
                          fill="url(#admAreaFillBlue)"
                          dot={{
                            r: 4,
                            stroke: "#3b82f6",
                            strokeWidth: 2,
                            fill: "#fff",
                          }}
                          activeDot={{
                            r: 6,
                            stroke: "#2563eb",
                            strokeWidth: 3,
                            fill: "#fff",
                          }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="orders"
                          name="Số đơn hàng"
                          stroke="#fb923c"
                          strokeWidth={2.8}
                          fill="url(#admAreaFillOrange)"
                          dot={{
                            r: 4,
                            stroke: "#fb923c",
                            strokeWidth: 2,
                            fill: "#fff",
                          }}
                          activeDot={{
                            r: 6,
                            stroke: "#ea580c",
                            strokeWidth: 3,
                            fill: "#fff",
                          }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="items_sold"
                          name="SP bán ra"
                          stroke="#10b981"
                          strokeWidth={2.8}
                          fill="url(#admAreaFillGreen)"
                          dot={{
                            r: 4,
                            stroke: "#10b981",
                            strokeWidth: 2,
                            fill: "#fff",
                          }}
                          activeDot={{
                            r: 6,
                            stroke: "#059669",
                            strokeWidth: 3,
                            fill: "#fff",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
            {/* Bottom stats and filters block */}
            <div className="adm-dash-style-32">
              {/* Left Column: Filters */}
              <div className="adm-dash-style-33">
                <div className="adm-dash-style-34">
                  <span className="adm-dash-style-35">Time Range</span>
                  <div className="adm-dash-style-36">
                    <div ref={dropdownRef} className="adm-dash-style-37">
                      <div
                        className="admRangeSelectWrap"
                        onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                      >
                        <span>{rangeLabels[analyticsRange]}</span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: showRangeDropdown
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                          className="adm-dash-style-38"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>

                      {showRangeDropdown && (
                        <div className="adm-dash-style-39">
                          {(
                            Object.keys(rangeLabels) as Array<
                              "7d" | "30d" | "month" | "custom"
                            >
                          ).map((key) => (
                            <div
                              key={key}
                              onClick={() => {
                                setAnalyticsRange(key);
                                setShowRangeDropdown(false);
                              }}
                              className={`admRangeDropdownItem ${analyticsRange === key ? "active" : ""}`}
                            >
                              <span>{rangeLabels[key]}</span>
                              {analyticsRange === key && (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#ea580c"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {analyticsRange === "custom" ? (
                      <div className="adm-dash-style-40">
                        <input
                          type="date"
                          className="admRangeDateInput"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                        <span className="adm-dash-style-41">đến</span>
                        <input
                          type="date"
                          className="admRangeDateInput"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="adm-dash-style-42">
                        <span>{dateRangeText}</span>
                        <span>📅</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="adm-dash-style-43">
                  <span className="adm-dash-style-44">Resolution</span>
                  <select
                    value={resolution}
                    onChange={(e) =>
                      setResolution(e.target.value as "day" | "week" | "month")
                    }
                    className="admResolutionSelect"
                  >
                    <option value="day">Theo Ngày</option>
                    <option value="week">Theo Tuần</option>
                    <option value="month">Theo Tháng</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Summary Stats */}
              <div className="adm-dash-style-45">
                <span className="adm-dash-style-46">Summary</span>

                <div className="adm-dash-style-47">
                  <div />
                  <div className="adm-dash-style-48">
                    <div className="adm-dash-style-49">
                      Doanh thu
                      <div className="adm-dash-style-50" />
                    </div>
                    <div className="adm-dash-style-51">
                      Đơn hàng thành công
                      <div className="adm-dash-style-52" />
                    </div>
                    <div className="adm-dash-style-53">
                      {`Đơn ngày (${new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })})`}
                      <div className="adm-dash-style-54" />
                    </div>
                  </div>
                </div>

                <div className="adm-dash-style-55">
                  <div className="adm-dash-style-56">
                    {activeData
                      ? formatHoverLabel(activeData.label)
                      : "Tổng quan"}
                  </div>
                  <div className="adm-dash-style-57">
                    <div className="adm-dash-style-58">
                      {activeData
                        ? `${activeData.value.toLocaleString("vi-VN")} đ`
                        : kpi
                          ? `${kpi.revenue_30d.toLocaleString("vi-VN")} đ`
                          : "—"}
                    </div>
                    <div className="adm-dash-style-59">
                      {activeData
                        ? `${activeData.orders}`
                        : kpi
                          ? `${kpi.paid_orders_30d ?? 0}`
                          : "—"}
                    </div>
                    <div className="adm-dash-style-60">
                      {activeData
                        ? `${activeData.items_sold ?? 0}`
                        : kpi
                          ? `${kpi.orders_today ?? 0}`
                          : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Best Selling Categories Section inside Analytics Card */}
          <div className="admAnalyticsCatsWrap adm-dash-style-61">
            <div className="admCardHead">
              <div>
                <h3 className="admCardTitle adm-dash-style-62">
                  Danh mục bán chạy
                </h3>
                <div className="admCardSub adm-dash-style-63">
                  Tỷ lệ doanh thu đóng góp của các danh mục sản phẩm hàng đầu
                </div>
              </div>
            </div>

            {(() => {
              const COLORS = [
                "#3b82f6",
                "#10b981",
                "#fb923c",
                "#8b5cf6",
                "#ec4899",
                "#06b6d4",
                "#f43f5e",
                "#eab308",
                "#84cc16",
                "#14b8a6",
              ];
              const pieData = (
                topCats30d.length
                  ? topCats30d
                  : [
                      { name: "Điện thoại", pct: 45 },
                      { name: "Laptop", pct: 30 },
                      { name: "Phụ kiện", pct: 15 },
                      { name: "Màn hình", pct: 10 },
                    ]
              ).map((c) => ({ name: c.name, value: c.pct }));

              return (
                <div className="adm-dash-style-64">
                  <div className="adm-dash-style-65">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any) =>
                            [`${val}%`, "Tỷ lệ"] as [string, string]
                          }
                          contentStyle={{
                            background: "var(--admin-card-bg)",
                            border: "1px solid var(--admin-border)",
                            borderRadius: "5px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--admin-text-p)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text inside Donut Chart */}
                    <div className="adm-dash-style-66">
                      <div className="adm-dash-style-67">100%</div>
                      <div className="adm-dash-style-68">Danh mục</div>
                    </div>
                  </div>

                  {/* Premium Legend & Stats side list */}
                  <div className="adm-dash-style-69">
                    {pieData.map((c, idx) => (
                      <div
                        key={c.name}
                        className="admPieCategoryItem"
                        style={
                          {
                            "--category-color": COLORS[idx % COLORS.length],
                          } as React.CSSProperties
                        }
                      >
                        <div className="adm-dash-style-70">
                          <span className="adm-dash-style-71">{c.name}</span>
                        </div>
                        <div className="adm-dash-style-72">
                          <span className="adm-dash-style-73">{c.value}%</span>
                          <span className="adm-dash-style-74">
                            Top {idx + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        <section className="admCard admOrdersCard">
          <div className="admCardHead admOrdersHead">
            <h3 className="admCardTitle">Đơn hàng gần đây</h3>
            <button type="button" className="admOrdersAllBtn">
              Xem tất cả
            </button>
          </div>

          <div className="admOrdersTableWrap">
            <table className="admOrdersTable">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Số tiền</th>
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders.length ? recentOrders : []).map((o) => (
                  <tr key={o.id}>
                    <td className="admOrdersCodeCell">
                      <span className="admOrdersCode">#{o.order_code}</span>
                    </td>
                    <td>
                      <div className="admOrdersCustomer">
                        {o.customer_avatar_url ? (
                          <img
                            className="admOrdersAvatarImg"
                            src={
                              resolveUserAvatar(o.customer_avatar_url) ||
                              undefined
                            }
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span
                            className={`admOrdersAvatar tone-${avatarToneOf(o.customer_name)}`}
                          >
                            {initialsOf(o.customer_name)}
                          </span>
                        )}
                        <span className="admOrdersCustomerName">
                          {o.customer_name}
                        </span>
                      </div>
                    </td>
                    <td className="admOrdersProduct">{o.product}</td>
                    <td className="admOrdersAmount">
                      {fmtVnd(o.total_amount)}
                      <span className="admOrdersCurrency">đ</span>
                    </td>
                    <td className="admOrdersDate">{o.created_date ?? ""}</td>
                    <td>
                      <span className={`admOrdersStatus ${o.status_tone}`}>
                        {o.status_label}
                      </span>
                    </td>
                    <td className="admOrdersActions">
                      <div className="admOrdersMenuWrap">
                        <button
                          type="button"
                          className="admOrdersMenuBtn"
                          aria-label="Thao tác"
                          aria-expanded={openOrderMenuId === o.id}
                          onClick={() =>
                            setOpenOrderMenuId((cur) =>
                              cur === o.id ? null : o.id,
                            )
                          }
                        >
                          <span aria-hidden>⋮</span>
                        </button>
                        {openOrderMenuId === o.id && (
                          <div className="admOrdersMenu" role="menu">
                            <button
                              type="button"
                              className="admOrdersMenuItem"
                              onClick={() => {
                                setOpenOrderMenuId(null);
                                setDetailOrder({
                                  id: o.id,
                                  order_code: o.order_code,
                                  customer_name: o.customer_name,
                                  customer_avatar_url:
                                    o.customer_avatar_url ?? null,
                                  product: o.product,
                                  total_amount: o.total_amount,
                                  created_date: o.created_date,
                                  status_label: o.status_label,
                                  status_tone: o.status_tone,
                                });
                              }}
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {detailOrder && (
          <div
            className="admModalOverlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDetailOrder(null);
            }}
          >
            <div className="admModal">
              <div className="admModalHead">
                <div>
                  <div className="admModalTitle">Chi tiết đơn hàng</div>
                  <div className="admModalSub">#{detailOrder.order_code}</div>
                </div>
                <button
                  type="button"
                  className="admModalClose"
                  onClick={() => setDetailOrder(null)}
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>

              <div className="admModalBody">
                <div className="admModalRow">
                  <div className="admModalLabel">Khách hàng</div>
                  <div className="admModalValue">
                    <div className="admOrdersCustomer">
                      {detailOrder.customer_avatar_url ? (
                        <img
                          className="admOrdersAvatarImg"
                          src={
                            resolveUserAvatar(
                              detailOrder.customer_avatar_url,
                            ) || undefined
                          }
                          alt=""
                        />
                      ) : (
                        <span
                          className={`admOrdersAvatar tone-${avatarToneOf(detailOrder.customer_name)}`}
                        >
                          {initialsOf(detailOrder.customer_name)}
                        </span>
                      )}
                      <span className="admOrdersCustomerName">
                        {detailOrder.customer_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Sản phẩm</div>
                  <div className="admModalValue">{detailOrder.product}</div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Số tiền</div>
                  <div className="admModalValue admModalStrong">
                    {fmtVnd(detailOrder.total_amount)} đ
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Ngày đặt</div>
                  <div className="admModalValue">
                    {detailOrder.created_date ?? ""}
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Trạng thái</div>
                  <div className="admModalValue">
                    <span
                      className={`admOrdersStatus ${detailOrder.status_tone}`}
                    >
                      {detailOrder.status_label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="admCard">
          <div className="admCardHead">
            <h3 className="admCardTitle">Tồn kho sản phẩm thấp</h3>
            {/* <button type="button" className="admBtn admBtnGhostSm">Quản lý kho</button> */}
          </div>
          <div className="admTableWrap">
            <table className="admTable">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>Phiên bản</th>
                  <th>Danh mục</th>
                  <th>Còn lại</th>
                  <th>Nhập thêm</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {dashLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="admSkeletonRow">
                      <td colSpan={8}>
                        <div className="admSkeletonCell">
                          <div
                            className="admSkeletonBar"
                            style={{ width: i % 2 === 0 ? "70%" : "90%" }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="adm-dash-style-76">
                      {dashError
                        ? dashError
                        : "Chưa có dữ liệu tồn kho (API chưa trả `stock_quantity` hoặc không có SP sắp hết)."}
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="admMono">
                        {(p.sku ?? `#${p.id}`).toString()}
                      </td>
                      <td>{p.product_name}</td>
                      <td>{p.variant_name ? p.variant_name : "—"}</td>
                      <td>{p.category?.name ?? "—"}</td>
                      <td className="admStrong">{p.stock_quantity ?? "—"}</td>
                      <td>
                        <div className="adm-dash-style-77">
                          <input
                            value={restockDraft[p.id] ?? ""}
                            onChange={(e) =>
                              setRestockDraft((cur) => ({
                                ...cur,
                                [p.id]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            inputMode="numeric"
                            style={{
                              width: 86,
                              padding: "8px 10px",
                              borderRadius: 5,
                              border: "1px solid rgba(15,23,42,.10)",
                              fontWeight: 800,
                            }}
                          />
                          <button
                            type="button"
                            className="admBtn admBtnPrimary adm-dash-style-78"
                            disabled={
                              restockBusyId === p.id ||
                              !(
                                Number.parseInt(
                                  (restockDraft[p.id] ?? "").trim(),
                                  10,
                                ) > 0
                              )
                            }
                            onClick={() => void restockVariant(p.id)}
                          >
                            {restockBusyId === p.id ? "..." : "Nhập"}
                          </button>
                        </div>
                      </td>
                      <td>
                        {p.price
                          ? `${Number.parseFloat(p.price).toLocaleString("vi-VN")} đ`
                          : "—"}
                      </td>
                      <td>
                        <span className="admBadge wait">Sắp hết</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="admDashGrid2b">
          <section className="admCard admReviewCard">
            <div className="admCardHead admReviewHead">
              <h3 className="admCardTitle">Đánh giá gần đây</h3>
              <button
                type="button"
                className="admIconBtn"
                aria-label="Đánh giá"
              >
                <ReviewChatIcon />
              </button>
            </div>
            <div className="admReviewList2">
              {(recentReviews.length ? recentReviews : []).map((r) => (
                <div key={r.id} className="admReviewRow2">
                  <div className="admReviewRowTop">
                    <div className="admReviewUser">
                      {r.user_avatar_url ? (
                        <img
                          className="admReviewAvatarImg"
                          src={
                            resolveUserAvatar(r.user_avatar_url) || undefined
                          }
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="admReviewAvatar" aria-hidden>
                          {initialsOf(r.user_name)}
                        </span>
                      )}
                      <span className="admReviewUserName">{r.user_name}</span>
                    </div>
                    <div
                      className="admReviewStars2"
                      aria-label={`${r.rating} sao`}
                    >
                      {"★★★★★".slice(0, Math.max(0, Math.min(5, r.rating)))}
                      <span className="admReviewStarsMuted2">
                        {"★★★★★".slice(Math.max(0, Math.min(5, r.rating)))}
                      </span>
                    </div>
                  </div>
                  <div className="admReviewQuote">“{r.comment}”</div>
                  <div className="admReviewTime2">{r.time}</div>
                </div>
              ))}
              {!recentReviews.length && (
                <div className="adm-dash-style-79">Chưa có đánh giá.</div>
              )}
            </div>
          </section>

          <section className="admCard admLoyalCard">
            <div className="admCardHead admLoyalHead">
              <h3 className="admCardTitle">Top khách hàng thân thiết</h3>
              <button
                type="button"
                className="admIconBtn"
                aria-label="Thành tích"
              >
                <MedalIcon />
              </button>
            </div>
            <div className={`admLoyalList${topCustomers.length > 3 ? ' admLoyalList--scroll' : ''}`}>
              {(topCustomers.length ? topCustomers : []).map((c) => (
                <div key={c.user_id} className="admLoyalRow">
                  <div className="admLoyalLeft">
                    {c.avatar_url ? (
                      <img
                        className="admLoyalAvatarImg"
                        src={resolveUserAvatar(c.avatar_url) || undefined}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className={`admLoyalAvatar tone-${avatarToneOf(c.name)}`}
                        aria-hidden
                      >
                        {initialsOf(c.name)}
                      </span>
                    )}
                    <div className="admLoyalInfo">
                      <div className="admLoyalName">{c.name}</div>
                      <div className={`admVipBadge tone-${c.vip_tone}`}>
                        {c.vip_label}
                      </div>
                    </div>
                  </div>
                  <div className="admLoyalRight">
                    <div className="admLoyalSpent">
                      {fmtMoneyShort(c.spent)} đ
                    </div>
                    <div className="admLoyalOrders">
                      {c.orders_count} đơn hàng
                    </div>
                  </div>
                </div>
              ))}
              {!topCustomers.length && (
                <div className="adm-dash-style-80">
                  Chưa có dữ liệu khách hàng.
                </div>
              )}
            </div>
            {/* <button type="button" className="admLoyalAllBtn">
              Xem tất cả khách hàng
            </button> */}
          </section>
        </div>
      </div>
    </div>
  );
}
