import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type {
  Product,
  ProductNews,
} from "@/features/services/products.service";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { resolveImageUrl } from "./PdpShared";

export function PdpRichSection({
  product,
  visibleNews,
}: {
  product: Product;
  visibleNews: ProductNews[];
}) {
  const [isRichExpanded, setIsRichExpanded] = useState(false);
  const [canExpandRich, setCanExpandRich] = useState(false);
  const richRef = useRef<HTMLDivElement | null>(null);

  // Reset trạng thái khi sản phẩm thay đổi
  useEffect(() => {
    setIsRichExpanded(false);
    setCanExpandRich(false);
  }, [product.rich_html]);

  useEffect(() => {
    const el = richRef.current;
    if (!el) return;

    const check = () => {
      // scrollHeight = chiều cao thực của nội dung (không bị clip)
      // 680 = max-height của .is-collapsed trong CSS
      setCanExpandRich(el.scrollHeight > 680);
    };

    // Đo ngay sau khi mount
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [product.rich_html]);

  if (!product.rich_html) return null;

  const sanitizedHtml = sanitizeHtml(product.rich_html);

  return (
    <section className="pdpRichSection" aria-label="Nội dung sản phẩm">
      <div
        className={[
          "pdpRichGrid",
          isRichExpanded ? "is-expanded" : "",
          visibleNews.length > 0 ? "" : "is-no-news",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="pdpRichLeft">
          <div className="pdpRichCard">
            <div
              ref={richRef}
              className={`pdpRichContent ${!isRichExpanded ? "is-collapsed" : ""}`}
              style={
                !/<[a-z][\s\S]*>/i.test(sanitizedHtml)
                  ? { whiteSpace: "pre-wrap" }
                  : undefined
              }
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
            {canExpandRich && (
              <div className="pdpRichActions">
                <button
                  type="button"
                  className="pdpRichToggleBtn"
                  onClick={() => setIsRichExpanded((v) => !v)}
                  aria-expanded={isRichExpanded}
                >
                  {isRichExpanded ? "Thu gọn" : "Xem thêm"}
                </button>
              </div>
            )}
          </div>
        </div>
        {visibleNews.length > 0 && (
          <div className="pdpRichRight">
            <section
              className="pdpNewsSection"
              aria-labelledby="pdp-news-title"
            >
              <div className="pdpNewsHead">
                <h3 id="pdp-news-title" className="pdpNewsTitle">
                  Tin tức sản phẩm
                </h3>
                <Link
                  to={`/products/${product.slug}#product-news`}
                  className="pdpNewsAllLink"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="pdpNewsMiniList" id="product-news">
                {visibleNews.slice(0, 7).map((item) => (
                  <Link
                    key={item.id}
                    to={`/product-news/${item.slug}`}
                    className="pdpNewsMiniCard"
                  >
                    <span className="pdpNewsMiniThumb" aria-hidden>
                      {item.thumbnail_url ? (
                        <img src={resolveImageUrl(item.thumbnail_url)} alt="" />
                      ) : (
                        <span className="pdpNewsMiniThumbPh" />
                      )}
                    </span>
                    <span className="pdpNewsMiniTitle">{item.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
