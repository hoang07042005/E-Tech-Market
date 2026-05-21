import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import '@/styles/admin/AdminPage.css'
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
import { apiFetch } from '@/configs/api.config'
import { fetchDashboardStats,  } from '@/features/services/admin/api.admin.service'
import { API_BASE_URL } from '@/configs/api.config'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

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
  | 'settings'

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
  settings: 'Cài đặt',
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

          {(hasPermissionForTab('categories') || hasPermissionForTab('productNews') || hasPermissionForTab('coupons')) && (
            <SidebarSection title="QUẢN LÝ SẢN PHẨM" collapsed={isSidebarCollapsed} />
          )}
          {hasPermissionForTab('categories') && <SidebarItem active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<GridIcon />} label="Danh mục" collapsed={isSidebarCollapsed} />}
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
          {activeTab === 'shopQna' && <ShopQnaInboxPage />}
          {activeTab === 'reviews' && <ReviewsAdminPage />}
          {activeTab === 'contactMessages' && <ContactsAdminPage />}
          {activeTab === 'coupons' && <CouponsAdminPage />}
          {activeTab === 'notifications' && <NotificationsAdminPage />}
          {activeTab === 'users' && <UsersAdminPage />}
          {activeTab === 'orders' && <OrdersAdminPage />}
          {activeTab === 'blog' && <AdminBlogPage />}
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

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        className="admChartTooltip"
        style={{
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          color: '#fff',
          fontSize: '13px',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px', color: '#94a3b8' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
          <span>Doanh thu: </span>
          <strong style={{ color: '#fb923c' }}>{payload[0].value.toLocaleString('vi-VN')} đ</strong>
        </div>
      </div>
    )
  }
  return null
}

function DashboardContent({ onCreateProduct }: { onCreateProduct: () => void }) {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | 'month' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${month}-01`
  })
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
  })
  const [showRangeDropdown, setShowRangeDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRangeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const rangeLabels: Record<'7d' | '30d' | 'month' | 'custom', string> = {
    month: 'Tháng này',
    '7d': '7 ngày',
    '30d': '30 ngày',
    custom: 'Tùy chọn ngày',
  }

  const [openOrderMenuId, setOpenOrderMenuId] = useState<number | null>(null)
  const [detailOrder, setDetailOrder] = useState<null | {
    id: number
    order_code: string
    customer_name: string
    customer_avatar_url?: string | null
    product: string
    total_amount: number
    created_date?: string
    status_label: string
    status_tone: 'ok' | 'wait' | 'bad'
  }>(null)

  type DashStats = {
    kpi: {
      revenue_30d: number
      current_orders: number
      total_products: number
      new_customers_7d: number
      avg_order_value_30d: number
      low_stock_variants: number
      low_stock_threshold: number
    }
    quick_tasks?: {
      pending_reviews: number
      low_stock_products: number
      pending_support: number
      pending_return_requests?: number
    }
    recent_activities?: Array<{
      dot: 'ok' | 'info' | 'warn'
      title: string
      desc: string
      time: string
    }>
    top_rated_products?: Array<{
      id: number
      name: string
      slug: string
      main_image_url?: string | null
      avg_rating: number
      reviews_count: number
    }>
    analytics?: {
      range?: '7d' | '30d' | 'month'
      revenue_7d: Array<{ date: string; label: string; value: number }>
      top_categories_30d: Array<{ name: string; pct: number }>
    }
    recent_orders?: Array<{
      id: number
      order_code: string
      customer_name: string
      customer_avatar_url?: string | null
      product: string
      total_amount: number
      created_at?: string | null
      created_date?: string
      status?: string
      status_label: string
      status_tone: 'ok' | 'wait' | 'bad'
    }>
    recent_reviews?: Array<{
      id: number
      user_name: string
      user_avatar_url?: string | null
      rating: number
      comment: string
      time: string
    }>
    top_customers?: Array<{
      user_id: number
      name: string
      avatar_url?: string | null
      spent: number
      orders_count: number
      vip_label: string
      vip_tone: 'gold' | 'silver' | 'bronze'
    }>
  }

  const [dashLoading, setDashLoading] = useState(true)
  const [dashError, setDashError] = useState<string | null>(null)
  const [dash, setDash] = useState<DashStats | null>(null)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [lowStockProducts, setLowStockProducts] = useState<Array<{
    id: number
    sku?: string | null
    product_name: string
    variant_name?: string | null
    category?: { name?: string } | null
    price?: string | null
    stock_quantity?: number | null
  }>>([])
  const [restockDraft, setRestockDraft] = useState<Record<number, string>>({})
  const [restockBusyId, setRestockBusyId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setDashLoading(false)
        setDashError('Chưa đăng nhập admin.')
        return
      }
      setDashLoading(true)
      setDashError(null)
      try {
        const [res, products] = await Promise.all([
          fetchDashboardStats<DashStats>(analyticsRange, token, customStartDate, customEndDate),
          apiFetch<unknown[]>('/api/admin/products', { token }),
        ])
        if (cancelled) return
        setDash(res)

        // Low stock list for table (best-effort, depends on API fields)
        const threshold = res?.kpi?.low_stock_threshold ?? 10
        setLowStockThreshold(threshold)
        const flat = (products ?? []).flatMap((row) => {
          const p = (row && typeof row === 'object') ? (row as Record<string, unknown>) : {}
          const base = {
            id: typeof p.id === 'number' ? p.id : Number.NaN,
            name: typeof p.name === 'string' ? p.name : '—',
            sku: typeof p.sku === 'string' ? p.sku : null,
            category: (p.category && typeof p.category === 'object') ? (p.category as { name?: string } | null) : null,
            price: typeof p.price === 'string' ? p.price : null,
            stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
            variants: Array.isArray(p.variants) ? (p.variants as unknown[]) : [],
          }
          // If variants exist, use their stock_quantity too
          if (base.variants.length === 0) {
            return [{
              id: base.id,
              product_name: base.name,
              variant_name: null,
              sku: base.sku,
              category: base.category,
              price: base.price,
              stock_quantity: base.stock_quantity,
            }]
          }
          return base.variants.map((vRow, idx) => {
            const v = (vRow && typeof vRow === 'object') ? (vRow as Record<string, unknown>) : {}
            const vid = typeof v.id === 'number' ? v.id : Number.NaN
            const vname = typeof v.variant_name === 'string' ? v.variant_name : ''
            const vsku = typeof v.sku === 'string' ? v.sku : null
            const vprice = typeof v.price === 'string' ? v.price : null
            const vstock = typeof v.stock_quantity === 'number' ? v.stock_quantity : null
            return {
              id: Number.isFinite(vid) ? vid : Number(`${base.id}${idx}`),
              product_name: base.name,
              variant_name: vname || null,
              sku: vsku ?? base.sku,
              category: base.category,
              price: vprice ?? base.price,
              stock_quantity: vstock,
            }
          })
        })

        const low = flat
          .filter((x) => typeof x.stock_quantity === 'number' && x.stock_quantity <= threshold)
          .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
          .slice(0, 6)
        setLowStockProducts(low)
      } catch (e: unknown) {
        if (cancelled) return
        setDashError(e instanceof Error ? e.message : 'Không tải được dữ liệu dashboard.')
      } finally {
        if (!cancelled) setDashLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token, analyticsRange, customStartDate, customEndDate])

  const restockVariant = async (variantId: number) => {
    if (!token) return
    const raw = (restockDraft[variantId] ?? '').trim()
    const add = Number.parseInt(raw, 10)
    if (!Number.isFinite(add) || add <= 0) return

    setRestockBusyId(variantId)
    try {
      await apiFetch(`/api/admin/product-variants/${variantId}/restock`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ add }),
      })
      setRestockDraft((p) => {
        const next = { ...p }
        delete next[variantId]
        return next
      })
      setLowStockProducts((p) => {
        const next = p
          .map((row) =>
            row.id === variantId
              ? { ...row, stock_quantity: (typeof row.stock_quantity === 'number' ? row.stock_quantity : 0) + add }
              : row,
          )
          .filter((row) => typeof row.stock_quantity === 'number' && row.stock_quantity <= lowStockThreshold)
        return next
      })
    } finally {
      setRestockBusyId(null)
    }
  }

  const kpi = dash?.kpi
  const fmtMoneyShort = (v: number) => {
    if (!Number.isFinite(v)) return '—'
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
    return v.toFixed(0)
  }

  const quickTasks = useMemo(() => {
    const qt = dash?.quick_tasks
    return [
      { key: 'review', label: `Duyệt ${qt?.pending_reviews ?? 0} đánh giá mới`, icon: <PencilIcon /> },
      { key: 'stock', label: `Nhập kho ${qt?.low_stock_products ?? 0} mặt hàng sắp hết`, icon: <BoxSmallIcon /> },
      { key: 'support', label: `Phản hồi ${qt?.pending_support ?? 0} yêu cầu hỗ trợ`, icon: <HeadsetIcon /> },
      { key: 'returns', label: `Duyệt ${qt?.pending_return_requests ?? 0} yêu cầu hoàn trả`, icon: <ReturnIcon /> },
      
      
    ]
  }, [dash?.quick_tasks])

  type KpiCard = {
    key: string
    label: string
    value: string
    sub: string
    badge: string
    icon: ReactNode
    tone: 'orange' | 'blue' | 'green' | 'purple' | 'cyan'
  }

  const kpis: KpiCard[] = [
    { key: 'rev', label: 'Tổng doanh thu', value: kpi ? `${fmtMoneyShort(kpi.revenue_30d)} đ` : '—', sub: '30 ngày qua', badge: '+12.5%', icon: <RevenueIcon />, tone: 'orange' as const },
    { key: 'orders', label: 'Đơn hàng hiện tại', value: kpi ? String(kpi.current_orders) : '—', sub: 'Đang xử lý', badge: 'Đang xử lý', icon: <CartIcon />, tone: 'blue' as const },
    { key: 'products', label: 'Tổng số sản phẩm', value: kpi ? String(kpi.total_products) : '—', sub: 'Cập nhật 5 phút trước', badge: 'Kho: 98%', icon: <BoxIcon />, tone: 'green' as const },
    { key: 'newCus', label: 'Khách hàng mới', value: kpi ? `+${kpi.new_customers_7d}` : '—', sub: '7 ngày', badge: '+18%', icon: <UserGroupIcon />, tone: 'purple' as const },
    { key: 'avg', label: 'Giá trị đơn hàng TB', value: kpi ? `${fmtMoneyShort(kpi.avg_order_value_30d)} đ` : '—', sub: 'So với tháng trước', badge: '+5.2%', icon: <GridIcon />, tone: 'cyan' as const },
  ]

  const recentActivities = dash?.recent_activities ?? []
  const topRated = dash?.top_rated_products ?? []
  const revenue7d = dash?.analytics?.revenue_7d ?? []
  const topCats30d = dash?.analytics?.top_categories_30d ?? []
  const resolveAdminImg = (url?: string | null) => {
    if (!url) return '/logo.png'
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  }

  const fmtVnd = (n: number) => n.toLocaleString('vi-VN')
  const initialsOf = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '—'
    const a = parts[0]?.[0] ?? ''
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
    return (a + b).toUpperCase()
  }
  const avatarToneOf = (s: string) => {
    const x = Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5
    return (['beige', 'blue', 'peach', 'sand', 'gray'] as const)[x]
  }
  const recentOrders = (dash?.recent_orders ?? []).slice(0, 10)
  const recentReviews = (dash?.recent_reviews ?? []).slice(0, 2)
  const topCustomers = (dash?.top_customers ?? []).slice(0, 3)
  const resolveUserAvatar = (url?: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  }

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.closest('.admOrdersMenuWrap')) return
      setOpenOrderMenuId(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="dashboardFadeIn">
      <div className="admDashWrap">
        <div className="admDashTop">
          <div>
            <h2 className="admDashTitle">Tổng quan hệ thống</h2>
            <div className="admDashSub">Chào mừng trở lại, bạn có lịch trình 1 ngày rất bận rộn.</div>
          </div>
          <div className="admDashTopActions">
            {/* <button type="button" className="admBtn admBtnGhost">
              <DownloadIcon /> Xuất báo cáo
            </button> */}
            <button type="button" className="admBtn admBtnPrimary" onClick={onCreateProduct}>
              <PlusIcon /> Thêm sản phẩm
            </button>
          </div>
        </div>

        <div className="admKpiGrid">
          {kpis.map((k) => (
            <div key={k.key} className={`admKpiCard2 tone-${k.tone}`}>
              <div className="admKpiTop">
                <div className="admKpiIcon2" aria-hidden>{k.icon}</div>
                <div className="admKpiBadge" aria-hidden>{k.badge}</div>
              </div>
              <div className="admKpiLabel2">{k.label}</div>
              <div className="admKpiValue2">{k.value}</div>
              <div className="admKpiSub2">{k.sub}</div>
              
            </div>
          ))}
          <div className="admKpiCard2 tone-red">
            <div className="admKpiTop">
              <div className="admKpiIcon2" aria-hidden><AlertIcon /></div>
              <div className="admKpiBadge" aria-hidden>
                {kpi ? `${kpi.low_stock_variants}` : '—'} sản phẩm
              </div>
            </div>
            <div className="admKpiLabel2">Cảnh báo tồn kho</div>
            <div className="admKpiValue2">Sắp hết hàng</div>
            <div className="admKpiSub2">Cần nhập thêm ngay</div>
            
          </div>
        </div>

        <div className="admDashGrid2 admDashGrid2--triple">
          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Nhiệm vụ nhanh</h3>
            </div>
            <div className="admQuickList2">
              {quickTasks.map((t) => (
                <button key={t.key} type="button" className="admQuickRow">
                  <span className="admQuickRowIcon" aria-hidden>{t.icon}</span>
                  <span className="admQuickRowText">{t.label}</span>
                  <span className="admQuickRowChevron" aria-hidden>›</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Hoạt động gần đây</h3>
            </div>
            <div className="admActivityList2">
              {(recentActivities.length ? recentActivities : [
                { dot: 'info' as const, title: '—', desc: 'Chưa có dữ liệu', time: '' },
              ]).slice(0, 3).map((a, idx) => (
                <div key={`${a.title}-${idx}`} className="admActivityRow">
                  <span className={`admActivityDot ${a.dot}`} aria-hidden />
                  <div className="admActivityRowBody">
                    <div className="admActivityRowText">
                      <b>{a.title}</b> {a.desc}
                    </div>
                    {a.time && <div className="admActivityRowTime">{a.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admCard admCardTight">
            <div className="admCardHead">
              <h3 className="admCardTitle">Top sản phẩm đánh giá cao</h3>
            </div>
            <div className="admTopRatedList">
              {(topRated.length ? topRated : [
                { id: 0, name: 'Chưa có dữ liệu', slug: '', main_image_url: null, avg_rating: 0, reviews_count: 0 },
              ]).slice(0, 3).map((p) => (
                <div key={p.id || p.name} className="admTopRatedRow">
                  <div className="admTopRatedLeft">
                    <img
                      className="admTopRatedThumb"
                      src={resolveAdminImg(p.main_image_url)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="admTopRatedRight">
                    <div className="admTopRatedName">{p.name}</div>
                    <div className="admTopRatedMeta">
                      <span className="admTopRatedStars" aria-label={`${p.avg_rating} sao`}>
                        {'★'.repeat(Math.max(0, Math.min(5, Math.round(p.avg_rating))))}
                        <span className="admTopRatedStarsMuted">
                          {'★'.repeat(Math.max(0, 5 - Math.round(p.avg_rating)))}
                        </span>
                      </span>
                      <span className="admTopRatedScore">{p.avg_rating ? p.avg_rating.toFixed(1) : '—'}</span>
                      <span className="admTopRatedCount">({p.reviews_count || 0})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="admCard admAnalyticsCard">
          <div className="admCardHead">
            <div>
              <h3 className="admCardTitle">Phân tích & Thống kê</h3>
              <div className="admCardSub">Hiệu suất doanh thu và danh mục hàng đầu</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {analyticsRange === 'custom' && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="date"
                      className="admRangeDateInput"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        outline: 'none',
                        color: '#334155',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>đến</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="date"
                      className="admRangeDateInput"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: '600',
                        outline: 'none',
                        color: '#334155',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div
                  className="admRangeSelectWrap"
                  onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#334155',
                    userSelect: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fb923c'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <span>{rangeLabels[analyticsRange]}</span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ 
                      position: 'static', 
                      opacity: 0.7, 
                      transform: showRangeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', 
                      transition: 'transform 0.2s ease', 
                      pointerEvents: 'none' 
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {showRangeDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      zIndex: 100,
                      minWidth: '160px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      padding: '6px',
                      animation: 'admFadeInDown 0.15s ease-out forwards',
                    }}
                  >
                    {(Object.keys(rangeLabels) as Array<'7d' | '30d' | 'month' | 'custom'>).map((key) => (
                      <div
                        key={key}
                        onClick={() => {
                          setAnalyticsRange(key)
                          setShowRangeDropdown(false)
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: analyticsRange === key ? '#ea580c' : '#334155',
                          backgroundColor: analyticsRange === key ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (analyticsRange !== key) {
                            e.currentTarget.style.backgroundColor = '#f8fafc'
                            e.currentTarget.style.color = '#0f172a'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (analyticsRange !== key) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = '#334155'
                          }
                        }}
                      >
                        <span>{rangeLabels[key]}</span>
                        {analyticsRange === key && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="admAnalyticsGrid">
            <div className="admAnalyticsChart">
              {(() => {
                const pts = (revenue7d.length ? revenue7d : [
                  { date: '—', label: 'Th 2', value: 0 },
                  { date: '—', label: 'Th 3', value: 0 },
                  { date: '—', label: 'Th 4', value: 0 },
                  { date: '—', label: 'Th 5', value: 0 },
                  { date: '—', label: 'Th 6', value: 0 },
                  { date: '—', label: 'Th 7', value: 0 },
                  { date: '—', label: 'CN', value: 0 },
                ]).slice(-7)

                return (
                  <div style={{ width: '100%', height: 220, position: 'relative', overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={pts}
                        margin={{ top: 18, right: 18, left: 10, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="admAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fb923c" stopOpacity={0.16} />
                            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="admLineStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#fb923c" />
                            <stop offset="60%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ea580c" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148, 163, 184, 0.18)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                          tickFormatter={(v) => `${fmtMoneyShort(v)} đ`}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ stroke: 'rgba(249, 115, 22, 0.15)', strokeWidth: 1 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="url(#admLineStroke)"
                          strokeWidth={2.4}
                          fill="url(#admAreaFill)"
                          dot={{ r: 3.5, stroke: '#9a5a12', strokeWidth: 1.5, fill: '#fff' }}
                          activeDot={{ r: 5.5, stroke: '#ea580c', strokeWidth: 2, fill: '#fff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </div>

            <div className="admAnalyticsCats">
              <div className="admCatsTitle">Danh mục bán chạy</div>
              <div className="admCatsList">
                {(topCats30d.length ? topCats30d : [
                  { name: 'Điện thoại', pct: 0 },
                  { name: 'Laptop', pct: 0 },
                  { name: 'Phụ kiện', pct: 0 },
                  { name: 'Màn hình', pct: 0 },
                ]).slice(0, 4).map((c, idx) => (
                  <div key={`${c.name}-${idx}`} className="admCatsRow">
                    <div className="admCatsRowTop">
                      <span>{c.name}</span>
                      <span>{c.pct}%</span>
                    </div>
                    <div className="admCatsBar">
                      <div className="admCatsBarFill" style={{ width: `${Math.max(0, Math.min(100, c.pct))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="admCard admOrdersCard">
          <div className="admCardHead admOrdersHead">
            <h3 className="admCardTitle">Đơn hàng gần đây</h3>
            <button type="button" className="admOrdersAllBtn">Xem tất cả</button>
          </div>

          <div className="admOrdersTableWrap">
            <table className="admOrdersTable">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Số tiền</th>
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders.length ? recentOrders : []).map((o) => (
                  <tr key={o.id}>
                    <td className="admOrdersCodeCell">
                      <span className="admOrdersCode">#{o.order_code}</span>
                    </td>
                    <td>
                      <div className="admOrdersCustomer">
                        {o.customer_avatar_url ? (
                          <img
                            className="admOrdersAvatarImg"
                            src={resolveUserAvatar(o.customer_avatar_url) || undefined}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className={`admOrdersAvatar tone-${avatarToneOf(o.customer_name)}`}>{initialsOf(o.customer_name)}</span>
                        )}
                        <span className="admOrdersCustomerName">{o.customer_name}</span>
                      </div>
                    </td>
                    <td className="admOrdersProduct">{o.product}</td>
                    <td className="admOrdersAmount">
                      {fmtVnd(o.total_amount)}
                      <span className="admOrdersCurrency">đ</span>
                    </td>
                    <td className="admOrdersDate">{o.created_date ?? ''}</td>
                    <td>
                      <span className={`admOrdersStatus ${o.status_tone}`}>
                        {o.status_label}
                      </span>
                    </td>
                    <td className="admOrdersActions">
                      <div className="admOrdersMenuWrap">
                        <button
                          type="button"
                          className="admOrdersMenuBtn"
                          aria-label="Thao tác"
                          aria-expanded={openOrderMenuId === o.id}
                          onClick={() => setOpenOrderMenuId((cur) => (cur === o.id ? null : o.id))}
                        >
                          <span aria-hidden>⋮</span>
                        </button>
                        {openOrderMenuId === o.id && (
                          <div className="admOrdersMenu" role="menu">
                            <button
                              type="button"
                              className="admOrdersMenuItem"
                              onClick={() => {
                                setOpenOrderMenuId(null)
                                setDetailOrder({
                                  id: o.id,
                                  order_code: o.order_code,
                                  customer_name: o.customer_name,
                                  customer_avatar_url: o.customer_avatar_url ?? null,
                                  product: o.product,
                                  total_amount: o.total_amount,
                                  created_date: o.created_date,
                                  status_label: o.status_label,
                                  status_tone: o.status_tone,
                                })
                              }}
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {detailOrder && (
          <div
            className="admModalOverlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setDetailOrder(null)
            }}
          >
            <div className="admModal">
              <div className="admModalHead">
                <div>
                  <div className="admModalTitle">Chi tiết đơn hàng</div>
                  <div className="admModalSub">#{detailOrder.order_code}</div>
                </div>
                <button type="button" className="admModalClose" onClick={() => setDetailOrder(null)} aria-label="Đóng">
                  ×
                </button>
              </div>

              <div className="admModalBody">
                <div className="admModalRow">
                  <div className="admModalLabel">Khách hàng</div>
                  <div className="admModalValue">
                    <div className="admOrdersCustomer">
                      {detailOrder.customer_avatar_url ? (
                        <img className="admOrdersAvatarImg" src={resolveUserAvatar(detailOrder.customer_avatar_url) || undefined} alt="" />
                      ) : (
                        <span className={`admOrdersAvatar tone-${avatarToneOf(detailOrder.customer_name)}`}>{initialsOf(detailOrder.customer_name)}</span>
                      )}
                      <span className="admOrdersCustomerName">{detailOrder.customer_name}</span>
                    </div>
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Sản phẩm</div>
                  <div className="admModalValue">{detailOrder.product}</div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Số tiền</div>
                  <div className="admModalValue admModalStrong">
                    {fmtVnd(detailOrder.total_amount)} đ
                  </div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Ngày đặt</div>
                  <div className="admModalValue">{detailOrder.created_date ?? ''}</div>
                </div>

                <div className="admModalRow">
                  <div className="admModalLabel">Trạng thái</div>
                  <div className="admModalValue">
                    <span className={`admOrdersStatus ${detailOrder.status_tone}`}>{detailOrder.status_label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="admCard">
          <div className="admCardHead">
            <h3 className="admCardTitle">Tồn kho sản phẩm thấp</h3>
            <button type="button" className="admBtn admBtnGhostSm">Quản lý kho</button>
          </div>
          <div className="admTableWrap">
            <table className="admTable">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>Phiên bản</th>
                  <th>Danh mục</th>
                  <th>Còn lại</th>
                  <th>Nhập thêm</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {dashLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="admSkeletonRow">
                      <td colSpan={8}>
                        <div className="admSkeletonCell">
                          <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '70%' : '90%' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 16, color: '#64748b' }}>
                      {dashError ? dashError : 'Chưa có dữ liệu tồn kho (API chưa trả `stock_quantity` hoặc không có SP sắp hết).'}
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="admMono">{(p.sku ?? `#${p.id}`).toString()}</td>
              <td>{p.product_name}</td>
              <td>{p.variant_name ? p.variant_name : '—'}</td>
                      <td>{p.category?.name ?? '—'}</td>
                      <td className="admStrong">{p.stock_quantity ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            value={restockDraft[p.id] ?? ''}
                            onChange={(e) => setRestockDraft((cur) => ({ ...cur, [p.id]: e.target.value }))}
                            placeholder="0"
                            inputMode="numeric"
                            style={{
                              width: 86,
                              padding: '8px 10px',
                              borderRadius: 10,
                              border: '1px solid rgba(15,23,42,.10)',
                              fontWeight: 800,
                            }}
                          />
                          <button
                            type="button"
                            className="admBtn admBtnPrimary"
                            style={{ padding: '8px 10px' }}
                            disabled={restockBusyId === p.id || !(Number.parseInt((restockDraft[p.id] ?? '').trim(), 10) > 0)}
                            onClick={() => void restockVariant(p.id)}
                          >
                            {restockBusyId === p.id ? '...' : 'Nhập'}
                          </button>
                        </div>
                      </td>
                      <td>{p.price ? `${Number.parseFloat(p.price).toLocaleString('vi-VN')} đ` : '—'}</td>
                      <td><span className="admBadge wait">Sắp hết</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="admDashGrid2b">
          <section className="admCard admReviewCard">
            <div className="admCardHead admReviewHead">
              <h3 className="admCardTitle">Đánh giá gần đây</h3>
              <button type="button" className="admIconBtn" aria-label="Đánh giá">
                <ReviewChatIcon />
              </button>
            </div>
            <div className="admReviewList2">
              {(recentReviews.length ? recentReviews : []).map((r) => (
                <div key={r.id} className="admReviewRow2">
                  <div className="admReviewRowTop">
                    <div className="admReviewUser">
                      {r.user_avatar_url ? (
                        <img className="admReviewAvatarImg" src={resolveUserAvatar(r.user_avatar_url) || undefined} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="admReviewAvatar" aria-hidden>{initialsOf(r.user_name)}</span>
                      )}
                      <span className="admReviewUserName">{r.user_name}</span>
                    </div>
                    <div className="admReviewStars2" aria-label={`${r.rating} sao`}>
                      {'★★★★★'.slice(0, Math.max(0, Math.min(5, r.rating)))}
                      <span className="admReviewStarsMuted2">{'★★★★★'.slice(Math.max(0, Math.min(5, r.rating)))}</span>
                    </div>
                  </div>
                  <div className="admReviewQuote">“{r.comment}”</div>
                  <div className="admReviewTime2">{r.time}</div>
                </div>
              ))}
              {!recentReviews.length && (
                <div style={{ padding: 12, color: '#64748b', fontWeight: 700 }}>Chưa có đánh giá.</div>
              )}
            </div>
          </section>

          <section className="admCard admLoyalCard">
            <div className="admCardHead admLoyalHead">
              <h3 className="admCardTitle">Top khách hàng thân thiết</h3>
              <button type="button" className="admIconBtn" aria-label="Thành tích">
                <MedalIcon />
              </button>
            </div>
            <div className="admLoyalList">
              {(topCustomers.length ? topCustomers : []).map((c) => (
                <div key={c.user_id} className="admLoyalRow">
                  <div className="admLoyalLeft">
                    {c.avatar_url ? (
                      <img className="admLoyalAvatarImg" src={resolveUserAvatar(c.avatar_url) || undefined} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className={`admLoyalAvatar tone-${avatarToneOf(c.name)}`} aria-hidden>{initialsOf(c.name)}</span>
                    )}
                    <div className="admLoyalInfo">
                      <div className="admLoyalName">{c.name}</div>
                      <div className={`admVipBadge tone-${c.vip_tone}`}>{c.vip_label}</div>
                    </div>
                  </div>
                  <div className="admLoyalRight">
                    <div className="admLoyalSpent">{fmtMoneyShort(c.spent)} đ</div>
                    <div className="admLoyalOrders">{c.orders_count} đơn hàng</div>
                  </div>
                </div>
              ))}
              {!topCustomers.length && (
                <div style={{ padding: 12, color: '#64748b', fontWeight: 700 }}>Chưa có dữ liệu khách hàng.</div>
              )}
            </div>
            <button type="button" className="admLoyalAllBtn">Xem tất cả khách hàng</button>
          </section>
        </div>
      </div>
    </div>
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
function ReviewChatIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M7.5 8.5h9M7.5 12h6" /></svg>)}
function MedalIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" /><path d="M9 14.5 7 22l5-2 5 2-2-7.5" /><path d="M8 3h4l-2 3H6l2-3zm8 0h-4l2 3h4l-2-3z" /></svg>)}
function RevenueIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> }
function PlusIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>)}
function PencilIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>)}
function HeadsetIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 16 0" /><path d="M4 12v5a2 2 0 0 0 2 2h2v-7H6a2 2 0 0 0-2 2Z" /><path d="M20 12v5a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2Z" /><path d="M12 19a2 2 0 0 0 2-2" /></svg>)}
function BoxSmallIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></svg>)}
function ReturnIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>)}
function AlertIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>)}
