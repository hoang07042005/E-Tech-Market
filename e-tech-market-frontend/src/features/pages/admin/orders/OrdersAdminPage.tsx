import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '@/configs/api.config'
import { fetchOrders, fetchOrderDetail, updateOrder, processOrderReturn, deleteOrder } from '@/features/services/admin/api.admin.service'
import ConfirmModal from '@/components/ConfirmModal'

type OrderRow = {
  id: number
  order_code: string
  customer_name: string
  customer_avatar_url?: string | null
  created_date: string
  total_amount: number
  payment_method: string
  status: string
  status_label: string
  status_tone: 'ok' | 'wait' | 'info' | 'bad' | 'muted'
  product: string
  return_request?: { status: string } | null
}

type OrdersResponse = {
  data: OrderRow[]
  pagination: {
    current_page: number
    per_page: number
    total: number
    last_page: number
    from: number | null
    to: number | null
  }
  stats: {
    total: number
    pending: number
    processing: number
    completed: number
    canceled: number
    return_requests_pending?: number
  }
}

type OrderDetail = {
  id: number
  order_code: string
  created_at?: string | null
  created_date: string
  created_time: string
  status: string
  status_label: string
  status_tone: 'ok' | 'wait' | 'info' | 'bad' | 'muted'
  status_step: number
  payment_status?: string
  payment: {
    method: string
    raw_method?: string | null
    status?: string | null
    transaction_code?: string | null
    paid_at?: string | null
  }
  customer: {
    name: string
    avatar_url?: string | null
    email?: string | null
    phone?: string | null
  }
  shipping: {
    name?: string | null
    phone?: string | null
    address: string
  }
  amounts: {
    subtotal: number
    discount: number
    points_discount?: number
    shipping_fee: number
    total: number
  }
  notes?: string | null
  return_request?: {
    id?: number
    status: string
    content?: string | null
    media?: Array<{ type?: string; url?: string | null; original_name?: string | null }> | null
    admin_note?: string | null
    refund_proof?: Array<{ type?: string; url?: string | null; original_name?: string | null }> | null
    approved_at?: string | null
    refunded_at?: string | null
    created_at?: string | null
    updated_at?: string | null
  } | null
  status_history?: Array<{
    id: number
    from_status?: string | null
    to_status: string
    from_label?: string | null
    to_label: string
    note?: string | null
    changed_at?: string | null
    changed_by?: { id: number; name: string; avatar_url?: string | null } | null
  }>
  items: Array<{
    product_id: number
    variant_id?: number | null
    name: string
    image_url?: string | null
    quantity: number
    unit_price: number
    total_price: number
    variant_color?: string | null
    variant_config?: string | null
  }>
}

const ORDER_STATUS_STEPS: Array<{ value: string; label: string; step: number }> = [
  { value: 'pending', label: 'Chờ xác nhận', step: 1 },
  { value: 'processing', label: 'Đã xác nhận', step: 2 },
  { value: 'paid', label: 'Chuyển bị hàng', step: 3 },
  { value: 'shipped', label: 'Đang giao', step: 4 },
  { value: 'delivered', label: 'Đã giao', step: 5 },
  { value: 'completed', label: 'Hoàn thành', step: 6 },
  { value: 'returned', label: 'Hoàn trả', step: 7 },
  { value: 'cancelled', label: 'Hủy', step: 0 },
]

function initialsOf(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return (a + b).toUpperCase()
}

function avatarToneOf(s: string) {
  const x = Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5
  return (['beige', 'blue', 'peach', 'sand', 'gray'] as const)[x]
}

function resolveAvatar(url?: string | null) {
  if (!url) return null
  const s = url.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* keep original */ }
    return s
  }
  return `${API_BASE_URL}${s.startsWith('/') ? s : `/${s}`}`
}

function resolveImage(url?: string | null) {
  return resolveAvatar(url)
}

function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN')
}

function parseDateString(iso: string) {
  const raw = iso.trim()
  if (!raw) return null

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const naiveTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)

  if (naiveTimestamp) {
    // Backend stores local Vietnam time (UTC+7) as naive strings.
    // Explicitly tag as +07:00 so the Date object is correct UTC internally,
    // then Intl.DateTimeFormat(Asia/Ho_Chi_Minh) will display the right local time
    // regardless of the browser's own timezone.
    const d = new Date(normalized + '+07:00')
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

function fmtViTime(iso?: string | null) {
  const d = iso ? parseDateString(iso) : null
  if (!d) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d)
}

export default function OrdersAdminPage() {
  // 🔒 Token is sent via httpOnly cookie automatically
  const hasAuth = true  // Always authenticated — behind ProtectedRoute

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [res, setRes] = useState<OrdersResponse | null>(null)
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [savingDetail, setSavingDetail] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>('pending')
  const [listTab, setListTab] = useState<'all' | 'returns'>('all')
  const [rrBusy, setRrBusy] = useState(false)
  const [rrError, setRrError] = useState<string | null>(null)
  const [rrNote, setRrNote] = useState<string>('')
  const [rrRefundFiles, setRrRefundFiles] = useState<File[]>([])
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<{ id: number; code: string } | null>(null)

  const [filters, setFilters] = useState({
    order_code: '',
    customer: '',
    date_from: '',
    date_to: '',
    status: 'all',
    payment_method: 'all',
    payment_status: 'all',
  })
  const [page, setPage] = useState(1)
  const switchListTab = (tab: 'all' | 'returns') => {
    setListTab(tab)
    setPage(1)
    setFilters((p) => ({
      ...p,
      status: tab === 'returns' ? 'all' : p.status,
    }))
  }

  useEffect(() => {
    const onOpenReturns = () => switchListTab('returns')
    window.addEventListener('admin-open-returns', onOpenReturns as EventListener)
    return () => window.removeEventListener('admin-open-returns', onOpenReturns as EventListener)
  }, [])

  const queryString = useMemo(() => {
    const q = new URLSearchParams()
    q.set('page', String(page))
    q.set('per_page', '20')
    if (filters.order_code.trim()) q.set('order_code', filters.order_code.trim())
    if (filters.customer.trim()) q.set('customer', filters.customer.trim())
    if (filters.date_from.trim()) q.set('date_from', filters.date_from.trim())
    if (filters.date_to.trim()) q.set('date_to', filters.date_to.trim())
    if (filters.status !== 'all') q.set('status', filters.status)
    if (filters.payment_method !== 'all') q.set('payment_method', filters.payment_method)
    if (filters.payment_status !== 'all') q.set('payment_status', filters.payment_status)
    if (listTab === 'returns') q.set('return_requests', 'pending')
    return q.toString()
  }, [filters, listTab, page])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!hasAuth) {
        setError('Bạn chưa đăng nhập.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchOrders<OrdersResponse>(queryString)
        if (cancelled) return
        setRes(data)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Không tải được đơn hàng.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [hasAuth, queryString])

  useEffect(() => {
    let cancelled = false
    async function loadDetail() {
      if (view !== 'detail' || !selectedId) return
      if (!hasAuth) {
        setDetailError('Bạn chưa đăng nhập.')
        return
      }
      setDetailLoading(true)
      setDetailError(null)
      try {
        const d = await fetchOrderDetail<OrderDetail>(selectedId)
        if (cancelled) return
        setDetail(d)
        setDraftStatus(d.status || 'pending')
      } catch (e) {
        if (cancelled) return
        setDetailError(e instanceof Error ? e.message : 'Không tải được chi tiết đơn.')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    void loadDetail()
    return () => {
      cancelled = true
    }
  }, [hasAuth, view, selectedId])

  const saveDetail = async () => {
    if (!hasAuth || !detail) return
    setSavingDetail(true)
    setDetailError(null)
    try {
      const updated = await updateOrder<OrderDetail>(detail.id, { status: draftStatus })
      setDetail(updated)

      // Update row badge in list if already loaded
      setRes((cur) => {
        if (!cur) return cur
        const nextRows = cur.data.map((r) =>
          r.id === updated.id
            ? {
                ...r,
                status: updated.status,
                status_label: updated.status_label,
                status_tone: updated.status_tone,
              }
            : r,
        )
        return { ...cur, data: nextRows }
      })
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Không thể lưu trạng thái.')
    } finally {
      setSavingDetail(false)
    }
  }

  const updateRowReturnRequest = (updated: OrderDetail) => {
    setRes((cur) => {
      if (!cur) return cur
      const nextRows = cur.data.map((r) =>
        r.id === updated.id
          ? {
              ...r,
              return_request: updated.return_request ? { status: updated.return_request.status } : null,
            }
          : r,
      )
      return { ...cur, data: nextRows }
    })
  }

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return
    const { id } = orderToDelete
    try {
      await deleteOrder(id)
      setRes((cur) => {
        if (!cur) return cur
        const nextRows = cur.data.filter((r) => r.id !== id)
        return {
          ...cur,
          data: nextRows,
          pagination: {
            ...cur.pagination,
            total: Math.max(0, cur.pagination.total - 1),
          }
        }
      })
      if (selectedId === id) {
        setSelectedId(null)
        setView('list')
      }
      setDeleteModalOpen(false)
      setOrderToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa đơn hàng.')
    }
  }

  const approveReturnRequest = async () => {
    if (!hasAuth || !detail) return
    setRrBusy(true)
    setRrError(null)
    try {
      const updated = await processOrderReturn<OrderDetail>(detail.id, 'approve', { admin_note: rrNote.trim() ? rrNote.trim() : null })
      setDetail(updated)
      updateRowReturnRequest(updated)
    } catch (e) {
      setRrError(e instanceof Error ? e.message : 'Không thể phê duyệt.')
    } finally {
      setRrBusy(false)
    }
  }

  const rejectReturnRequest = async () => {
    if (!hasAuth || !detail) return
    if (!rrNote.trim()) {
      setRrError('Vui lòng nhập lý do/ghi chú khi từ chối.')
      return
    }
    setRrBusy(true)
    setRrError(null)
    try {
      const updated = await processOrderReturn<OrderDetail>(detail.id, 'reject', { admin_note: rrNote.trim() })
      setDetail(updated)
      updateRowReturnRequest(updated)
    } catch (e) {
      setRrError(e instanceof Error ? e.message : 'Không thể từ chối.')
    } finally {
      setRrBusy(false)
    }
  }

  const markRefunded = async () => {
    if (!hasAuth || !detail) return
    setRrBusy(true)
    setRrError(null)
    try {
      const fd = new FormData()
      if (rrNote.trim()) fd.set('admin_note', rrNote.trim())
      rrRefundFiles.forEach((f) => fd.append('refund_proof[]', f))
      const updated = await processOrderReturn<OrderDetail>(detail.id, 'refunded', fd as any)
      setDetail(updated)
      updateRowReturnRequest(updated)
      setRrRefundFiles([])
    } catch (e) {
      setRrError(e instanceof Error ? e.message : 'Không thể cập nhật hoàn tiền.')
    } finally {
      setRrBusy(false)
    }
  }

  const stats = res?.stats ?? { total: 0, pending: 0, processing: 0, completed: 0, canceled: 0, return_requests_pending: 0 }
  const rows = res?.data ?? []
  const pg = res?.pagination

  const pageNums = useMemo(() => {
    const last = pg?.last_page ?? 1
    const cur = pg?.current_page ?? 1
    const out: number[] = []
    const start = Math.max(1, cur - 1)
    const end = Math.min(last, start + 2)
    for (let i = start; i <= end; i++) out.push(i)
    return { out, last, cur }
  }, [pg?.current_page, pg?.last_page])

  if (view === 'detail') {
    return (
      <div className="admOrderDetailPage">
        <div className="admOrderDetailTop">
          <button
            type="button"
            className="admOrderBackBtn"
            onClick={() => {
              setView('list')
              setSelectedId(null)
              setDetail(null)
            }}
          >
            ← Quay lại
          </button>
          {/* <div className="admOrderDetailActions">
            <button type="button" className="admOrdersBtn ghost">
              <span className="admOrdersBtnIcon" aria-hidden>🧾</span> In hóa đơn
            </button>
            <button type="button" className="admOrdersBtn primary" onClick={() => void saveDetail()} disabled={savingDetail || detailLoading || !detail}>
              <span className="admOrdersBtnIcon" aria-hidden>💾</span> Lưu thay đổi
            </button>
          </div> */}
        </div>

        {detailLoading ? (
          <div className="admOrderCard" style={{ padding: 20 }}>
            <div className="admSkeletonBar" style={{ width: '40%', height: 24, marginBottom: 20 }} />
            <div className="admSkeletonBar" style={{ width: '100%', height: 100, marginBottom: 16 }} />
            <div className="admSkeletonBar" style={{ width: '100%', height: 140 }} />
          </div>
        ) : detailError ? (
          <div className="admOrdersEmpty">{detailError}</div>
        ) : !detail ? (
          <div className="admOrdersEmpty">Không có dữ liệu.</div>
        ) : (
          <>
            <div className="admOrderHeader">
              <div className="admOrderHeaderLeft">
                <div className="admOrderTitleRow">
                  <h2 className="admOrderTitle">Đơn hàng #{detail.order_code}</h2>
                  <span className={`admOrdersStatus2 tone-${detail.status_tone}`}>{detail.status_label}</span>
                </div>
                <div className="admOrderSub">
                  Đặt vào {detail.created_date}, {detail.created_time}
                </div>
              </div>
            </div>

            <section className="admOrderCard admOrderStatusCard">
              <div className="admOrderCardHead">
                <div className="admOrderCardTitle">Quản lý trạng thái</div>
                <div className="admOrderStatusPick">
                  <span className="admOrderStatusPickLabel">Trạng thái hiện tại:</span>
                  <span className={`admOrdersStatus2 tone-${detail.status_tone}`}>{detail.status_label}</span>
                </div>
              </div>
              <div className="admOrderStatusForm">
                <div className="admOrderStatusFormText">
                  <label className="admOrderStatusFormLabel" htmlFor="order-status-select">
                    Cập nhật trạng thái
                  </label>
                  <p className="admOrderStatusFormHint">Chọn trạng thái phù hợp để cập nhật tiến trình xử lý đơn hàng.</p>
                </div>
                <div className="admOrderStatusFormControls">
                  <select
                    id="order-status-select"
                    className="admOrdersSelect"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    aria-label="Chọn trạng thái đơn hàng"
                  >
                    {ORDER_STATUS_STEPS.map((s) => {
                      const isTerminal = detail.status === 'cancelled' || detail.status === 'returned' || detail.status === 'completed'
                      // Admin không được set completed/returned/cancelled. Chỉ hiển thị option này khi đơn đang ở đúng trạng thái (để xem).
                      if ((s.value === 'completed' || s.value === 'returned' || s.value === 'cancelled') && detail.status !== s.value) return null
                      const disableBack =
                        s.value !== 'cancelled' &&
                        s.step > 0 &&
                        detail.status_step > 0 &&
                        s.step < detail.status_step
                      const disabled = isTerminal ? s.value !== detail.status : disableBack
                      return (
                        <option key={s.value} value={s.value} disabled={disabled}>
                          {s.label}
                        </option>
                      )
                    })}
                  </select>
                  <button
                    type="button"
                    className="admOrdersBtn primary"
                    onClick={() => void saveDetail()}
                    disabled={savingDetail || draftStatus === detail.status}
                  >
                    {savingDetail ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              </div>
              <div className="admOrderSteps">
                {(() => {
                  const showReturnStep = detail.status === 'returned' || detail.return_request?.status === 'approved' || detail.return_request?.status === 'refunded'
                  const baseSteps = detail.status === 'cancelled'
                    ? [{ value: 'cancelled', label: 'Hủy', step: 0 }]
                    : ORDER_STATUS_STEPS.filter((s) => s.value !== 'cancelled' && (s.value !== 'returned' || showReturnStep))
                  const steps = showReturnStep
                    ? baseSteps.map((s) => {
                        if (s.value === 'returned') return { ...s, step: 6 }
                        if (s.value === 'completed') return { ...s, step: 7 }
                        return s
                      }).sort((a, b) => a.step - b.step)
                    : baseSteps
                  const historyMap = new Map(detail.status_history?.map((h) => [h.to_status, h.changed_at ?? null]) ?? [])
                  const effectiveStep = detail.status === 'cancelled'
                    ? 0
                    : detail.return_request?.status === 'refunded'
                      ? 7
                      : detail.status === 'returned' || detail.return_request?.status === 'approved'
                        ? 6
                        : detail.status_step
                  return steps.map((s, idx) => {
                    const isCancel = s.step === 0
                    const done = isCancel ? detail.status === 'cancelled' : s.step <= effectiveStep
                    const active = isCancel ? detail.status === 'cancelled' : s.step === effectiveStep
                    const historyTime = historyMap.get(s.value)
                    const time = historyTime
                      ? fmtViTime(historyTime)
                      : s.value === 'pending'
                        ? `${detail.created_time} ${detail.created_date}`
                        : s.value === 'returned' && detail.return_request?.status === 'approved'
                          ? fmtViTime(detail.return_request.approved_at)
                          : s.value === 'completed' && detail.return_request?.status === 'refunded'
                            ? fmtViTime(detail.return_request.refunded_at)
                            : null
                    const label = s.value === 'completed' && showReturnStep ? 'Hoàn thành (hoàn trả)' : s.label
                    return (
                      <div key={`${s.value}-${s.step}`} className={`admOrderStep ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                        <div className="admOrderStepDot" aria-hidden>{done ? '✓' : idx + 1}</div>
                        <div>
                          <div className="admOrderStepLabel">{label}</div>
                          {time ? <div className="admOrderStepTime">{time}</div> : null}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </section>

            <div className="admOrderGrid">
              <section className="admOrderCard">
                <div className="admOrderCardHead">
                  <div className="admOrderCardTitle">Danh sách sản phẩm</div>
                  <span className="admOrderChip">{detail.items.length} món</span>
                </div>
                <div className="admOrderTableWrap">
                  <table className="admOrderTable">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Đơn giá</th>
                        <th>Số lượng</th>
                        <th>Tổng cộng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((it, i) => {
                        const variantSub = [it.variant_color, it.variant_config].filter(Boolean).join(' - ')
                        return (
                        <tr key={`${it.product_id}-${i}`}>
                          <td className="admOrderProd">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {it.image_url ? (
                                <img
                                  src={resolveImage(it.image_url) || undefined}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                  style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(15,23,42,.08)', background: '#f3f4f6', flex: '0 0 auto' }}
                                />
                              ) : (
                                <span style={{ width: 42, height: 42, borderRadius: 10, border: '1px solid rgba(15,23,42,.08)', background: 'rgba(148,163,184,.12)', flex: '0 0 auto' }} />
                              )}
                              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <span>{it.name}</span>
                                {variantSub && (
                                  <span style={{ fontSize: 13, color: 'var(--admin-text-s)', marginTop: 2 }}>
                                    {variantSub}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="admOrderMoney">{fmtVnd(it.unit_price)}đ</td>
                          <td className="admOrderQty">{it.quantity}</td>
                          <td className="admOrderMoney strong">{fmtVnd(it.total_price)}đ</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="admOrderRightCol">
                <section className="admOrderCard">
                  <div className="admOrderCardHead">
                    <div className="admOrderCardTitle">Thông tin khách hàng</div>
                    
                  </div>
                  <div className="admOrderCustomerBox">
                    {detail.customer.avatar_url ? (
                      <img className="admOrderAvatarImg" src={resolveAvatar(detail.customer.avatar_url) || undefined} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className={`admOrderAvatar tone-${avatarToneOf(detail.customer.name)}`} aria-hidden>{initialsOf(detail.customer.name)}</span>
                    )}
                    <div className="admOrderCustomerInfo">
                      <div className="admOrderCustomerName">{detail.customer.name}</div>
                      <div className="admOrderCustomerSub">{detail.customer.phone ?? '—'}</div>
                      <div className="admOrderCustomerSub">{detail.customer.email ?? '—'}</div>
                    </div>
                  </div>
                  <div className="admOrderAddr">
                    <div className="admOrderAddrLabel">Địa chỉ giao hàng</div>
                    <div className="admOrderAddrValue">{detail.shipping.address || '—'}</div>
                  </div>
                </section>

                <section className="admOrderCard">
                  <div className="admOrderCardHead">
                    <div className="admOrderCardTitle">Thanh toán &amp; Chi phí</div>
                  </div>
                  <div className="admOrderPayGrid">
                    <div className="admOrderPayRow">
                      <span>Tạm tính</span>
                      <span className="admOrderMoney strong">{fmtVnd(detail.amounts.subtotal)}đ</span>
                    </div>
                    <div className="admOrderPayRow">
                      <span>Phí vận chuyển</span>
                      <span className="admOrderMoney">{fmtVnd(detail.amounts.shipping_fee)}đ</span>
                    </div>
                    <div className="admOrderPayRow">
                      <span>Giảm giá khuyến mãi</span>
                      <span className="admOrderMoney neg">-{fmtVnd(detail.amounts.discount)}đ</span>
                    </div>
                    {(detail.amounts.points_discount ?? 0) > 0 && <div className="admOrderPayRow">
                      <span>Giảm giá (Điểm thưởng)</span>
                      <span className="admOrderMoney neg">-{fmtVnd(detail.amounts.points_discount ?? 0)}đ</span>
                    </div>}
                    <div className="admOrderPayDivider" />
                    <div className="admOrderPayRow total">
                      <span>Thành tiền</span>
                      <span className="admOrderMoney strong">{fmtVnd(detail.amounts.total)}đ</span>
                    </div>
                    <div className="admOrderPayMethod">
                      <div className="admOrderPayMethodLabel">Phương thức</div>
                      <div className="admOrderPayMethodValue">{detail.payment.method}</div>
                      <span className={`admOrdersStatus2 tone-${detail.payment.status === 'paid' ? 'ok' : 'wait'}`}>
                        {detail.payment.status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="admOrderCard">
                  <div className="admOrderCardHead">
                    <div className="admOrderCardTitle">Ghi chú nội bộ</div>
                  </div>
                  <div className="admOrderNote">
                    {detail.notes ? `“${detail.notes}”` : 'Chưa có ghi chú.'}
                  </div>
                </section>
              </div>
            </div>

            <div className="admOrderBottomGrid">
              <section className="admOrderCard">
                <div className="admOrderCardHead">
                  <div className="admOrderCardTitle">Yêu cầu hoàn trả</div>
                  {detail.return_request ? (
                    <span
                      className={`admOrderChip ${
                        detail.return_request.status === 'pending'
                          ? 'warn'
                          : detail.return_request.status === 'approved'
                            ? 'info'
                            : detail.return_request.status === 'refunded'
                              ? 'ok'
                              : detail.return_request.status === 'rejected'
                                ? 'bad'
                                : ''
                      }`}
                    >
                      {detail.return_request.status}
                    </span>
                  ) : null}
                </div>
                {!detail.return_request ? (
                  <div className="admOrdersEmpty" style={{ padding: 8 }}>
                    Không có yêu cầu hoàn trả.
                  </div>
                ) : (
                  <>
                    <div className="admOrderSupportGrid">
                      <div className="admOrderSupportBox">
                        <div className="admOrderSupportLabel">Nội dung yêu cầu</div>
                        <div className="admOrderSupportValue" style={{ whiteSpace: 'pre-wrap' }}>
                          {detail.return_request.content || '—'}
                        </div>
                        {Array.isArray(detail.return_request.media) && detail.return_request.media.length ? (
                          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                            {detail.return_request.media.slice(0, 8).map((m, i) => {
                              const u = resolveImage(m?.url || null)
                              if (!u) return null
                              const isVideo = (m?.type || '').toString().toLowerCase() === 'video'
                              return isVideo ? (
                                <video key={i} src={u} controls style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 10, background: '#111827' }} />
                              ) : (
                                <img key={i} src={u} alt="" style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 10, background: '#f3f4f6' }} />
                              )
                            })}
                          </div>
                        ) : null}
                      </div>

                      <div className="admOrderSupportBox">
                        <div className="admOrderSupportLabel">Ghi chú admin</div>
                        <textarea
                          className="admOrderTextarea"
                          placeholder="Nhập ghi chú (lý do từ chối / nội dung hoàn tiền...)"
                          value={rrNote}
                          onChange={(e) => setRrNote(e.target.value)}
                        />
                        {detail.return_request.status === 'approved' ? (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--admin-text-p)' }}>Chứng từ hoàn tiền</div>
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              onChange={(e) => setRrRefundFiles(Array.from(e.target.files || []))}
                            />
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--admin-text-s)' }}>Upload ảnh/video chứng từ hoàn tiền (tối đa 8 file).</div>
                          </div>
                        ) : null}

                        {detail.return_request.admin_note ? (
                          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--admin-text-s)' }}>
                            <span style={{ fontWeight: 900 }}>Đã lưu:</span> {detail.return_request.admin_note}
                          </div>
                        ) : null}

                        {Array.isArray(detail.return_request.refund_proof) && detail.return_request.refund_proof.length ? (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--admin-text-p)' }}>Chứng từ đã lưu</div>
                            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                              {detail.return_request.refund_proof.slice(0, 8).map((m, i) => {
                                const u = resolveImage(m?.url || null)
                                if (!u) return null
                                const isVideo = (m?.type || '').toString().toLowerCase() === 'video'
                                return isVideo ? (
                                  <video key={i} src={u} controls style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 10, background: '#111827' }} />
                                ) : (
                                  <img key={i} src={u} alt="" style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 10, background: '#f3f4f6' }} />
                                )
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="admOrderSupportActions">
                      {detail.return_request.status === 'pending' ? (
                        <>
                          <button type="button" className="admOrderDangerBtn" disabled={rrBusy} onClick={() => void rejectReturnRequest()}>
                            {rrBusy ? 'Đang xử lý…' : 'Từ chối'}
                          </button>
                          <button type="button" className="admOrderOkBtn" disabled={rrBusy} onClick={() => void approveReturnRequest()}>
                            {rrBusy ? 'Đang xử lý…' : 'Phê duyệt'}
                          </button>
                        </>
                      ) : detail.return_request.status === 'approved' ? (
                        <button type="button" className="admOrderOkBtn" disabled={rrBusy} onClick={() => void markRefunded()}>
                          {rrBusy ? 'Đang lưu…' : 'Xác nhận đã hoàn tiền'}
                        </button>
                      ) : null}
                      {rrError ? (
                        <div style={{ marginLeft: 'auto', color: '#b91c1c', fontWeight: 900, fontSize: 12 }}>
                          {rrError}
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </section>
            </div>

            <section className="admOrderCard" style={{ marginTop: 12 }}>
              <div className="admOrderCardHead">
                <div className="admOrderCardTitle">Lịch sử chuyển trạng thái</div>
                <span className="admOrderChip">{(detail.status_history?.length ?? 0).toLocaleString('vi-VN')} lần</span>
              </div>
              {!detail.status_history?.length ? (
                <div className="admOrdersEmpty" style={{ padding: 8 }}>
                  Chưa có lịch sử.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.status_history.map((h) => (
                    <div key={h.id} className="admOrderSupportBox" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, color: 'var(--admin-text-p)' }}>
                          {(h.from_label || '—') + ' → ' + (h.to_label || h.to_status)}
                        </div>
                        <div style={{ marginTop: 4, fontWeight: 700, fontSize: 12, color: 'var(--admin-text-s)' }}>
                          {fmtViTime(h.changed_at)} {h.changed_by?.name ? `• ${h.changed_by.name}` : ''}
                        </div>
                        {h.note ? (
                          <div style={{ marginTop: 6, fontWeight: 600, fontSize: 12, color: 'var(--admin-text-s)' }}>{h.note}</div>
                        ) : null}
                      </div>
                      <span className="admOrderChip">{h.to_label || h.to_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="admOrdersPage">
      <div className="admOrdersTop">
        <div>
          <h2 className="admOrdersTitle">Quản lý đơn hàng</h2>
          
        </div>
      </div>

      <div className="admOrdersKpis">
        <div className="admOrdersKpi">
          <div className="admOrdersKpiLabel">Tổng đơn hàng</div>
          <div className="admOrdersKpiValue">{stats.total.toLocaleString('vi-VN')}</div>
          <div className="admOrdersKpiSub ok">+12%</div>
        </div>
        <div className="admOrdersKpi">
          <div className="admOrdersKpiLabel">Chờ xác nhận</div>
          <div className="admOrdersKpiValue warn">{stats.pending.toLocaleString('vi-VN')}</div>
          <div className="admOrdersKpiSub">Yêu cầu xử lý</div>
        </div>
        <div className="admOrdersKpi">
          <div className="admOrdersKpiLabel">Đang xử lý</div>
          <div className="admOrdersKpiValue info">{stats.processing.toLocaleString('vi-VN')}</div>
          <div className="admOrdersKpiSub">Trong kho</div>
        </div>
        <div className="admOrdersKpi">
          <div className="admOrdersKpiLabel">Hoàn thành</div>
          <div className="admOrdersKpiValue ok">{stats.completed.toLocaleString('vi-VN')}</div>
          <div className="admOrdersKpiSub ok">Giao hàng thành công</div>
        </div>
        <div className="admOrdersKpi">
          <div className="admOrdersKpiLabel">Đã hủy</div>
          <div className="admOrdersKpiValue bad">{stats.canceled.toLocaleString('vi-VN')}</div>
          <div className="admOrdersKpiSub bad">Thất bại</div>
        </div>
      </div>

      <section className="admOrdersFilterCard">
        <div className="admOrdersFilterTitle">Bộ lọc nâng cao</div>
        <div className="admOrdersFilters">
          <div className="admOrdersField">
            <div className="admOrdersFieldLabel">Mã đơn hàng</div>
            <input
              className="admOrdersInput"
              placeholder="#ET-XXXX"
              value={filters.order_code}
              onChange={(e) => setFilters((p) => ({ ...p, order_code: e.target.value }))}
            />
          </div>
          <div className="admOrdersField">
            <div className="admOrdersFieldLabel">Tên khách hàng</div>
            <input
              className="admOrdersInput"
              placeholder="Nhập tên…"
              value={filters.customer}
              onChange={(e) => setFilters((p) => ({ ...p, customer: e.target.value }))}
            />
          </div>
          <div className="admOrdersField">
            <div className="admOrdersFieldLabel">Khoảng ngày</div>
            <div className="admOrdersDateRow">
              <input
                className="admOrdersInput"
                placeholder="dd/mm/yyyy"
                value={filters.date_from}
                onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
              />
              <span className="admOrdersDateSep">–</span>
              <input
                className="admOrdersInput"
                placeholder="dd/mm/yyyy"
                value={filters.date_to}
                onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
              />
            </div>
          </div>
          <div className="admOrdersField">
            <div className="admOrdersFieldLabel">Trạng thái</div>
            <select className="admOrdersSelect" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="processing">Đã xác nhận</option>
              <option value="paid">Chuyển bị hàng</option>
              <option value="shipped">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="completed">Hoàn thành</option>
              <option value="returned">Hoàn trả</option>
              <option value="cancelled">Hủy</option>
            </select>
          </div>
          <div className="admOrdersField">
            <div className="admOrdersFieldLabel">Thanh toán</div>
            <select className="admOrdersSelect" value={filters.payment_method} onChange={(e) => setFilters((p) => ({ ...p, payment_method: e.target.value }))}>
              <option value="all">Tất cả</option>
              <option value="cod">COD</option>
              <option value="vnpay">VNPAY</option>
              <option value="momo">MoMo</option>
            </select>
          </div>
        </div>

        <div className="admOrdersFilterActions">
          <button
            type="button"
            className="admOrdersLinkBtn"
            onClick={() => {
              setFilters({
                order_code: '',
                customer: '',
                date_from: '',
                date_to: '',
                status: 'all',
                payment_method: 'all',
                payment_status: 'all',
              })
              setPage(1)
            }}
          >
            Xóa bộ lọc
          </button>
          <button
            type="button"
            className="admOrdersBtn primary"
            onClick={() => {
              setPage(1)
            }}
          >
            Áp dụng
          </button>
        </div>
      </section>

      <div className="admOrdersTop">
        <div>
          <div className="admOrdersTabs">
            <button
              type="button"
              className={`admOrdersTab ${listTab === 'all' ? 'active' : ''}`}
              onClick={() => switchListTab('all')}
            >
              Tất cả đơn hàng
            </button>
            <button
              type="button"
              className={`admOrdersTab ${listTab === 'returns' ? 'active' : ''}`}
              onClick={() => switchListTab('returns')}
            >
              Yêu cầu hoàn trả {stats.return_requests_pending ? `(${stats.return_requests_pending})` : ''}
            </button>
          </div>
        </div>
      </div>

      <section className="admOrdersTableCard">
       {loading ? (
        <div className="admTxnWrap" style={{ marginTop: 24, border: 'none' }}>
          <table className="admTxnTable">
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={8}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '80%' : '60%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
          <div className="admOrdersEmpty">{error}</div>
        ) : (
          <>
            <div className="admOrdersTableWrap2">
              <table className="admOrdersTable2">
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Khách hàng</th>
                    <th>Ngày đặt</th>
                    <th>Tổng cộng</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td className="admOrdersCode2">#{o.order_code}</td>
                      <td>
                        <div className="admOrdersCust2">
                          {o.customer_avatar_url ? (
                            <img className="admOrdersAvatar2Img" src={resolveAvatar(o.customer_avatar_url) || undefined} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span className={`admOrdersAvatar2 tone-${avatarToneOf(o.customer_name)}`} aria-hidden>{initialsOf(o.customer_name)}</span>
                          )}
                          <div className="admOrdersCust2Info">
                            <div className="admOrdersCust2Name">{o.customer_name}</div>
                            <div className="admOrdersCust2Sub">{o.product}</div>
                          </div>
                        </div>
                      </td>
                      <td className="admOrdersDate2">{o.created_date}</td>
                      <td className="admOrdersTotal2">{fmtVnd(o.total_amount)}đ</td>
                      <td className="admOrdersPay2">{o.payment_method}</td>
                      <td>
                        <span className={`admOrdersStatus2 tone-${o.status_tone}`}>{o.status_label}</span>
                      </td>
                      <td className="admOrdersActions2">
                        <button
                          className="admOrdersIconBtn"
                          type="button"
                          aria-label="Xem"
                          onClick={() => {
                            setSelectedId(o.id)
                            setDetail(null)
                            setView('detail')
                          }}
                        >
                          <DetailIcon />
                        </button>
                        {o.status === 'cancelled' && (
                          <button
                            className="admOrdersIconBtn delete"
                            type="button"
                            aria-label="Xóa"
                            onClick={() => {
                              setOrderToDelete({ id: o.id, code: o.order_code })
                              setDeleteModalOpen(true)
                            }}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={7} style={{ padding: 16, color: 'var(--admin-text-s)', fontWeight: 700 }}>
                        Không có đơn hàng phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admOrdersPager">
              <div className="admOrdersPagerLeft">
                Hiển thị {pg?.from ?? 0}–{pg?.to ?? 0} trên {pg?.total ?? 0} đơn hàng
              </div>
              <div className="admOrdersPagerRight">
                <button
                  type="button"
                  className="admOrdersPageBtn"
                  disabled={!pg || pg.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Trang trước"
                >
                  ‹
                </button>
                {pageNums.out.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`admOrdersPageBtn ${pageNums.cur === n ? 'active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                {pageNums.last > (pageNums.out.at(-1) ?? 0) && (
                  <button type="button" className="admOrdersPageBtn" onClick={() => setPage(pageNums.last)}>
                    {pageNums.last}
                  </button>
                )}
                <button
                  type="button"
                  className="admOrdersPageBtn"
                  disabled={!pg || pg.current_page >= pg.last_page}
                  onClick={() => setPage((p) => Math.min(pg?.last_page ?? p, p + 1))}
                  aria-label="Trang sau"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <ConfirmModal
        open={deleteModalOpen}
        title="Xóa vĩnh viễn đơn hàng"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng #${orderToDelete?.code} đã hủy này không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDeleteOrder}
        onCancel={() => {
          setDeleteModalOpen(false)
          setOrderToDelete(null)
        }}
        confirmLabel="Xóa"
        cancelLabel="Hủy"
      />
    </div>
  )
}
function DetailIcon() {return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>)}
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
    </svg>
  )
}