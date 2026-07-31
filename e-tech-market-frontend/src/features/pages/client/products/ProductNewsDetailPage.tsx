import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchProductNewsBySlug,
  type ProductNews,
} from "@/features/services/products.service";
import "@/styles/pages/ProductDetailPage.css";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { useWishlistQuery, useWishlistMutation } from '@/features/services/mutations'
import { useAuthStore } from '@/features/store/useAuthStore'

// Removed unused resolveImageUrl

export default function ProductNewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<ProductNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sanitizedContent = useMemo(
    () => sanitizeHtml(news?.content_html),
    [news?.content_html],
  );

  const userStr = useAuthStore((state) => state.userStr)
  const hasAuth = !!userStr
  const { data: newsWishlists } = useWishlistQuery(hasAuth, 'news')
  const newsWishlistMutation = useWishlistMutation('news')

  const isFavorited = (id: number) => {
    if (!hasAuth) return false
    return newsWishlists?.some(w => w.product_news_id === id)
  }

  const handleToggleFavorite = () => {
    if (!hasAuth) {
      alert('Vui lòng đăng nhập để yêu thích!')
      return
    }
    if (news) {
      newsWishlistMutation.mutate(news.id)
    }
  }

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            <button 
              onClick={handleToggleFavorite}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '5px' }}
              title="Yêu thích tin tức này"
            >
              <HeartIcon filled={isFavorited(news.id)} />
            </button>
          </div>
          <div
            className="pdpRichContent"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>
      </div>
    </div>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  )
}
