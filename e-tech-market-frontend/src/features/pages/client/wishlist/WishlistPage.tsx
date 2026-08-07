import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@/styles/pages/ProductsPage.css";
import "@/styles/pages/BlogPage.css";
import "@/styles/pages/VideoPage.css";
import "@/styles/pages/WishlistPage.css";
import { API_BASE_URL } from "@/configs/api.config";
import {
  useWishlistQuery,
  useWishlistMutation,
} from "@/features/services/mutations";
import type { Product } from "@/features/services/products.service";
import Skeleton from "@/components/Skeleton";
import { useAuthStore } from "@/features/store/useAuthStore";
import { ProductCard } from "@/features/pages/client/products/ProductsPage";

const resolveImageUrl = (url: string | null) => {
  if (!url) return "https://via.placeholder.com/400";
  const s = url.trim();
  if (!s) return "https://via.placeholder.com/400";
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
  const path = s.startsWith("/") ? s : `/${s}`;
  if (!path.startsWith("/storage/")) return `${API_BASE_URL}/storage${path}`;
  return `${API_BASE_URL}${path}`;
};

const getVideoThumbnail = (
  videoUrl: string,
  fallbackUrl?: string | null,
): string => {
  if (!videoUrl) return resolveImageUrl(fallbackUrl ?? null);
  const ytMatch = videoUrl.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?\/)|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/,
  );
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  return resolveImageUrl(fallbackUrl ?? null);
};

function WishlistCard({
  item,
  onRemove,
  type,
}: {
  item: any;
  onRemove: (id: number) => void;
  type: string;
}) {
  if (type === "product") {
    return (
      <div style={{ position: "relative" }}>
        <ProductCard
          product={item}
          hideCompare={true}
          customActionNode={
            <button
              type="button"
              className="wlCardRemove"
              aria-label="Xóa khỏi yêu thích"
              onClick={(e) => {
                e.preventDefault();
                onRemove(item.id);
              }}
            >
              <TrashIcon />
            </button>
          }
        />
      </div>
    );
  }

  const getCardData = () => {
    switch (type) {
      case "blog":
        return {
          id: item.id,
          title: item.title,
          desc: item.excerpt || "Không có tóm tắt",
          img: resolveImageUrl(item.thumbnail_url || item.thumbnail_path),
          link: `/blog/${item.slug}`,
          tag: item.category?.name || "Bài viết",
          date:
            item.published_at || item.created_at || new Date().toISOString(),
        };
      case "video":
        return {
          id: item.id,
          title: item.title,
          desc:
            item.description ||
            item.product?.short_description ||
            "Không có mô tả",
          img: getVideoThumbnail(
            item.video_url,
            item.thumbnail_url || item.product?.main_image_url,
          ),
          link: `/videos/${item.id}`,
          tag: item.product?.name || item.category?.name || "Video",
        };
      case "news":
        return {
          id: item.id,
          title: item.title,
          desc: item.content_html
            ? item.content_html.replace(/<[^>]+>/g, "").substring(0, 100) +
              "..."
            : "Không có nội dung",
          img: resolveImageUrl(item.thumbnail_url || item.thumbnail_path),
          link: `/product-news/${item.slug}`,
          tag: item.category?.name || "Tin sản phẩm",
          date:
            item.published_at || item.created_at || new Date().toISOString(),
        };
      default:
        return {
          id: item.id,
          title: item.title,
          desc: "",
          img: "",
          link: "",
          tag: "",
          date: new Date().toISOString(),
        };
    }
  };

  const data = getCardData();

  if (type === "blog" || type === "news") {
    return (
      <div
        className="blogCard"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          margin: 0,
        }}
      >
        <div className="blogCardThumbWrap">
          <Link to={data.link}>
            <img src={data.img} alt={data.title} className="blogCardThumb" />
          </Link>
          <span
            className="blogCardTag"
            style={{ background: type === "news" ? "#e74c3c" : "#3498db" }}
          >
            {data.tag}
          </span>
          <button
            type="button"
            className="wlCardRemove"
            aria-label="Xóa khỏi yêu thích"
            onClick={(e) => {
              e.preventDefault();
              onRemove(item.id);
            }}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
              borderRadius: "50%",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <TrashIcon />
          </button>
        </div>
        <div className="blogCardBody">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span className="blogCardDate">
              {new Date(data.date).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <Link to={data.link} className="blogCardTitle">
            {data.title}
          </Link>
          <p className="blogCardExcerpt">{data.desc}</p>
          <Link to={data.link} className="blogCardMore">
            Đọc thêm →
          </Link>
        </div>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div
        className="cvCard"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          cursor: "default",
        }}
      >
        <div className="cvThumbnailWrap" style={{ position: "relative" }}>
          <Link to={data.link}>
            <img src={data.img} alt={data.title} className="cvThumbnail" />
          </Link>
          <Link to={data.link} className="cvPlayOverlay">
            <div className="cvPlayBtn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </div>
          </Link>
          <button
            type="button"
            className="wlCardRemove"
            aria-label="Xóa khỏi yêu thích"
            onClick={(e) => {
              e.preventDefault();
              onRemove(item.id);
            }}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
              borderRadius: "50%",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <TrashIcon />
          </button>
        </div>
        <div className="cvCardBody">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <h3 className="cvCardTitle">{data.title || "Video giới thiệu"}</h3>
          </div>
          <p className="cvCardDesc">{data.desc}</p>
          <div className="cvProductLinkBadge">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "4px" }}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {data.tag}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function WishlistPage() {
  const navigate = useNavigate();
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "product" | "blog" | "video" | "news"
  >("product");
  const userStr = useAuthStore((state) => state.userStr);
  const hasAuth = !!userStr;

  const { data: wishlistData, isLoading: loading } = useWishlistQuery(
    hasAuth,
    activeTab,
  );
  const wishlistMutation = useWishlistMutation(activeTab);
  const items = wishlistData || [];

  useEffect(() => {
    if (!hasAuth) {
      navigate("/login");
    }
  }, [hasAuth, navigate]);

  const currentItems = useMemo(() => {
    if (activeTab === "product")
      return items.map((i: any) => i.product).filter(Boolean);
    if (activeTab === "blog")
      return items.map((i: any) => i.blog_post || i.blogPost).filter(Boolean);
    if (activeTab === "video")
      return items.map((i: any) => i.video).filter(Boolean);
    if (activeTab === "news")
      return items
        .map((i: any) => i.product_news || i.productNews)
        .filter(Boolean);
    return [];
  }, [items, activeTab]);

  const categoryFacets = useMemo(() => {
    if (activeTab !== "product")
      return [{ id: "all", name: "Tất cả", count: currentItems.length }];
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const p of currentItems as Product[]) {
      const catId = p.category?.id != null ? String(p.category.id) : "other";
      const name = (p.category?.name ?? "Khác").trim() || "Khác";
      const prev = map.get(catId);
      if (prev) prev.count += 1;
      else map.set(catId, { id: catId, name, count: 1 });
    }
    const facets = Array.from(map.values())
      .filter((f) => f.count > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
    return [
      { id: "all", name: "Tất cả", count: currentItems.length },
      ...facets,
    ];
  }, [currentItems, activeTab]);

  const filtered = useMemo(() => {
    if (selectedCatId === "all") return currentItems;
    if (activeTab !== "product") return currentItems;
    if (selectedCatId === "other")
      return (currentItems as Product[]).filter((p) => !p.category?.id);
    const idNum = Number.parseInt(selectedCatId, 10);
    if (!Number.isFinite(idNum)) return currentItems;
    return (currentItems as Product[]).filter((p) => p.category?.id === idNum);
  }, [currentItems, selectedCatId, activeTab]);

  async function remove(id: number) {
    wishlistMutation.mutate(id);
  }

  async function clearAll() {
    const ids = currentItems.map((i: any) => i.id);
    ids.forEach((id) => wishlistMutation.mutate(id));
  }

  function WishlistSkeleton() {
    return (
      <div className="wlCard">
        <div className="wlCardImgWrap">
          <Skeleton width="100%" height="180px" borderRadius="12px" />
        </div>
        <div className="wlCardBody">
          <div className="wlCardTop">
            <Skeleton width="60px" height="14px" />
            <Skeleton width="100px" height="18px" />
          </div>
          <Skeleton
            width="100%"
            height="22px"
            style={{ margin: "12px 0 8px" }}
          />
          <Skeleton
            width="100%"
            height="40px"
            style={{ marginBottom: "16px" }}
          />
          <Skeleton width="100%" height="48px" borderRadius="10px" />
        </div>
      </div>
    );
  }

  return (
    <main className="wlPage">
      {showMobileFilters && (
        <div
          className="ppSidebarOverlay"
          onClick={() => setShowMobileFilters(false)}
        />
      )}
      <div className="wlInner">
        <div className="wlBreadcrumb">
          Trang chủ &rsaquo; Danh sách yêu thích
        </div>

        <div className="wlHeader">
          <div>
            <h1 className="wlTitle">Danh sách yêu thích</h1>
            <p className="wlSub">
              Bạn có <b>{currentItems.length}</b> mục được lưu trong danh sách
              này.
            </p>
          </div>
          <button
            type="button"
            className="wlClearBtn wlClearBtn--desktop"
            onClick={clearAll}
            disabled={currentItems.length === 0}
          >
            <TrashIcon />
            Xóa tất cả
          </button>
        </div>

        {/* Tabs for different wishlist types */}
        <div className="wlTabsContainer">
          {[
            { id: "product", label: "Sản phẩm" },
            { id: "blog", label: "Bài viết" },
            { id: "video", label: "Video" },
            { id: "news", label: "Tin sản phẩm" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedCatId("all");
              }}
              className={`wlTabItem ${activeTab === tab.id ? "wlTabItem--active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="wlGrid">
            <aside className="wlSidebar">
              <div className="wlSideCard">
                <Skeleton
                  width="120px"
                  height="18px"
                  style={{ marginBottom: "20px" }}
                />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ marginBottom: "12px" }}>
                    <Skeleton width="100%" height="40px" borderRadius="8px" />
                  </div>
                ))}
              </div>
            </aside>
            <div className="wlCards">
              <div className="wlCardsGrid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <WishlistSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="wlEmpty">
            Chưa có mục yêu thích nào trong phần này. Hãy khám phá và lưu lại
            những gì bạn thích.
          </div>
        ) : (
          <>
            <div className="wlMobileFilterWrap hfMobileOnly">
              <button
                className="ppMobileFilterBtn"
                onClick={() => setShowMobileFilters(true)}
                aria-label="Danh mục"
              >
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
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
                Bộ lọc
              </button>
            </div>

            <div className="wlGrid">
              <aside
                className={`wlSidebar ${showMobileFilters ? "wlSidebar--open" : ""}`}
              >
                <div
                  className="wlSidebarClose"
                  onClick={() => setShowMobileFilters(false)}
                >
                  ✕
                </div>
                <div className="wlSideCard">
                  <div className="wlSideTitle">PHÂN LOẠI</div>
                  {categoryFacets.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={
                        selectedCatId === f.id
                          ? "wlCatBtn wlCatBtn--active"
                          : "wlCatBtn"
                      }
                      onClick={() => {
                        setSelectedCatId(f.id);
                        setShowMobileFilters(false);
                      }}
                    >
                      <span>{f.name}</span>
                      <span className="wlCatCount">{f.count}</span>
                    </button>
                  ))}
                </div>

                <div className="wlPromo">
                  <div className="wlPromoTitle">Ưu đãi hôm nay</div>
                  <div className="wlPromoText">
                    Giảm thêm 500k khi mua từ 2 sản phẩm yêu thích.
                  </div>
                  <Link className="wlPromoLink" to="/products">
                    Xem chi tiết
                  </Link>
                </div>
              </aside>

              <div className="wlCards">
                <div className="wlCardsGrid">
                  {filtered.map((p: any) => (
                    <WishlistCard
                      key={p.id}
                      item={p}
                      onRemove={remove}
                      type={activeTab}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="wlBottomBar">
              <div>
                <div className="wlBottomTitle">
                  Bạn đang có một bộ sưu tập tuyệt vời!
                </div>
                <div className="wlBottomSub">
                  Các mục trong danh sách này được lưu trữ an toàn.
                </div>
              </div>
              <div className="wlBottomActions">
                <div
                  className="wlMobileBtnGroup"
                  style={{ display: "flex", gap: "12px", width: "100%" }}
                >
                  <button
                    type="button"
                    className="wlClearBtn wlClearBtn--mobile"
                    onClick={clearAll}
                    disabled={currentItems.length === 0}
                    style={{ margin: 0, flex: 1, padding: "12px 8px" }}
                  >
                    <TrashIcon />
                    Xóa
                  </button>
                  <button
                    type="button"
                    className="wlShareBtn"
                    style={{ margin: 0, flex: 1, padding: "12px 8px" }}
                  >
                    Chia sẻ
                  </button>
                </div>
                <Link to="/" className="wlContinueBtn">
                  Tiếp tục khám phá
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6M14 11v6"
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
function CartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 6h15l-2 9H8L7 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M7 6 6 3H2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}
