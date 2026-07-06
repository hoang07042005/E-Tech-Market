import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/configs/api.config";
import { useAuthStore } from "@/features/store/useAuthStore";
import logoMomo from "@/assets/logo-momo.png";
import logoVnpay from "@/assets/vnpay-logo.png";
import logoCod from "@/assets/COD.png";

type IconProps = { className?: string; title?: string };

type SettingsPayload = {
  meta?: {
    last_saved_at?: string | null;
    updated_by?: { id: number; name: string; email: string } | null;
  };
  store: {
    store_name: string;
    contact_email: string;
    contact_phone: string;
    warehouse_address: string;
    currency: string;
    language: string;
    maintenance_mode?: boolean;
    products_per_page?: number;
  };
  payments: {
    momo?: { enabled?: boolean; partner_id?: string | null };
    vnpay?: { enabled?: boolean; tmn_code?: string | null };
    cod?: { enabled?: boolean };
  };
  recent_transactions: Array<{
    code: string;
    customer: string;
    amount: number;
    status_label: string;
    status_tone: "ok" | "wait" | "bad";
  }>;
  shipping: {
    methods: Array<{
      id: number;
      name: string;
      description?: string | null;
      base_fee: number;
      estimated_days_min?: number | null;
      estimated_days_max?: number | null;
      is_active: boolean;
    }>;
    policy: { free_shipping_min: number; apply_global: boolean };
    zones: Array<{
      id: number;
      name: string;
      eta?: string | null;
      fee: number;
      is_active: boolean;
    }>;
  };
  security: {
    two_fa_enabled: boolean;
    strength_label: string;
    last_login: string | null;
    alerts: number;
  };
  chat: {
    service: "none" | "facebook" | "zalo" | "tawkto";
    facebook_page_id: string;
    zalo_oa_id: string;
    tawkto_property_id: string;
    tawkto_widget_id: string;
  };
};

type ZoneRow = {
  id: number;
  name: string;
  eta?: string | null;
  fee: number;
  is_active: boolean;
};
type MethodRow = {
  id: number;
  name: string;
  description?: string | null;
  base_fee: number;
  estimated_days_min?: number | null;
  estimated_days_max?: number | null;
  is_active: boolean;
};

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  const s = url.trim();
  if (!s) return null;
  // Already absolute URL - check if hostname is accessible
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s);
      // If hostname is 'nginx' (Docker network hostname), replace with current origin
      if (urlObj.hostname === "nginx" || urlObj.hostname === "localhost") {
        const path = s.replace(/^https?:\/\/[^/]+/, "");
        return window.location.origin + path;
      }
    } catch {
      /* keep original */
    }
    return s;
  }
  // Relative path - prepend API base URL
  return `${API_BASE_URL}${s.startsWith("/") ? s : `/${s}`}`;
}

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN");
}

function fmtAdminDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SettingsAdminPage() {
  // 🔒 Token is sent via httpOnly cookie automatically
  const hasAuth = true; // Always authenticated — behind ProtectedRoute
  const userStr = useAuthStore((state) => state.userStr);

  const userAvatarUrl = useMemo(() => {
    if (!userStr) return null;
    try {
      const u = JSON.parse(userStr) as {
        avatar_url?: string | null;
        avatarUrl?: string | null;
      };
      return (u.avatar_url ?? u.avatarUrl ?? null) || null;
    } catch {
      return null;
    }
  }, [userStr]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [saving, setSaving] = useState(false);

  // local editable states
  const [store, setStore] = useState<SettingsPayload["store"]>({
    store_name: "",
    contact_email: "",
    contact_phone: "",
    warehouse_address: "",
    currency: "VND",
    language: "vi",
    maintenance_mode: false,
  });
  const [chat, setChat] = useState<SettingsPayload["chat"]>({
    service: "none",
    facebook_page_id: "",
    zalo_oa_id: "",
    tawkto_property_id: "",
    tawkto_widget_id: "",
  });
  const [payments, setPayments] = useState<SettingsPayload["payments"]>({
    momo: { enabled: true, partner_id: "" },
    vnpay: { enabled: true, tmn_code: "" },
    cod: { enabled: true },
  });
  const [shipPolicy, setShipPolicy] = useState({
    free_shipping_min: 5000000,
    apply_global: true,
  });
  const [twoFa, setTwoFa] = useState(false);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [zoneQuery, setZoneQuery] = useState("");
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [addingZone, setAddingZone] = useState(false);
  const [addZoneErr, setAddZoneErr] = useState<string | null>(null);
  const [addZoneForm, setAddZoneForm] = useState<{
    name: string;
    eta: string;
    fee: string;
    is_active: boolean;
  }>({
    name: "",
    eta: "",
    fee: "0",
    is_active: true,
  });

  // Quick-paste add zones
  const [zonePasteOpen, setZonePasteOpen] = useState(false);
  const [zonePasteText, setZonePasteText] = useState("");
  const [addingZones, setAddingZones] = useState(false);
  const [zonePasteErr, setZonePasteErr] = useState<string | null>(null);

  // 2FA states
  const [twoFaSetupOpen, setTwoFaSetupOpen] = useState(false);
  const [twoFaSetupData, setTwoFaSetupData] = useState<{
    secret: string;
    qr_code_url: string;
  } | null>(null);
  const [twoFaOtp, setTwoFaOtp] = useState("");
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  const [twoFaDisableOpen, setTwoFaDisableOpen] = useState(false);
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  const openTwoFaSetup = async () => {
    try {
      setTwoFaLoading(true);
      const res = await apiFetch<{ secret: string; qr_code_url: string }>(
        "/api/2fa/setup",
        { method: "POST" },
      );
      setTwoFaSetupData(res);
      setTwoFaSetupOpen(true);
      setTwoFaError(null);
      setTwoFaOtp("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const reloadTwoFaStatus = async () => {
    try {
      const s = await apiFetch<SettingsPayload>("/api/admin/settings");
      setTwoFa(s.security.two_fa_enabled);
      setData(s);
    } catch {
      // keep current state if reload fails
    }
  };

  const saveTwoFaStatus = async (enabled: boolean) => {
    try {
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          store,
          payments,
          shipping_policy: shipPolicy,
          security: { two_fa_enabled: enabled },
          chat,
        }),
      });
    } catch {
      // continue anyway
    }
  };

  const verifyTwoFa = async () => {
    if (twoFaOtp.length !== 6) return;
    try {
      setTwoFaLoading(true);
      await apiFetch("/api/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ otp: twoFaOtp }),
      });
      setTwoFa(true);
      setTwoFaSetupOpen(false);
      await saveTwoFaStatus(true);
      await reloadTwoFaStatus();
    } catch (e: any) {
      setTwoFaError(e.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const openTwoFaDisable = () => {
    setTwoFaDisableOpen(true);
    setTwoFaError(null);
    setTwoFaPassword("");
  };

  const disableTwoFa = async () => {
    if (!twoFaPassword) return;
    try {
      setTwoFaLoading(true);
      await apiFetch("/api/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: twoFaPassword }),
      });
      setTwoFa(false);
      setTwoFaDisableOpen(false);
      await saveTwoFaStatus(false);
      await reloadTwoFaStatus();
    } catch (e: any) {
      setTwoFaError(e.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const [methods, setMethods] = useState<MethodRow[]>([]);
  const [methodQuery, setMethodQuery] = useState("");
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [addMethodErr, setAddMethodErr] = useState<string | null>(null);
  const [editingMethodId, setEditingMethodId] = useState<number | null>(null);
  const [manageMethodsOpen, setManageMethodsOpen] = useState(false);
  const [ranks, setRanks] = useState<
    Array<{
      id: number;
      rank_name: string;
      min_spend: number;
      point_multiplier: number;
      benefits: string | null;
    }>
  >([]);
  const [ranksLoading, setRanksLoading] = useState(false);
  const [manageRanksOpen, setManageRanksOpen] = useState(false);
  const [addRankForm, setAddRankForm] = useState({
    rank_name: "",
    min_spend: "0",
    point_multiplier: "1",
    benefits: "",
  });
  const [addRankErr, setAddRankErr] = useState<string | null>(null);
  const [addingRank, setAddingRank] = useState(false);
  const [editingRankId, setEditingRankId] = useState<number | null>(null);
  const [addMethodForm, setAddMethodForm] = useState<{
    name: string;
    description: string;
    base_fee: string;
    estimated_days_min: string;
    estimated_days_max: string;
    is_active: boolean;
  }>({
    name: "",
    description: "",
    base_fee: "0",
    estimated_days_min: "",
    estimated_days_max: "",
    is_active: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!hasAuth) {
        setError("Bạn chưa đăng nhập.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const s = await apiFetch<SettingsPayload>("/api/admin/settings");
        if (cancelled) return;
        setData(s);
        setStore(s.store);
        setChat(s.chat);
        setPayments(s.payments);
        setShipPolicy(s.shipping.policy);
        setMethods(s.shipping.methods as MethodRow[]);
        // Load zones from dedicated endpoint to reflect DB exactly (no truncation/limits).
        try {
          const z = await apiFetch<ZoneRow[]>("/api/admin/shipping/zones");
          if (!cancelled) setZones(Array.isArray(z) ? z : []);
        } catch {
          if (!cancelled) setZones(s.shipping.zones);
        }
        // Load methods from dedicated endpoint to reflect DB exactly.
        try {
          const m = await apiFetch<MethodRow[]>("/api/admin/shipping/methods");
          if (!cancelled) setMethods(Array.isArray(m) ? m : []);
        } catch {
          // keep from settings payload
        }
        // Load membership ranks
        try {
          const r = await apiFetch<{
            data: Array<{
              id: number;
              rank_name: string;
              min_spend: number;
              point_multiplier: number;
              benefits: string | null;
            }>;
          }>("/api/admin/membership-ranks");
          if (!cancelled) setRanks(r?.data || []);
        } catch {
          // keep empty
        }
        setTwoFa(s.security.two_fa_enabled);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không tải được cài đặt.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [hasAuth]);

  const onSaveAll = async () => {
    if (!hasAuth) return;
    setSaving(true);
    try {
      const updated = await apiFetch<SettingsPayload>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          store,
          payments,
          shipping_policy: shipPolicy,
          security: { two_fa_enabled: twoFa },
          chat,
        }),
      });
      setData(updated);
      setStore(updated.store);
      setChat(updated.chat);
      setPayments(updated.payments);
      setShipPolicy(updated.shipping.policy);
      setZones(updated.shipping.zones);
      setTwoFa(updated.security.two_fa_enabled);
    } finally {
      setSaving(false);
    }
  };

  const openAddZone = () => {
    setAddZoneErr(null);
    setAddZoneForm({ name: "", eta: "", fee: "0", is_active: true });
    setAddZoneOpen(true);
  };

  const submitAddZone = async () => {
    if (!hasAuth) return;
    const name = addZoneForm.name.trim();
    if (!name) {
      setAddZoneErr("Vui lòng nhập tên khu vực.");
      return;
    }
    const fee =
      Number(addZoneForm.fee.replaceAll(".", "").replaceAll(",", "").trim()) ||
      0;
    if (fee < 0) {
      setAddZoneErr("Đơn giá không hợp lệ.");
      return;
    }
    setAddingZone(true);
    setAddZoneErr(null);
    try {
      const created = await apiFetch<ZoneRow>("/api/admin/shipping/zones", {
        method: "POST",
        body: JSON.stringify({
          name,
          eta: addZoneForm.eta.trim() || null,
          fee,
          is_active: addZoneForm.is_active,
        }),
      });
      setZones((z) => [created, ...z]);
      setAddZoneOpen(false);
    } catch (e) {
      setAddZoneErr(e instanceof Error ? e.message : "Không thể thêm khu vực.");
    } finally {
      setAddingZone(false);
    }
  };

  const handleSubmitZonePaste = async () => {
    if (!hasAuth) return;
    const lines = zonePasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setZonePasteErr("Vui lòng nhập ít nhất một dòng.");
      return;
    }
    const parsed: { name: string; eta: string | null; fee: number }[] = [];
    const errors: string[] = [];
    lines.forEach((ln, idx) => {
      const parts = ln.split("|").map((p) => p.trim());
      const name = parts[0] || "";
      const eta = parts[1] || null;
      const feeStr = parts[2] || "0";
      const fee = Number(feeStr.replaceAll(".", "").replaceAll(",", "")) || 0;
      if (!name) errors.push(`Dòng ${idx + 1}: thiếu tên khu vực.`);
      if (fee < 0) errors.push(`Dòng ${idx + 1}: đơn giá không hợp lệ.`);
      parsed.push({ name, eta, fee });
    });
    if (errors.length) {
      setZonePasteErr(errors.join(" "));
      return;
    }
    setAddingZones(true);
    setZonePasteErr(null);
    try {
      const created = await Promise.all(
        parsed.map((p) =>
          apiFetch<ZoneRow>("/api/admin/shipping/zones", {
            method: "POST",
            body: JSON.stringify({ name: p.name, eta: p.eta, fee: p.fee }),
          }),
        ),
      );
      setZones((z) => [...created, ...z]);
      setZonePasteOpen(false);
    } catch (e) {
      setZonePasteErr(e instanceof Error ? e.message : "Không thể thêm vùng.");
    } finally {
      setAddingZones(false);
    }
  };

  const updateZone = async (z: ZoneRow) => {
    if (!hasAuth) return;
    const name = prompt("Tên khu vực", z.name)?.trim();
    if (!name) return;
    const eta = prompt("Thời gian dự kiến", z.eta ?? "")?.trim() ?? "";
    const feeStr =
      prompt("Đơn giá (VND)", String(z.fee))?.trim() ?? String(z.fee);
    const fee = Number(feeStr.replaceAll(".", "").replaceAll(",", "")) || 0;
    const updated = await apiFetch<ZoneRow>(
      `/api/admin/shipping/zones/${z.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name, eta, fee }),
      },
    );
    setZones((cur) => cur.map((x) => (x.id === z.id ? updated : x)));
  };

  const toggleZoneActive = async (z: ZoneRow) => {
    if (!hasAuth) return;
    const updated = await apiFetch<ZoneRow>(
      `/api/admin/shipping/zones/${z.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: !z.is_active }),
      },
    );
    setZones((cur) => cur.map((x) => (x.id === z.id ? updated : x)));
  };

  const deleteZone = async (z: ZoneRow) => {
    if (!hasAuth) return;
    const ok = window.confirm(
      `Xóa vùng “${z.name}”? Thao tác này không thể hoàn tác.`,
    );
    if (!ok) return;
    await apiFetch<{ ok: true }>(`/api/admin/shipping/zones/${z.id}`, {
      method: "DELETE",
    });
    setZones((cur) => cur.filter((x) => x.id !== z.id));
  };

  const filteredZones = useMemo(() => {
    const q = zoneQuery.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter((z) => z.name.toLowerCase().includes(q));
  }, [zoneQuery, zones]);

  const filteredMethods = useMemo(() => {
    const q = methodQuery.trim().toLowerCase();
    if (!q) return methods;
    return methods.filter((m) => m.name.toLowerCase().includes(q));
  }, [methodQuery, methods]);

  const methodsPreview = useMemo(() => {
    // Show up to 3 active partners; the 4th tile is always "Add partner".
    return methods
      .filter((m) => m.is_active)
      .sort((a, b) => b.id - a.id)
      .slice(0, 3);
  }, [methods]);

  const openAddMethod = () => {
    setAddMethodErr(null);
    setEditingMethodId(null);
    setAddMethodForm({
      name: "",
      description: "",
      base_fee: "0",
      estimated_days_min: "",
      estimated_days_max: "",
      is_active: true,
    });
    setAddMethodOpen(true);
  };

  const submitAddMethod = async () => {
    if (!hasAuth) return;
    const name = addMethodForm.name.trim();
    if (!name) {
      setAddMethodErr("Vui lòng nhập tên đối tác.");
      return;
    }
    const baseFee =
      Number(
        addMethodForm.base_fee.replaceAll(".", "").replaceAll(",", "").trim(),
      ) || 0;
    if (baseFee < 0) {
      setAddMethodErr("Phí cơ bản không hợp lệ.");
      return;
    }
    const dMin =
      addMethodForm.estimated_days_min.trim() === ""
        ? null
        : Number(addMethodForm.estimated_days_min.trim());
    const dMax =
      addMethodForm.estimated_days_max.trim() === ""
        ? null
        : Number(addMethodForm.estimated_days_max.trim());
    if (dMin !== null && (!Number.isFinite(dMin) || dMin < 0)) {
      setAddMethodErr("Số ngày tối thiểu không hợp lệ.");
      return;
    }
    if (dMax !== null && (!Number.isFinite(dMax) || dMax < 0)) {
      setAddMethodErr("Số ngày tối đa không hợp lệ.");
      return;
    }
    setAddingMethod(true);
    setAddMethodErr(null);
    try {
      if (editingMethodId) {
        const updated = await apiFetch<MethodRow>(
          `/api/admin/shipping/methods/${editingMethodId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              name,
              description: addMethodForm.description.trim() || null,
              base_fee: baseFee,
              estimated_days_min: dMin,
              estimated_days_max: dMax,
              is_active: addMethodForm.is_active,
            }),
          },
        );
        setMethods((cur) =>
          cur.map((x) => (x.id === editingMethodId ? updated : x)),
        );
      } else {
        const created = await apiFetch<MethodRow>(
          "/api/admin/shipping/methods",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              description: addMethodForm.description.trim() || null,
              base_fee: baseFee,
              estimated_days_min: dMin,
              estimated_days_max: dMax,
              is_active: addMethodForm.is_active,
            }),
          },
        );
        setMethods((cur) => [created, ...cur]);
      }
      setAddMethodOpen(false);
    } catch (e) {
      setAddMethodErr(
        e instanceof Error ? e.message : "Không thể thêm đối tác.",
      );
    } finally {
      setAddingMethod(false);
    }
  };

  const toggleMethodActive = async (m: MethodRow) => {
    if (!hasAuth) return;
    const updated = await apiFetch<MethodRow>(
      `/api/admin/shipping/methods/${m.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: !m.is_active }),
      },
    );
    setMethods((cur) => cur.map((x) => (x.id === m.id ? updated : x)));
  };

  const updateMethod = async (m: MethodRow) => {
    if (!hasAuth) return;
    setAddMethodErr(null);
    setEditingMethodId(m.id);
    setAddMethodForm({
      name: m.name,
      description: m.description ?? "",
      base_fee: String(m.base_fee ?? 0),
      estimated_days_min:
        m.estimated_days_min == null ? "" : String(m.estimated_days_min),
      estimated_days_max:
        m.estimated_days_max == null ? "" : String(m.estimated_days_max),
      is_active: !!m.is_active,
    });
    setAddMethodOpen(true);
  };

  const deleteMethod = async (m: MethodRow) => {
    if (!hasAuth) return;
    const ok = window.confirm(
      `Xóa đối tác “${m.name}”? Thao tác này không thể hoàn tác.`,
    );
    if (!ok) return;
    await apiFetch<{ ok: true }>(`/api/admin/shipping/methods/${m.id}`, {
      method: "DELETE",
    });
    setMethods((cur) => cur.filter((x) => x.id !== m.id));
  };

  if (loading)
    return (
      <div className="admSettingsPage">
        <div className="admSettingsTop">
          <div style={{ flex: 1 }}>
            <div
              className="admSkeletonBar"
              style={{ width: 320, height: 24, marginBottom: 8 }}
            />
            <div
              className="admSkeletonBar"
              style={{ width: 450, height: 14 }}
            />
          </div>
          <div
            className="admSkeletonBar"
            style={{ width: 120, height: 38, borderRadius: 10 }}
          />
        </div>

        <div className="admSettingsGridTop">
          <section className="admSetCard" style={{ height: 340, padding: 20 }}>
            <div
              className="admSkeletonBar"
              style={{ width: "30%", height: 18, marginBottom: 24 }}
            />
            <div
              className="admSkeletonBar"
              style={{ width: "100%", height: 40, marginBottom: 16 }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div className="admSkeletonBar" style={{ height: 40 }} />
              <div className="admSkeletonBar" style={{ height: 40 }} />
            </div>
            <div
              className="admSkeletonBar"
              style={{ width: "100%", height: 80 }}
            />
          </section>

          <section className="admSetCard" style={{ height: 340, padding: 20 }}>
            <div
              className="admSkeletonBar"
              style={{ width: "40%", height: 18, marginBottom: 24 }}
            />
            <div
              className="admSkeletonBar"
              style={{ width: "100%", height: 60, marginBottom: 20 }}
            />
            <div
              className="admSkeletonBar"
              style={{ width: "100%", height: 100 }}
            />
          </section>
        </div>

        <section
          className="admSetCard"
          style={{ height: 120, padding: 20, marginTop: 14 }}
        >
          <div
            className="admSkeletonBar"
            style={{ width: "20%", height: 18, marginBottom: 20 }}
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div className="admSkeletonBar" style={{ height: 40 }} />
            <div className="admSkeletonBar" style={{ height: 40 }} />
          </div>
        </section>
      </div>
    );
  if (error) return <div className="admSettingsEmpty">{error}</div>;
  if (!data) return <div className="admSettingsEmpty">Chưa có dữ liệu.</div>;

  return (
    <div className="admSettingsPage">
      <div className="admSettingsTop">
        <div>
          <h2 className="admSettingsTitle">Cấu hình chung</h2>
          <div className="admSettingsSub">
            Cập nhật danh tính cửa hàng và các tuỳ chọn toàn cầu.
          </div>
        </div>
        <button
          type="button"
          className="admSettingsSaveBtn"
          onClick={onSaveAll}
          disabled={saving}
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>

      {/* 1) General */}
      <div className="admSettingsGridTop">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section className="admSetCard">
            <div className="admSetCardHead">
              <div className="admSetCardTitle">
                <span className="admSetIcon" aria-hidden>
                  <IconStore />
                </span>{" "}
                Danh tính cửa hàng
              </div>
            </div>
            <div className="admSetForm">
              <label className="admSetField">
                <span>Tên cửa hàng</span>
                <input
                  value={store.store_name || ""}
                  onChange={(e) =>
                    setStore((p) => ({ ...p, store_name: e.target.value }))
                  }
                />
              </label>
              <div className="admSet2Col">
                <label className="admSetField">
                  <span>Email liên hệ</span>
                  <input
                    value={store.contact_email || ""}
                    onChange={(e) =>
                      setStore((p) => ({ ...p, contact_email: e.target.value }))
                    }
                  />
                </label>
                <label className="admSetField">
                  <span>Số điện thoại</span>
                  <input
                    value={store.contact_phone || ""}
                    onChange={(e) =>
                      setStore((p) => ({ ...p, contact_phone: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="admSetField">
                <span>Địa chỉ</span>
                <textarea
                  value={store.warehouse_address || ""}
                  onChange={(e) =>
                    setStore((p) => ({
                      ...p,
                      warehouse_address: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="admSetCard">
            <div className="admSetCardHead">
              <div className="admSetCardTitle">
                <span className="admSetIcon" aria-hidden>
                  <IconGlobe /> {/* Or any suitable icon */}
                </span>{" "}
                Hệ thống / Bảo trì
              </div>
            </div>
            <div className="admSetForm">
              <div
                className="admMaintenanceSection"
                style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}
              >
                <div className="admMaintenanceRow">
                  <label className="admSwitch">
                    <input
                      type="checkbox"
                      checked={!!store.maintenance_mode}
                      onChange={(e) =>
                        setStore((p) => ({
                          ...p,
                          maintenance_mode: e.target.checked,
                        }))
                      }
                    />
                    <span />
                  </label>
                  <div className="admMaintenanceText">
                    <strong
                      className={
                        store.maintenance_mode
                          ? "admMaintenanceTitle isActive"
                          : "admMaintenanceTitle"
                      }
                    >
                      Bật chế độ bảo trì
                    </strong>
                    <div className="admMaintenanceNote">
                      Khi bật, người dùng sẽ không thể truy cập bất kỳ trang nào
                      ở phía người dùng (trừ trang quản trị).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="admSetSide">
          <section className="admSetCard" style={{ padding: 12 }}>
            <div className="admSecTitle">
              <span className="admSetIcon" aria-hidden>
                <IconClipboard />
              </span>{" "}
              Nhật ký
            </div>
            <div className="admSecLog">
              <div className="admSecLogTitle">Đăng nhập thành công</div>
              <div className="admSecLogSub">
                {data.security.last_login
                  ? `Lần cuối: ${data.security.last_login}`
                  : "Chưa có dữ liệu"}
              </div>
            </div>
            <button type="button" className="admSetLinkBtn">
              Xuất báo cáo (CSV)
            </button>
            <div className="admSetMiniCard" style={{ marginTop: 12 }}>
              <div className="admMiniRow">
                <span className="admMiniDot" aria-hidden>
                  <IconClock />
                </span>
                <div>
                  <div className="admMiniTitle">Lưu lần cuối</div>
                  <div className="admMiniSub">
                    {fmtAdminDateTime(data.meta?.last_saved_at ?? null)}
                  </div>
                </div>
              </div>
              <div className="admMiniRow">
                <span className="admMiniDot" aria-hidden>
                  <IconUser />
                </span>
                <div>
                  <div className="admMiniTitle">Cập nhật bởi</div>
                  <div className="admMiniSub">
                    {data.meta?.updated_by?.name ||
                      data.meta?.updated_by?.email ||
                      "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="admSetCard" style={{ padding: 8, marginTop: 8 }}>
            <div className="admSecTitle" style={{ marginBottom: 8 }}>
              <span className="admSetIcon" aria-hidden>
                <IconGlobe />
              </span>{" "}
              Cấu hình hiển thị
            </div>
            <label className="admSetField" style={{ marginBottom: 0 }}>
              <span
                style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}
              >
                Số lượng sản phẩm/trang sẽ áp dụng cho cả giao diện Web và App.
              </span>
              <input
                type="number"
                min="1"
                max="100"
                style={{ marginTop: 2, fontSize: "14px", padding: "5px 5px" }}
                value={store.products_per_page ?? 12}
                onChange={(e) =>
                  setStore((p) => ({
                    ...p,
                    products_per_page: Number(e.target.value) || 12,
                  }))
                }
              />
            </label>
          </section>
        </aside>
      </div>

      <section className="admSetCard">
        <div className="admSetCardHead">
          <div className="admSetCardTitle">
            <span className="admSetIcon" aria-hidden>
              <IconGlobe />
            </span>{" "}
            Bản địa hoá
          </div>
        </div>
        <div className="admSet2Col">
          <label className="admSetField">
            <span>Tiền tệ mặc định</span>
            <select
              value={store.currency}
              onChange={(e) =>
                setStore((p) => ({ ...p, currency: e.target.value }))
              }
            >
              <option value="VND">Vietnamese Dong (VND)</option>
            </select>
          </label>
          <label className="admSetField">
            <span>Ngôn ngữ hệ thống</span>
            <select
              value={store.language}
              onChange={(e) =>
                setStore((p) => ({ ...p, language: e.target.value }))
              }
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </section>

      {/* 2) Payments */}
      <div className="admSetSectionHead">
        <h3>Cổng thanh toán</h3>
        <div className="admSetSectionSub">
          Quản lý các cổng thanh toán và phương thức giao dịch tích hợp.
        </div>
      </div>

      <div className="admPayGrid">
        <section className="admPayCard">
          <div className="admPayTop">
            <div className="admPayIcon admPayIcon--logo">
              <img src={logoMomo} alt="MoMo" className="admPayIconImg" />
            </div>
            <label className="admSwitch">
              <input
                type="checkbox"
                checked={!!payments.momo?.enabled}
                onChange={(e) =>
                  setPayments((p) => ({
                    ...p,
                    momo: { ...(p.momo ?? {}), enabled: e.target.checked },
                  }))
                }
              />
              <span />
            </label>
          </div>
          <div className="admPayName">Ví Momo</div>
          <div className="admPayDesc">
            Tích hợp ví điện tử phổ biến nhất Việt Nam.
          </div>
          {/* <label className="admPayField">
            <span>Momo Partner ID</span>
            <input
              value={payments.momo?.partner_id ?? ''}
              onChange={(e) => setPayments((p) => ({ ...p, momo: { ...(p.momo ?? {}), partner_id: e.target.value } }))}
              placeholder="***********"
            />
          </label> */}
        </section>

        <section className="admPayCard">
          <div className="admPayTop">
            <div className="admPayIcon admPayIcon--logo">
              <img src={logoVnpay} alt="VNPAY" className="admPayIconImg" />
            </div>
            <label className="admSwitch">
              <input
                type="checkbox"
                checked={!!payments.vnpay?.enabled}
                onChange={(e) =>
                  setPayments((p) => ({
                    ...p,
                    vnpay: { ...(p.vnpay ?? {}), enabled: e.target.checked },
                  }))
                }
              />
              <span />
            </label>
          </div>
          <div className="admPayName">Cổng VNPAY</div>
          <div className="admPayDesc">
            Giải pháp thanh toán QR-Code và ATM nội địa.
          </div>
          {/* <label className="admPayField">
            <span>TMN Code</span>
            <input
              value={payments.vnpay?.tmn_code ?? ''}
              onChange={(e) => setPayments((p) => ({ ...p, vnpay: { ...(p.vnpay ?? {}), tmn_code: e.target.value } }))}
              placeholder="VNPAY_XXXX"
            />
          </label> */}
        </section>

        <section className="admPayCard">
          <div className="admPayTop">
            <div className="admPayIcon admPayIcon--logo">
              <img
                src={logoCod}
                alt="Thanh toán khi nhận (COD)"
                className="admPayIconImg"
              />
            </div>
            <label className="admSwitch">
              <input
                type="checkbox"
                checked={!!payments.cod?.enabled}
                onChange={(e) =>
                  setPayments((p) => ({
                    ...p,
                    cod: { ...(p.cod ?? {}), enabled: e.target.checked },
                  }))
                }
              />
              <span />
            </label>
          </div>
          <div className="admPayName">COD (Thanh toán khi nhận)</div>
          <div className="admPayDesc">
            Khách thanh toán tiền mặt cho shipper hoặc tại cửa hàng khi nhận
            hàng.
          </div>
          <div className="admPayField">
            <span>Ghi chú</span>
            <p className="admPayCodNote">
              Không cần Partner ID hay API — chỉ bật/tắt phương thức này cho đơn
              hàng.
            </p>
          </div>
        </section>
      </div>

      <section className="admSetCard">
        <div className="admSetCardHead">
          <div className="admSetCardTitle">Giao dịch gần đây</div>
          <button type="button" className="admSetLinkBtn">
            Xem tất cả
          </button>
        </div>
        <div className="admTxnWrap">
          <table className="admTxnTable">
            <thead>
              <tr>
                <th>Mã GD</th>
                <th>Khách hàng</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_transactions.map((t, idx) => (
                <tr key={`${t.code}-${idx}`}>
                  <td className="admMono">#{t.code}</td>
                  <td>{t.customer}</td>
                  <td className="admStrong">{fmtVnd(t.amount)}đ</td>
                  <td>
                    <span className={`admTxnBadge ${t.status_tone}`}>
                      {t.status_label}
                    </span>
                  </td>
                </tr>
              ))}
              {!data.recent_transactions.length && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 14,
                      color: "var(--admin-text-s)",
                      fontWeight: 700,
                    }}
                  >
                    Chưa có giao dịch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3) Membership Ranks */}
      <div className="admSetSectionHead">
        <h3>Cài đặt hạng thành viên</h3>
        <div className="admSetSectionSub">
          Quản lý hạng thành viên và tiêu chí tích lũy.
        </div>
      </div>

      <div className="admShipShotLayout">
        <section className="admShipCurrentCard">
          <div className="admShipCurrentHead">
            <div className="admShipCurrentTitle">
              <span className="admSetIcon" aria-hidden>
                <IconStar />
              </span>{" "}
              Các hạng thành viên
            </div>
            <button
              type="button"
              className="admShipManageLink"
              disabled={ranksLoading}
              onClick={() => {
                setRanksLoading(true);
                apiFetch<{
                  data: Array<{
                    id: number;
                    rank_name: string;
                    min_spend: number;
                    point_multiplier: number;
                    benefits: string | null;
                  }>;
                }>("/api/admin/membership-ranks")
                  .then((r) => {
                    setRanks(r?.data || []);
                    setRanksLoading(false);
                    setManageRanksOpen(true);
                  })
                  .catch(() => setRanksLoading(false));
              }}
            >
              {ranksLoading ? "Đang tải..." : "Quản lý tất cả"}
            </button>
          </div>
          <div className="admShipCurrentGrid">
            {ranks.slice(0, 4).map((r) => (
              <div key={r.id} className="admShipMethodTile">
                <div className="admShipMethodTop">
                  <div className="admShipMethodName">{r.rank_name}</div>
                </div>
                <div className="admShipMethodMeta">
                  Tích lũy tối thiểu: {fmtVnd(r.min_spend)}
                </div>
                <div className="admShipMethodMeta">
                  Hệ số điểm: x{r.point_multiplier}
                </div>
              </div>
            ))}
            {ranks.length === 0 && (
              <div style={{ padding: 16, color: "var(--admin-text-s)" }}>
                Chưa có hạng thành viên.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 4) Shipping */}
      <div className="admSetSectionHead">
        <h3>Cài đặt vận chuyển</h3>
        <div className="admSetSectionSub">
          Quản lý đối tác và biểu phí giao hàng toàn quốc.
        </div>
      </div>

      <div className="admShipShotLayout">
        <section className="admShipCurrentCard">
          <div className="admShipCurrentHead">
            <div className="admShipCurrentTitle">
              <span className="admSetIcon" aria-hidden>
                <IconFuel />
              </span>{" "}
              Đối tác vận chuyển hiện tại
            </div>
            <button
              type="button"
              className="admShipManageLink"
              onClick={() => setManageMethodsOpen(true)}
            >
              Quản lý tất cả
            </button>
          </div>

          <div className="admShipCurrentGrid">
            {methodsPreview.map((m) => (
              <div key={m.id} className="admShipMethodTile">
                <div className="admShipMethodTop">
                  <div className="admShipMethodIcon" aria-hidden>
                    ⚡
                  </div>
                  <label
                    className="admSwitch"
                    title={m.is_active ? "Đang bật" : "Đang tắt"}
                  >
                    <input
                      type="checkbox"
                      checked={m.is_active}
                      onChange={() => void toggleMethodActive(m)}
                    />
                    <span />
                  </label>
                </div>
                <div className="admShipMethodName">{m.name}</div>
                <div className={`admShipMethodSub ${m.is_active ? "ok" : ""}`}>
                  {m.is_active ? "Đang hoạt động" : "Tạm tắt"}
                </div>
                <div className="admShipMethodDesc">{m.description}</div>
                <button
                  type="button"
                  className="admShipMethodCfg"
                  onClick={() => void updateMethod(m)}
                >
                  Cập nhật
                </button>
              </div>
            ))}

            <button
              type="button"
              className="admShipMethodAddTile"
              onClick={openAddMethod}
            >
              <div className="admShipMethodAddIcon" aria-hidden>
                <IconPlus />
              </div>
              <div className="admShipMethodAddText">
                Thêm đối tác vận chuyển
              </div>
              <div className="admShipMethodAddSub">
                Kết nối GHN, GHTK, Viettel Post...
              </div>
            </button>
          </div>
        </section>

        <aside className="admShipPolicySide">
          <section className="admShipPolicyCard isShot">
            <div className="admShipPolicyTitle">Chính sách Miễn phí</div>
            <label className="admSetField">
              <span>Đơn hàng tối thiểu (đ)</span>
              <input
                value={String(shipPolicy.free_shipping_min)}
                onChange={(e) =>
                  setShipPolicy((p) => ({
                    ...p,
                    free_shipping_min:
                      Number(
                        e.target.value.replaceAll(".", "").replaceAll(",", ""),
                      ) || 0,
                  }))
                }
              />
            </label>
            <label className="admShipCheck isShot">
              <input
                type="checkbox"
                checked={shipPolicy.apply_global}
                onChange={(e) =>
                  setShipPolicy((p) => ({
                    ...p,
                    apply_global: e.target.checked,
                  }))
                }
              />
              Áp dụng toàn quốc
            </label>
            <button
              type="button"
              className="admShipPolicyBtn isShot"
              onClick={onSaveAll}
              disabled={saving}
            >
              {saving ? "Đang lưu…" : "Cập nhật chính sách"}
            </button>
          </section>

          <section className="admShipTipCard">
            <div className="admShipTipDot" aria-hidden />
            <div className="admShipTipText">
              <b>Mẹo:</b> Thiết lập chính sách miễn phí ship giúp tăng tỷ lệ
              chốt đơn (Conversion Rate) lên đến 35% cho các đơn hàng giá trị
              cao.
            </div>
          </section>
        </aside>
      </div>

      {manageMethodsOpen && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Quản lý đối tác vận chuyển"
          onClick={() => setManageMethodsOpen(false)}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">Quản lý đối tác vận chuyển</div>
                <div className="admModalSub">
                  Thêm / sửa / xoá / bật tắt đối tác
                </div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => setManageMethodsOpen(false)}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div className="admModalBody">
              <div
                className="admShipZoneTools"
                style={{ justifyContent: "space-between" }}
              >
                <input
                  className="admShipZoneSearch"
                  value={methodQuery}
                  onChange={(e) => setMethodQuery(e.target.value)}
                  placeholder="Tìm đối tác…"
                  aria-label="Tìm đối tác vận chuyển"
                />
                <button
                  type="button"
                  className="admShipAddZoneBtn"
                  onClick={openAddMethod}
                >
                  + Thêm đối tác
                </button>
              </div>

              <div className="admTxnWrap" style={{ maxHeight: 420 }}>
                <table className="admTxnTable">
                  <thead>
                    <tr>
                      <th>Đối tác</th>
                      <th>Thời gian</th>
                      <th>Phí cơ bản</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMethods.map((m) => {
                      const eta =
                        m.estimated_days_min != null &&
                        m.estimated_days_max != null
                          ? `${m.estimated_days_min}–${m.estimated_days_max} ngày`
                          : m.estimated_days_min != null
                            ? `${m.estimated_days_min}+ ngày`
                            : "—";
                      return (
                        <tr key={m.id}>
                          <td
                            style={{
                              fontWeight: 950,
                              color: "var(--admin-text-p)",
                            }}
                          >
                            {m.name}
                            <div
                              style={{
                                color: "var(--admin-text-s)",
                                fontWeight: 850,
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              {m.description ?? "—"}
                            </div>
                          </td>
                          <td
                            style={{
                              color: "var(--admin-text-p)",
                              fontWeight: 900,
                            }}
                          >
                            {eta}
                          </td>
                          <td className="admStrong">{fmtVnd(m.base_fee)}đ</td>
                          <td>
                            <label
                              className="admSwitch"
                              title={m.is_active ? "Đang bật" : "Đang tắt"}
                            >
                              <input
                                type="checkbox"
                                checked={m.is_active}
                                onChange={() => void toggleMethodActive(m)}
                              />
                              <span />
                            </label>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                justifyContent: "center",
                              }}
                            >
                              <button
                                type="button"
                                className="admPencilBtn"
                                onClick={() => void updateMethod(m)}
                                aria-label="Sửa"
                              >
                                <IconPencil />
                              </button>
                              <button
                                type="button"
                                className="admPencilBtn admDangerBtn"
                                onClick={() => void deleteMethod(m)}
                                aria-label="Xóa"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredMethods.length && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: 14,
                            color: "var(--admin-text-s)",
                            fontWeight: 700,
                          }}
                        >
                          Chưa có đối tác vận chuyển.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {addMethodOpen && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={
            editingMethodId
              ? "Sửa đối tác vận chuyển"
              : "Thêm đối tác vận chuyển"
          }
          onClick={() => setAddMethodOpen(false)}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">
                  {editingMethodId
                    ? "Sửa đối tác vận chuyển"
                    : "Thêm đối tác vận chuyển"}
                </div>
                <div className="admModalSub">
                  Cấu hình phí cơ bản và thời gian dự kiến
                </div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => setAddMethodOpen(false)}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div className="admModalBody">
              <label className="admSetField">
                <span>Tên đối tác</span>
                <input
                  value={addMethodForm.name}
                  onChange={(e) =>
                    setAddMethodForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </label>
              <label className="admSetField">
                <span>Mô tả</span>
                <input
                  value={addMethodForm.description}
                  onChange={(e) =>
                    setAddMethodForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Giao hàng toàn quốc"
                />
              </label>
              <div className="admSet2Col">
                <label className="admSetField">
                  <span>Phí cơ bản (VND)</span>
                  <input
                    value={addMethodForm.base_fee}
                    onChange={(e) =>
                      setAddMethodForm((p) => ({
                        ...p,
                        base_fee: e.target.value,
                      }))
                    }
                    inputMode="numeric"
                  />
                </label>
                <label className="admSetField">
                  <span>Trạng thái</span>
                  <label className="admShipCheck" style={{ marginTop: 0 }}>
                    <input
                      type="checkbox"
                      checked={addMethodForm.is_active}
                      onChange={(e) =>
                        setAddMethodForm((p) => ({
                          ...p,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    Kích hoạt
                  </label>
                </label>
              </div>
              <div className="admSet2Col">
                <label className="admSetField">
                  <span>Ngày tối thiểu</span>
                  <input
                    value={addMethodForm.estimated_days_min}
                    onChange={(e) =>
                      setAddMethodForm((p) => ({
                        ...p,
                        estimated_days_min: e.target.value,
                      }))
                    }
                    inputMode="numeric"
                    placeholder="1"
                  />
                </label>
                <label className="admSetField">
                  <span>Ngày tối đa</span>
                  <input
                    value={addMethodForm.estimated_days_max}
                    onChange={(e) =>
                      setAddMethodForm((p) => ({
                        ...p,
                        estimated_days_max: e.target.value,
                      }))
                    }
                    inputMode="numeric"
                    placeholder="3"
                  />
                </label>
              </div>

              {addMethodErr && (
                <div className="admSettingsEmpty" style={{ padding: 10 }}>
                  {addMethodErr}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="admShipPolicyBtn"
                  onClick={() => {
                    setAddMethodOpen(false);
                    setEditingMethodId(null);
                  }}
                  disabled={addingMethod}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="admSettingsSaveBtn"
                  onClick={() => void submitAddMethod()}
                  disabled={addingMethod}
                >
                  {addingMethod
                    ? "Đang lưu…"
                    : editingMethodId
                      ? "Lưu thay đổi"
                      : "Thêm đối tác"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="admSetCard">
        <div className="admSetCardHead">
          <div className="admSetCardTitle">Phí vận chuyển theo khu vực</div>
          <div className="admShipZoneTools">
            <input
              className="admShipZoneSearch"
              value={zoneQuery}
              onChange={(e) => setZoneQuery(e.target.value)}
              placeholder="Tìm khu vực…"
              aria-label="Tìm khu vực vận chuyển"
            />
            <button
              type="button"
              className="admShipToolbarBtn"
              onClick={() => {
                setZonePasteErr(null);
                setZonePasteText("");
                setZonePasteOpen(true);
              }}
            >
              Dán nhiều vùng
            </button>
            <button
              type="button"
              className="admShipAddZoneBtn"
              onClick={openAddZone}
            >
              + Thêm vùng
            </button>
          </div>
        </div>
        <div className="admTxnWrap">
          <table className="admTxnTable">
            <thead>
              <tr>
                <th>Khu vực</th>
                <th>Thời gian dự kiến</th>
                <th>Đơn giá</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredZones.map((z) => (
                <tr key={z.id}>
                  <td>{z.name}</td>
                  <td>{z.eta ?? "—"}</td>
                  <td className="admStrong">{fmtVnd(z.fee)}đ</td>
                  <td>
                    <label
                      className="admSwitch"
                      title={z.is_active ? "Đang bật" : "Đang tắt"}
                    >
                      <input
                        type="checkbox"
                        checked={z.is_active}
                        onChange={() => void toggleZoneActive(z)}
                      />
                      <span />
                    </label>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        type="button"
                        className="admPencilBtn"
                        onClick={() => updateZone(z)}
                        aria-label="Sửa"
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="admPencilBtn admDangerBtn"
                        onClick={() => void deleteZone(z)}
                        aria-label="Xóa"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredZones.length && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 14,
                      color: "var(--admin-text-s)",
                      fontWeight: 700,
                    }}
                  >
                    Chưa có vùng vận chuyển.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {manageRanksOpen && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Quản lý hạng thành viên"
          onClick={() => setManageRanksOpen(false)}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">Quản lý hạng thành viên</div>
                <div className="admModalSub">
                  Cấu hình các hạng và tiêu chí tích lũy
                </div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => setManageRanksOpen(false)}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div
              className="admModalBody"
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <table className="admTxnTable">
                <thead>
                  <tr>
                    <th>Tên hạng</th>
                    <th>Tích lũy tối thiểu</th>
                    <th>Hệ số điểm</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {ranks.map((r) => (
                    <tr key={r.id}>
                      <td>{r.rank_name}</td>
                      <td>{fmtVnd(r.min_spend)}</td>
                      <td>x{r.point_multiplier}</td>
                      <td>
                        <button
                          type="button"
                          className="admTxtBtn"
                          onClick={() => {
                            setEditingRankId(r.id);
                            setAddRankForm({
                              rank_name: r.rank_name,
                              min_spend: String(r.min_spend),
                              point_multiplier: String(r.point_multiplier),
                              benefits: r.benefits || "",
                            });
                            setAddRankErr(null);
                          }}
                        >
                          Sửa
                        </button>
                        <span style={{ margin: "0 4px" }}>|</span>
                        <button
                          type="button"
                          className="admTxtBtn"
                          style={{ color: "#ef4444" }}
                          onClick={async () => {
                            if (!confirm(`Xóa hạng "${r.rank_name}"?`)) return;
                            try {
                              await apiFetch(
                                `/api/admin/membership-ranks/${r.id}`,
                                { method: "DELETE" },
                              );
                              const r2 = await apiFetch<{
                                data: Array<{
                                  id: number;
                                  rank_name: string;
                                  min_spend: number;
                                  point_multiplier: number;
                                  benefits: string | null;
                                }>;
                              }>("/api/admin/membership-ranks");
                              setRanks(r2?.data || []);
                            } catch (e) {
                              alert(
                                e instanceof Error ? e.message : "Xóa thất bại",
                              );
                            }
                          }}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {ranks.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: 14,
                          color: "var(--admin-text-s)",
                          fontWeight: 700,
                        }}
                      >
                        Chưa có hạng thành viên.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div
                style={{
                  marginTop: 16,
                  borderTop: "1px solid var(--admin-border)",
                  paddingTop: 16,
                }}
              >
                <h4 style={{ marginBottom: 12 }}>
                  {editingRankId ? "Sửa hạng" : "Thêm hạng mới"}
                </h4>
                <label className="admSetField">
                  <span>Tên hạng</span>
                  <input
                    value={addRankForm.rank_name}
                    onChange={(e) =>
                      setAddRankForm((p) => ({
                        ...p,
                        rank_name: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Kim Cương (Diamond)"
                  />
                </label>
                <label className="admSetField">
                  <span>Tích lũy tối thiểu (VND)</span>
                  <input
                    type="number"
                    value={addRankForm.min_spend}
                    onChange={(e) =>
                      setAddRankForm((p) => ({
                        ...p,
                        min_spend: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="admSetField">
                  <span>Hệ số điểm</span>
                  <input
                    type="number"
                    step="0.1"
                    value={addRankForm.point_multiplier}
                    onChange={(e) =>
                      setAddRankForm((p) => ({
                        ...p,
                        point_multiplier: e.target.value,
                      }))
                    }
                    min="1"
                  />
                </label>
                <label className="admSetField">
                  <span>Quyền lợi</span>
                  <textarea
                    value={addRankForm.benefits}
                    onChange={(e) =>
                      setAddRankForm((p) => ({
                        ...p,
                        benefits: e.target.value,
                      }))
                    }
                    placeholder="Mô tả quyền lợi..."
                    rows={3}
                    style={{ width: "100%", padding: 8 }}
                  />
                </label>
                {addRankErr && (
                  <div
                    style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}
                  >
                    {addRankErr}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="admShipPolicyBtn"
                    onClick={async () => {
                      if (!addRankForm.rank_name || !addRankForm.min_spend) {
                        setAddRankErr(
                          "Vui lòng nhập tên và tích lũy tối thiểu",
                        );
                        return;
                      }
                      setAddingRank(true);
                      setAddRankErr(null);
                      try {
                        if (editingRankId) {
                          await apiFetch(
                            `/api/admin/membership-ranks/${editingRankId}`,
                            {
                              method: "PATCH",
                              body: JSON.stringify({
                                rank_name: addRankForm.rank_name,
                                min_spend: parseInt(addRankForm.min_spend),
                                point_multiplier:
                                  parseFloat(addRankForm.point_multiplier) || 1,
                                benefits: addRankForm.benefits || null,
                              }),
                            },
                          );
                        } else {
                          await apiFetch("/api/admin/membership-ranks", {
                            method: "POST",
                            body: JSON.stringify({
                              rank_name: addRankForm.rank_name,
                              min_spend: parseInt(addRankForm.min_spend),
                              point_multiplier:
                                parseFloat(addRankForm.point_multiplier) || 1,
                              benefits: addRankForm.benefits || null,
                            }),
                          });
                        }
                        const r = await apiFetch<{
                          data: Array<{
                            id: number;
                            rank_name: string;
                            min_spend: number;
                            point_multiplier: number;
                            benefits: string | null;
                          }>;
                        }>("/api/admin/membership-ranks");
                        setRanks(r?.data || []);
                        setAddRankForm({
                          rank_name: "",
                          min_spend: "0",
                          point_multiplier: "1",
                          benefits: "",
                        });
                        setEditingRankId(null);
                      } catch (e) {
                        setAddRankErr(e instanceof Error ? e.message : "Lỗi");
                      } finally {
                        setAddingRank(false);
                      }
                    }}
                    disabled={addingRank}
                  >
                    {editingRankId ? "Lưu" : "Thêm"}
                  </button>
                  {editingRankId && (
                    <button
                      type="button"
                      className="admShipPolicyBtn"
                      style={{ background: "#6b7280" }}
                      onClick={() => {
                        setEditingRankId(null);
                        setAddRankForm({
                          rank_name: "",
                          min_spend: "0",
                          point_multiplier: "1",
                          benefits: "",
                        });
                      }}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {zonePasteOpen && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Dán nhiều vùng vận chuyển"
          onClick={() => setZonePasteOpen(false)}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">Dán nhiều vùng vận chuyển</div>
                <div className="admModalSub">Dán mỗi dòng: Tên|Thời gian dự kiến|Đơn giá (VND)</div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => setZonePasteOpen(false)}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div className="admModalBody">
              <label className="admSetField">
                <span>Dán nhiều vùng</span>
                <textarea
                  value={zonePasteText}
                  onChange={(e) => setZonePasteText(e.target.value)}
                  placeholder={`Ví dụ:\nNội thành TP.HCM|1-3 ngày|50000\nNgoại thành|2-5 ngày|70000`}
                  rows={8}
                />
              </label>

              {zonePasteErr && (
                <div className="admSettingsEmpty" style={{ padding: 10 }}>
                  {zonePasteErr}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" className="admShipPolicyBtn" onClick={() => setZonePasteOpen(false)} disabled={addingZones}>
                  Huỷ
                </button>
                <button type="button" className="admSettingsSaveBtn" onClick={() => void handleSubmitZonePaste()} disabled={addingZones}>
                  {addingZones ? "Đang thêm…" : "Thêm vùng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addZoneOpen && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Thêm vùng vận chuyển"
          onClick={() => setAddZoneOpen(false)}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">Thêm vùng vận chuyển</div>
                <div className="admModalSub">Tạo khu vực và phí áp dụng</div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => setAddZoneOpen(false)}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div className="admModalBody">
              <label className="admSetField">
                <span>Tên khu vực</span>
                <input
                  value={addZoneForm.name}
                  onChange={(e) =>
                    setAddZoneForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ví dụ: Nội thành TP.HCM"
                />
              </label>
              <div className="admSet2Col">
                <label className="admSetField">
                  <span>Thời gian dự kiến</span>
                  <input
                    value={addZoneForm.eta}
                    onChange={(e) =>
                      setAddZoneForm((p) => ({ ...p, eta: e.target.value }))
                    }
                    placeholder="Ví dụ: 1-3 ngày"
                  />
                </label>
                <label className="admSetField">
                  <span>Đơn giá (VND)</span>
                  <input
                    value={addZoneForm.fee}
                    onChange={(e) =>
                      setAddZoneForm((p) => ({ ...p, fee: e.target.value }))
                    }
                    inputMode="numeric"
                    placeholder="50000"
                  />
                </label>
              </div>
              <label className="admShipCheck" style={{ marginTop: 0 }}>
                <input
                  type="checkbox"
                  checked={addZoneForm.is_active}
                  onChange={(e) =>
                    setAddZoneForm((p) => ({
                      ...p,
                      is_active: e.target.checked,
                    }))
                  }
                />
                Kích hoạt ngay
              </label>

              {addZoneErr && (
                <div className="admSettingsEmpty" style={{ padding: 10 }}>
                  {addZoneErr}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="admShipPolicyBtn"
                  onClick={() => setAddZoneOpen(false)}
                  disabled={addingZone}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="admSettingsSaveBtn"
                  onClick={() => void submitAddZone()}
                  disabled={addingZone}
                >
                  {addingZone ? "Đang thêm…" : "Thêm vùng"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4) Live Chat */}
      <div className="admSetSectionHead">
        <h3>Hệ thống Chat trực tuyến</h3>
        <div className="admSetSectionSub">
          Tích hợp các widget chat miễn phí (Facebook, Zalo, Tawk.to).
        </div>
      </div>

      <section className="admSetCard">
        <div className="admSetCardHead">
          <div className="admSetCardTitle">
            <span className="admSetIcon" aria-hidden>
              <IconPhone />
            </span>{" "}
            Cấu hình Live Chat
          </div>
        </div>
        <div className="admSetForm">
          <label className="admSetField">
            <span>Dịch vụ chat</span>
            <select
              value={chat.service}
              onChange={(e) =>
                setChat((p) => ({ ...p, service: e.target.value as any }))
              }
            >
              <option value="none">Không sử dụng</option>
              <option value="facebook">Facebook Messenger Chat Plugin</option>
              <option value="zalo">Zalo OA Chat Widget</option>
              <option value="tawkto">Tawk.to Live Chat</option>
            </select>
          </label>

          {chat.service === "facebook" && (
            <div className="admSet2Col">
              <label className="admSetField">
                <span>Facebook Page ID</span>
                <input
                  value={chat.facebook_page_id || ""}
                  onChange={(e) =>
                    setChat((p) => ({ ...p, facebook_page_id: e.target.value }))
                  }
                  placeholder="Ví dụ: 123456789012345"
                />
              </label>
              <div
                className="admSetField"
                style={{
                  justifyContent: "center",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--admin-text-s)" }}>
                  Lưu ý: Bạn cần thêm domain của website vào Whitelisted Domains
                  trong cài đặt Fanpage.
                </span>
              </div>
            </div>
          )}

          {chat.service === "zalo" && (
            <div className="admSet2Col">
              <label className="admSetField">
                <span>Zalo OA ID</span>
                <input
                  value={chat.zalo_oa_id || ""}
                  onChange={(e) =>
                    setChat((p) => ({ ...p, zalo_oa_id: e.target.value }))
                  }
                  placeholder="Ví dụ: 383215286595568541"
                />
              </label>
            </div>
          )}

          {chat.service === "tawkto" && (
            <div className="admSet2Col">
              <label className="admSetField">
                <span>Property ID</span>
                <input
                  value={chat.tawkto_property_id || ""}
                  onChange={(e) =>
                    setChat((p) => ({
                      ...p,
                      tawkto_property_id: e.target.value,
                    }))
                  }
                  placeholder="60f1..."
                />
              </label>
              <label className="admSetField">
                <span>Widget ID</span>
                <input
                  value={chat.tawkto_widget_id || ""}
                  onChange={(e) =>
                    setChat((p) => ({ ...p, tawkto_widget_id: e.target.value }))
                  }
                  placeholder="1f..."
                />
              </label>
            </div>
          )}
        </div>
      </section>

      {/* 5) Security */}
      <div className="admSetSectionHead">
        <h3>Cài đặt bảo mật</h3>
        <div className="admSetSectionSub">
          Thiết lập xác thực 2 lớp, quản lý phiên và nhật ký truy cập.
        </div>
      </div>

      <div className="admSecGrid">
        <section className="admSecCard">
          <div className="admSecTitle">
            <span className="admSetIcon" aria-hidden>
              <IconKey />
            </span>{" "}
            Xác thực 2 lớp (2FA)
          </div>
          <div className="admSecSub">
            Bảo vệ tài khoản admin bằng yêu cầu xác minh khi đăng nhập.
          </div>
          <div className="admSecRow">
            <div className="admSecOption">
              <span className="admSecOptionIcon" aria-hidden>
                <IconPhone />
              </span>
              <div className="admSecOptionText">
                <div className="admSecOptionName">Google Authenticator</div>
              </div>
            </div>
            <label className="admSwitch">
              <input
                type="checkbox"
                checked={twoFa}
                onChange={(e) => {
                  if (e.target.checked) openTwoFaSetup();
                  else openTwoFaDisable();
                }}
                disabled={twoFaLoading}
              />
              <span />
            </label>
          </div>
        </section>

        <section className="admSecCard strong">
          <div className="admSecShield" aria-hidden>
            <IconShield />
          </div>
          <div className="admSecStrongLabel">Trạng thái</div>
          <div className="admSecStrongValue">
            {data.security.strength_label}
          </div>
        </section>
      </div>

      {userAvatarUrl && (
        <img
          className="admHiddenPreload"
          src={resolveAvatar(userAvatarUrl) || undefined}
          alt=""
          aria-hidden
        />
      )}

      {twoFaSetupOpen && twoFaSetupData && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setTwoFaSetupOpen(false);
          }}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">Bật xác thực 2 bước (2FA)</div>
                <div className="admModalSub">
                  Sử dụng Google Authenticator để quét mã QR
                </div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => {
                  setTwoFaSetupOpen(false);
                }}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div
              className="admModalBody"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <img
                src={twoFaSetupData.qr_code_url}
                alt="QR Code"
                style={{
                  width: 200,
                  height: 200,
                  background: "#fff",
                  padding: 8,
                  borderRadius: 8,
                }}
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--admin-text-s)" }}>
                  Hoặc nhập mã bí mật này vào ứng dụng:
                </div>
                <code
                  style={{
                    background: "var(--admin-bg)",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontWeight: 700,
                    marginTop: 4,
                    display: "inline-block",
                  }}
                >
                  {twoFaSetupData.secret}
                </code>
              </div>
              <div style={{ width: "100%", marginTop: 8 }}>
                <label className="admSetField">
                  <span>Nhập mã OTP (6 số) để xác nhận</span>
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFaOtp}
                    onChange={(e) =>
                      setTwoFaOtp(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="123456"
                    style={{
                      textAlign: "center",
                      letterSpacing: 4,
                      fontWeight: "bold",
                    }}
                  />
                </label>
              </div>
              {twoFaError && (
                <div style={{ color: "#ef4444", fontSize: 13 }}>
                  {twoFaError}
                </div>
              )}
              <button
                type="button"
                className="admSettingsSaveBtn"
                style={{ width: "100%" }}
                onClick={verifyTwoFa}
                disabled={twoFaLoading || twoFaOtp.length !== 6}
              >
                {twoFaLoading ? "Đang xác nhận..." : "Xác nhận bật 2FA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {twoFaDisableOpen && (
        <div
          className="admModalOverlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setTwoFaDisableOpen(false);
          }}
        >
          <div className="admModal" onClick={(e) => e.stopPropagation()}>
            <div className="admModalHead">
              <div>
                <div className="admModalTitle">Tắt xác thực 2 bước</div>
                <div className="admModalSub">
                  Vui lòng xác nhận mật khẩu để tiếp tục
                </div>
              </div>
              <button
                type="button"
                className="admModalClose"
                onClick={() => {
                  setTwoFaDisableOpen(false);
                }}
                aria-label="Đóng"
              >
                <IconX />
              </button>
            </div>
            <div className="admModalBody">
              <label className="admSetField">
                <span>Mật khẩu của bạn</span>
                <input
                  type="password"
                  value={twoFaPassword}
                  onChange={(e) => setTwoFaPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                />
              </label>
              {twoFaError && (
                <div
                  style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}
                >
                  {twoFaError}
                </div>
              )}
              <div
                style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  className="admShipPolicyBtn"
                  onClick={() => {
                    setTwoFaDisableOpen(false);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="admSettingsSaveBtn"
                  style={{ background: "#ef4444" }}
                  onClick={disableTwoFa}
                  disabled={twoFaLoading || !twoFaPassword}
                >
                  {twoFaLoading ? "Đang tắt..." : "Tắt 2FA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconStore({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M3 10.5 5 4h14l2 6.5M4 10.5h16M6 10.5V20h12v-9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M10 20v-6h4v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconGlobe({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M2 12h20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 2c3 3 3 17 0 20-3-3-3-17 0-20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconUser({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}
function IconKey({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M21 7a5 5 0 1 1-9.7 1.7L3 17v4h4l2-2h2l2-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M18 7h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconPhone({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.4 19.4 0 0 1-5.97-5.97A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.6 2.62a2 2 0 0 1-.45 2.11L8.1 9.6a16 16 0 0 0 6.3 6.3l1.15-1.13a2 2 0 0 1 2.11-.45c.84.28 1.72.48 2.62.6A2 2 0 0 1 22 16.9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconShield({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 2 20 6v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconClipboard({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M9 4h6v3H9V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7 7H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconPlus({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconPencil({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconTrash({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10 11v7M14 11v7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 14h10l1-14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconX({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconFuel({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M6 3h8v18H6V3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6 7h8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14 6h3l2 2v9a2 2 0 0 1-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M18 11v-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconClock({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 7v6l4 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconStar({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 2.25L7 14.14 2 9.27l6.91-1.01L12 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
