import { useEffect, useMemo, useState } from 'react'
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
  'https://www.bing.com/images/search?view=detailV2&ccid=Dv9y%2Bpsk&id=BCDC0B0CADEE679EDDD3D170C8FAEE5070B03AE7&thid=OIP.Dv9y-pskOyCDJAhLX2i32wHaHa&mediaurl=https%3A%2F%2Fstatic.vecteezy.com%2Fsystem%2Fresources%2Fpreviews%2F020%2F911%2F740%2Foriginal%2Fuser-profile-icon-profile-avatar-user-icon-male-icon-face-icon-profile-icon-free-png.png&cdnurl=https%3A%2F%2Fth.bing.com%2Fth%2Fid%2FR.0eff72fa9b243b208324084b5f68b7db%3Frik%3D5zqwcFDu%252bshw0Q%26pid%3DImgRaw%26r%3D0&exph=1920&expw=1920&q=user&form=IRPRST&ck=54DFA9937F928AB26214895AAF49827C&selectedindex=9&itb=0&cw=1250&ch=572&ajaxhist=0&ajaxserp=0&vt=0&sim=11'

const PROMO_URL =
  (import.meta.env.VITE_PROFILE_PROMO_IMAGE_URL as string | undefined)?.trim() ||
  '/Screenshot 2026-05-28 091249.png'


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
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editDraft, setEditDraft] = useState(() => ({
    name: '',
    email: '',
    phone: '',
    address_line: '',
    province: '',
    district: '',
    ward: '',
  }))
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)

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

  function openEditModal() {
    setEditDraft({
      name: (me?.name ?? me?.username ?? '').toString(),
      email: (me?.email ?? '').toString(),
      phone: (me?.phone ?? '').toString(),
      address_line: (me?.address_line ?? '').toString(),
      province: (me?.province ?? '').toString(),
      district: (me?.district ?? '').toString(),
      ward: (me?.ward ?? '').toString(),
    })
    setEditAvatarFile(null)
    setEditAvatarPreview(resolveMediaUrl(me?.avatar_url) || AVATAR_URL)
    setEditOpen(true)
  }

  function closeEditModal() {
    setEditOpen(false)
    setEditAvatarFile(null)
    setEditAvatarPreview(null)
  }

  async function saveFromModal() {
    setSaveError(null)
    try {
      let updated: any = null
      if (editAvatarFile) {
        const fd = new FormData()
        fd.append('file', editAvatarFile)
        try {
          updated = await apiFetch<MeUser>('/me/avatar', {
            method: 'POST',
            body: fd,
          })
        } catch {
          // ignore avatar upload failure here; continue to profile update
        }
      }

      const patched = await apiFetch<MeUser>('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: editDraft.name.trim(),
          email: editDraft.email.trim(),
          phone: editDraft.phone.trim() || null,
          address_line: editDraft.address_line.trim() || null,
          province: editDraft.province.trim() || null,
          district: editDraft.district.trim() || null,
          ward: editDraft.ward.trim() || null,
        }),
      })

      const next = patched ?? updated ?? (await fetchMe())
      setMe(next as MeUser)
      window.localStorage.setItem('user', JSON.stringify(next))
      window.dispatchEvent(new Event('auth-change'))
      closeEditModal()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cập nhật thất bại.'
      setSaveError(msg)
    }
  }

  useEffect(() => {
    let revoked = false
    fetchMe()
      .then((u) => {
        if (revoked) return
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
      .catch(() => {
        if (revoked) return
        setMe(null)
        navigate('/login')
      })

    apiFetch<{ data: OrderRow[] }>('/orders')
      .then((res) => {
        if (revoked) return
        setOrders(res.data ?? [])
      })
      .catch(() => {
        if (revoked) return
        setOrders([])
      })
      .finally(() => {
        if (revoked) return
        setLoading(false)
      })

    return () => {
      revoked = true
    }
  }, [navigate])

  



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
    try {
      await apiLogout()
    } catch {
      // ignore
    }
    window.localStorage.removeItem('user')
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
                    onClick={openEditModal}
                  >
                    Chỉnh sửa
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
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="pfField">
                        <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
                        <Skeleton width="100%" height="48px" borderRadius="10px" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="pfSimpleRow">
                        <div className="pfSimpleLabel">Họ và tên :</div>
                        <div className="pfSimpleValue">{profileDraft.name || '—'}</div>
                      </div>
                      <div className="pfSimpleRow">
                        <div className="pfSimpleLabel">Email :</div>
                        <div className="pfSimpleValue">{profileDraft.email || '—'}</div>
                      </div>
                      <div className="pfSimpleRow">
                        <div className="pfSimpleLabel">Số điện thoại :</div>
                        <div className="pfSimpleValue">{profileDraft.phone || '—'}</div>
                      </div>
                      <div className="pfSimpleRow">
                        <div className="pfSimpleLabel">Địa chỉ :</div>
                        <div className="pfSimpleValue">
                          <div style={{ marginTop: 6, color: 'var(--et-text)' }}>
                            {[
                              profileDraft.address_line,
                              profileDraft.ward,
                              profileDraft.district,
                              profileDraft.province,
                            ].filter(Boolean).join(', ')}
                          </div>
                        </div>
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
              <div className="pfTwoCol">
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
                    {orders.length === 0 ? (
                      <div style={{ padding: 14, color: 'var(--et-text-muted)' }}>
                        Chưa có đơn hàng nào.
                      </div>
                    ) : (
                      <div className="pfOrderList">
                        {orders.slice(0, 3).map((o) => {
                          const thumbs = ((o.items ?? []).map((it) => {
                            const p = (it as any)?.product as any
                            // try multiple common fields for an image
                            const candidates = [
                              (it as any)?.image,
                              p?.image,
                              p?.image_url,
                              p?.main_image_url,
                              p?.main_image,
                              p?.thumbnail,
                              p?.main_image_url,
                              Array.isArray(p?.images) ? p.images[0] : null,
                              Array.isArray(p?.media) ? p.media[0]?.url ?? p.media[0] : null,
                              (it as any)?.product?.main_image_url,
                            ]
                            let img: any = null
                            for (const c of candidates) {
                              if (!c) continue
                              if (typeof c === 'string') { img = c; break }
                              if (typeof c === 'object') {
                                if (typeof c.url === 'string') { img = c.url; break }
                                if (typeof c.src === 'string') { img = c.src; break }
                                if (typeof c.path === 'string') { img = c.path; break }
                              }
                            }
                            return resolveMediaUrl(img ?? null) || null
                          }).filter(Boolean) as string[])
                          const extraCount = Math.max(0, thumbs.length - 4)
                          const thumbCount = thumbs.length || 1
                          const layout = thumbCount === 1 ? 'one' : thumbCount === 2 ? 'two' : thumbCount === 3 ? 'three' : 'four'
                          const statusLabel = o.status === 'pending'
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
                                      : (o.status || '—')

                          return (
                            <div key={o.id} className="pfOrderItem">
                              <div className={`pfOrderThumbGrid pfThumbLayout-${layout}`}>
                                {(() => {
                                  const display = (thumbs.length === 0 ? [AVATAR_URL] : thumbs.slice(0, 4))
                                  return display.map((src, idx) => (
                                    <div key={idx} className="pfOrderThumbCell" data-idx={idx}>
                                      <img className="pfOrderThumbImg" src={src} alt="" loading="lazy" />
                                      {idx === 3 && extraCount > 0 && (
                                        <div className="pfThumbOverlay">+{extraCount}</div>
                                      )}
                                    </div>
                                  ))
                                })()}
                              </div>
                              <div className="pfOrderMain">
                                <div className="pfOrderHeader">
                                  <div className="pfOrderCode">{o.order_code}</div>
                                  <div>
                                    <span className={o.status === 'shipped' ? 'pfStatusPill pfStatusPillWarn pfOrderStatus' : 'pfStatusPill pfOrderStatus'}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                </div>

                                {(() => {
                                  const names = (o.items ?? []).map((it) => {
                                    const p = (it as any)?.product as any
                                    return (p?.name || (it as any)?.product_name_snapshot || '').toString()
                                  }).filter(Boolean) as string[]
                                  const text = names.length > 0 ? names.join(', ') : '—'
                                  return (
                                    <div className="pfOrderName">{text}</div>
                                  )
                                })()}
                                <div className="pfOrderFooter">
                                  <div className="pfOrderMeta">{o.items?.length ?? 0} sản phẩm</div>
                                  <div className="pfOrderMeta">{formatDateShort(o.created_at)}</div>
                                  <div className="pfOrderAmount">{formatMoneyVnd(o.total_amount)}</div>

                                  <div className="pfOrderActions">
                                    <button type="button" className="pfOrderDetailsBtn" onClick={() => navigate(`/profile/orders/${o.id}`)}>
                                      Chi tiết
                                    </button>
                                  </div>
                                </div>
                              </div>


                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {editOpen && (
                  <div className="pfModalOverlay" role="dialog" aria-modal="true">
                    <div className="pfModal">
                      <div className="pfModalHeader">
                        <h3 className="pfModalTitle">Chỉnh sửa thông tin</h3>
                        <button type="button" className="pfModalClose" onClick={closeEditModal} aria-label="Đóng">✕</button>
                      </div>
                      <div className="pfModalBody">
                        <aside className="pfModalSidebar">
                          <div className="pfModalAvatarWrap">
                            <img src={editAvatarPreview || AVATAR_URL} alt="" className="pfAvatar" />
                            <input
                              id="pf-avatar-input"
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={(e) => {
                                const f = e.currentTarget.files?.[0] ?? null
                                setEditAvatarFile(f)
                                if (f) setEditAvatarPreview(URL.createObjectURL(f))
                              }}
                              style={{ display: 'none' }}
                            />
                            <label htmlFor="pf-avatar-input" className="pfFileBtn">Chọn ảnh</label>
                          </div>
                        </aside>
                        <div className="pfModalContent">
                          <div className="pfFormGrid">
                            <div className="pfField">
                              <label className="pfLabel">Họ và tên</label>
                              <input className="pfInput" value={editDraft.name} onChange={(e) => setEditDraft((s) => ({ ...s, name: e.target.value }))} />
                            </div>
                            <div className="pfField">
                              <label className="pfLabel">Số điện thoại</label>
                              <input className="pfInput" value={editDraft.phone} onChange={(e) => setEditDraft((s) => ({ ...s, phone: e.target.value }))} />
                            </div>
                            <div className="pfField">
                              <label className="pfLabel">Email</label>
                              <input className="pfInput" value={editDraft.email} onChange={(e) => setEditDraft((s) => ({ ...s, email: e.target.value }))} type="email" />
                            </div>
                            <div className="pfField" style={{ gridColumn: '1 / -1' }}>
                              <label className="pfLabel">Địa chỉ</label>
                              <input className="pfInput" value={editDraft.address_line} onChange={(e) => setEditDraft((s) => ({ ...s, address_line: e.target.value }))} />
                            </div>
                            <div className="pfField">
                              <label className="pfLabel">Phường/Xã</label>
                              <input className="pfInput" value={editDraft.ward} onChange={(e) => setEditDraft((s) => ({ ...s, ward: e.target.value }))} />
                            </div>
                             <div className="pfField">
                              <label className="pfLabel">Quận/Huyện</label>
                              <input className="pfInput" value={editDraft.district} onChange={(e) => setEditDraft((s) => ({ ...s, district: e.target.value }))} />
                            </div>
                            <div className="pfField">
                              <label className="pfLabel">Tỉnh/Thành phố</label>
                              <input className="pfInput" value={editDraft.province} onChange={(e) => setEditDraft((s) => ({ ...s, province: e.target.value }))} />
                            </div>
                          </div>

                          <div className="pfModalActions">
                            <button type="button" className="pfBtn pfBtnPrimary" onClick={saveFromModal}>Lưu</button>
                            <button type="button" className="pfBtn" onClick={closeEditModal}>Hủy</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
              </div>
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


function SideIconWrap({ children }: { children: React.ReactNode }) { return (<span aria-hidden="true" className="pfSideIcon">{children}</span>) }
function IconUser() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" /></svg>) }
function IconReceipt() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2h12v20l-2-1-2 1-2-1-2 1-2-1-2 1V2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 7h6M9 11h6M9 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
function IconShield() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9.5 12.2l1.6 1.6 3.6-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
function IconLogout() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>) }
function IconTicket() { return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 5v2M13 11v2M13 17v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>) }
