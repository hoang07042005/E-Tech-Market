import { useCallback, useMemo, useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import {
  fetchAdminDeletedProductVariants,
  hardDeleteAdminDeletedProductVariants,
} from "@/features/services/admin/products.admin.service";
import type { AdminDeletedProductVariant } from "@/features/services/admin/products.admin.service";
import "@/styles/admin/ProductPage.css";

export default function DeletedProductVariantsPage({
  onBack,
}: {
  onBack: () => void;
}) {
  const [items, setItems] = useState<AdminDeletedProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [pending, setPending] = useState(false);

  const PAGE_SIZE = 100;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedProductVariants(PAGE_SIZE);
      setItems(data);
      setSelectedIds([]);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        setError((err as { message?: unknown }).message as string);
      } else {
        setError("Không tải được dữ liệu đã xóa.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(t);
  }, [fetchData]);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selectedSet.has(id)),
    [allIds, selectedSet],
  );

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(allIds);
  };

  const openConfirm = () => {
    if (selectedIds.length === 0) {
      alert("Chưa chọn dữ liệu nào để xóa hẳn.");
      return;
    }
    setPendingDeleteIds(selectedIds);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setPending(true);
    try {
      await hardDeleteAdminDeletedProductVariants(pendingDeleteIds);
      setPendingDeleteIds([]);
      await fetchData();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        alert((err as { message?: unknown }).message as string);
      } else {
        alert("Xóa hẳn thất bại.");
      }
    } finally {
      setPending(false);
    }
  };

  const imageUrl = (url: string | null) => {
    if (!url) return "";
    const s = url.trim();
    if (!s) return "";
    return s;
  };

  return (
    <div className="prodAdminRoot">
      <div className="prodHeader">
        <div>
          <h2 className="prodTitle">Dữ liệu đã xóa (Hard delete)</h2>
          <p className="prodSub">
            Chỉ xóa hẳn các phiên bản đã soft-delete để giải phóng dữ liệu.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" className="prodAddBtn" onClick={onBack}>
            ← Quay lại
          </button>
          <button
            type="button"
            className="prodAddBtn"
            onClick={openConfirm}
            disabled={pending || selectedIds.length === 0}
            style={{ background: "#ef4444" }}
            title="Xóa hẳn dữ liệu đã chọn (không thể hoàn tác)"
          >
            {pending ? "Đang xóa..." : `Xóa hẳn (${selectedIds.length})`}
          </button>
        </div>
      </div>

      {error && <div className="prodErrorBanner">{error}</div>}

      <div className="prodTableWrap">
        <div
          style={{
            marginBottom: 20,
            marginTop: 20,
            marginLeft: 25,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            Chọn tất cả
          </label>

          <div style={{ color: "#64748b", fontSize: 13 }}>
            Đã chọn: <b>{selectedIds.length}</b> / {items.length}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 24, color: "#94a3b8" }}>Đang tải...</div>
        ) : (
          <table className="prodTable">
            <thead>
              <tr>
                <th style={{ width: 56 }}>CHỌN</th>
                <th>VARIANT</th>
                <th>SẢN PHẨM</th>
                <th>KHO</th>
                <th>THUMB</th>
                <th>XÓA LÚC</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#94a3b8",
                    }}
                  >
                    Không có phiên bản nào đang ở trạng thái đã xóa.
                  </td>
                </tr>
              ) : (
                items.map((v) => {
                  const checked = selectedSet.has(v.id);
                  return (
                    <tr key={v.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(v.id)}
                        />
                      </td>

                      {/* VARIANT */}
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span style={{ fontWeight: 600 }}>
                            {v.variant_name || "(không có tên)"}
                          </span>
                          <span style={{ color: "#64748b", fontSize: 12 }}>
                            ID: {v.id}
                          </span>
                        </div>
                      </td>

                      {/* PRODUCT */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{v.product_id}</span>
                      </td>

                      {/* QUESTION + TECH SPECS */}
                      <td colSpan={2}>
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                fontWeight: 600,
                              }}
                            >
                              Hỏi đáp / Câu hỏi đã xóa
                            </div>
                            <div style={{ color: "#0f172a", fontSize: 13 }}>
                              — (Chưa có dữ liệu trong response hiện tại)
                            </div>
                          </div>

                          <div style={{ display: "grid", gap: 6 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                fontWeight: 600,
                              }}
                            >
                              Thông số kỹ thuật đã xóa
                            </div>
                            <div style={{ color: "#0f172a", fontSize: 13 }}>
                              — (Chưa có dữ liệu trong response hiện tại)
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* STOCK */}
                      <td>
                        <span>{v.stock_quantity ?? 0}</span>
                      </td>

                      {/* THUMB */}
                      <td>
                        {v.image_url ? (
                          <img
                            src={imageUrl(v.image_url)}
                            alt=""
                            style={{
                              width: 44,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: 6,
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>

                      {/* DELETED AT */}
                      <td>
                        <span style={{ color: "#0f172a" }}>
                          {v.deleted_at ? v.deleted_at : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Xóa hẳn dữ liệu đã xóa"
        message={
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0 }}>
              Hành động này sẽ hard delete vĩnh viễn các phiên bản đã
              soft-delete bạn đã chọn.
            </p>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Số lượng: <b>{pendingDeleteIds.length}</b>
            </p>
            <p style={{ margin: 0, color: "#ef4444" }}>Không thể hoàn tác.</p>
          </div>
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
