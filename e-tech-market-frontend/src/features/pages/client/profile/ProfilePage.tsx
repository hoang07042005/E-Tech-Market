import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '@/styles/pages/ProfilePage.css'
import { me as fetchMe, logout as apiLogout } from '@/features/services/auth.service'
import { API_BASE_URL, apiFetch } from '@/configs/api.config'
import Skeleton from '@/components/Skeleton'
import { clearAuthSessionExpiry } from '@/features/store/auth.store'

type TabKey = 'profile' | 'orders' | 'notifications' | 'payments' | 'security' | 'coupons'

type MeUser = {
  id?: number
  name?: string
  username?: string
  email?: string
  phone?: string
  address_line?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  avatar_url?: string | null
  roles?: Array<{ slug?: string; name?: string }>
}

type OrderRow = {
  id: number
  order_code: string
  created_at: string
  total_amount: number | string
  status: string
  items?: Array<{ product?: { name?: string } | null }>
}

const AVATAR_URL =
  (import.meta.env.VITE_PROFILE_AVATAR_URL as string | undefined)?.trim() ||
  'https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=320&q=80'

const PROMO_URL =
  (import.meta.env.VITE_PROFILE_PROMO_IMAGE_URL as string | undefined)?.trim() ||
  'https://lh3.googleusercontent.com/aida/ADBb0uhHZ_5pRbpgtwJmsvqPlInCJ0xszaBAGlhnvFV6MmoprOJFk8cOzTKk363dkrBMfuuMy6C4MI6uglBXY7ngltTSXv7O-acEAv3yIOzuZZDBi9nRU0ijC77KiCNzVnjYx9Luy4rT3J2f6ImDm-jkqdlRoSidOwHQnrtPBvXCfXHoyquWt6aqNaZYmLZc-yHtwHVD-65QUJCu7EIqL917PA1C2MF2ZEkqEF1_9CwZUS9IFsKGzipaaI5CCRY'


function formatMoneyVnd(v: number | string) {
  const n = typeof v === 'number' ? v : Number.parseFloat(v)
  if (!Number.isFinite(n)) return `${v} đ`
  return `${n.toLocaleString('vi-VN')} đ`
}

function formatDateShort(iso: string) {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  return new Date(t).toLocaleDateString('vi-VN')
}

function resolveMediaUrl(maybeUrl: string | null | undefined): string | null {
  if (!maybeUrl) return null
  const s = maybeUrl.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  try {
    return new URL(s, API_BASE_URL).toString()
  } catch {
    return s
  }
}

export default function ProfilePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [tab, setTab] = useState<TabKey>('profile')
  const path = (location.pathname || '').toLowerCase()
  const ordersRoute = path.startsWith('/profile/orders')
  const notifsRoute = path.startsWith('/profile/notifications')
  const securityRoute = path.startsWith('/profile/security')
  const couponsRoute = path.startsWith('/profile/coupons')
  const activeTab = ordersRoute
    ? 'orders'
    : notifsRoute
      ? 'notifications'
      : securityRoute
        ? 'security'
        : couponsRoute
          ? 'coupons'
          : tab
  const [twoFa, setTwoFa] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const [me, setMe] = useState<MeUser | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    email: '',
    phone: '',
    address_line: '',
    province: '',
    district: '',
    ward: '',
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const displayName = useMemo(() => {
    const localUser = (() => {
      try {
        const raw = window.localStorage.getItem('user')
        if (!raw) return null
        return JSON.parse(raw) as MeUser
      } catch {
        return null
      }
    })()
    return (
      me?.name ||
      me?.username ||
      localUser?.name ||
      localUser?.username ||
      'Khách hàng'
    )
  }, [me?.name, me?.username])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchMe(token)
      .then((u) => {
        const next = u as MeUser
        setMe(next)
        setProfileDraft({
          name: (next?.name ?? next?.username ?? '').toString(),
          email: (next?.email ?? '').toString(),
          phone: (next?.phone ?? '').toString(),
          address_line: (next?.address_line ?? '').toString(),
          province: (next?.province ?? '').toString(),
          district: (next?.district ?? '').toString(),
          ward: (next?.ward ?? '').toString(),
        })
      })
      .catch(() => setMe(null))

    apiFetch<{ data: OrderRow[] }>('/orders', { token })
      .then((res) => setOrders(res.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [navigate, token])

  const canSave = useMemo(() => {
    if (tab !== 'profile') return false
    if (!token) return false
    if (!me) return false
    const next = {
      name: profileDraft.name.trim(),
      email: profileDraft.email.trim(),
      phone: profileDraft.phone.trim(),
      address_line: profileDraft.address_line.trim(),
      province: profileDraft.province.trim(),
      district: profileDraft.district.trim(),
      ward: profileDraft.ward.trim(),
    }
    const prev = {
      name: (me.name ?? me.username ?? '').toString().trim(),
      email: (me.email ?? '').toString().trim(),
      phone: (me.phone ?? '').toString().trim(),
      address_line: (me.address_line ?? '').toString().trim(),
      province: (me.province ?? '').toString().trim(),
      district: (me.district ?? '').toString().trim(),
      ward: (me.ward ?? '').toString().trim(),
    }
    return (
      next.name.length > 0 &&
      next.email.length > 0 &&
      (next.name !== prev.name ||
        next.email !== prev.email ||
        next.phone !== prev.phone ||
        next.address_line !== prev.address_line ||
        next.province !== prev.province ||
        next.district !== prev.district ||
        next.ward !== prev.ward)
    )
  }, [
    me,
    profileDraft.address_line,
    profileDraft.district,
    profileDraft.email,
    profileDraft.name,
    profileDraft.phone,
    profileDraft.province,
    profileDraft.ward,
    tab,
    token,
  ])

  async function saveProfile() {
    if (!token) return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const updated = await apiFetch<MeUser>('/me', {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          name: profileDraft.name.trim(),
          email: profileDraft.email.trim(),
          phone: profileDraft.phone.trim() || null,
          address_line: profileDraft.address_line.trim() || null,
          province: profileDraft.province.trim() || null,
          district: profileDraft.district.trim() || null,
          ward: profileDraft.ward.trim() || null,
        }),
      })
      setMe(updated)
      setProfileDraft({
        name: (updated?.name ?? updated?.username ?? '').toString(),
        email: (updated?.email ?? '').toString(),
        phone: (updated?.phone ?? '').toString(),
        address_line: (updated?.address_line ?? '').toString(),
        province: (updated?.province ?? '').toString(),
        district: (updated?.district ?? '').toString(),
        ward: (updated?.ward ?? '').toString(),
      })
      window.localStorage.setItem('user', JSON.stringify(updated))
      window.dispatchEvent(new Event('auth-change'))
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus('idle'), 1500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cập nhật thất bại.'
      setSaveError(msg)
      setSaveStatus('error')
    }
  }

  async function onPickAvatar(file: File) {
    if (!token) return
    setAvatarBusy(true)
    setSaveError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const updated = await apiFetch<MeUser>('/me/avatar', {
        token,
        method: 'POST',
        body: fd,
      })
      setMe(updated)
      window.localStorage.setItem('user', JSON.stringify(updated))
      window.dispatchEvent(new Event('auth-change'))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cập nhật avatar thất bại.'
      setSaveError(msg)
    } finally {
      setAvatarBusy(false)
    }
  }

  const orderCount = orders.length
  const totalSpent = useMemo(() => {
    return orders.reduce((acc, o) => {
      const n = typeof o.total_amount === 'number' ? o.total_amount : Number.parseFloat(o.total_amount)
      return acc + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [orders])

  const tier = useMemo(() => {
    if (totalSpent >= 100_000_000) return 'Thành viên Platinum'
    if (totalSpent >= 30_000_000) return 'Thành viên Vàng'
    if (totalSpent >= 10_000_000) return 'Thành viên Bạc'
    return 'Thành viên'
  }, [totalSpent])

  // const etId = useMemo(() => {
  //   const n = me?.id
  //   if (!n || !Number.isFinite(n)) return 'ET-—'
  //   return `ET-${String(n).padStart(6, '0')}`
  // }, [me?.id])

  async function logout() {
    if (!token) {
      navigate('/login')
      return
    }
    try {
      await apiLogout(token)
    } catch {
      // ignore
    }
    window.localStorage.removeItem('user')
    window.localStorage.removeItem('token')
    clearAuthSessionExpiry()
    window.dispatchEvent(new Event('auth-change'))
    navigate('/login')
  }

  return (
    <main className="pfPage">
      <div className="pfInner">
        <section className="pfTopCard" aria-label="Tóm tắt tài khoản">
          <div className="pfTopRow">
            <div className="pfAvatarWrap">
              {loading ? (
                <Skeleton width="100%" height="100%" borderRadius="50%" />
              ) : (
                <>
                  <img
                    className="pfAvatar"
                    src={resolveMediaUrl(me?.avatar_url) || AVATAR_URL}
                    alt=""
                    loading="lazy"
                  />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0]
                      e.currentTarget.value = ''
                      if (f) void onPickAvatar(f)
                    }}
                  />
                  <button
                    type="button"
                    className="pfAvatarEdit"
                    aria-label="Chỉnh avatar"
                    disabled={avatarBusy}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <PencilIcon />
                  </button>
                </>
              )}
            </div>

            <div className="pfTopInfo">
              {loading ? (
                <>
                  <Skeleton width="180px" height="32px" style={{ marginBottom: '8px' }} />
                  <Skeleton width="120px" height="24px" />
                </>
              ) : (
                <>
                  <h1 className="pfName">{displayName}</h1>
                  <div className="pfBadges">
                    <span className="pfBadge">{tier}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pfStats" aria-label="Thống kê tài khoản">
              <div className="pfStat">
                {loading ? (
                  <>
                    <Skeleton width="40px" height="32px" style={{ marginBottom: '4px' }} />
                    <Skeleton width="60px" height="14px" />
                  </>
                ) : (
                  <>
                    <p className="pfStatNum">{orderCount}</p>
                    <p className="pfStatLabel">Đơn hàng</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="pfGrid" aria-label="Khu vực tài khoản">
          <aside className="pfSidebar">
            <button
              type="button"
              className={activeTab === 'profile' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => {
                setTab('profile')
                navigate('/profile')
              }}
            >
              <SideIconWrap>
                <IconUser />
              </SideIconWrap>
              Thông tin cá nhân
            </button>
            <button
              type="button"
              className={activeTab === 'orders' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => navigate('/profile/orders')}
            >
              <SideIconWrap>
                <IconReceipt />
              </SideIconWrap>
              Lịch sử đơn hàng
            </button>
            {/* <button
              type="button"
              className={activeTab === 'notifications' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => navigate('/profile/notifications')}
            >
              <SideIconWrap>
                <IconBell />
              </SideIconWrap>
              Thông báo
            </button> */}
            {/* <button
              type="button"
              className={activeTab === 'payments' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => {
                setTab('payments')
                navigate('/profile')
              }}
            >
              <SideIconWrap>
                <IconCard />
              </SideIconWrap>
              Phương thức thanh toán
            </button> */}
            <button
              type="button"
              className={activeTab === 'security' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => {
                setTab('security')
                navigate('/profile/security')
              }}
            >
              <SideIconWrap>
                <IconShield />
              </SideIconWrap>
              Bảo mật
            </button>
            <button
              type="button"
              className={activeTab === 'coupons' ? 'pfNavBtn pfNavBtnActive' : 'pfNavBtn'}
              onClick={() => {
                setTab('coupons')
                navigate('/profile/coupons')
              }}
            >
              <SideIconWrap>
                <IconTicket />
              </SideIconWrap>
              Kho Voucher
            </button>
            <div className="pfNavSep" />
            <button type="button" className="pfNavBtn pfLogoutBtn pfLogoutBtnDesktop" onClick={logout}>
              <SideIconWrap>
                <IconLogout />
              </SideIconWrap>
              Đăng xuất
            </button>
          </aside>

          <div className="pfContent">
            <section className="pfCard" aria-label="Thông tin">
              <div className="pfCardHead">
                <h2 className="pfCardTitle">
                  {activeTab === 'profile'
                    ? 'Thông tin cá nhân'
                    : activeTab === 'orders'
                      ? 'Lịch sử đơn hàng'
                      : activeTab === 'notifications'
                        ? 'Thông báo'
                      : activeTab === 'payments'
                        ? 'Phương thức thanh toán'
                      : activeTab === 'coupons'
                        ? 'Kho Voucher'
                        : 'Bảo mật'}
                </h2>
                {activeTab === 'profile' && (
                  <button
                    type="button"
                    className="pfSaveBtn"
                    disabled={!canSave || saveStatus === 'saving'}
                    onClick={saveProfile}
                  >
                    {saveStatus === 'saving' ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </button>
                )}
              </div>
              {saveError && (
                <div style={{ marginBottom: 12, color: '#b91c1c', fontWeight: 800 }}>
                  {saveError}
                </div>
              )}

              {ordersRoute || notifsRoute || securityRoute || couponsRoute ? (
                <Outlet />
              ) : tab === 'profile' ? (
                <div className="pfFormGrid">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="pfField">
                          <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
                          <Skeleton width="100%" height="48px" borderRadius="10px" />
                        </div>
                      ))
                    : (
                      <>
                        <div className="pfField">
                          <label className="pfLabel">Họ và tên</label>
                          <input
                            className="pfInput"
                            value={profileDraft.name}
                            onChange={(e) => setProfileDraft((s) => ({ ...s, name: e.target.value }))}
                            placeholder="Họ và tên"
                          />
                        </div>
                        <div className="pfField">
                          <label className="pfLabel">Số điện thoại</label>
                          <input
                            className="pfInput"
                            value={profileDraft.phone}
                            onChange={(e) => setProfileDraft((s) => ({ ...s, phone: e.target.value }))}
                            placeholder="Số điện thoại"
                          />
                        </div>
                        <div className="pfField">
                          <label className="pfLabel">Email</label>
                          <input
                            className="pfInput"
                            value={profileDraft.email}
                            onChange={(e) => setProfileDraft((s) => ({ ...s, email: e.target.value }))}
                            placeholder="Email"
                            type="email"
                          />
                        </div>
                        <div className="pfField" style={{ gridColumn: '1 / -1' }}>
                          <label className="pfLabel">Địa chỉ</label>
                          <input
                            className="pfInput"
                            value={profileDraft.address_line}
                            onChange={(e) =>
                              setProfileDraft((s) => ({ ...s, address_line: e.target.value }))
                            }
                            placeholder="Số nhà, tên đường..."
                          />
                        </div>
                        <div className="pfField">
                          <label className="pfLabel">Tỉnh/Thành phố</label>
                          <input
                            className="pfInput"
                            value={profileDraft.province}
                            onChange={(e) => setProfileDraft((s) => ({ ...s, province: e.target.value }))}
                            placeholder="VD: Hồ Chí Minh"
                          />
                        </div>
                        <div className="pfField">
                          <label className="pfLabel">Quận/Huyện</label>
                          <input
                            className="pfInput"
                            value={profileDraft.district}
                            onChange={(e) => setProfileDraft((s) => ({ ...s, district: e.target.value }))}
                            placeholder="VD: Quận 1"
                          />
                        </div>
                        <div className="pfField">
                          <label className="pfLabel">Phường/Xã</label>
                          <input
                            className="pfInput"
                            value={profileDraft.ward}
                            onChange={(e) => setProfileDraft((s) => ({ ...s, ward: e.target.value }))}
                            placeholder="VD: Phường Bến Nghé"
                          />
                        </div>
                      </>
                    )}
                </div>
              ) : (
                <div style={{ color: 'var(--et-text-muted)', lineHeight: 1.7, fontSize: 14 }}>
                  Chức năng này sẽ được hoàn thiện tiếp. Hiện tại trang đã được dựng UI đúng bố cục.
                </div>
              )}
            </section>

            {tab === 'profile' && !ordersRoute && (
              <>
                <section className="pfCard" aria-label="Đơn hàng gần đây">
                  <div className="pfCardHead" style={{ marginBottom: 0 }}>
                    <h3 className="pfCardTitle">Đơn hàng gần đây</h3>
                    <button
                      type="button"
                      onClick={() => navigate('/profile/orders')}
                      style={{
                        fontWeight: 900,
                        color: 'var(--et-primary-hover)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Xem tất cả
                    </button>
                  </div>

                  <div className="pfOrdersWrapper">
                    <table className="pfTable">
                      <thead>
                        <tr>
                          <th className="pfHideMobile">Mã đơn hàng</th>
                          <th>Sản phẩm</th>
                          <th className="pfHideMobile">Ngày đặt</th>
                          <th>Tổng tiền</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 3).map((o) => (
                          <tr key={o.id}>
                            <td className="pfHideMobile" style={{ fontWeight: 900 }}>{o.order_code}</td>
                            <td className="pfOrderNameCell">
                              <div className="pfOrderName">{o.items?.[0]?.product?.name ?? '—'}</div>
                              <div className="pfOrderMetaMobile">
                                {o.order_code} • {formatDateShort(o.created_at)}
                              </div>
                            </td>
                            <td className="pfHideMobile">{formatDateShort(o.created_at)}</td>
                            <td style={{ fontWeight: 900 }}>{formatMoneyVnd(o.total_amount)}</td>
                            <td>
                              <span
                                className={o.status === 'shipped' ? 'pfStatusPill pfStatusPillWarn' : 'pfStatusPill'}
                              >
                                {o.status === 'pending'
                                  ? 'Chờ xác nhận'
                                  : o.status === 'processing'
                                    ? 'Đã xác nhận'
                                    : o.status === 'shipped'
                                      ? 'Đang giao'
                                      : o.status === 'delivered'
                                        ? 'Hoàn thành'
                                        : o.status === 'returned'
                                          ? 'Hoàn trả'
                                          : o.status === 'cancelled'
                                            ? 'Đã hủy'
                                            : (o.status || '—')}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ padding: 14, color: 'var(--et-text-muted)' }}>
                              Chưa có đơn hàng nào.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="pfRowGrid">
                  <section className="pfMiniCard" aria-label="Bảo mật">
                    <h3 className="pfMiniTitle">Bảo mật</h3>
                    <div className="pfMiniTopRow">
                      <div>
                        <div style={{ fontWeight: 900, marginBottom: 4 }}>
                          Xác thực 2 yếu tố (2FA)
                        </div>
                        <div className="pfToggleText">Tăng cường bảo mật cho tài khoản của bạn.</div>
                      </div>
                      <button
                        type="button"
                        className={twoFa ? 'pfSwitch pfSwitchOn' : 'pfSwitch'}
                        onClick={() => setTwoFa((s) => !s)}
                        aria-label="Bật tắt 2FA"
                      >
                        <span className="pfSwitchKnob" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="pfToggleRow pfToggleRowBtn"
                      onClick={() => {
                        setTab('security')
                        navigate('/profile/security')
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>Thay đổi mật khẩu</div>
                        <div className="pfToggleText">Cập nhật mật khẩu để an toàn hơn.</div>
                      </div>
                      <span className="pfChevron" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  </section>

                  <section className="pfPromo" aria-label="Ưu đãi">
                    <img className="pfPromoImg" src={PROMO_URL} alt="" loading="lazy" />
                    <div className="pfPromoTint" aria-hidden="true" />
                    <div className="pfPromoContent">
                      <h3 className="pfPromoTitle">Ưu đãi Platinum</h3>
                      <p className="pfPromoSub">
                        Nâng cấp tài khoản để nhận ưu đãi vận chuyển miễn phí và hoàn tiền 5% cho mọi linh kiện.
                      </p>
                      <button
                        type="button"
                        className="pfPromoBtn"
                        onClick={() => navigate('/products')}
                      >
                        Tìm hiểu thêm
                      </button>
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>

          <button type="button" className="pfLogoutBtnMobile" onClick={logout}>
            <SideIconWrap>
              <IconLogout />
            </SideIconWrap>
            Đăng xuất
          </button>
        </section>
      </div>
    </main>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}



function SideIconWrap({ children }: { children: React.ReactNode }) {return (<span aria-hidden="true" className="pfSideIcon">{children}</span>)}
function IconUser() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" /></svg>)}
function IconReceipt() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1V2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 7h6M9 11h6M9 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>)}
function IconShield() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9.5 12.2l1.6 1.6 3.6-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>)}
function IconLogout() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>)}
function IconTicket() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 5v2M13 11v2M13 17v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
