import { useCallback, useState, useEffect, useMemo } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import {
  fetchAdminDeletedProductVariants,
  hardDeleteAdminDeletedProductVariants,
  fetchAdminDeletedProducts,
  hardDeleteAdminDeletedProducts,
  fetchAdminDeletedProductNews,
  hardDeleteAdminDeletedProductNews,
  fetchAdminDeletedProductFaqs,
  hardDeleteAdminDeletedProductFaqs,
} from "@/features/services/admin/products.admin.service";
import type {
  AdminDeletedProductVariant,
  AdminDeletedProduct,
  AdminDeletedProductNews,
  AdminDeletedProductFaq,
} from "@/features/services/admin/products.admin.service";
import {
  fetchAdminDeletedBlogPosts,
  hardDeleteAdminDeletedBlogPosts,
  fetchAdminDeletedBlogComments,
  hardDeleteAdminDeletedBlogComments,
  fetchAdminDeletedUsers,
  hardDeleteAdminDeletedUsers,
  fetchAdminDeletedCategories,
  hardDeleteAdminDeletedCategories,
  fetchAdminDeletedReviews,
  hardDeleteAdminDeletedReviews,
} from "@/features/services/admin/blog.admin.service";
import type {
  AdminDeletedBlogPost,
  AdminDeletedBlogComment,
  AdminDeletedUser,
  AdminDeletedCategory,
  AdminDeletedReview,
} from "@/features/services/admin/blog.admin.service";
import "@/styles/admin/ProductPage.css";
import "@/styles/admin/HardDeletePage.css";

type DeletedTab = "product_variants" | "products" | "product_news" | "product_faqs" | "blog_posts" | "blog_comments" | "users" | "categories" | "reviews";

const PAGE_SIZE = 100;

// ── Generic selection helpers ────────────────────────────────────────────────
function useSelection(allIds: number[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selectedSet.has(id)),
    [allIds, selectedSet],
  );

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(allIds);
  };
  const reset = () => setSelectedIds([]);

  return { selectedIds, selectedSet, allSelected, toggleOne, toggleAll, reset };
}

// ── Shared header row ────────────────────────────────────────────────────────
function SelectHeader({
  allSelected,
  onToggle,
  selectedCount,
  totalCount,
}: {
  allSelected: boolean;
  onToggle: () => void;
  selectedCount: number;
  totalCount: number;
}) {
  return (
    <div className="hdp-select-header">
      <label>
        <input type="checkbox" checked={allSelected} onChange={onToggle} />
        Chọn tất cả
      </label>
      <div className="hdp-select-count">
        Đã chọn: <b>{selectedCount}</b> / {totalCount}
      </div>
    </div>
  );
}

// ── Thumb helper ─────────────────────────────────────────────────────────────
function Thumb({ url }: { url: string | null }) {
  if (!url) return <span className="hdp-thumb-empty">—</span>;
  return <img src={url.trim()} alt="" className="hdp-thumb" />;
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`hdp-badge ${active ? "hdp-badge--active" : "hdp-badge--inactive"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Product variants
// ────────────────────────────────────────────────────────────────────────────
function VariantsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedProductVariant[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>VARIANT</th>
              <th>SẢN PHẨM (ID)</th>
              <th>KHO</th>
              <th>THUMB</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="hdp-empty-cell">
                  Không có phiên bản nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((v) => (
                <tr key={v.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(v.id)} onChange={() => sel.toggleOne(v.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{v.variant_name || "(không có tên)"}</span>
                      <span className="hdp-cell-sub">ID: {v.id}</span>
                    </div>
                  </td>
                  <td>
                    <span className="hdp-cell-name">{v.product_id}</span>
                  </td>
                  <td>{v.stock_quantity ?? 0}</td>
                  <td><Thumb url={v.image_url} /></td>
                  <td>
                    <span className="hdp-cell-dark">{v.deleted_at ?? "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Products
// ────────────────────────────────────────────────────────────────────────────
function ProductsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedProduct[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>SẢN PHẨM</th>
              <th>DANH MỤC</th>
              <th>THƯƠNG HIỆU</th>
              <th>THUMB</th>
              <th>TRẠNG THÁI</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="hdp-empty-cell">
                  Không có sản phẩm nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(p.id)} onChange={() => sel.toggleOne(p.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{p.name}</span>
                      <span className="hdp-cell-sub">ID: {p.id} · {p.slug}</span>
                    </div>
                  </td>
                  <td>{p.category?.name ?? <span className="hdp-cell-muted">—</span>}</td>
                  <td>{p.brand ?? <span className="hdp-cell-muted">—</span>}</td>
                  <td><Thumb url={p.main_image_url} /></td>
                  <td><StatusBadge active={p.is_active} /></td>
                  <td>
                    <span className="hdp-cell-dark">{p.deleted_at ?? "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Product news
// ────────────────────────────────────────────────────────────────────────────
function ProductNewsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedProductNews[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>TIÊU ĐỀ</th>
              <th>SẢN PHẨM</th>
              <th>THUMB</th>
              <th>HOẠT ĐỘNG</th>
              <th>NGÀY ĐĂNG</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="hdp-empty-cell">
                  Không có product news nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((n) => (
                <tr key={n.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(n.id)} onChange={() => sel.toggleOne(n.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{n.title}</span>
                      <span className="hdp-cell-sub">ID: {n.id} · {n.slug}</span>
                    </div>
                  </td>
                  <td>
                    {n.product ? (
                      <div className="hdp-cell-grid-sm">
                        <span className="hdp-cell-name">{n.product.name}</span>
                        <span className="hdp-cell-sub">ID: {n.product_id}</span>
                      </div>
                    ) : (
                      <span className="hdp-cell-muted">ID: {n.product_id}</span>
                    )}
                  </td>
                  <td><Thumb url={n.thumbnail_url} /></td>
                  <td><StatusBadge active={n.is_active} /></td>
                  <td>
                    <span className="hdp-cell-dark-sm">
                      {n.published_at ? new Date(n.published_at).toLocaleDateString("vi-VN") : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="hdp-cell-dark-sm">{n.deleted_at ?? "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Product FAQs
// ────────────────────────────────────────────────────────────────────────────
function ProductFaqsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedProductFaq[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>CÂU HỎI</th>
              <th>SẢN PHẨM</th>
              <th>TRẢ LỜI</th>
              <th>HOẠT ĐỘNG</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="hdp-empty-cell">
                  Không có product FAQ nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr key={f.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(f.id)} onChange={() => sel.toggleOne(f.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{f.question}</span>
                      <span className="hdp-cell-sub">ID: {f.id}</span>
                    </div>
                  </td>
                  <td>
                    {f.product ? (
                      <div className="hdp-cell-grid-sm">
                        <span className="hdp-cell-name">{f.product.name}</span>
                        <span className="hdp-cell-sub">ID: {f.product_id}</span>
                      </div>
                    ) : (
                      <span className="hdp-cell-muted">ID: {f.product_id}</span>
                    )}
                  </td>
                  <td>
                    <span className="hdp-answer-cell" title={f.answer ?? ""}>
                      {f.answer ?? <span className="hdp-cell-muted">—</span>}
                    </span>
                  </td>
                  <td><StatusBadge active={f.is_active} /></td>
                  <td>
                    <span className="hdp-cell-dark-sm">{f.deleted_at ?? "—"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Blog Posts
// ────────────────────────────────────────────────────────────────────────────
function BlogPostsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedBlogPost[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>TIÊU ĐỀ</th>
              <th>DANH MỤC</th>
              <th>TÁC GIẢ</th>
              <th>THUMB</th>
              <th>TRẠNG THÁI</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="hdp-empty-cell">
                  Không có blog post nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(p.id)} onChange={() => sel.toggleOne(p.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{p.title}</span>
                      <span className="hdp-cell-sub">ID: {p.id} · {p.slug}</span>
                    </div>
                  </td>
                  <td>{p.category?.name ?? <span className="hdp-cell-muted">—</span>}</td>
                  <td>{p.author?.name ?? <span className="hdp-cell-muted">—</span>}</td>
                  <td><Thumb url={p.thumbnail_url} /></td>
                  <td><StatusBadge active={p.is_published} /></td>
                  <td><span className="hdp-cell-dark-sm">{p.deleted_at ?? "—"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Blog Comments
// ────────────────────────────────────────────────────────────────────────────
function BlogCommentsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedBlogComment[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>NỘI DUNG</th>
              <th>TÁC GIẢ</th>
              <th>BÀI VIẾT</th>
              <th>TRẠNG THÁI</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="hdp-empty-cell">
                  Không có blog comment nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(c.id)} onChange={() => sel.toggleOne(c.id)} />
                  </td>
                  <td>
                    <span className="hdp-answer-cell" title={c.content}>
                      {c.content}
                    </span>
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{c.author_name ?? "Ẩn danh"}</span>
                      {c.author_email && <span className="hdp-cell-sub">{c.author_email}</span>}
                    </div>
                  </td>
                  <td>
                    {c.post ? (
                      <div className="hdp-cell-grid-sm">
                        <span className="hdp-cell-name">{c.post.title}</span>
                        <span className="hdp-cell-sub">ID: {c.blog_post_id}</span>
                      </div>
                    ) : (
                      <span className="hdp-cell-muted">ID: {c.blog_post_id}</span>
                    )}
                  </td>
                  <td>
                    <span className={`hdp-badge ${c.status === "approved" ? "hdp-badge--active" : "hdp-badge--inactive"}`}>
                      {c.status ?? "—"}
                    </span>
                  </td>
                  <td><span className="hdp-cell-dark-sm">{c.deleted_at ?? "—"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Users
// ────────────────────────────────────────────────────────────────────────────
function UsersTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedUser[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>NGƯỜI DÙNG</th>
              <th>EMAIL</th>
              <th>ĐIỆN THOẠI</th>
              <th>AVATAR</th>
              <th>TRẠNG THÁI</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="hdp-empty-cell">
                  Không có user nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(u.id)} onChange={() => sel.toggleOne(u.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{u.name}</span>
                      <span className="hdp-cell-sub">ID: {u.id}</span>
                    </div>
                  </td>
                  <td><span className="hdp-cell-sub">{u.email}</span></td>
                  <td>{u.phone ?? <span className="hdp-cell-muted">—</span>}</td>
                  <td><Thumb url={u.avatar_url} /></td>
                  <td><StatusBadge active={u.is_active} /></td>
                  <td><span className="hdp-cell-dark-sm">{u.deleted_at ?? "—"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Categories
// ────────────────────────────────────────────────────────────────────────────
function CategoriesTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedCategory[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>TÊN DANH MỤC</th>
              <th>SLUG</th>
              <th>LOẠI</th>
              <th>TRẠNG THÁI</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="hdp-empty-cell">
                  Không có danh mục nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(c.id)} onChange={() => sel.toggleOne(c.id)} />
                  </td>
                  <td>
                    <div className="hdp-cell-grid">
                      <span className="hdp-cell-name">{c.name}</span>
                      <span className="hdp-cell-sub">ID: {c.id}</span>
                    </div>
                  </td>
                  <td><span className="hdp-cell-sub">{c.slug}</span></td>
                  <td>{c.type ?? <span className="hdp-cell-muted">—</span>}</td>
                  <td><StatusBadge active={c.is_active} /></td>
                  <td><span className="hdp-cell-dark-sm">{c.deleted_at ?? "—"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB: Reviews
// ────────────────────────────────────────────────────────────────────────────
function ReviewsTab({
  items,
  isLoading,
  sel,
}: {
  items: AdminDeletedReview[];
  isLoading: boolean;
  sel: ReturnType<typeof useSelection>;
}) {
  return (
    <div className="prodTableWrap">
      <SelectHeader
        allSelected={sel.allSelected}
        onToggle={sel.toggleAll}
        selectedCount={sel.selectedIds.length}
        totalCount={items.length}
      />
      {isLoading ? (
        <div className="hdp-loading">Đang tải...</div>
      ) : (
        <table className="prodTable">
          <thead>
            <tr>
              <th style={{ width: 56 }}>CHỌN</th>
              <th>ĐÁNH GIÁ</th>
              <th>SẢN PHẨM</th>
              <th>NGƯỜI DÙNG</th>
              <th>ĐIỂM</th>
              <th>TRẠNG THÁI</th>
              <th>XÓA LÚC</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="hdp-empty-cell">
                  Không có đánh giá nào đang ở trạng thái đã xóa.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" checked={sel.selectedSet.has(r.id)} onChange={() => sel.toggleOne(r.id)} />
                  </td>
                  <td>
                    <span className="hdp-answer-cell" title={r.comment}>{r.comment}</span>
                  </td>
                  <td>
                    {r.product ? (
                      <div className="hdp-cell-grid-sm">
                        <span className="hdp-cell-name">{r.product.name}</span>
                        <span className="hdp-cell-sub">ID: {r.product_id}</span>
                      </div>
                    ) : (
                      <span className="hdp-cell-muted">ID: {r.product_id}</span>
                    )}
                  </td>
                  <td>
                    {r.user ? (
                      <div className="hdp-cell-grid-sm">
                        <span className="hdp-cell-name">{r.user.name}</span>
                        <span className="hdp-cell-sub">{r.user.email}</span>
                      </div>
                    ) : (
                      <span className="hdp-cell-muted">ID: {r.user_id}</span>
                    )}
                  </td>
                  <td>
                    <span className="hdp-cell-name" style={{ color: "#f97316" }}>⭐ {r.rating}</span>
                  </td>
                  <td>
                    <span className={`hdp-badge ${r.status === "approved" ? "hdp-badge--active" : "hdp-badge--inactive"}`}>
                      {r.status ?? "—"}
                    </span>
                  </td>
                  <td><span className="hdp-cell-dark-sm">{r.deleted_at ?? "—"}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE ROOT
// ════════════════════════════════════════════════════════════════════════════
export default function HardDeletePage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<DeletedTab>("product_variants");

  // ── Per-tab state ──────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<AdminDeletedProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const [products, setProducts] = useState<AdminDeletedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [news, setNews] = useState<AdminDeletedProductNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const [faqs, setFaqs] = useState<AdminDeletedProductFaq[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);

  const [blogPosts, setBlogPosts] = useState<AdminDeletedBlogPost[]>([]);
  const [blogPostsLoading, setBlogPostsLoading] = useState(false);

  const [blogComments, setBlogComments] = useState<AdminDeletedBlogComment[]>([]);
  const [blogCommentsLoading, setBlogCommentsLoading] = useState(false);

  const [users, setUsers] = useState<AdminDeletedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [categories, setCategories] = useState<AdminDeletedCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [reviews, setReviews] = useState<AdminDeletedReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ── Selection (per tab) ────────────────────────────────────────────────────
  const variantAllIds = useMemo(() => variants.map((i) => i.id), [variants]);
  const productAllIds = useMemo(() => products.map((i) => i.id), [products]);
  const newsAllIds = useMemo(() => news.map((i) => i.id), [news]);
  const faqAllIds = useMemo(() => faqs.map((i) => i.id), [faqs]);
  const blogPostAllIds = useMemo(() => blogPosts.map((i) => i.id), [blogPosts]);
  const blogCommentAllIds = useMemo(() => blogComments.map((i) => i.id), [blogComments]);
  const userAllIds = useMemo(() => users.map((i) => i.id), [users]);
  const categoryAllIds = useMemo(() => categories.map((i) => i.id), [categories]);
  const reviewAllIds = useMemo(() => reviews.map((i) => i.id), [reviews]);

  const variantSel = useSelection(variantAllIds);
  const productSel = useSelection(productAllIds);
  const newsSel = useSelection(newsAllIds);
  const faqSel = useSelection(faqAllIds);
  const blogPostSel = useSelection(blogPostAllIds);
  const blogCommentSel = useSelection(blogCommentAllIds);
  const userSel = useSelection(userAllIds);
  const categorySel = useSelection(categoryAllIds);
  const reviewSel = useSelection(reviewAllIds);

  // ── Fetch per tab ─────────────────────────────────────────────────────────
  const fetchVariants = useCallback(async () => {
    setVariantsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedProductVariants(PAGE_SIZE);
      setVariants(data);
      variantSel.reset();
    } catch {
      setError("Không tải được dữ liệu product variants đã xóa.");
    } finally {
      setVariantsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedProducts(PAGE_SIZE);
      setProducts(data);
      productSel.reset();
    } catch {
      setError("Không tải được dữ liệu products đã xóa.");
    } finally {
      setProductsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNews = useCallback(async () => {
    setNewsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedProductNews(PAGE_SIZE);
      setNews(data);
      newsSel.reset();
    } catch {
      setError("Không tải được dữ liệu product news đã xóa.");
    } finally {
      setNewsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFaqs = useCallback(async () => {
    setFaqsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedProductFaqs(PAGE_SIZE);
      setFaqs(data);
      faqSel.reset();
    } catch {
      setError("Không tải được dữ liệu product FAQs đã xóa.");
    } finally {
      setFaqsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlogPosts = useCallback(async () => {
    setBlogPostsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedBlogPosts(PAGE_SIZE);
      setBlogPosts(data);
      blogPostSel.reset();
    } catch {
      setError("Không tải được dữ liệu blog posts đã xóa.");
    } finally {
      setBlogPostsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlogComments = useCallback(async () => {
    setBlogCommentsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedBlogComments(PAGE_SIZE);
      setBlogComments(data);
      blogCommentSel.reset();
    } catch {
      setError("Không tải được dữ liệu blog comments đã xóa.");
    } finally {
      setBlogCommentsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedUsers(PAGE_SIZE);
      setUsers(data);
      userSel.reset();
    } catch {
      setError("Không tải được dữ liệu users đã xóa.");
    } finally {
      setUsersLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedCategories(PAGE_SIZE);
      setCategories(data);
      categorySel.reset();
    } catch {
      setError("Không tải được dữ liệu categories đã xóa.");
    } finally {
      setCategoriesLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDeletedReviews(PAGE_SIZE);
      setReviews(data);
      reviewSel.reset();
    } catch {
      setError("Không tải được dữ liệu reviews đã xóa.");
    } finally {
      setReviewsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "product_variants") {
      const t = window.setTimeout(() => { void fetchVariants(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "products") {
      const t = window.setTimeout(() => { void fetchProducts(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "product_news") {
      const t = window.setTimeout(() => { void fetchNews(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "product_faqs") {
      const t = window.setTimeout(() => { void fetchFaqs(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "blog_posts") {
      const t = window.setTimeout(() => { void fetchBlogPosts(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "blog_comments") {
      const t = window.setTimeout(() => { void fetchBlogComments(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "users") {
      const t = window.setTimeout(() => { void fetchUsers(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "categories") {
      const t = window.setTimeout(() => { void fetchCategories(); }, 0);
      return () => window.clearTimeout(t);
    }
    if (tab === "reviews") {
      const t = window.setTimeout(() => { void fetchReviews(); }, 0);
      return () => window.clearTimeout(t);
    }
  }, [tab, fetchVariants, fetchProducts, fetchNews, fetchFaqs, fetchBlogPosts, fetchBlogComments, fetchUsers, fetchCategories, fetchReviews]);

  // ── Confirm modal ──────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [pending, setPending] = useState(false);

  const currentSel =
    tab === "product_variants" ? variantSel
    : tab === "products" ? productSel
    : tab === "product_news" ? newsSel
    : tab === "product_faqs" ? faqSel
    : tab === "blog_posts" ? blogPostSel
    : tab === "blog_comments" ? blogCommentSel
    : tab === "users" ? userSel
    : tab === "categories" ? categorySel
    : reviewSel;

  const openConfirm = () => {
    if (currentSel.selectedIds.length === 0) {
      alert("Chưa chọn dữ liệu nào để xóa hẳn.");
      return;
    }
    setPendingIds(currentSel.selectedIds);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    setPending(true);
    try {
      if (tab === "product_variants") {
        await hardDeleteAdminDeletedProductVariants(pendingIds);
        await fetchVariants();
      } else if (tab === "products") {
        await hardDeleteAdminDeletedProducts(pendingIds);
        await fetchProducts();
      } else if (tab === "product_news") {
        await hardDeleteAdminDeletedProductNews(pendingIds);
        await fetchNews();
      } else if (tab === "product_faqs") {
        await hardDeleteAdminDeletedProductFaqs(pendingIds);
        await fetchFaqs();
      } else if (tab === "blog_posts") {
        await hardDeleteAdminDeletedBlogPosts(pendingIds);
        await fetchBlogPosts();
      } else if (tab === "blog_comments") {
        await hardDeleteAdminDeletedBlogComments(pendingIds);
        await fetchBlogComments();
      } else if (tab === "users") {
        await hardDeleteAdminDeletedUsers(pendingIds);
        await fetchUsers();
      } else if (tab === "categories") {
        await hardDeleteAdminDeletedCategories(pendingIds);
        await fetchCategories();
      } else {
        await hardDeleteAdminDeletedReviews(pendingIds);
        await fetchReviews();
      }
      setPendingIds([]);
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

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabCounts: Record<DeletedTab, number> = {
    product_variants: variants.length,
    products: products.length,
    product_news: news.length,
    product_faqs: faqs.length,
    blog_posts: blogPosts.length,
    blog_comments: blogComments.length,
    users: users.length,
    categories: categories.length,
    reviews: reviews.length,
  };

  const tabs: { key: DeletedTab; label: string }[] = [
    { key: "product_variants", label: "Product variants" },
    { key: "products", label: "Products" },
    { key: "product_news", label: "Product news" },
    { key: "product_faqs", label: "Product faqs" },
    { key: "blog_posts", label: "Blog posts" },
    { key: "blog_comments", label: "Blog comments" },
    { key: "users", label: "Users" },
    { key: "categories", label: "Categories" },
    { key: "reviews", label: "Reviews" },
  ];

  const confirmLabels: Record<DeletedTab, string> = {
    product_variants: "phiên bản sản phẩm (variant)",
    products: "sản phẩm",
    product_news: "product news",
    product_faqs: "product FAQ",
    blog_posts: "blog post",
    blog_comments: "blog comment",
    users: "người dùng",
    categories: "danh mục",
    reviews: "đánh giá",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="prodAdminRoot">
      <div className="prodHeader">
        <div>
          <h2 className="prodTitle">Dữ liệu đã xóa (Hard delete)</h2>
          <p className="prodSub">Xem/tác động hard-delete theo từng nhóm dữ liệu (tab).</p>
        </div>

        <div className="hdp-header-actions">
          <button type="button" className="prodAddBtn" onClick={onBack}>
            ← Quay lại
          </button>

          <button
            type="button"
            className="prodAddBtn hdp-delete-btn"
            onClick={openConfirm}
            disabled={pending || currentSel.selectedIds.length === 0}
            title="Xóa hẳn dữ liệu đã chọn (không thể hoàn tác)"
          >
            {pending ? "Đang xóa..." : `Xóa hẳn (${currentSel.selectedIds.length})`}
          </button>
        </div>
      </div>

      {/* Tab underline nav */}
      <div className="hdp-tab-nav">
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`hdp-tab-btn${isActive ? " hdp-tab-btn--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {tabCounts[t.key] > 0 && (
                <span className={`hdp-tab-count${isActive ? " hdp-tab-count--active" : ""}`}>
                  ({tabCounts[t.key]})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <div className="prodErrorBanner">{error}</div>}

      {tab === "product_variants" && (
        <VariantsTab items={variants} isLoading={variantsLoading} sel={variantSel} />
      )}
      {tab === "products" && (
        <ProductsTab items={products} isLoading={productsLoading} sel={productSel} />
      )}
      {tab === "product_news" && (
        <ProductNewsTab items={news} isLoading={newsLoading} sel={newsSel} />
      )}
      {tab === "product_faqs" && (
        <ProductFaqsTab items={faqs} isLoading={faqsLoading} sel={faqSel} />
      )}
      {tab === "blog_posts" && (
        <BlogPostsTab items={blogPosts} isLoading={blogPostsLoading} sel={blogPostSel} />
      )}
      {tab === "blog_comments" && (
        <BlogCommentsTab items={blogComments} isLoading={blogCommentsLoading} sel={blogCommentSel} />
      )}
      {tab === "users" && (
        <UsersTab items={users} isLoading={usersLoading} sel={userSel} />
      )}
      {tab === "categories" && (
        <CategoriesTab items={categories} isLoading={categoriesLoading} sel={categorySel} />
      )}
      {tab === "reviews" && (
        <ReviewsTab items={reviews} isLoading={reviewsLoading} sel={reviewSel} />
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xóa hẳn dữ liệu đã xóa"
        message={
          <div className="hdp-confirm-grid">
            <p style={{ margin: 0 }}>
              Hành động này sẽ hard delete vĩnh viễn các{" "}
              <b>{confirmLabels[tab]}</b> bạn đã chọn.
            </p>
            {tab === "users" && (
              <p style={{ margin: "8px 0 0", color: "#ef4444", fontWeight: 500 }}>
                Lưu ý: Xóa người dùng sẽ tự động xóa TOÀN BỘ ĐƠN HÀNG và dữ liệu liên quan của họ!
              </p>
            )}
            <p className="hdp-confirm-count">
              Số lượng: <b>{pendingIds.length}</b>
            </p>
            <p className="hdp-confirm-warning">Không thể hoàn tác.</p>
          </div>
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
