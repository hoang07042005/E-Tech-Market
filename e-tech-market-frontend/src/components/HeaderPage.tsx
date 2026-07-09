import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "@/styles/components/HeaderFooter.css";
import { cartCount, getCart } from "@/features/services/cart.service";
import { HeartOutlineIcon } from "./icons/HeartIcon";
import { apiFetch } from "@/configs/api.config";
import { useApiQuery } from "@/features/api/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/store/useAuthStore";

export type NavKey =
  | "Home"
  | "Product"
  | "Accessory"
  | "Blog"
  | "Contact"
  | "About";

const NAV: NavKey[] = [
  "Home",
  "Product",
  "Accessory",
  "Blog",
  "Contact",
  "About",
];

const NAV_LABEL: Record<NavKey, string> = {
  Home: "Trang chủ",
  Product: "Sản phẩm",
  Accessory: "Linh kiện",
  Blog: "Tin tức",
  Contact: "Liên hệ",
  About: "Giới thiệu",
};

type StoredUser = {
  name?: string;
  username?: string;
  avatar_url?: string | null;
  roles?: { slug?: string }[];
};

function isAdminUser(user: StoredUser | null): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false;
  const staffRoles = ["admin", "warehouse-staff", "order-staff", "editor"];
  return user.roles.some((r) => staffRoles.includes(r?.slug || ""));
}

function firstLetter(name: string) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || s;
  return last.slice(0, 1).toUpperCase();
}

function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  if (!s) return null;

  // Already absolute URL - check if hostname is accessible
  if (/^https?:\/\//i.test(s)) {
    // If hostname is 'nginx' (Docker network hostname), replace with current origin
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

  // Relative path - prepend current origin (nginx proxies /storage to backend)
  if (s.startsWith("/storage/") || s.startsWith("storage/")) {
    return window.location.origin + "/" + s.replace(/^\/+/, "");
  }

  return s;
}

function CartIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 6h15l-2 9H8L7 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M7 6 6 3H2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WishlistIcon() {
  return <HeartOutlineIcon size={18} className="hfIconSvg" />;
}

function UserIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8h16M4 16h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="hfIconSvg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeaderPage({ active = "Home" }: { active?: NavKey }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const savedUser = useAuthStore((state) => state.userStr);

  const hideSearch = location.pathname === "/products";

  const user = useMemo(() => {
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser) as StoredUser;
    } catch {
      return { name: savedUser };
    }
  }, [savedUser]);

  const [cartQty, setCartQty] = useState(() => cartCount(getCart()));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActiveIdx, setSearchActiveIdx] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return (
      typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
    );
  });

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark";

    if (isDark) {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  };

  type Notif = {
    id: number;
    type?: string | null;
    title?: string | null;
    body?: string | null;
    data?: Record<string, unknown> | null;
    read_at?: string | null;
    created_at?: string | null;
  };
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifWrapRef = useRef<HTMLDivElement | null>(null);

  const notifQuery = useApiQuery<{ data: Notif[]; unread: number }>(
    ["notifications"],
    `/notifications?per_page=10&unread=1`,
    {
      enabled: !!user,
      staleTime: 60000,
    },
  );

  const notifRows = Array.isArray(notifQuery.data?.data)
    ? notifQuery.data.data
    : [];
  const notifUnread = Number(notifQuery.data?.unread ?? 0) || 0;
  const notifLoading = notifQuery.isLoading;

  useEffect(() => {
    if (notifOpen && user) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [notifOpen, user, queryClient]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (notifWrapRef.current && notifWrapRef.current.contains(t)) return;
      setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const markNotifRead = async (id: number) => {
    if (!user) return;
    try {
      await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await apiFetch(`/notifications/read-all`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      // ignore
    }
  };

  const openFromNotif = async (n: Notif) => {
    await markNotifRead(n.id);
    const type = (n.type || "").toString();
    const data = (n.data || {}) as Record<string, unknown>;
    if (type.startsWith("order_return_") && typeof data.order_id === "number") {
      navigate(`/orders/${data.order_id}`);
      setNotifOpen(false);
      return;
    }
    if (typeof data.order_id === "number") {
      navigate(`/orders/${data.order_id}`);
      setNotifOpen(false);
      return;
    }
    if (typeof data.post_slug === "string") {
      navigate(`/blog/${data.post_slug}`);
      setNotifOpen(false);
      return;
    }
    if (typeof data.action_url === "string") {
      navigate(data.action_url);
      setNotifOpen(false);
      return;
    }
    setNotifOpen(false);
  };

  useEffect(() => {
    const onCart = () => setCartQty(cartCount(getCart()));
    window.addEventListener("cart-change", onCart);
    window.addEventListener("storage", onCart);
    return () => {
      window.removeEventListener("cart-change", onCart);
      window.removeEventListener("storage", onCart);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleNav = (item: NavKey) => {
    if (item === "Home") {
      navigate("/");
      return;
    }
    if (item === "Product") {
      navigate("/products");
      return;
    }
    if (item === "Accessory") {
      navigate("/products?category=linh-kien");
      return;
    }
    if (item === "Blog") {
      navigate("/blog");
      return;
    }
    if (item === "Contact") {
      navigate("/contact");
      return;
    }
    if (item === "About") {
      navigate("/about");
    }
  };

  const handleUserClick = () => {
    // 🔒 Token is in httpOnly cookie, check user state instead
    if (!user) {
      navigate("/login");
    } else {
      navigate("/profile");
    }
  };

  type SearchHit = {
    id: number;
    name: string;
    slug: string;
    main_image_url?: string | null;
    price?: string | number | null;
    sale_price?: string | number | null;
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchQuery.trim();
    setSearchOpen(false);
    if (!term) {
      navigate("/products");
      return;
    }
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSearchActiveIdx(-1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiFetch(
          `/products?search=${encodeURIComponent(val.trim())}&per_page=6`,
        );
        const json = res as { data?: SearchHit[] } | SearchHit[];
        const hits: SearchHit[] = Array.isArray(json)
          ? json
          : Array.isArray((json as { data?: SearchHit[] }).data)
            ? (json as { data: SearchHit[] }).data
            : [];
        setSearchResults(hits.slice(0, 6));
        setSearchOpen(hits.length > 0);
      } catch {
        setSearchResults([]);
        setSearchOpen(false);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen || !searchResults.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchActiveIdx((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && searchActiveIdx >= 0) {
      e.preventDefault();
      const hit = searchResults[searchActiveIdx];
      if (hit) {
        setSearchOpen(false);
        navigate(`/products/${hit.slug}`);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (searchWrapRef.current && searchWrapRef.current.contains(t)) return;
      setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (hideSearch) setSearchOpen(false);
  }, [hideSearch]);

  return (
    <header className={`hfHeader ${menuOpen ? "hfMenuOpen" : ""}`}>
      <div className="hfHeaderInner">
        <button
          type="button"
          className="hfLogo hfLogoBrand"
          aria-label="E-TECH MARKET — Trang chủ"
          onClick={() => navigate("/")}
        >
          <img
            className="hfLogoImg"
            src={darkMode ? "/logo-trang.png" : "/logo.png"}
            alt=""
            decoding="async"
          />
        </button>

        {menuOpen && (
          <div className="hfNavOverlay" onClick={() => setMenuOpen(false)} />
        )}

        <nav
          className={`hfNav ${menuOpen ? "hfNavMobileOpen" : ""}`}
          aria-label="Điều hướng chính"
        >
          {NAV.map((item) => (
            <div
              key={item}
              role="button"
              tabIndex={0}
              className={`hfNavItem ${item === active ? "hfNavItemActive" : ""}`}
              onClick={() => handleNav(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNav(item);
                }
              }}
            >
              {NAV_LABEL[item]}
            </div>
          ))}
          {user && isAdminUser(user) && (
            <div
              role="button"
              tabIndex={0}
              className={`hfNavItem ${location.pathname.startsWith("/admin") ? "hfNavItemActive" : ""}`}
              onClick={() => navigate("/admin")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/admin");
                }
              }}
            >
              Quản trị
            </div>
          )}

          <div className="hfNavDivider hfMobileOnly" />

          <div
            className="hfNavItem hfMobileOnly"
            onClick={() => navigate("/wishlist")}
          >
            <WishlistIcon />
            <span>Yêu thích</span>
          </div>

          <div
            className="hfNavItem hfMobileOnly"
            onClick={() => navigate("/notifications")}
          >
            <BellIcon />
            <span>Thông báo</span>
            {notifUnread > 0 && (
              <span className="hfNavBadgeMobile">
                {notifUnread > 99 ? "99+" : notifUnread}
              </span>
            )}
          </div>
        </nav>

        {!hideSearch && (
          <div className="hfSearchWrap" ref={searchWrapRef}>
            <form
              className="hfSearch"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <input
                type="search"
                className="hfSearchInput"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                autoComplete="off"
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0) setSearchOpen(true);
                }}
              />
              <button
                type="submit"
                className="hfSearchButton"
                aria-label="Tìm kiếm"
              >
                {searchLoading ? (
                  <svg
                    className="hfSearchIcon hfSearchSpinner"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="28"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg
                    className="hfSearchIcon"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="m16.5 16.5 4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </form>
            {searchOpen && searchResults.length > 0 && (
              <div
                className="hfSearchDropdown"
                role="listbox"
                aria-label="Gợi ý tìm kiếm"
              >
                {searchResults.map((hit, idx) => {
                  const price = Number(hit.sale_price ?? hit.price ?? 0);
                  return (
                    <button
                      key={hit.id}
                      type="button"
                      role="option"
                      aria-selected={idx === searchActiveIdx}
                      className={`hfSearchItem${idx === searchActiveIdx ? " hfSearchItemActive" : ""}`}
                      onMouseEnter={() => setSearchActiveIdx(idx)}
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(`/products/${hit.slug}`);
                      }}
                    >
                      <svg
                        className="hfSearchItemIcon"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          cx="11"
                          cy="11"
                          r="7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <path
                          d="m16.5 16.5 4 4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="hfSearchItemInfo">
                        <span className="hfSearchItemName">{hit.name}</span>
                        {price > 0 && (
                          <span className="hfSearchItemPrice">
                            {price.toLocaleString("vi-VN")}₫
                          </span>
                        )}
                      </div>
                      {hit.main_image_url ? (
                        <img
                          className="hfSearchItemImg"
                          src={
                            resolveAvatarUrl(hit.main_image_url) ??
                            hit.main_image_url
                          }
                          alt=""
                          decoding="async"
                        />
                      ) : (
                        <div className="hfSearchItemImgPlaceholder" />
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="hfSearchViewAll"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate(
                      `/products?search=${encodeURIComponent(searchQuery.trim())}`,
                    );
                  }}
                >
                  Xem tất cả kết quả cho &ldquo;{searchQuery.trim()}&rdquo;
                </button>
              </div>
            )}
          </div>
        )}

        <div className="hfHeaderRight" aria-label="Thao tác trên header">
          <button
            type="button"
            className="hfIconBtn hfThemeBtn"
            aria-label="Chuyển đổi giao diện sáng/tối"
            onClick={toggleTheme}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          <button
            type="button"
            className="hfIconBtn hfCartBtn"
            aria-label="Giỏ hàng"
            onClick={() => navigate("/cart")}
          >
            <CartIcon />
            {cartQty > 0 && <span className="hfCartBadge">{cartQty}</span>}
          </button>

          <button
            type="button"
            className="hfIconBtn hfWishlistBtn hfHideOnMobile"
            aria-label="Danh sách yêu thích"
            onClick={() => navigate("/wishlist")}
          >
            <WishlistIcon />
          </button>

          <div className="hfNotifWrap hfHideOnMobile" ref={notifWrapRef}>
            <button
              type="button"
              className="hfIconBtn hfNotifBtn"
              aria-label="Thông báo"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <BellIcon />
              {notifUnread > 0 && (
                <span className="hfNotifBadge">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              )}
            </button>
            {notifOpen ? (
              <div className="hfNotifMenu" role="menu">
                <div className="hfNotifHead">
                  <div className="hfNotifTitle">Thông báo</div>
                  <button
                    type="button"
                    className="hfNotifMarkAll"
                    onClick={() => void markAllRead()}
                  >
                    Đọc tất cả
                  </button>
                </div>
                {notifLoading ? (
                  <div className="hfNotifEmpty">Đang tải…</div>
                ) : !user ? (
                  <div className="hfNotifEmpty">
                    Vui lòng đăng nhập để xem thông báo.
                  </div>
                ) : !notifRows.length ? (
                  <div className="hfNotifEmpty">Chưa có thông báo.</div>
                ) : (
                  <div className="hfNotifList">
                    {notifRows.slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`hfNotifRow ${n.read_at ? "" : "unread"}`}
                        onClick={() => void openFromNotif(n)}
                      >
                        <div className="hfNotifRowTitle">{n.title || "—"}</div>
                        <div className="hfNotifRowBody">{n.body || ""}</div>
                      </button>
                    ))}
                  </div>
                )}
                {user ? (
                  <button
                    type="button"
                    className="hfNotifViewAll"
                    onClick={() => {
                      setNotifOpen(false);
                      navigate("/notifications");
                    }}
                  >
                    Xem tất cả
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hfUserMenu">
            <button
              type="button"
              className={`hfIconBtn ${user ? "hfUserActive" : ""}`}
              aria-label="Tài khoản"
              onClick={handleUserClick}
            >
              {user ? (
                resolveAvatarUrl(user.avatar_url) ? (
                  <span className="hfAvatar" aria-hidden="true">
                    <img
                      className="hfAvatarImg"
                      src={resolveAvatarUrl(user.avatar_url) || ""}
                      alt=""
                      decoding="async"
                    />
                  </span>
                ) : (
                  <span
                    className="hfAvatar hfAvatarFallback"
                    aria-hidden="true"
                  >
                    {firstLetter(user.username || user.name || "")}
                  </span>
                )
              ) : (
                <UserIcon />
              )}
            </button>
          </div>

          <button
            type="button"
            className="hfIconBtn hfMenuBtn"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
