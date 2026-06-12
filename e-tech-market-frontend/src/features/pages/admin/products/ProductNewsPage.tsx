import { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/configs/api.config";
import ConfirmModal from "@/components/ConfirmModal";
import "@/styles/admin/ProductNewsPage.css";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

type ProductLite = {
  id: number;
  name: string;
  brand: string | null;
  main_image_url: string | null;
  category?: { id: number; name: string };
};

type NewsItem = {
  id: number;
  product_id: number;
  title: string;
  slug: string;
  content_html: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const resolveImageUrl = (url: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

export default function ProductNewsPage() {
  const token = localStorage.getItem("token");

  const [products, setProducts] = useState<ProductLite[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteNews, setPendingDeleteNews] = useState<NewsItem | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    thumbnail_url: "",
    content_html: "",
    sort_order: 0,
    is_active: true,
  });

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setError(null);
    try {
      const res = await apiFetch<any>("/api/admin/products?per_page=100", {
        token,
      });
      const arr = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      setProducts(arr);
      if (!selectedProductId && arr.length > 0) setSelectedProductId(arr[0].id);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Không tải được danh sách sản phẩm.",
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchNews = async (productId: number) => {
    setLoadingNews(true);
    setError(null);
    try {
      const data = await apiFetch<NewsItem[]>(
        `/api/admin/products/${productId}/news`,
        { token },
      );
      setNews(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không tải được tin tức.");
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchProducts();
    });
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      queueMicrotask(() => {
        fetchNews(selectedProductId);
      });
    }
  }, [selectedProductId]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      thumbnail_url: "",
      content_html: "",
      sort_order: 0,
      is_active: true,
    });
    setIsEditorOpen(true);
  };

  const openEdit = (item: NewsItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      thumbnail_url: item.thumbnail_url || "",
      content_html: item.content_html || "",
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
    });
    setIsEditorOpen(true);
  };

  const save = async () => {
    if (!selectedProductId) return;
    if (thumbnailUploading) {
      alert("Ảnh thumbnail đang upload, vui lòng đợi xong rồi bấm Lưu.");
      return;
    }
    if (!form.title.trim() || !form.content_html.trim()) {
      alert("Vui lòng nhập tiêu đề và nội dung HTML.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      thumbnail_url: form.thumbnail_url.trim() || null,
      content_html: form.content_html,
      sort_order: form.sort_order || 0,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        await apiFetch(
          `/api/admin/products/${selectedProductId}/news/${editing.id}`,
          {
            method: "PUT",
            token,
            body: JSON.stringify(payload),
          },
        );
      } else {
        await apiFetch(`/api/admin/products/${selectedProductId}/news`, {
          method: "POST",
          token,
          body: JSON.stringify({
            ...payload,
            published_at: new Date().toISOString(),
          }),
        });
      }
      setIsEditorOpen(false);
      setEditing(null);
      fetchNews(selectedProductId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Lưu tin tức thất bại.");
    }
  };

  const uploadThumbnail = async (file: File) => {
    if (!token) throw new Error("Bạn chưa đăng nhập.");
    setThumbnailUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiFetch<{ url?: string; message?: string }>(
        `/api/admin/uploads/product-news-thumbnail`,
        {
          method: "POST",
          token,
          body: fd,
        },
      );
      if (!data.url) throw new Error("Không nhận được URL ảnh.");
      setForm((prev) => ({ ...prev, thumbnail_url: data.url || "" }));
    } finally {
      setThumbnailUploading(false);
    }
  };

  const remove = (item: NewsItem) => {
    setPendingDeleteNews(item);
    setConfirmOpen(true);
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteNews(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProductId || !pendingDeleteNews) return;
    setConfirmOpen(false);
    try {
      await apiFetch(
        `/api/admin/products/${selectedProductId}/news/${pendingDeleteNews.id}`,
        {
          method: "DELETE",
          token,
        },
      );
      setPendingDeleteNews(null);
      fetchNews(selectedProductId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="pnRoot">
      {error && <div className="pnError">{error}</div>}

      <div className="pnGrid">
        <div className="pnLeft">
          <div className="pnLeftHead">
            <div className="pnLeftTitle">Sản phẩm</div>
            {loadingProducts && (
              <div
                className="admSkeletonBar"
                style={{ width: "60px", height: "14px" }}
              />
            )}
          </div>
          <div className="pnProductList">
            {products.map((p) => {
              const active = p.id === selectedProductId;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`pnProdItem ${active ? "active" : ""}`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <div className="pnProdThumb">
                    {p.main_image_url ? (
                      <img src={resolveImageUrl(p.main_image_url)} alt="" />
                    ) : (
                      <div className="pnProdThumbPh" />
                    )}
                  </div>
                  <div className="pnProdInfo">
                    <div className="pnProdName">{p.name}</div>
                    <div className="pnProdMeta">
                      {p.brand || "—"} • {p.category?.name || "—"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pnRight">
          <div className="pnRightHead">
            <div>
              <div className="pnRightTitleMain">Tin tức sản phẩm</div>
              <div className="pnRightSub pnRightSubAccent">
                {selectedProduct
                  ? selectedProduct.name
                  : "Chọn sản phẩm để quản lý tin."}
              </div>
            </div>

            <button
              type="button"
              className="pnAddBtn"
              onClick={openCreate}
              disabled={!selectedProductId}
            >
              <span className="pnAddIcon" aria-hidden="true">
                +
              </span>
              <span className="pnAddLabel">Thêm tin</span>
            </button>
          </div>

          <div className="pnNewsWrap">
            {loadingNews ? (
              <div className="pnNewsList">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="pnNewsCard"
                    style={{ minHeight: 120 }}
                  >
                    <div
                      className="admSkeletonBar"
                      style={{ width: "60%", height: 20, marginBottom: 12 }}
                    />
                    <div
                      className="admSkeletonBar"
                      style={{ width: "100%", height: 60 }}
                    />
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="pnEmpty">Chưa có tin tức cho sản phẩm này.</div>
            ) : (
              <div className="pnNewsList">
                {news.map((n) => (
                  <div key={n.id} className="pnNewsCard">
                    <div className="pnNewsTop">
                      <div className="pnNewsTitle">{n.title}</div>
                      <div className="pnNewsActions">
                        <button
                          type="button"
                          className="pnBtn"
                          onClick={() => openEdit(n)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="pnBtn danger"
                          onClick={() => remove(n)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    <div className="pnNewsMeta">
                      <span className={`pnPill ${n.is_active ? "on" : "off"}`}>
                        {n.is_active ? "BẬT" : "TẮT"}
                      </span>
                      {n.published_at && (
                        <span className="pnMetaText">
                          Đăng:{" "}
                          {new Date(n.published_at).toLocaleString("vi-VN")}
                        </span>
                      )}
                      <span className="pnMetaText">Thứ tự: {n.sort_order}</span>
                    </div>
                    <div className="pnHtmlHint">
                      Nội dung HTML đã lưu (xem trước đơn giản):
                    </div>
                    <div
                      className="pnHtmlPreview"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(n.content_html),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditorOpen && (
        <div className="pnModalOverlay" onClick={() => setIsEditorOpen(false)}>
          <div className="pnModal" onClick={(e) => e.stopPropagation()}>
            <div className="pnModalHead">
              <div className="pnModalTitle">
                {editing ? "Sửa tin" : "Thêm tin mới"}
              </div>
              <button
                type="button"
                className="pnModalClose"
                onClick={() => setIsEditorOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="pnModalBody">
              <div className="pnField">
                <label>Tiêu đề</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="pnField">
                <label>Ảnh thumbnail (tải lên)</label>
                <div className="pnUploadRow">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        try {
                          await uploadThumbnail(f);
                        } catch (err: unknown) {
                          alert(
                            err instanceof Error
                              ? err.message
                              : "Upload thất bại",
                          );
                        }
                      }
                    }}
                  />
                  {thumbnailUploading && (
                    <span className="pnTiny">Đang upload...</span>
                  )}
                </div>
                {form.thumbnail_url && (
                  <div className="pnThumbPreview">
                    <img src={resolveImageUrl(form.thumbnail_url)} alt="" />
                    <button
                      type="button"
                      className="pnBtn danger"
                      onClick={() => setForm({ ...form, thumbnail_url: "" })}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                )}
              </div>
              <div className="pnRow">
                <div className="pnField">
                  <label>Thứ tự sắp xếp</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sort_order: parseInt(e.target.value || "0", 10),
                      })
                    }
                  />
                </div>
              </div>
              <div className="pnCheck">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <span>Đang bật</span>
              </div>
              <div className="pnField">
                <label>Nội dung HTML (dán từ website)</label>
                <textarea
                  rows={10}
                  value={form.content_html}
                  onChange={(e) =>
                    setForm({ ...form, content_html: e.target.value })
                  }
                />
                <div className="pnTiny">
                  Hệ thống sẽ tự lọc thẻ nguy hiểm (script, onclick...).
                </div>
              </div>
            </div>

            <div className="pnModalFoot">
              <button
                type="button"
                className="pnBtn"
                onClick={() => setIsEditorOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="pnAddBtn"
                onClick={save}
                disabled={thumbnailUploading}
              >
                {thumbnailUploading ? "Đang upload ảnh..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận xóa tin tức"
        message={
          pendingDeleteNews ? (
            <div style={{ display: "grid", gap: 12 }}>
              <p>Bạn có chắc chắn muốn xóa tin tức này không?</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {pendingDeleteNews.thumbnail_url ? (
                  <img
                    src={resolveImageUrl(pendingDeleteNews.thumbnail_url)}
                    alt={pendingDeleteNews.title}
                    style={{
                      width: 72,
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 8,
                      background: "#f3f4f6",
                      display: "grid",
                      placeItems: "center",
                      color: "#6b7280",
                      fontSize: 12,
                      textAlign: "center",
                      padding: 8,
                    }}
                  >
                    No image
                  </div>
                )}
                <div>
                  <strong>{pendingDeleteNews.title}</strong>
                  <div style={{ color: "#6b7280", marginTop: 4 }}>
                    {pendingDeleteNews.slug}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            "Bạn có chắc chắn muốn xóa tin tức này?"
          )
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
