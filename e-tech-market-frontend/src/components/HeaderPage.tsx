import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '@/styles/components/HeaderFooter.css'
import { cartCount, getCart } from '@/features/services/cart.service'
import { HeartOutlineIcon } from './icons/HeartIcon'
import { apiFetch } from '@/configs/api.config'


export type NavKey = 'Home' | 'Product' | 'Accessory' | 'Blog' | 'Contact' | 'About'

const NAV: NavKey[] = ['Home', 'Product', 'Accessory', 'Blog', 'Contact', 'About']

const NAV_LABEL: Record<NavKey, string> = {
  Home: 'Trang chủ',
  Product: 'Sản phẩm',
  Accessory: 'Linh kiện',
  Blog: 'Tin tức',
  Contact: 'Liên hệ',
  About: 'Giới thiệu',
}

type StoredUser = {
  name?: string
  username?: string
  avatar_url?: string | null
  roles?: { slug?: string }[]
}

function isAdminUser(user: StoredUser | null): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false
  const staffRoles = ['admin', 'warehouse-staff', 'order-staff', 'editor']
  return user.roles.some((r) => staffRoles.includes(r?.slug || ''))
}

function readStoredUser(): StoredUser | null {
  const savedUser = localStorage.getItem('user')
  const token = localStorage.getItem('token')
  if (!savedUser || !token) return null
  try {
    return JSON.parse(savedUser) as StoredUser
  } catch {
    return { name: savedUser }
  }
}

function firstLetter(name: string) {
  const s = (name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  const last = parts[parts.length - 1] || s
  return last.slice(0, 1).toUpperCase()
}

function CartIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 6h15l-2 9H8L7 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 6 6 3H2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function WishlistIcon() {
  return (
    <HeartOutlineIcon size={18} className="hfIconSvg" />
  )
}

function UserIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="hfIconSvg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export default function HeaderPage({ active = 'Home' }: { active?: NavKey }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<StoredUser | null>(readStoredUser)
  const [cartQty, setCartQty] = useState(() => cartCount(getCart()))
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (isDark) {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDarkMode(false)
    }
  }, [])

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setDarkMode(true)
    }
  }

  type Notif = {
    id: number
    type?: string | null
    title?: string | null
    body?: string | null
    data?: Record<string, unknown> | null
    read_at?: string | null
    created_at?: string | null
  }
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifRows, setNotifRows] = useState<Notif[]>([])
  const [notifUnread, setNotifUnread] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const notifWrapRef = useRef<HTMLDivElement | null>(null)

  const loadNotifs = useCallback(async () => {
    if (!token) return
    setNotifLoading(true)
    try {
      const res = await apiFetch<{ data: Notif[]; unread: number }>(`/notifications?per_page=10&unread=1`, { token })
      setNotifRows(Array.isArray(res.data) ? res.data : [])
      setNotifUnread(Number(res.unread ?? 0) || 0)
    } catch {
      // ignore
    } finally {
      setNotifLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!notifOpen) return
    const t = window.setTimeout(() => {
      void loadNotifs()
    }, 0)
    return () => window.clearTimeout(t)
  }, [notifOpen, loadNotifs])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (notifWrapRef.current && notifWrapRef.current.contains(t)) return
      setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const markNotifRead = async (id: number) => {
    if (!token) return
    try {
      await apiFetch(`/notifications/${id}/read`, { token, method: 'PATCH', body: JSON.stringify({}) })
      setNotifRows((p) => p.filter((n) => n.id !== id))
      setNotifUnread((u) => Math.max(0, u - 1))
    } catch {
      // ignore
    }
  }

  const markAllRead = async () => {
    if (!token) return
    try {
      await apiFetch(`/notifications/read-all`, { token, method: 'PATCH', body: JSON.stringify({}) })
      setNotifRows([])
      setNotifUnread(0)
    } catch {
      // ignore
    }
  }

  const openFromNotif = async (n: Notif) => {
    await markNotifRead(n.id)
    const type = (n.type || '').toString()
    const data = (n.data || {}) as Record<string, unknown>
    if (type.startsWith('order_return_') && typeof data.order_id === 'number') {
      navigate(`/orders/${data.order_id}`)
      setNotifOpen(false)
      return
    }
    if (typeof data.order_id === 'number') {
      navigate(`/orders/${data.order_id}`)
      setNotifOpen(false)
      return
    }
    if (typeof data.post_slug === 'string') {
      navigate(`/blog/${data.post_slug}`)
      setNotifOpen(false)
      return
    }
    if (typeof data.action_url === 'string') {
      navigate(data.action_url)
      setNotifOpen(false)
      return
    }
    setNotifOpen(false)
  }

  const refreshUser = useCallback(() => {
    setUser(readStoredUser())
  }, [])

  useEffect(() => {
    window.addEventListener('auth-change', refreshUser)
    window.addEventListener('storage', refreshUser)
    window.addEventListener('visibilitychange', refreshUser)
    return () => {
      window.removeEventListener('auth-change', refreshUser)
      window.removeEventListener('storage', refreshUser)
      window.removeEventListener('visibilitychange', refreshUser)
    }
  }, [refreshUser])

  useEffect(() => {
    const onCart = () => setCartQty(cartCount(getCart()))
    window.addEventListener('cart-change', onCart)
    window.addEventListener('storage', onCart)
    return () => {
      window.removeEventListener('cart-change', onCart)
      window.removeEventListener('storage', onCart)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleNav = (item: NavKey) => {
    if (item === 'Home') {
      navigate('/')
      return
    }
    if (item === 'Product') {
      navigate('/products')
      return
    }
    if (item === 'Accessory') {
      navigate('/products?category=linh-kien')
      return
    }
    if (item === 'Blog') {
      navigate('/blog')
      return
    }
    if (item === 'Contact') {
      navigate('/contact')
      return
    }
    if (item === 'About') {
      navigate('/about')
    }
  }

  const handleUserClick = () => {
    const savedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!savedUser || !token) {
      setUser(null)
      navigate('/login')
    } else {
      navigate('/profile')
    }
  }


  return (
    <header className={`hfHeader ${menuOpen ? 'hfMenuOpen' : ''}`}>
      <div className="hfHeaderInner">
        <button
          type="button"
          className="hfLogo hfLogoBrand"
          aria-label="E-TECH MARKET — Trang chủ"
          onClick={() => navigate('/')}
        >
          <img className="hfLogoImg" src="/logo.png" alt="" decoding="async" />
        </button>

        {menuOpen && (
          <div className="hfNavOverlay" onClick={() => setMenuOpen(false)} />
        )}

        <nav className={`hfNav ${menuOpen ? 'hfNavMobileOpen' : ''}`} aria-label="Điều hướng chính">
          {NAV.map((item) => (
            <div
              key={item}
              role="button"
              tabIndex={0}
              className={`hfNavItem ${item === active ? 'hfNavItemActive' : ''}`}
              onClick={() => handleNav(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleNav(item)
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
              className={`hfNavItem ${location.pathname.startsWith('/admin') ? 'hfNavItemActive' : ''}`}
              onClick={() => navigate('/admin')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate('/admin')
                }
              }}
            >
              Quản trị
            </div>
          )}

          <div className="hfNavDivider hfMobileOnly" />
          
          <div className="hfNavItem hfMobileOnly" onClick={() => navigate('/wishlist')}>
            <WishlistIcon />
            <span>Yêu thích</span>
          </div>

          <div className="hfNavItem hfMobileOnly" onClick={() => navigate('/notifications')}>
            <BellIcon />
            <span>Thông báo</span>
            {notifUnread > 0 && <span className="hfNavBadgeMobile">{notifUnread > 99 ? '99+' : notifUnread}</span>}
          </div>
        </nav>

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
            onClick={() => navigate('/cart')}
          >
            <CartIcon />
            {cartQty > 0 && <span className="hfCartBadge">{cartQty}</span>}
          </button>
          
          <button
            type="button"
            className="hfIconBtn hfWishlistBtn hfHideOnMobile"
            aria-label="Danh sách yêu thích"
            onClick={() => navigate('/wishlist')}
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
              {notifUnread > 0 && <span className="hfNotifBadge">{notifUnread > 99 ? '99+' : notifUnread}</span>}
            </button>
            {notifOpen ? (
              <div className="hfNotifMenu" role="menu">
                <div className="hfNotifHead">
                  <div className="hfNotifTitle">Thông báo</div>
                  <button type="button" className="hfNotifMarkAll" onClick={() => void markAllRead()}>
                    Đọc tất cả
                  </button>
                </div>
                {notifLoading ? (
                  <div className="hfNotifEmpty">Đang tải…</div>
                ) : !token ? (
                  <div className="hfNotifEmpty">Vui lòng đăng nhập để xem thông báo.</div>
                ) : !notifRows.length ? (
                  <div className="hfNotifEmpty">Chưa có thông báo.</div>
                ) : (
                  <div className="hfNotifList">
                    {notifRows.slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`hfNotifRow ${n.read_at ? '' : 'unread'}`}
                        onClick={() => void openFromNotif(n)}
                      >
                        <div className="hfNotifRowTitle">{n.title || '—'}</div>
                        <div className="hfNotifRowBody">{n.body || ''}</div>
                      </button>
                    ))}
                  </div>
                )}
                {token ? (
                  <button type="button" className="hfNotifViewAll" onClick={() => { setNotifOpen(false); navigate('/notifications') }}>
                    Xem tất cả
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hfUserMenu">
            <button
              type="button"
              className={`hfIconBtn ${user ? 'hfUserActive' : ''}`}
              aria-label="Tài khoản"
              onClick={handleUserClick}
            >
              {user ? (
                user.avatar_url ? (
                  <span className="hfAvatar" aria-hidden="true">
                    <img className="hfAvatarImg" src={user.avatar_url} alt="" decoding="async" />
                  </span>
                ) : (
                  <span className="hfAvatar hfAvatarFallback" aria-hidden="true">
                    {firstLetter(user.username || user.name || '')}
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
  )
}
