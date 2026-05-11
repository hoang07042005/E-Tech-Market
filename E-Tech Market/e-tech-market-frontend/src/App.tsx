import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiFetch } from './lib/api'

import {
  AUTH_EXPIRED_EVENT,
  ensureAuthExpiryMigrated,
  isAuthSessionExpired,
  performAuthSessionExpiry,
} from './lib/authSession'

import './App.css'
import HeaderPage from './components/HeaderPage'
import FooterPage from './components/FooterPage'
import HomePage from './pages/home/HomePage'
import ProductsPage from './pages/products/ProductsPage'
import AuthPage from './auth/AuthPage'
import ForgotPasswordPage from './auth/ForgotPasswordPage'
import ResetPasswordPage from './auth/ResetPasswordPage'
import AdminPage from './adminPage/AdminPage'
import ProductDetailPage from './pages/products/ProductDetailPage'
import ProductNewsDetailPage from './pages/products/ProductNewsDetailPage'
import CartPage from './pages/cart/CartPage'
import CheckoutPage from './pages/checkout/CheckoutPage'
import TermsOfServicePage from './pages/legal/TermsOfServicePage'
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage'
import ContactPage from './pages/contact/ContactPage'
import AboutPage from './pages/about/AboutPage'
import WishlistPage from './pages/wishlist/WishlistPage'
import ProfilePage from './pages/profile/ProfilePage'
import OrdersPage from './pages/orders/OrdersPage'
import OrderDetailPage from './pages/orders/OrderDetailPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import SecurityPage from './pages/profile/SecurityPage'
import CouponsPage from './pages/profile/CouponsPage'
import BlogPage from './pages/blog/BlogPage'
import BlogPostDetailPage from './pages/blog/BlogPostDetailPage'

type StoredUserJson = {
  roles?: { slug?: string }[]
}

function parseStoredUser(raw: string): StoredUserJson | null {
  try {
    const data = JSON.parse(raw) as unknown
    return data !== null && typeof data === 'object' ? (data as StoredUserJson) : null
  } catch {
    return null
  }
}

// function isAdminStoredUser(user: StoredUserJson | null): boolean {
//   return (
//     user !== null &&
//     Array.isArray(user.roles) &&
//     user.roles.some((role) => role?.slug === 'admin')
//   )
// }

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const userStr = localStorage.getItem('user')
  const token = localStorage.getItem('token')

  if (!userStr || !token) {
    return <Navigate to="/login" replace />
  }

  const user = parseStoredUser(userStr)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  const isAdmin =
    Array.isArray(user.roles) &&
    user.roles.some((role) => role?.slug === 'admin')

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
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

  useEffect(() => {
    let mounted = true
    apiFetch<{ maintenance_mode: boolean }>('/api/store/config')
      .then((res) => {
        if (mounted) setMaintenanceMode(!!res.maintenance_mode)
      })
      .catch(() => {
        if (mounted) setMaintenanceMode(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  /** Phiên đăng nhập 24h: kiểm tra khi đổi route + mỗi phút. */
  useEffect(() => {
    const goExpired = () => {
      navigate('/login?session=expired', { replace: true })
    }

    const check = () => {
      if (!localStorage.getItem('token')) return
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
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>
  }

  // Block client UI if maintenance mode is ON, unless we are on Admin or Login pages
  const isMaintenanceBlocked = maintenanceMode && !path.startsWith('/admin') && path !== '/login'

  if (isMaintenanceBlocked) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Hệ thống đang bảo trì</h1>
        <p style={{ fontSize: '18px', color: '#4b5563' }}>Chúng tôi đang nâng cấp hệ thống. Vui lòng quay lại sau ít phút.</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      {!hideChrome && <HeaderPage active={headerActive} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
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

        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/register" element={<AuthPage initialMode="register" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
       
      </Routes>
      {!hideChrome && <FooterPage />}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppFrame />
    </Router>
  )
}