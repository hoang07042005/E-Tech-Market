import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '@/styles/admin/AdminPage.css'
import DashboardContent from './dashboard/DashboardPage'
import CategoryPage from './categories/CategoryPage'
import ProductPage from './products/ProductPage'
import ProductNewsPage from './products/ProductNewsPage'
import ShopQnaInboxPage from './shopQna/ShopQnaInboxPage'
import ReviewsAdminPage from './reviews/ReviewsAdminPage'
import ContactsAdminPage from './contacts/ContactsAdminPage'
import CouponsAdminPage from './coupons/CouponsAdminPage'
import UsersAdminPage from './users/UsersAdminPage'
import OrdersAdminPage from './orders/OrdersAdminPage'
import SettingsAdminPage from './settings/SettingsAdminPage'
import NotificationsAdminPage from './notifications/NotificationsAdminPage'
import AdminBlogPage from './blog/AdminBlogPage'
import AdminFlashSalePage from './flashSale/AdminFlashSalePage'
import BannerAdminPage from './banners/BannerAdminPage'
import VideoAdminPage from './videos/VideoAdminPage'
import VideoCategoryPage from './categories/VideoCategoryPage'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'


type AdminTab =
  | 'dashboard'
  | 'products'
  | 'productNews'
  | 'categories'
  | 'shopQna'
  | 'reviews'
  | 'contactMessages'
  | 'coupons'
  | 'orders'
  | 'notifications'
  | 'users'
  | 'blog'
  | 'flashSale'
  | 'banners'
  | 'videos'
  | 'settings'
  | 'videoCategories'

const ADMIN_TAB_TITLE: Record<AdminTab, string> = {
  dashboard: 'Bảng điều khiển',
  products: 'Sản phẩm',
  productNews: 'Tin sản phẩm',
  categories: 'Danh mục',
  shopQna: 'Hỏi đáp cửa hàng',
  reviews: 'Đánh giá sản phẩm',
  contactMessages: 'Liên hệ khách hàng',
  coupons: 'Mã giảm giá',
  orders: 'Đơn hàng',
  notifications: 'Thông báo',
  users: 'Người dùng',
  blog: 'Tin tức Blog',
  flashSale: 'Flash Sale',
  banners: 'Banners',
  videos: 'Videos',
  settings: 'Cài đặt',
  videoCategories: 'Danh mục Video',
}

function readUserNameFromStorage(): string {
  const userStr = localStorage.getItem('user')
  if (!userStr) return 'Quản trị'
  try {
    const user = JSON.parse(userStr) as { name?: string }
    return user.name || 'Quản trị'
  } catch {
    return 'Quản trị'
  }
}

function readUserRoleFromStorage(): string {
  const userStr = localStorage.getItem('user')
  if (!userStr) return 'Quản trị viên'
  try {
    const user = JSON.parse(userStr) as { roles?: Array<{ name?: string; slug?: string }> }
    const r = user.roles?.[0]
    if (r?.name) return r.name
    if (r?.slug === 'admin') return 'Quản trị viên'
    if (r?.slug === 'customer') return 'Khách hàng'
    return 'Quản trị viên'
  } catch {
    return 'Quản trị viên'
  }
}

function readUserEmailFromStorage(): string {
  const userStr = localStorage.getItem('user')
  if (!userStr) return 'admin@etech.com'
  try {
    const user = JSON.parse(userStr) as { email?: string; username?: string }
    return user.email || user.username || 'admin@etech.com'
  } catch {
    return 'admin@etech.com'
  }
}

function readUserAvatarFromStorage(): string | null {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    const user = JSON.parse(userStr) as { avatar_url?: string | null; avatarUrl?: string | null }
    return (user.avatar_url ?? user.avatarUrl ?? null) || null
  } catch {
    return null
  }
}

function resolveAdminImg(url?: string | null): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function hasPermissionForTab(tab: AdminTab): boolean {
  const userStr = localStorage.getItem('user')
  if (!userStr) return false
  try {
    const user = JSON.parse(userStr) as { roles?: Array<{ slug?: string }> }
    const roles = (user.roles ?? []).map(r => r.slug || '')
    
    // Super Admin has all permissions
    if (roles.includes('admin')) return true
    
    switch (tab) {
      case 'dashboard':
        return true // Everyone can view the dashboard
      case 'products':
      case 'categories':
        return roles.includes('warehouse-staff')
      case 'orders':
        return roles.includes('order-staff') || roles.includes('warehouse-staff')
      case 'blog':
      case 'productNews':
        return roles.includes('editor')
      case 'coupons':
        return roles.includes('admin')
      case 'users':
        return roles.includes('admin')
      case 'settings':
        return roles.includes('admin')
      case 'flashSale':
      case 'banners':
      case 'videos':
      case 'videoCategories':
        return roles.includes('admin')
      case 'reviews':
      case 'shopQna':
      case 'contactMessages':
      case 'notifications':
        return roles.includes('admin')
      default:
        return false
    }
  } catch {
    return false
  }
}

export default function AdminPage() {
  const { tab } = useParams<{ tab: string }>()
  const activeTab = (tab || 'dashboard') as AdminTab
  const navigate = useNavigate()
  
  const setActiveTab = (newTab: AdminTab) => {
    navigate(`/admin/${newTab}`)
  }

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [createProductTick, setCreateProductTick] = useState(0)
  const [openEditProductId, setOpenEditProductId] = useState<number | null>(null)
  const [openEditProductTick, setOpenEditProductTick] = useState(0)
  const [userName] = useState(readUserNameFromStorage)
  const [userRole] = useState(readUserRoleFromStorage)
  const [userEmail] = useState(readUserEmailFromStorage)
  const [userAvatarUrl] = useState(readUserAvatarFromStorage)
  const [logoSrc, setLogoSrc] = useState('/logo.png')
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  type QuickProduct = {
    id: number
    name: string
    brand?: string | null
    main_image_url?: string | null
    category_name?: string | null
  }
  const [qSearch, setQSearch] = useState('')
  const [qOpen, setQOpen] = useState(false)
  const [qLoading, setQLoading] = useState(false)
  const [qRows, setQRows] = useState<QuickProduct[]>([])
  const [qCatHits, setQCatHits] = useState<{ name: string; items: QuickProduct[] }[]>([])

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
  const notifWrapRef = useRef<HTMLDivElement | null>(null)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)

  const loadNotifs = useCallback(async () => {
    if (!token) return
    setNotifLoading(true)
    try {
      const res = await apiFetch<{ data: Notif[]; unread: number }>('/notifications?per_page=20&unread=1', { token })
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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (searchWrapRef.current && searchWrapRef.current.contains(t)) return
      setQOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    const query = qSearch.trim()
    if (!qOpen) return
    if (!token) return
    if (query.length < 2) return

    const t = window.setTimeout(() => {
      setQLoading(true)
      ;(async () => {
        try {
          const data = await apiFetch<unknown[]>(`/api/admin/products`, { token })
          const rows: QuickProduct[] = (Array.isArray(data) ? data : []).map((p) => {
            const obj = (p ?? {}) as Record<string, unknown>
            const cat = (obj.category ?? {}) as Record<string, unknown>
            return {
              id: Number(obj.id),
              name: String(obj.name || ''),
              brand: (typeof obj.brand === 'string' ? obj.brand : null),
              main_image_url: (typeof obj.main_image_url === 'string' ? obj.main_image_url : null),
              category_name: (typeof cat.name === 'string' ? cat.name : null),
            }
          })
          const qLower = query.toLowerCase()

          // 1) Category matches → show category block(s)
          const cats = Array.from(
            new Set(rows.map(r => (r.category_name || '').trim()).filter(Boolean))
          )
          const matchedCats = cats.filter(c => c.toLowerCase().includes(qLower)).slice(0, 3)
          const catBlocks = matchedCats.map((c) => ({
            name: c,
            items: rows.filter(r => (r.category_name || '').trim() === c).slice(0, 8),
          }))
          setQCatHits(catBlocks)

          // 2) Direct product matches (name/brand/category)
          const idsInCats = new Set<number>()
          for (const g of catBlocks) for (const it of g.items) idsInCats.add(it.id)

          const filtered = rows
            .filter((r) => `${r.name} ${r.brand || ''} ${r.category_name || ''}`.toLowerCase().includes(qLower))
            .filter((r) => !idsInCats.has(r.id))
            .slice(0, 8)
          setQRows(filtered)
        } catch {
          setQRows([])
          setQCatHits([])
        } finally {
          setQLoading(false)
        }
      })()
    }, 220)

    return () => window.clearTimeout(t)
  }, [qSearch, qOpen, token])

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
    if (type === 'order_return_request') {
      setActiveTab('orders')
      window.dispatchEvent(new CustomEvent('admin-open-returns'))
      setNotifOpen(false)
      return
    }
    if (type === 'shop_qna_new') {
      setActiveTab('shopQna')
      setNotifOpen(false)
      return
    }
    if (type === 'low_stock') {
      setActiveTab('products')
      setNotifOpen(false)
      return
    }
    // Fallback: if order_id exists
    if (typeof data.order_id === 'number') {
      setActiveTab('orders')
      setNotifOpen(false)
    }
  }

  const resolveAvatar = (url?: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  }

  return (
    <div className={`adminLayout ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Overlay for Mobile */}
      <div className="adminSidebarOverlay" onClick={() => setIsSidebarCollapsed(true)}></div>

      {/* Sidebar */}
      <aside className="adminSidebarPremium">
        <div className="adminBrand">
          <img className="adminBrandLogoImg" src={logoSrc} alt="" decoding="async" />
          {!isSidebarCollapsed }
        </div>

        <nav className="adminSidebarNav">
          <SidebarSection title="CHÍNH" collapsed={isSidebarCollapsed} />
          <SidebarItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} label="Bảng điều khiển" collapsed={isSidebarCollapsed} />
          {hasPermissionForTab('orders') && <SidebarItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<CartIcon />} label="Đơn hàng" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('flashSale') && <SidebarItem active={activeTab === 'flashSale'} onClick={() => setActiveTab('flashSale')} icon={<FlashIcon />} label="Flash Sale" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('products') && <SidebarItem active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<BoxIcon />} label="Sản phẩm" collapsed={isSidebarCollapsed} />}

          {(hasPermissionForTab('categories') || hasPermissionForTab('videoCategories') || hasPermissionForTab('productNews') || hasPermissionForTab('coupons')) && (
            <SidebarSection title="QUẢN LÝ SẢN PHẨM" collapsed={isSidebarCollapsed} />
          )}
          {hasPermissionForTab('categories') && <SidebarItem active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<GridIcon />} label="Danh mục sản phẩm" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('videoCategories') && <SidebarItem active={activeTab === 'videoCategories'} onClick={() => setActiveTab('videoCategories')} icon={<GridIcon />} label="Danh mục video" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('productNews') && <SidebarItem active={activeTab === 'productNews'} onClick={() => setActiveTab('productNews')} icon={<NewspaperIcon />} label="Tin sản phẩm" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('coupons') && <SidebarItem active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} icon={<TicketIcon />} label="Mã giảm giá" collapsed={isSidebarCollapsed} />}

          {(hasPermissionForTab('users') || hasPermissionForTab('reviews') || hasPermissionForTab('shopQna') || hasPermissionForTab('contactMessages')) && (
            <SidebarSection title="QUẢN LÝ KHÁCH HÀNG" collapsed={isSidebarCollapsed} />
          )}
          {hasPermissionForTab('users') && <SidebarItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UserGroupIcon />} label="Người dùng" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('reviews') && <SidebarItem active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} icon={<StarIcon />} label="Đánh giá" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('shopQna') && <SidebarItem active={activeTab === 'shopQna'} onClick={() => setActiveTab('shopQna')} icon={<ChatBubbleIcon />} label="Hỏi đáp cửa hàng" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('contactMessages') && <SidebarItem active={activeTab === 'contactMessages'} onClick={() => setActiveTab('contactMessages')} icon={<MailIcon />} label="Liên hệ" collapsed={isSidebarCollapsed} />}

          {(hasPermissionForTab('blog') || hasPermissionForTab('notifications')) && (
            <SidebarSection title="NỘI DUNG & TRUYỀN THÔNG" collapsed={isSidebarCollapsed} />
          )}
          {hasPermissionForTab('blog') && <SidebarItem active={activeTab === 'blog'} onClick={() => setActiveTab('blog')} icon={<NewspaperIcon />} label="Tin tức Blog" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('banners') && <SidebarItem active={activeTab === 'banners'} onClick={() => setActiveTab('banners')} icon={<ImageIcon />} label="Banners" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('videos') && <SidebarItem active={activeTab === 'videos'} onClick={() => setActiveTab('videos')} icon={<VideoIcon />} label="Videos" collapsed={isSidebarCollapsed} />}
          {hasPermissionForTab('notifications') && <SidebarItem active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<BellIcon />} label="Thông báo" collapsed={isSidebarCollapsed} />}

          {hasPermissionForTab('settings') && (
            <>
              <SidebarSection title="HỆ THỐNG" collapsed={isSidebarCollapsed} />
              <SidebarItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon />} label="Cài đặt" collapsed={isSidebarCollapsed} />
            </>
          )}
        </nav>

        <div className="adminSidebarFooter">
          {!isSidebarCollapsed && (
            <div className="adminSidebarUserCard">
              {userAvatarUrl ? (
                <img
                  className="adminSidebarUserAvatarImg"
                  src={resolveAvatar(userAvatarUrl) || undefined}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="adminSidebarUserAvatar" aria-hidden>{userName.charAt(0)}</div>
              )}
              <div className="adminSidebarUserInfo">
                <div className="adminSidebarUserName">{userName || 'Quản trị viên'}</div>
                <div className="adminSidebarUserEmail">{userEmail}</div>
              </div>
            </div>
          )}

          <button className="adminSidebarAction" onClick={() => navigate('/')}>
            <ExitIcon />
            {!isSidebarCollapsed && <span>Về cửa hàng</span>}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="adminMainArea">
        <header className="adminTopBar">
          <div className="adminTopBarLeft">
            <button
              className="adminToggleBtn"
              onClick={() => {
                setIsSidebarCollapsed((current) => !current)
                setLogoSrc((current) => (current === '/logo.png' ? '/logoEtech.png' : '/logo.png'))
              }}
            >
              <MenuIcon />
            </button>
            <div className="adminBreadcrumb">
              <span className="breadcrumbParent">Quản trị</span>
              <span className="breadcrumbSeparator">/</span>
              <span className="breadcrumbCurrent">{ADMIN_TAB_TITLE[activeTab]}</span>
            </div>
          </div>

          <div className="adminTopBarRight">
            <div className="adminSearchBox" ref={searchWrapRef}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Tìm nhanh…"
                value={qSearch}
                onChange={(e) => {
                  const v = e.target.value
                  setQSearch(v)
                  setQOpen(true)
                  if (v.trim().length < 2) {
                    setQRows([])
                    setQCatHits([])
                  }
                }}
                onFocus={() => {
                  setQOpen(true)
                  if (qSearch.trim().length < 2) {
                    setQRows([])
                    setQCatHits([])
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setQOpen(false)
                }}
              />

              {qOpen && (
                <div className="adminQuickMenu" role="menu">
                  <div className="adminQuickHead">Tìm sản phẩm</div>
                  {qSearch.trim().length < 2 ? (
                    <div className="adminQuickEmpty">Nhập ít nhất 2 ký tự…</div>
                  ) : qLoading ? (
                    <div className="adminQuickEmpty">Đang tìm…</div>
                  ) : !qRows.length && !qCatHits.length ? (
                    <div className="adminQuickEmpty">Không tìm thấy.</div>
                  ) : (
                    <div className="adminQuickList">
                      {qCatHits.map((g) => (
                        <div key={g.name} className="adminQuickGroup">
                          <div className="adminQuickGroupHead">
                            <span className="adminQuickGroupName">{g.name}</span>
                          </div>
                          <div className="adminQuickDivider" />
                          {g.items.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className="adminQuickRow"
                              onClick={() => {
                                setActiveTab('products')
                                setOpenEditProductId(r.id)
                                setOpenEditProductTick((t) => t + 1)
                                setQOpen(false)
                              }}
                            >
                              <div className="adminQuickThumb">
                                {r.main_image_url ? (
                                  <img src={resolveAdminImg(r.main_image_url)} alt="" />
                                ) : (
                                  <span className="adminQuickThumbPh" aria-hidden />
                                )}
                              </div>
                              <div className="adminQuickBody">
                                <div className="adminQuickTitle">{r.name}</div>
                                <div className="adminQuickSub">{r.brand || '—'}</div>
                              </div>
                              <div className="adminQuickGo">Sửa</div>
                            </button>
                          ))}
                        </div>
                      ))}

                      {qCatHits.length > 0 && qRows.length > 0 && (
                        <div className="adminQuickDivider adminQuickDivider--spaced" />
                      )}

                      {qRows.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="adminQuickRow"
                          onClick={() => {
                            setActiveTab('products')
                            setOpenEditProductId(r.id)
                            setOpenEditProductTick((t) => t + 1)
                            setQOpen(false)
                          }}
                        >
                          <div className="adminQuickThumb">
                            {r.main_image_url ? (
                              <img src={resolveAdminImg(r.main_image_url)} alt="" />
                            ) : (
                              <span className="adminQuickThumbPh" aria-hidden />
                            )}
                          </div>
                          <div className="adminQuickBody">
                            <div className="adminQuickTitle">{r.name}</div>
                            <div className="adminQuickSub">{r.brand || r.category_name || '—'}</div>
                          </div>
                          <div className="adminQuickGo">Sửa</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* <button
              type="button"
              className="adminBtnSecondary"
              onClick={() => setLogoSrc((current) => (current === '/logo.png' ? '/logoEtech.png' : '/logo.png'))}
              title="Đổi logo admin"
            >
              Đổi logo
            </button> */}
            <div className="adminNotificationWrap" ref={notifWrapRef}>
              <button
                type="button"
                className="adminNotificationBtn"
                aria-label="Thông báo"
                onClick={() => setNotifOpen((v) => !v)}
              >
                <BellIcon />
                {notifUnread > 0 && <span className="adminNotificationDot" aria-hidden />}
              </button>
              {notifOpen ? (
                <div className="adminNotifMenu" role="menu">
                  <div className="adminNotifHead">
                    <div className="adminNotifTitle">Thông báo</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        className="adminNotifMarkAll"
                        onClick={() => {
                          setActiveTab('notifications')
                          setNotifOpen(false)
                        }}
                      >
                        Xem tất cả
                      </button>
                      <button type="button" className="adminNotifMarkAll" onClick={() => void markAllRead()}>
                        Đọc tất cả
                      </button>
                    </div>
                  </div>
                  {notifLoading ? (
                    <div className="adminNotifList" style={{ padding: '16px' }}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="admSkeletonBar" style={{ marginBottom: 14, width: i === 0 ? '70%' : (i === 1 ? '90%' : '60%'), height: 14 }} />
                      ))}
                    </div>
                  ) : !notifRows.length ? (
                    <div className="adminNotifEmpty">Chưa có thông báo.</div>
                  ) : (
                    <>
                      <div className="adminNotifList">
                        {notifRows.slice(0, 20).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className={`adminNotifRow ${n.read_at ? '' : 'unread'}`}
                            onClick={() => void openFromNotif(n)}
                          >
                            <div className="adminNotifRowTitle">{n.title || '—'}</div>
                            <div className="adminNotifRowBody">{n.body || ''}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div className="adminUserCard">
              {userAvatarUrl ? (
                <img
                  className="adminUserAvatarImg"
                  src={resolveAvatar(userAvatarUrl) || undefined}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="adminUserAvatar">{userName.charAt(0)}</div>
              )}
              <div className="adminUserInfo">
                <span className="adminUserName">{userName}</span>
                <span className="adminUserRole">{userRole}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="adminScrollContent">
          {activeTab === 'dashboard' && (
            <DashboardContent
              onCreateProduct={() => {
                setActiveTab('products')
                setCreateProductTick(t => t + 1)
              }}
            />
          )}
          {activeTab === 'products' && (
            <ProductPage
              createTick={createProductTick}
              openEditId={openEditProductId}
              openEditTick={openEditProductTick}
            />
          )}
          {activeTab === 'productNews' && <ProductNewsPage />}
          {activeTab === 'categories' && <CategoryPage />}
          {activeTab === 'videoCategories' && <VideoCategoryPage />}
          {activeTab === 'shopQna' && <ShopQnaInboxPage />}
          {activeTab === 'reviews' && <ReviewsAdminPage />}
          {activeTab === 'contactMessages' && <ContactsAdminPage />}
          {activeTab === 'coupons' && <CouponsAdminPage />}
          {activeTab === 'notifications' && <NotificationsAdminPage />}
          {activeTab === 'users' && <UsersAdminPage />}
          {activeTab === 'orders' && <OrdersAdminPage />}
          {activeTab === 'blog' && <AdminBlogPage />}
          {activeTab === 'banners' && <BannerAdminPage />}
          {activeTab === 'videos' && <VideoAdminPage />}
          {activeTab === 'flashSale' && <AdminFlashSalePage />}
          {activeTab === 'settings' && <SettingsAdminPage />}
        </div>

        {activeTab === 'dashboard' && <AdminFooter />}
      </main>
    </div>
  )
}

function AdminFooter() {
  return (
    <footer className="adminFooter">
      <div className="adminFooterInner">
        <div className="adminFooterBrand">
          <div className="adminFooterBrandName">E-Tech Market</div>
          <div className="adminFooterBrandDesc">
            Hệ thống quản trị thương mại điện tử chuyên nghiệp với độ chính xác và tin cậy cao nhất.
          </div>
        </div>

        <div className="adminFooterCopy">
          © {new Date().getFullYear()} E-Tech Market. Technical Precision &amp; Unwavering Reliability.
        </div>
      </div>
    </footer>
  )
}

type SidebarItemProps = {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  collapsed: boolean
  badge?: string
}

function FlashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function SidebarSection({ title, collapsed }: { title: string; collapsed: boolean }) {
  if (collapsed) return null
  return <div className="adminNavSectionTitle">{title}</div>
}

function SidebarItem({ active, onClick, icon, label, collapsed, badge }: SidebarItemProps) {
  return (
    <button className={`sidebarItem ${active ? 'active' : ''}`} onClick={onClick} title={collapsed ? label : ''}>
      <span className="sidebarItemIcon">{icon}</span>
      {!collapsed && <span className="sidebarItemLabel">{label}</span>}
      {!collapsed && badge && <span className="sidebarItemBadge">{badge}</span>}
    </button>
  )
}

function ChatBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H9l-5 4V7a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4z" />
    </svg>
  )
}

function NewspaperIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h7M8 14h7M8 18h5" strokeLinecap="round" />
      <path d="M4 6V4a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  )
}

/* ICONS */
function DashboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> }
function BoxIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8V21H3V8"></path><path d="M1 3H23V8H1V3Z"></path><path d="M10 12H14"></path></svg> }
function GridIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> }
function CartIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> }
function UserGroupIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> }
function SettingsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> }
function MenuIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg> }
function SearchIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> }
function BellIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> }
function ExitIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> }

