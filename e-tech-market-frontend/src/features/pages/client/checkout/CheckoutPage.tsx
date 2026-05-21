import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '@/styles/pages/CheckoutPage.css'

import { cartCount, cartTotal, clearCart, getCart, type CartState } from '@/features/services/cart.service'
import { apiFetch } from '@/configs/api.config'
import logoMomo from '@/assets/logo-momo.png'
import logoVnpay from '@/assets/vnpay-logo.png'
import logoCod from '@/assets/COD.png'

function formatVnd(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`
}

type PaymentMethod = 'cod' | 'vnpay' | 'momo'

type ShippingMethodId = number

type PaymentAvailability = Record<PaymentMethod, boolean>

type ShippingMethodPublic = {
  id: number
  name: string
  description: string | null
  base_fee: number
  estimated_days_min: number | null
  estimated_days_max: number | null
  is_active: boolean
}

type ShippingZonePublic = {
  id: number
  name: string
  eta: string | null
  fee: number
  is_active: boolean
}

type StoredUser = {
  name?: string
  phone?: string
  address_line?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
}

type CouponPublic = {
  id: number
  code: string
  coupon_type: 'fixed' | 'percentage'
  value: number
  min_order_amount: number | null
  start_at: string | null
  end_at: string | null
}

function readStoredUser(): StoredUser | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as unknown
    return v && typeof v === 'object' ? (v as StoredUser) : null
  } catch {
    return null
  }
}

function buildAccountAddressLine(u: StoredUser) {
  const base = (u.address_line ?? '').trim()
  const parts = [u.ward, u.district, u.province].map((x) => (x ?? '').trim()).filter(Boolean)
  if (!base && parts.length === 0) return ''
  if (!base) return parts.join(', ')
  if (parts.length === 0) return base
  return `${base}, ${parts.join(', ')}`
}

// Removed auto zone mapping on reload (user will choose or restore last selection).

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartState>(() => getCart())
  const [submitting, setSubmitting] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payAvail, setPayAvail] = useState<PaymentAvailability>({
    cod: true,
    vnpay: true,
    momo: true,
  })
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodPublic[]>([])
  const [shippingZones, setShippingZones] = useState<ShippingZonePublic[]>([])
  const [shipPolicy, setShipPolicy] = useState<{ free_shipping_min: number; apply_global: boolean }>({
    free_shipping_min: 0,
    apply_global: true,
  })

  // --- Coupon ---
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [activeCoupons, setActiveCoupons] = useState<CouponPublic[]>([])
  const [showCouponModal, setShowCouponModal] = useState(false)

  const account = useMemo(() => readStoredUser(), [])
  const token = useMemo(() => (typeof window === 'undefined' ? null : localStorage.getItem('token')), [])

  const pendingPaymentKey = 'pending_payment'
  const shipMethodKey = 'checkout_shipping_method_id'
  const shipZoneKey = 'checkout_shipping_zone_id'

  const paymentReturn = useMemo(() => {
    const usp = new URLSearchParams(window.location.search)
    const gateway = usp.get('gateway')
    const success = usp.get('success')
    const code = usp.get('order_code')
    if (!gateway || !success || !code) return null
    return { gateway, success: success === '1', order_code: code }
  }, [])

  const [form, setForm] = useState(() => ({
    name: (account?.name ?? '').trim(),
    phone: (account?.phone ?? '').trim(),
    address_line: account ? buildAccountAddressLine(account) : '',
    notes: '',
    payment_method: 'cod' as PaymentMethod,
    shipping_method_id: null as ShippingMethodId | null,
    shipping_zone_id: null as number | null,
  }))

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const cfg = await apiFetch<{ momo?: { enabled?: boolean }; vnpay?: { enabled?: boolean }; cod?: { enabled?: boolean } }>(
            '/api/store/payments',
          )
          const next: PaymentAvailability = {
            cod: !!cfg.cod?.enabled,
            vnpay: !!cfg.vnpay?.enabled,
            momo: !!cfg.momo?.enabled,
          }
          if (!cancelled) setPayAvail(next)
        } catch {
          // keep defaults
        }
      })()

    apiFetch<CouponPublic[]>('/api/coupons')
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setActiveCoupons(res)
      })
      .catch(() => { })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const s = await apiFetch<{
            policy: { free_shipping_min: number; apply_global: boolean }
            methods: ShippingMethodPublic[]
            zones: ShippingZonePublic[]
          }>('/api/store/shipping')

          if (cancelled) return
          setShipPolicy({
            free_shipping_min: Number(s.policy?.free_shipping_min ?? 0) || 0,
            apply_global: !!s.policy?.apply_global,
          })
          setShippingMethods(Array.isArray(s.methods) ? s.methods : [])
          setShippingZones(Array.isArray(s.zones) ? s.zones : [])

          setForm((cur) => {
            const next = { ...cur }

            // Restore last selection from localStorage (if still active).
            if (!next.shipping_method_id) {
              const raw = window.localStorage.getItem(shipMethodKey)
              const id = raw ? Number(raw) : NaN
              const ok = Number.isFinite(id) && (Array.isArray(s.methods) ? s.methods : []).some((m) => m.is_active && m.id === id)
              if (ok) next.shipping_method_id = id
            }
            if (!next.shipping_zone_id) {
              const raw = window.localStorage.getItem(shipZoneKey)
              const id = raw ? Number(raw) : NaN
              const ok = Number.isFinite(id) && (Array.isArray(s.zones) ? s.zones : []).some((z) => z.is_active && z.id === id)
              if (ok) next.shipping_zone_id = id
            }

            return next
          })
        } catch {
          // keep defaults
        }
      })()
    return () => {
      cancelled = true
    }
  }, [])

  // If selected method is disabled, auto switch to first enabled.
  useEffect(() => {
    if (payAvail[form.payment_method]) return
    const firstEnabled = (['cod', 'vnpay', 'momo'] as PaymentMethod[]).find((m) => payAvail[m])
    if (!firstEnabled) return
    const t = window.setTimeout(() => {
      setForm((s) => ({ ...s, payment_method: firstEnabled }))
    }, 0)
    return () => window.clearTimeout(t)
  }, [form.payment_method, payAvail])

  // Persist selections (do not auto-pick on reload).
  useEffect(() => {
    if (form.shipping_method_id) window.localStorage.setItem(shipMethodKey, String(form.shipping_method_id))
  }, [form.shipping_method_id])

  useEffect(() => {
    if (form.shipping_zone_id) window.localStorage.setItem(shipZoneKey, String(form.shipping_zone_id))
  }, [form.shipping_zone_id])

  useEffect(() => {
    const onChange = () => setCart(getCart())
    window.addEventListener('cart-change', onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener('cart-change', onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const totalQty = useMemo(() => cartCount(cart), [cart])
  const totalPrice = useMemo(() => cartTotal(cart), [cart])

  const isFreeShipping = useMemo(() => {
    return shipPolicy.apply_global && shipPolicy.free_shipping_min > 0 && totalPrice >= shipPolicy.free_shipping_min
  }, [shipPolicy.apply_global, shipPolicy.free_shipping_min, totalPrice])

  const discountAmount = appliedCoupon?.discount_amount ?? 0

  const grandTotal = useMemo(() => {
    const selected = shippingMethods.find((m) => m.id === form.shipping_method_id) || null
    const selectedZone = shippingZones.find((z) => z.id === form.shipping_zone_id) || null
    const shipFee = (selected?.base_fee ?? 0) + (selectedZone?.fee ?? 0)
    return Math.max(0, totalPrice - discountAmount + (isFreeShipping ? 0 : shipFee))
  }, [
    form.shipping_method_id,
    form.shipping_zone_id,
    isFreeShipping,
    shippingMethods,
    shippingZones,
    totalPrice,
    discountAmount,
  ])

  const applyCoupon = async (overrideCode?: string) => {
    const code = overrideCode || couponInput.trim()
    if (!code) return
    setCouponError(null)
    setCouponLoading(true)
    try {
      const res = await apiFetch<{ coupon: any; discount_amount: number }>('/api/coupons/apply', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ code, order_amount: totalPrice }),
      })
      setAppliedCoupon({ code, discount_amount: res.discount_amount })
      setCouponInput('')
      setCouponError(null)
      setShowCouponModal(false)
    } catch (err: unknown) {
      setAppliedCoupon(null)
      setCouponError(err instanceof Error ? err.message : 'Mã giảm giá không hợp lệ.')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  const shippingFee = useMemo(() => {
    const selected = shippingMethods.find((m) => m.id === form.shipping_method_id) || null
    const selectedZone = shippingZones.find((z) => z.id === form.shipping_zone_id) || null
    return isFreeShipping ? 0 : (selected?.base_fee ?? 0) + (selectedZone?.fee ?? 0)
  }, [form.shipping_method_id, form.shipping_zone_id, isFreeShipping, shippingMethods, shippingZones])

  const validationError = useMemo(() => {
    if (cart.items.length === 0) return 'Giỏ hàng đang trống.'
    if (form.name.trim().length === 0) return 'Vui lòng nhập họ và tên.'
    if (form.phone.trim().length === 0) return 'Vui lòng nhập số điện thoại.'
    if (form.address_line.trim().length === 0) return 'Vui lòng nhập địa chỉ.'
    return null
  }, [cart.items.length, form.address_line, form.name, form.phone])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!payAvail[form.payment_method]) {
      setError('Phương thức thanh toán này đang tạm khóa. Vui lòng chọn phương thức khác.')
      return
    }
    setSubmitting(true)
    try {
      if (form.payment_method === 'cod') {
        // If logged in, create real order in backend (so it is saved in DB).
        if (token) {
          const created = await apiFetch<{ id: number; order_code: string }>(`/orders/from-items`, {
            method: 'POST',
            token,
            body: JSON.stringify({
              shipping_name: form.name.trim(),
              shipping_phone: form.phone.trim(),
              shipping_address_line: form.address_line.trim(),
              shipping_province: null,
              shipping_district: null,
              shipping_ward: null,
              notes: form.notes.trim() || null,
              coupon_code: appliedCoupon?.code || null,
              payment_method: 'cod',
              items: cart.items.map((it) => ({
                product_id: it.product_id,
                variant_id: it.variant_id,
                quantity: it.quantity,
              })),
              shipping_method_id: form.shipping_method_id,
              shipping_zone_id: form.shipping_zone_id,
            }),
          })

          localStorage.setItem(
            'last_order',
            JSON.stringify({
              order_id: created.id,
              order_code: created.order_code,
              created_at: new Date().toISOString(),
              shipping_name: form.name.trim(),
              shipping_phone: form.phone.trim(),
              shipping_address_line: form.address_line.trim(),
              notes: form.notes.trim() || null,
              payment_method: 'cod',
              shipping_method_id: form.shipping_method_id,
              shipping_zone_id: form.shipping_zone_id,
              total_qty: totalQty,
              subtotal_amount: totalPrice,
              total_amount: grandTotal,
              items: cart.items,
            }),
          )
          clearCart()
          localStorage.removeItem(pendingPaymentKey)
          setOrderCode(created.order_code)
          return
        }

        // Not logged in: keep frontend-only flow.
        const code = `OD-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
        localStorage.setItem(
          'last_order',
          JSON.stringify({
            order_code: code,
            created_at: new Date().toISOString(),
            shipping_name: form.name.trim(),
            shipping_phone: form.phone.trim(),
            shipping_address_line: form.address_line.trim(),
            notes: form.notes.trim() || null,
            payment_method: form.payment_method,
            shipping_method_id: form.shipping_method_id,
            shipping_zone_id: form.shipping_zone_id,
            total_qty: totalQty,
            subtotal_amount: totalPrice,
            total_amount: grandTotal,
            items: cart.items,
          }),
        )
        clearCart()
        localStorage.removeItem(pendingPaymentKey)
        setOrderCode(code)
        return
      }

      if (!token) {
        setError('Vui lòng đăng nhập để thanh toán online.')
        return
      }

      // For online payments: create 1 backend order from localStorage cart (no duplicates).
      type PendingPayment = { order_id: number; order_code: string; method: PaymentMethod }
      const rawPending = localStorage.getItem(pendingPaymentKey)
      const pending: PendingPayment | null = rawPending ? (JSON.parse(rawPending) as PendingPayment) : null

      let order_id: number
      let order_code: string

      if (pending && pending.method === form.payment_method) {
        order_id = pending.order_id
        order_code = pending.order_code
      } else {
        const created = await apiFetch<{ id: number; order_code: string }>(`/orders/from-items`, {
          method: 'POST',
          token,
          body: JSON.stringify({
            shipping_name: form.name.trim(),
            shipping_phone: form.phone.trim(),
            shipping_address_line: form.address_line.trim(),
            shipping_province: null,
            shipping_district: null,
            shipping_ward: null,
            notes: form.notes.trim() || null,
            coupon_code: appliedCoupon?.code || null,
            payment_method: form.payment_method,
            items: cart.items.map((it) => ({
              product_id: it.product_id,
              variant_id: it.variant_id,
              quantity: it.quantity,
            })),
            shipping_method_id: form.shipping_method_id,
            shipping_zone_id: form.shipping_zone_id,
          }),
        })
        order_id = created.id
        order_code = created.order_code
        localStorage.setItem(pendingPaymentKey, JSON.stringify({ order_id, order_code, method: form.payment_method }))
      }

      // Create payment link & redirect to gateway
      const pay = await apiFetch<{ pay_url: string }>(`/payments/${form.payment_method}/${order_id}/create`, {
        method: 'POST',
        token,
        // MoMo will show "choose payment method" screen by default
        body: form.payment_method === 'momo' ? JSON.stringify({ request_type: 'payWithMethod' }) : undefined,
      })
      window.location.href = pay.pay_url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể đặt hàng. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle gateway return (show success/fail; clear cart only on success)
  useEffect(() => {
    if (!paymentReturn) return
    queueMicrotask(() => {
      if (paymentReturn.success) {
        localStorage.removeItem(pendingPaymentKey)
        clearCart()
        setOrderCode(paymentReturn.order_code)
      } else {
        setError('Thanh toán thất bại. Bạn có thể bấm “Xác nhận đặt hàng” để thử thanh toán lại (không tạo đơn mới).')
      }
    })
  }, [paymentReturn])

  if (orderCode) {
    return (
      <div className="coPage">
        <div className="coContainer">
          <div className="coSuccessWrap">
            <div className="coSuccessCard">
              <div className="coSuccessTop">
                <div className="coSuccessBadge" aria-hidden="true">
                  <CheckIcon />
                </div>
                <div>
                  <div className="coSuccessKicker">Đặt hàng thành công</div>
                  <h1 className="coSuccessTitle">Cảm ơn bạn đã mua sắm!</h1>
                </div>
              </div>

              <div className="coSuccessCodeRow">
                <div className="coSuccessCodeLabel">Mã đơn hàng của bạn:</div>
                <div className="coSuccessCode">{orderCode}</div>
                <button
                  type="button"
                  className="coCopyBtn"
                  onClick={() => void navigator.clipboard?.writeText(orderCode)}
                >
                  Sao chép
                </button>
              </div>

              <div className="coSuccessDesc">
                Đơn hàng của bạn đã được ghi nhận và đang chờ xác nhận. Chúng tôi sẽ nhanh chóng xử lý, đóng gói và cập nhật trạng thái vận chuyển trong thời gian sớm nhất.
                Bạn có thể theo dõi chi tiết đơn hàng, trạng thái giao hàng và thông tin thanh toán trong mục <b>Đơn hàng</b> bất cứ lúc nào.
              </div>

              <div className="coSuccessActions">
                <button type="button" className="coPrimaryBtn" onClick={() => navigate('/products')}>
                  Tiếp tục mua sắm
                </button>
                <Link className="coGhostBtn" to="/">
                  Về trang chủ
                </Link>
                <Link className="coGhostBtn" to="/profile/orders">
                  Xem đơn hàng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="coPage">
      <div className="coContainer">
        <div className="coHeader">
          <div className="coHeaderLeft">
            <Link to="/cart" className="coBackIcon" aria-label="Quay lại">
              ←
            </Link>
            <div>
              <h1 className="coTitle">Thanh toán</h1>
              <div className="coSubtitle">Kiểm tra thông tin nhận hàng và hoàn tất đơn.</div>
            </div>
          </div>
        </div>

        {cart.items.length === 0 ? (
          <div className="coEmpty">
            <p>Giỏ hàng của bạn đang trống.</p>
            <Link to="/products" className="coPrimaryLink">Đi mua sắm</Link>
          </div>
        ) : (
          <div className="coGrid">
            <div className="coLeft">
              <form className="coCard" onSubmit={submit}>
                <div className="coCardTitleRow">
                  <h3 className="coCardTitle">Thông tin nhận hàng</h3>
                </div>

                <div className="coFieldRow">
                  <div className="coField">
                    <label>Họ và tên</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      required
                    />
                  </div>
                  <div className="coField">
                    <label>Số điện thoại</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="0901234567"
                      required
                    />
                  </div>
                </div>

                <div className="coField">
                  <label>Địa chỉ</label>
                  <input
                    value={form.address_line}
                    onChange={(e) => setForm((s) => ({ ...s, address_line: e.target.value }))}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành…"
                    required
                  />
                </div>

                <div className="coField">
                  <label>Ghi chú đơn hàng</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Ví dụ: giao giờ hành chính…"
                    rows={3}
                  />
                </div>

                <div className="coShipBlock">
                  <div className="coShipTitle">Phương thức vận chuyển</div>
                  <div className="coShipZoneRow">
                    <select
                      className="coSelect"
                      value={form.shipping_zone_id ?? ''}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          shipping_zone_id: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      aria-label="Khu vực giao hàng"
                    >
                      <option value="">Chọn khu vực giao hàng</option>
                      {!shippingZones.filter((z) => z.is_active).length && <option value="">Chưa cấu hình khu vực</option>}
                      {shippingZones
                        .filter((z) => z.is_active)
                        .map((z) => {
                          const feeLabel = isFreeShipping ? 'Miễn phí' : z.fee > 0 ? `+${formatVnd(z.fee)}` : '+0 đ'
                          return (
                            <option key={z.id} value={String(z.id)}>
                              {z.name} ({feeLabel})
                            </option>
                          )
                        })}
                    </select>
                    <select
                      className="coSelect"
                      value={form.shipping_method_id ?? ''}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          shipping_method_id: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      aria-label="Phương thức vận chuyển"
                    >
                      <option value="">Chọn phương thức vận chuyển</option>
                      {!shippingMethods.filter((m) => m.is_active).length && <option value="">Chưa cấu hình vận chuyển</option>}
                      {shippingMethods
                        .filter((m) => m.is_active)
                        .map((m) => {
                          const eta =
                            m.estimated_days_min && m.estimated_days_max
                              ? `${m.estimated_days_min}–${m.estimated_days_max} ngày`
                              : m.estimated_days_min
                                ? `${m.estimated_days_min}+ ngày`
                                : ''
                          const label = [m.name, eta ? `· ${eta}` : null].filter(Boolean).join(' ')
                          return (
                            <option key={m.id} value={String(m.id)}>
                              {label}
                            </option>
                          )
                        })}
                    </select>
                  </div>
                  <div className="coShipNote">
                    {isFreeShipping
                      ? 'Miễn phí vận chuyển (đủ điều kiện).'
                      : 'Phí vận chuyển sẽ được tính theo phương thức bạn chọn.'}
                  </div>
                </div>
              </form>

              <div className="coCard coPayCard">
                <h3 className="coCardTitle">Phương thức thanh toán</h3>
                <div className="coPayGrid" role="radiogroup" aria-label="Phương thức thanh toán">
                  <button
                    type="button"
                    disabled={!payAvail.cod}
                    className={`coPayOption ${form.payment_method === 'cod' ? 'is-active' : ''} ${!payAvail.cod ? 'is-disabled' : ''}`}
                    onClick={() => payAvail.cod && setForm((s) => ({ ...s, payment_method: 'cod' }))}
                  >
                    <div className="coPayLogo">
                      <img className="coPayLogoImg" src={logoCod} alt="Thanh toán khi nhận (COD)" />
                    </div>
                    <div className="coPayLabel">Thanh toán khi nhận</div>
                    {!payAvail.cod && <div className="coPayLockedBadge">Tạm khóa</div>}
                  </button>
                  <button
                    type="button"
                    disabled={!payAvail.vnpay}
                    className={`coPayOption ${form.payment_method === 'vnpay' ? 'is-active' : ''} ${!payAvail.vnpay ? 'is-disabled' : ''}`}
                    onClick={() => payAvail.vnpay && setForm((s) => ({ ...s, payment_method: 'vnpay' }))}
                  >
                    <div className="coPayLogo">
                      <img className="coPayLogoImg" src={logoVnpay} alt="VNPAY" />
                    </div>
                    <div className="coPayLabel">VNPAY (ATM/CREDIT)</div>
                    {!payAvail.vnpay && <div className="coPayLockedBadge">Tạm khóa</div>}
                  </button>
                  <button
                    type="button"
                    disabled={!payAvail.momo}
                    className={`coPayOption ${form.payment_method === 'momo' ? 'is-active' : ''} ${!payAvail.momo ? 'is-disabled' : ''}`}
                    onClick={() => payAvail.momo && setForm((s) => ({ ...s, payment_method: 'momo' }))}
                  >
                    <div className="coPayLogo">
                      <img className="coPayLogoImg" src={logoMomo} alt="MoMo" />
                    </div>
                    <div className="coPayLabel">Ví điện tử MoMo</div>
                    {!payAvail.momo && <div className="coPayLockedBadge">Tạm khóa</div>}
                  </button>
                </div>
                {(!payAvail.cod || !payAvail.vnpay || !payAvail.momo) && (
                  <div className="coPayLockedHint" aria-live="polite">
                    Đang tạm khóa:{' '}
                    {([
                      !payAvail.cod ? 'COD' : null,
                      !payAvail.vnpay ? 'VNPAY' : null,
                      !payAvail.momo ? 'MoMo' : null,
                    ]
                      .filter(Boolean)
                      .join(', '))}
                  </div>
                )}
              </div>
            </div>

            <aside className="coSummary">
              <div className="coSummaryCard">
                <h3 className="coSummaryTitle">Tóm tắt đơn hàng ({totalQty})</h3>

                <div className="coSummaryItems">
                  {cart.items.map((it) => (
                    <div key={it.key} className="coSumItem">
                      <div className="coSumThumb">
                        {it.image_url ? <img src={it.image_url} alt="" /> : <div className="coSumThumbPh" />}
                      </div>
                      <div className="coSumBody">
                        <div className="coSumName">{it.name}</div>
                        {it.variant_label && <div className="coSumVariant">{it.variant_label}</div>}
                        <div className="coSumMeta">
                          <span>x{it.quantity}</span>
                          <span>{formatVnd(it.price)}</span>
                        </div>
                      </div>
                      <div className="coSumLine">{formatVnd(it.price * it.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="coSummaryRow">
                  <span>Tạm tính</span>
                  <b>{formatVnd(totalPrice)}</b>
                </div>
                <div className="coSummaryRow">
                  <span>Phí vận chuyển</span>
                  {isFreeShipping ? (
                    <b className="coFree">Miễn phí</b>
                  ) : (
                    <b>{formatVnd(shippingFee)}</b>
                  )}
                </div>

                <div className="coCoupon">
                  {appliedCoupon ? (
                    <div className="coCouponApplied">
                      <div className="coCouponAppliedInfo">
                        <span className="coCouponTag">🎟️ {appliedCoupon.code}</span>
                        <span className="coCouponSaved">-{formatVnd(appliedCoupon.discount_amount)}</span>
                      </div>
                      <button type="button" className="coCouponRemoveBtn" onClick={removeCoupon}>Bỏ mã</button>
                    </div>
                  ) : (
                    <div className="coCouponInputGroup">
                      <div className="coCouponInputRow">
                        <input
                          className="coCouponInput"
                          placeholder="Nhập mã giảm giá"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void applyCoupon() } }}
                          disabled={couponLoading}
                        />
                        <button
                          type="button"
                          className="coCouponBtn"
                          onClick={() => void applyCoupon()}
                          disabled={couponLoading || !couponInput.trim()}
                        >
                          {couponLoading ? 'Đang kiểm…' : 'Áp dụng'}
                        </button>
                      </div>
                      <button type="button" className="coCouponListBtn" onClick={() => setShowCouponModal(true)}>
                        🎁 Chọn mã có sẵn
                      </button>
                    </div>
                  )}
                </div>
                {couponError && <div className="coCouponError">{couponError}</div>}

                {discountAmount > 0 && (
                  <div className="coSummaryRow coDiscountRow">
                    <span>Giảm giá</span>
                    <b className="coDiscountValue">-{formatVnd(discountAmount)}</b>
                  </div>
                )}

                <div className="coDivider" />
                <div className="coSummaryTotal">
                  <div>Tổng cộng</div>
                  <div className="coTotalPrice">{formatVnd(grandTotal)}</div>
                </div>

                {error && <div className="coError">{error}</div>}

                <button
                  type="button"
                  className="coConfirmBtn"
                  disabled={submitting || cart.items.length === 0}
                  onClick={() => void submit()}
                >
                  XÁC NHẬN ĐẶT HÀNG
                </button>
                <div className="coFinePrint">
                  Bằng cách nhấn nút, bạn đồng ý với điều khoản mua hàng.
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {showCouponModal && (
        <div className="coModalOverlay" onClick={() => setShowCouponModal(false)}>
          <div className="coModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="coModalHeader">
              <h3 className="coModalTitle">Chọn mã giảm giá</h3>
              <button type="button" className="coModalClose" onClick={() => setShowCouponModal(false)}>✕</button>
            </div>
            <div className="coModalBody">
              {activeCoupons.length === 0 ? (
                <div className="coModalEmpty">Hiện chưa có mã giảm giá nào.</div>
              ) : (
                <div className="coCouponList">
                  {activeCoupons.map((c) => {
                    const isEligible = !c.min_order_amount || totalPrice >= c.min_order_amount
                    return (
                      <div key={c.id} className={`coCouponItem ${!isEligible ? 'is-disabled' : ''}`}>
                        <div className="coCouponItemLeft">
                          <div className="coCouponItemCode">{c.code}</div>
                          <div className="coCouponItemValue">
                            {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`}
                          </div>
                          {c.min_order_amount && (
                            <div className="coCouponItemMin">
                              Đơn tối thiểu {formatVnd(c.min_order_amount)}
                            </div>
                          )}
                        </div>
                        <div className="coCouponItemRight">
                          <button
                            type="button"
                            className="coCouponItemBtn"
                            disabled={!isEligible || couponLoading}
                            onClick={() => void applyCoupon(c.code)}
                          >
                            Áp dụng
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





function CheckIcon() {return (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5"stroke="currentColor"strokeWidth="2.4"strokeLinecap="round"strokeLinejoin="round"/></svg>)}
