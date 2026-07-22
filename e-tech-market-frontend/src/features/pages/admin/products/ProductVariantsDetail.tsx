import { useEffect, useState } from "react";
import { fetchAdminProductDetail } from "@/features/services/admin/products.admin.service";
import { API_BASE_URL } from "@/configs/api.config";

interface Category {
  id: number;
  name: string;
}

interface ProductImage {
  id: number;
  image_url: string;
}

interface ProductSpec {
  id: number;
  product_id: number;
  product_variant_id: number | null;
  spec_group: string | null;
  spec_key: string;
  spec_value: string;
  spec_unit: string | null;
  sort_order: number;
}

interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  color: string | null;
  configuration: string | null;
  sku: string;
  price: string;
  discount_type: "percentage" | "fixed" | null;
  discount_value: string | null;
  discount_start_at: string | null;
  discount_end_at: string | null;
  stock_quantity: number | null;
  image_url: string | null;
  is_active: boolean;
  effective_price?: number;
}

interface ProductFaq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  price: string;
  brand: string | null;
  category_id: number;
  category?: Category;
  is_active: boolean;
  description: string | null;
  rich_html: string | null;
  main_image_url: string | null;
  images?: ProductImage[];
  specs?: ProductSpec[];
  variants?: ProductVariant[];
  faqs?: ProductFaq[];
}

const formatCurrency = (amount: number | string | undefined | null) => {
  if (amount == null) return "0 ₫";
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(val);
};

const resolveImageUrl = (url: string | null) => {
  if (!url) return "";
  const s = url.trim();
  if (!s) return "";
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

const translateErrorMessage = (msg: string) => {
  const s = (msg || "").trim();
  if (!s) return "Lỗi khi tải chi tiết sản phẩm.";

  const lower = s.toLowerCase();

  if (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch")
  ) {
    return "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
  }
  if (lower.includes("timeout")) {
    return "Hết thời gian kết nối. Vui lòng thử lại.";
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return "Không tìm thấy thông tin sản phẩm.";
  }
  if (
    lower.includes("unauthorized") ||
    lower.includes("unauthenticated") ||
    lower.includes("401")
  ) {
    return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
  }
  if (lower.includes("forbidden") || lower.includes("403")) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("required")
  ) {
    return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.";
  }

  // Best-effort: nếu backend trả message kiểu English nhưng không khớp pattern nào,
  // vẫn trả nguyên nhưng hạn chế hiển thị quá dài
  if (s.length > 200) return s.slice(0, 200) + "...";
  return s;
};

export default function ProductVariantsDetail({
  productId,
  onBack,
}: {
  productId: number;
  onBack: () => void;
}) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | "all">("all");

  const hasAuth = true; // Always authenticated — behind ProtectedRoute

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    fetchAdminProductDetail<ProductDetail>(productId)
      .then((res) => {
        if (mounted) {
          setProduct(res);
        }
      })
      .catch((err) => {
        if (mounted) {
          if (err && typeof err === "object" && "message" in err) {
            const raw = String((err as { message?: unknown }).message || "");
            setError(translateErrorMessage(raw));
          } else {
            setError("Lỗi khi tải chi tiết sản phẩm.");
          }
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [productId, hasAuth]);

  if (isLoading) {
    return (
      <div
        className="prodAdminRoot"
        style={{ padding: "40px 0", textAlign: "center" }}
      >
        <div
          className="et-loader-spinner"
          style={{ margin: "0 auto 20px" }}
        ></div>
        <div style={{ color: "#64748b", fontSize: "15px", fontWeight: 600 }}>
          Đang tải thông số kỹ thuật & phiên bản...
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="prodAdminRoot">
        <div className="prodHeader">
          <button
            className="pBackBtn"
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <ArrowLeftIcon /> Quay lại
          </button>
        </div>
        <div className="prodErrorBanner">
          {error || "Không tìm thấy thông tin sản phẩm."}
        </div>
      </div>
    );
  }

  // Calculate some analytics
  const variants = product.variants || [];
  const totalStock = variants.reduce(
    (sum, v) => sum + (v.stock_quantity || 0),
    0,
  );
  const activeVariants = variants.filter((v) => v.is_active);
  const outOfStockCount = variants.filter(
    (v) => (v.stock_quantity || 0) <= 0,
  ).length;

  // Price range calculation
  const prices = variants.map((v) => {
    const original = parseFloat(v.price);
    const effective = v.effective_price ? Number(v.effective_price) : original;
    return { original, effective };
  });

  const minPrice = prices.length
    ? Math.min(...prices.map((p) => p.effective))
    : parseFloat(product.price || "0");
  const maxPrice = prices.length
    ? Math.max(...prices.map((p) => p.effective))
    : parseFloat(product.price || "0");

  // Filter specs
  const allSpecs = product.specs || [];
  const generalSpecs = allSpecs.filter((s) => !s.product_variant_id);
  const variantSpecificSpecs = allSpecs.filter((s) => s.product_variant_id);

  // Group specs helper
  const groupSpecs = (specsList: ProductSpec[]) => {
    const groups: Record<string, ProductSpec[]> = {};
    specsList.forEach((spec) => {
      const gName = spec.spec_group || "Thông số chung";
      if (!groups[gName]) {
        groups[gName] = [];
      }
      groups[gName].push(spec);
    });

    // Sort groups
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        groupName: key,
        specs: groups[key].sort((a, b) => a.sort_order - b.sort_order),
      }));
  };

  const groupedGeneralSpecs = groupSpecs(generalSpecs);

  // Extract unique colors
  const uniqueColors = Array.from(
    new Set(variants.map((v) => (v.color || "").trim()).filter(Boolean)),
  );

  // Fallback to configurations if no colors exist
  const uniqueConfigs =
    uniqueColors.length === 0
      ? Array.from(
          new Set(
            variants.map((v) => (v.configuration || "").trim()).filter(Boolean),
          ),
        )
      : [];

  const filterType =
    uniqueColors.length > 0
      ? "color"
      : uniqueConfigs.length > 0
        ? "config"
        : "none";
  const filterItems = filterType === "color" ? uniqueColors : uniqueConfigs;

  // Filter variants displayed
  const displayedVariants =
    selectedFilter === "all"
      ? variants
      : variants.filter((v) => {
          if (filterType === "color")
            return (v.color || "").trim() === selectedFilter;
          if (filterType === "config")
            return (v.configuration || "").trim() === selectedFilter;
          return true;
        });

  return (
    <div className="prodAdminRoot pDetailPremium">
      {/* Header section */}
      <div className="prodHeader pDetailHeader">
        <div className="pHeaderLeft">
          <button
            className="pBackBtn pBackDetailBtn"
            onClick={onBack}
            title="Quay lại danh sách"
          >
            <ArrowLeftIcon />
            <span>Quay lại</span>
          </button>
          <div className="pHeaderMeta">
            <h2 className="prodTitle pDetailTitle">{product.name}</h2>
            <div className="pDetailBadges">
              <span className="pDetailBrand">
                {product.brand || "Chưa có thương hiệu"}
              </span>
              <span className="pDetailSep">•</span>
              <span className="pDetailCategory">
                {product.category?.name || "Không có danh mục"}
              </span>
              <span className="pDetailSep">•</span>
              <span
                className={`pStatus ${product.is_active ? "active" : "inactive"}`}
              >
                {product.is_active ? "SẢN PHẨM HOẠT ĐỘNG" : "SẢN PHẨM ẨN"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics stats */}
      <div className="prodStatsGrid pDetailStatsGrid">
        <div className="prodStatCard pDetailStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--orange">
              <BoxIcon />
            </div>
            <div className="prodStatHint">
              {activeVariants.length}/{variants.length} Đang kích hoạt
            </div>
          </div>
          <div className="prodStatLabel">Số phiên bản</div>
          <div className="prodStatValue">{variants.length}</div>
        </div>

        <div className="prodStatCard pDetailStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--green">
              <DatabaseIcon />
            </div>
            {outOfStockCount > 0 ? (
              <div className="prodStatHint prodStatHint--red">
                {outOfStockCount} phiên bản hết hàng
              </div>
            ) : (
              <div className="prodStatHint prodStatHint--green">
                Tất cả ổn định
              </div>
            )}
          </div>
          <div className="prodStatLabel">Tổng số lượng kho</div>
          <div className="prodStatValue">{totalStock.toLocaleString()}</div>
        </div>

        <div className="prodStatCard pDetailStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--blue">
              <DollarIcon />
            </div>
            <div className="prodStatHint">Giá hiệu lực</div>
          </div>
          <div className="prodStatLabel">Giá thấp nhất</div>
          <div className="prodStatValue pDetailStatPrice">
            {formatCurrency(minPrice)}
          </div>
        </div>

        <div className="prodStatCard pDetailStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--blue">
              <DollarIcon />
            </div>
            <div className="prodStatHint">Giá hiệu lực</div>
          </div>
          <div className="prodStatLabel">Giá cao nhất</div>
          <div className="prodStatValue pDetailStatPrice">
            {formatCurrency(maxPrice)}
          </div>
        </div>
      </div>

      {/* Main layout grid */}
      <div className="pDetailGrid">
        {/* Left / Center content: Versions and specifications details */}
        <div className="pDetailMainContent">
          {/* Variant Selector Tabs */}
          <div className="pDetailFilterBar">
            <h3 className="pBlockTitle">Chi tiết phiên bản sản phẩm</h3>
            {filterType !== "none" && (
              <div className="pVariantFilterTabs">
                <button
                  className={`pVariantTabBtn ${selectedFilter === "all" ? "active" : ""}`}
                  onClick={() => setSelectedFilter("all")}
                >
                  Tất cả ({variants.length})
                </button>
                {filterItems.map((item) => {
                  const count = variants.filter((v) => {
                    if (filterType === "color")
                      return (v.color || "").trim() === item;
                    return (v.configuration || "").trim() === item;
                  }).length;
                  return (
                    <button
                      key={item}
                      className={`pVariantTabBtn ${selectedFilter === item ? "active" : ""}`}
                      onClick={() => setSelectedFilter(item)}
                    >
                      {item} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Variants display area */}
          {displayedVariants.length === 0 ? (
            <div className="pDetailEmptyBox">
              Sản phẩm này chưa có bất kì phiên bản (variants) nào. Vui lòng vào
              chỉnh sửa sản phẩm để thêm phiên bản.
            </div>
          ) : (
            <div className="pDetailVariantsList">
              {displayedVariants.map((variant) => {
                const variantSpecs = variantSpecificSpecs.filter(
                  (s) => s.product_variant_id === variant.id,
                );
                const groupedVarSpecs = groupSpecs(variantSpecs);
                const originalPrice = parseFloat(variant.price);
                const finalPrice = variant.effective_price
                  ? Number(variant.effective_price)
                  : originalPrice;
                const isDiscounted = finalPrice < originalPrice;

                return (
                  <div key={variant.id} className="pDetailVariantCard">
                    {/* Variant top row details */}
                    <div className="pVarCardHeader">
                      <div className="pVarCardImg">
                        <img
                          src={
                            variant.image_url
                              ? resolveImageUrl(variant.image_url)
                              : resolveImageUrl(product.main_image_url)
                          }
                          alt={variant.variant_name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.png";
                          }}
                        />
                      </div>

                      <div className="pVarCardInfo">
                        <div className="pVarCardTitleWrap">
                          <h4 className="pVarCardTitle">
                            {variant.variant_name}
                          </h4>
                          <span
                            className={`pStatus ${variant.is_active ? "active" : "inactive"}`}
                            style={{ padding: "2px 8px", fontSize: "9px" }}
                          >
                            {variant.is_active
                              ? "ĐANG KINH DOANH"
                              : "TẠM NGỪNG"}
                          </span>
                        </div>

                        <div className="pVarCardMetaGrid">
                          <div className="pVarMetaItem">
                            <span className="pVarMetaLabel">Mã SKU:</span>
                            <span className="pVarMetaValue pSkuText">
                              {variant.sku || "—"}
                            </span>
                          </div>
                          <div className="pVarMetaItem">
                            <span className="pVarMetaLabel">Màu sắc:</span>
                            <span className="pVarMetaValue">
                              {variant.color || "—"}
                            </span>
                          </div>
                          <div className="pVarMetaItem">
                            <span className="pVarMetaLabel">Cấu hình:</span>
                            <span className="pVarMetaValue">
                              {variant.configuration || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="pVarCardPricingRow">
                          <div className="pVarPriceContainer">
                            {isDiscounted ? (
                              <>
                                <span className="pVarEffectivePrice">
                                  {formatCurrency(finalPrice)}
                                </span>
                                <span className="pVarOriginalPrice">
                                  {formatCurrency(originalPrice)}
                                </span>
                                <span className="pVarDiscountTag">
                                  Giảm{" "}
                                  {variant.discount_type === "percentage"
                                    ? `${Number(variant.discount_value)}%`
                                    : formatCurrency(variant.discount_value)}
                                </span>
                              </>
                            ) : (
                              <span className="pVarEffectivePrice">
                                {formatCurrency(originalPrice)}
                              </span>
                            )}
                          </div>

                          <div className="pVarStockContainer">
                            <span className="pVarStockLabel">Kho hàng:</span>
                            <span
                              className={`pVarStockValue ${!variant.stock_quantity || variant.stock_quantity <= 0 ? "out" : variant.stock_quantity < 10 ? "low" : "ok"}`}
                            >
                              {variant.stock_quantity || 0} sản phẩm
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Variant specs display */}
                    <div className="pVarCardSpecsSection">
                      <h5 className="pVarSpecsTitle">
                        Thông số kĩ thuật riêng phiên bản
                      </h5>
                      {groupedVarSpecs.length === 0 ? (
                        <p className="pVarSpecsEmpty">
                          Không có thông số kĩ thuật riêng biệt cho phiên bản
                          này.
                        </p>
                      ) : (
                        <div className="pVarSpecsGrid">
                          {groupedVarSpecs.map((g) => (
                            <div key={g.groupName} className="pVarSpecGroup">
                              <h6 className="pVarSpecGroupName">
                                {g.groupName}
                              </h6>
                              <table className="pVarSpecTable">
                                <tbody>
                                  {g.specs.map((spec) => (
                                    <tr key={spec.id}>
                                      <td className="pSpecKey">
                                        {spec.spec_key}
                                      </td>
                                      <td className="pSpecVal">
                                        {spec.spec_value} {spec.spec_unit || ""}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side content: General specifications, description & FAQs */}
        <div className="pDetailSidebar">
          {/* General specs panel */}
          <div className="pSideSection">
            <h3 className="pBlockTitle flex-center">
              <SettingsIcon /> Thông số kĩ thuật chung
            </h3>
            {groupedGeneralSpecs.length === 0 ? (
              <div className="pSideSpecsEmpty">
                Không có thông số kĩ thuật dùng chung.
              </div>
            ) : (
              <div className="pSideSpecsList">
                {groupedGeneralSpecs.map((g) => (
                  <div key={g.groupName} className="pSideSpecGroup">
                    <h6 className="pSideSpecGroupName">{g.groupName}</h6>
                    <table className="pSideSpecTable">
                      <tbody>
                        {g.specs.map((spec) => (
                          <tr key={spec.id}>
                            <td className="pSideSpecKey">{spec.spec_key}</td>
                            <td className="pSideSpecVal">
                              {spec.spec_value} {spec.spec_unit || ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description & FAQs */}
          {(product.description ||
            (product.faqs && product.faqs.length > 0)) && (
            <div className="pSideSection">
              <h3 className="pBlockTitle">Thông tin bổ sung</h3>

              {product.description && (
                <div className="pDetailDescWrapper">
                  <h4 className="pSideMiniTitle">Mô tả tóm tắt</h4>
                  <p className="pSideDesc">{product.description}</p>
                </div>
              )}

              {product.faqs && product.faqs.length > 0 && (
                <div className="pDetailFaqsWrapper">
                  <h4 className="pSideMiniTitle">
                    Câu hỏi thường gặp ({product.faqs.length})
                  </h4>
                  <div className="pDetailFaqList">
                    {product.faqs.map((faq) => (
                      <div key={faq.id} className="pDetailFaqItem">
                        <div className="pFaqQuestion">Q: {faq.question}</div>
                        <div className="pFaqAnswer">{faq.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function DatabaseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}
function DollarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
