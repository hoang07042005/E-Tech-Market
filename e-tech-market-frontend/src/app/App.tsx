import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useApiQuery } from '@/features/api/useApiQuery'
import ErrorBoundary from '@/components/ErrorBoundary'
import { GlobalToastProvider } from '@/components/GlobalToastProvider'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL, getAuthToken } from '@/configs/api.config'
import { useAuthStore } from '@/features/store/useAuthStore'

import {
  AUTH_EXPIRED_EVENT,
  ensureAuthExpiryMigrated,
  isAuthSessionExpired,
  performAuthSessionExpiry,
} from '@/features/store/auth.store'
import { syncCartFromBackend } from '@/features/services/cart.service'

import '@/styles/App.css'
import HeaderPage from '@/components/HeaderPage'
import FooterPage from '@/components/FooterPage'
import ChatWidget from '@/components/ChatWidget'
import EtechChatbotWidget from '@/components/EtechChatbotWidget'
import CompareTray from '@/components/CompareTray'

// Lazy load page components
const HomePage = lazy(() => import('@/features/pages/client/home/HomePage'))
const ProductsPage = lazy(() => import('@/features/pages/client/products/ProductsPage'))
const AuthPage = lazy(() => import('@/features/pages/client/auth/AuthPage'))
const ForgotPasswordPage = lazy(() => import('@/features/pages/client/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/pages/client/auth/ResetPasswordPage'))
const AdminPage = lazy(() => import('@/features/pages/admin/AdminPage'))
const ProductDetailPage = lazy(() => import('@/features/pages/client/products/ProductDetailPage'))
const ProductNewsDetailPage = lazy(() => import('@/features/pages/client/products/ProductNewsDetailPage'))
const CartPage = lazy(() => import('@/features/pages/client/cart/CartPage'))
const CheckoutPage = lazy(() => import('@/features/pages/client/checkout/CheckoutPage'))
const TermsOfServicePage = lazy(() => import('@/features/pages/client/info/TermsOfServicePage'))
const PurchaseTermsPage = lazy(() => import('@/features/pages/client/info/PurchaseTermsPage'))
const PrivacyPolicyPage = lazy(() => import('@/features/pages/client/info/PrivacyPolicyPage'))
const PaymentSecurityPolicyPage = lazy(() => import('@/features/pages/client/info/PaymentSecurityPolicyPage'))
const RefundPolicyPage = lazy(() => import('@/features/pages/client/info/RefundPolicyPage'))
const ComplaintPolicyPage = lazy(() => import('@/features/pages/client/info/ComplaintPolicyPage'))
const OneForOnePolicyPage = lazy(() => import('@/features/pages/client/info/OneForOnePolicyPage'))
const ContactPage = lazy(() => import('@/features/pages/client/info/ContactPage'))
const AboutPage = lazy(() => import('@/features/pages/client/info/AboutPage'))
const WishlistPage = lazy(() => import('@/features/pages/client/wishlist/WishlistPage'))
const ProfilePage = lazy(() => import('@/features/pages/client/profile/ProfilePage'))
const OrdersPage = lazy(() => import('@/features/pages/client/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/features/pages/client/orders/OrderDetailPage'))
const NotificationsPage = lazy(() => import('@/features/pages/client/notifications/NotificationsPage'))
const SecurityPage = lazy(() => import('@/features/pages/client/profile/SecurityPage'))
const CouponsPage = lazy(() => import('@/features/pages/client/profile/CouponsPage'))
const BlogPage = lazy(() => import('@/features/pages/client/blog/BlogPage'))
const BlogPostDetailPage = lazy(() => import('@/features/pages/client/blog/BlogPostDetailPage'))
const ComparePage = lazy(() => import('@/features/pages/client/products/ComparePage'))
const FlashSalePage = lazy(() => import('@/features/pages/client/products/FlashSalePage'))
const VideoPage = lazy(() => import('@/features/pages/client/video/VideoPage'))
const VideoDetailPage = lazy(() => import('@/features/pages/client/video/VideoDetailPage'))

// Using shared `queryClient` from configs/queryClient.ts

function isStaffOrAdmin(data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const response = data as { user?: unknown }
  // API returns {user: {roles: [...]}} - extract roles from nested user
  const userObj = response.user as { roles?: unknown } | undefined
  const roles = userObj?.roles || (data as { roles?: unknown }).roles
  if (!Array.isArray(roles)) return false
  return roles.some((role: any) =>
    ["admin", "warehouse-staff", "order-staff", "editor", "shop", "delivery"].includes(role?.slug || "")
  )
}

function useCurrentUser(forceEnabled?: boolean) {
  const userStr = useAuthStore((state) => state.userStr)
  // Only call /api/me when we have a session marker (user in localStorage)
  // or when explicitly forced (e.g. ProtectedRoute)
  const shouldFetch = forceEnabled ?? !!userStr
  return useApiQuery<any>(['currentUser'], '/api/me', {
    enabled: shouldFetch,
    retry: false,  // Don't retry on 401 — user is simply not logged in
    staleTime: 0,
    fetchOptions: { silent401: true }, // Suppress global error toast for unauthenticated users
  })
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 🔒 Token is in httpOnly cookie; userStr in localStorage signals a logged-in session
  const userStr = useAuthStore((state) => state.userStr)
  const { data: user, isLoading, isError } = useCurrentUser(true) // Always fetch for protected routes

  if (isLoading) {
    return <PageLoader />
  }

  // If there is an error fetching user data, treat as unauthenticated
  if (isError) {
    return <Navigate to="/login" replace />
  }

  // If /api/me hasn't resolved yet but we have a session marker, keep showing loader
  if (!user) {
    if (userStr) {
      return <PageLoader />
    }
    return <Navigate to="/login" replace />
  }

  if (!isStaffOrAdmin(user)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="et-page-loader" style={{ minHeight: '50vh', background: 'transparent', position: 'relative' }}>
      <div className="et-loader-spinner"></div>
      <div className="et-loader-text">Đang tải trang...</div>
    </div>
  )
}

function AppFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = (location.pathname || '').toLowerCase()
  const queryClient = useQueryClient()



  const headerActive = (() => {
    if (location.pathname.startsWith('/contact')) return 'Contact' as const
    if (location.pathname.startsWith('/about')) return 'About' as const
    if (location.pathname.startsWith('/blog')) return 'Blog' as const
    if (!location.pathname.startsWith('/products')) return 'Home' as const
    const category = new URLSearchParams(location.search).get('category')
    if (category === 'accessories' || category === 'linh-kien' || category === '4') return 'Accessory' as const
    return 'Product' as const
  })()

  const hideChrome =
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path.startsWith('/admin')

  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null)
  const [chatConfig, setChatConfig] = useState<any>(null)
  const currentUserQuery = useCurrentUser()
  const storeConfigQuery = useApiQuery<{ maintenance_mode: boolean; chat: any }>(['storeConfig'], '/api/store/config', {
    retry: 1,
    staleTime: 1000 * 60 * 5,
  })
  const currentUser = currentUserQuery.data
  const isStaffOrAdminUser = isStaffOrAdmin(currentUser)

  useEffect(() => {
    if (!storeConfigQuery.data) return
    setMaintenanceMode(!!storeConfigQuery.data.maintenance_mode)
    setChatConfig(storeConfigQuery.data.chat || { service: 'none' })
  }, [storeConfigQuery.data])

  useEffect(() => {
    if (currentUser) {
      syncCartFromBackend()
      
      let es: EventSource | null = null;
      let retryTimeout: number | undefined;
      
      const connectSSE = () => {
        const token = getAuthToken();
        const url = `${API_BASE_URL}/api/v1/sse/stream` + (token ? `?token=${token}` : '');
        es = new EventSource(url, { withCredentials: true });
        
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification_created') {
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } else if (data.type === 'payment_confirmed' || data.type === 'payment_failed') {
              queryClient.invalidateQueries({ queryKey: ['order', String(data.order_id)] });
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              window.dispatchEvent(new CustomEvent('payment_status_changed', { detail: data }));
            }
          } catch (e) {}
        };
        
        es.onerror = () => {
          es?.close();
          retryTimeout = window.setTimeout(connectSSE, 5000);
        };
      };
      
      connectSSE();
      
      return () => {
        es?.close();
        if (retryTimeout) clearTimeout(retryTimeout);
      };
    }
  }, [currentUser, queryClient])

  /** Phiên đăng nhập 24h: kiểm tra khi đổi route + mỗi phút. */
  useEffect(() => {
    const goExpired = () => {
      navigate('/login?session=expired', { replace: true })
    }

    const check = () => {
      // 🔒 Token is in httpOnly cookie, always check expiry
      // Don't rely on localStorage which is now deprecated
      ensureAuthExpiryMigrated()
      if (isAuthSessionExpired()) {
        performAuthSessionExpiry()
      }
    }

    const onExpired = () => goExpired()

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    check()
    const timer = window.setInterval(check, 60_000)
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
      window.clearInterval(timer)
    }
  }, [location.pathname, navigate])

  if (maintenanceMode === null) {
    // Admin routes should never be blocked by the maintenance loader
    if (path.startsWith('/admin')) {
      return (
        <div className="app-container">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/:tab"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </div>
      )
    }

    return (
      <div className="et-page-loader">
        <div className="et-loader-logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="var(--et-primary)" />
            <path d="M12 10H28V14H16V18H26V22H16V26H28V30H12V10Z" fill="white" />
          </svg>
          E-TECH
        </div>
        <div className="et-loader-spinner"></div>
        <div className="et-loader-text">Đang tải thông tin cần thiết...</div>
        <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
          Trải nghiệm của bạn sẽ sẵn sàng ngay bây giờ.
        </p>
      </div>
    )
  }

  // Block client UI if maintenance mode is ON, unless we are on Admin/Login pages or the user is Staff/Admin
  const isMaintenanceBlocked =
    maintenanceMode &&
    !isStaffOrAdminUser &&
    !path.startsWith('/admin') &&
    path !== '/login'

  if (isMaintenanceBlocked) {
    return (
      <div className="et-page-loader" style={{ background: '#f8fafc', padding: '24px' }}>
        <div className="et-maintenance-container">
          <div className="et-loader-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="var(--et-primary)" />
              <path d="M12 10H28V14H16V18H26V22H16V26H28V30H12V10Z" fill="white" />
            </svg>
            E-TECH
          </div>
          <h1 className="et-maintenance-title">Hệ thống đang bảo trì</h1>
          <p className="et-maintenance-desc">
            Chúng tôi đang tiến hành nâng cấp và tối ưu hệ thống nhằm mang đến trải nghiệm mua sắm nhanh chóng, ổn định và an toàn hơn cho khách hàng. Trong thời gian bảo trì, một số chức năng có thể tạm thời không khả dụng. Đội ngũ kỹ thuật đang nỗ lực hoàn tất quá trình nâng cấp trong thời gian sớm nhất. Cảm ơn bạn đã thông cảm và kiên nhẫn chờ đợi. Vui lòng quay lại sau ít phút để tiếp tục trải nghiệm dịch vụ tại E-TECH MARKET.
          </p>
          <div className="et-maintenance-badge">
            E-Tech Market
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {!hideChrome && <HeaderPage active={headerActive} />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/flash-sale" element={<FlashSalePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/videos" element={<VideoPage />} />
          <Route path="/videos/:id" element={<VideoDetailPage />} />
          <Route path="/product-news/:slug" element={<ProductNewsDetailPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/profile" element={<ProfilePage />}>
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="coupons" element={<CouponsPage />} />
          </Route>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/dieu-khoan" element={<TermsOfServicePage />} />
          <Route path="/dieu-khoan-mua-hang" element={<PurchaseTermsPage />} />
          <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
          <Route path="/chinh-sach-bao-mat-thanh-toan" element={<PaymentSecurityPolicyPage />} />
          <Route path="/chinh-sach-hoan-tien" element={<RefundPolicyPage />} />
          <Route path="/giai-quyet-khieu-nai" element={<ComplaintPolicyPage />} />
          <Route path="/quy-dinh-bao-hanh-1-doi-1" element={<OneForOnePolicyPage />} />

          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/register" element={<AuthPage initialMode="register" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/:tab"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      {!hideChrome && <FooterPage />}
      {!hideChrome && chatConfig && <ChatWidget config={chatConfig} />}
      {!hideChrome && <EtechChatbotWidget />}
      {!hideChrome && <CompareTray />}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <GlobalToastProvider>
        <ErrorBoundary>
          <AppFrame />
        </ErrorBoundary>
      </GlobalToastProvider>
    </Router>
  )
}





