import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useApiQuery } from '@/features/api/useApiQuery'
import ErrorBoundary from '@/components/ErrorBoundary'
import { GlobalToastProvider } from '@/components/GlobalToastProvider'

import {
  AUTH_EXPIRED_EVENT,
  ensureAuthExpiryMigrated,
  isAuthSessionExpired,
  performAuthSessionExpiry,
} from '@/features/store/auth.store'

import '@/styles/App.css'
import HeaderPage from '@/components/HeaderPage'
import FooterPage from '@/components/FooterPage'
import ChatWidget from '@/components/ChatWidget'
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

function isStaffOrAdmin(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const roles = (user as { roles?: unknown }).roles
  return Array.isArray(roles) && roles.some((role: any) =>
    ['admin', 'warehouse-staff', 'order-staff', 'editor'].includes(role?.slug || ''),
  )
}

function useCurrentUser() {
  // 🔒 Token is now in httpOnly cookie, managed by browser automatically
  // We check if user is authenticated by attempting to fetch /api/me
  // The cookie will be sent automatically with credentials: 'include'
  return useApiQuery<any>(['currentUser'], '/api/me', {
    enabled: true, // Always try to fetch, backend will reject with 401 if not authenticated
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 🔒 Token is in httpOnly cookie, not localStorage
  // We rely on useCurrentUser() to validate authentication
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return <PageLoader />
  }

  if (isError || !isStaffOrAdmin(user)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="et-page-loader" style={{ minHeight: '50vh', background: 'transparent' }}>
      <div className="et-loader-spinner"></div>
      <div className="et-loader-text">Đang tải trang...</div>
    </div>
  )
}

function AppFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = (location.pathname || '').toLowerCase()



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
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
  const currentUser = currentUserQuery.data
  const isStaffOrAdminUser = isStaffOrAdmin(currentUser)

  useEffect(() => {
    if (!storeConfigQuery.data) return
    setMaintenanceMode(!!storeConfigQuery.data.maintenance_mode)
    setChatConfig(storeConfigQuery.data.chat || { service: 'none' })
  }, [storeConfigQuery.data])

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