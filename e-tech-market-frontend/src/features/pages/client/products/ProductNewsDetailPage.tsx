import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL } from "@/configs/api.config";
import {
  fetchProductNewsBySlug,
  type ProductNews,
} from "@/features/services/products.service";
import "@/styles/pages/ProductDetailPage.css";
import { sanitizeHtml } from "@/__tests__/utils/sanitizeHtml";

const resolveImageUrl = (url: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

export default function ProductNewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<ProductNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sanitizedContent = useMemo(
    () => sanitizeHtml(news?.content_html),
    [news?.content_html],
  );

  useEffect(() => {
    if (!slug) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetchProductNewsBySlug(slug)
      .then(setNews)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Không tải được tin tức."),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="pdpLoading">Đang tải tin tức...</div>;
  if (error || !news)
    return (
      <div className="pdpError">
        Không tìm thấy tin tức. <Link to="/products">Quay lại</Link>
      </div>
    );

  return (
    <div className="pdpPage">
      <div className="ppContainer">
        <nav className="pdpBreadcrumb">
          <Link to="/">Home</Link> / <Link to="/products">Store</Link> /{" "}
          <span>Tin tức</span>
        </nav>

        <div className="pdpRichCard" style={{ padding: 18 }}>
          <h1
            style={{
              margin: "0 0 10px",
              fontSize: 28,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            {news.title}
          </h1>
          {news.thumbnail_url && (
            <img
              src={resolveImageUrl(news.thumbnail_url)}
              alt={news.title}
              style={{
                width: "100%",
                borderRadius: 14,
                margin: "8px 0 18px",
                objectFit: "cover",
              }}
            />
          )}
          <div
            className="pdpRichContent"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>
      </div>
    </div>
  );
}
