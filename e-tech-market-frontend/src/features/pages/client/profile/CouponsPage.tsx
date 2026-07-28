import { useEffect, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import { useAuthStore } from '@/features/store/useAuthStore'
import { toast } from '@/utils/toast';
import '@/styles/pages/CouponsPage.css'

type CouponPublic = {
  id: number
  code: string
  coupon_type: 'fixed' | 'percentage'
  value: number
  min_order_amount: number | null
  start_at: string | null
  end_at: string | null
  max_uses_per_user: number | null
  user_usage_count?: number
  max_uses: number | null
  usages_count?: number
}

function formatVnd(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`
}

export default function CouponsPage() {
  const [activeCoupons, setActiveCoupons] = useState<CouponPublic[]>([])
  const [loading, setLoading] = useState(true)

  const userStr = useAuthStore((state) => state.userStr)

  useEffect(() => {
    let cancelled = false
    if (!userStr) {
      setLoading(false)
      return
    }

    apiFetch<CouponPublic[]>('/api/me/coupons')
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setActiveCoupons(res)
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Đã lưu mã vào bộ nhớ tạm!')
  }

  if (loading) {
    return <div style={{ padding: '20px 0', color: 'var(--et-text-muted)' }}>Đang tải kho voucher...</div>
  }

  return (
    <div style={{ marginTop: '20px' }}>
      {activeCoupons.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--et-text-muted)', background: 'var(--et-surface)', border: '1px solid var(--et-border)', borderRadius: '12px' }}>
          Hiện bạn chưa có mã giảm giá nào.
        </div>
      ) : (
        <div className="cpCouponGridContainer">
          {activeCoupons.map((c) => {
            const perUserLimit = c.max_uses_per_user
            const userUsed = c.user_usage_count ?? 0
            const userRemaining = perUserLimit ? perUserLimit - userUsed : null

            const totalLimit = c.max_uses
            const totalUsed = c.usages_count ?? 0
            const totalRemaining = totalLimit ? totalLimit - totalUsed : null

            const showRemaining = userRemaining !== null ? userRemaining : totalRemaining
            const showLimit = userRemaining !== null ? perUserLimit! : totalLimit

            return (
              <div key={c.id} className="cpCouponCardNew" style={{ width: '100%', boxSizing: 'border-box', maxWidth: '360px', margin: '0 auto' }}>
              <div className="cpCouponCardNewLeft">
                <span className="cpCouponCardNewLeftLabel">Giảm</span>
                <span className="cpCouponCardNewLeftValue">
                  {c.coupon_type === 'percentage' ? (
                    <>
                      {c.value}<span className="percent">%</span>
                    </>
                  ) : (
                    <>
                      {Math.floor(c.value / 1000)}<span className="percent">K</span>
                    </>
                  )}
                </span>
                <div className="cpCouponCardNewLeftMax">
                  {c.coupon_type === 'percentage' ? 'Phiếu ưu đãi' : 'Giảm trực tiếp'}
                </div>
              </div>

              <div className="cpCouponCardNewRightWrapper" style={{ minWidth: 0 }}>
                <div className="cpCouponCardNewRight">
                  <div className="cpCouponCardNewRightTop">
                    <div className="cpCouponCardNewIconBox">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 10V6C21 4.9 20.1 4 19 4H5C3.9 4 3 4.9 3 6V10C4.1 10 5 10.9 5 12C5 13.1 4.1 14 3 14V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V14C19.9 14 19 13.1 19 12C19 10.9 19.9 10 21 10Z"
                              stroke="#FF6B00"
                              stroke-width="2"
                              stroke-linejoin="round"/>

                        <path d="M10 10L8.5 12L10 14"
                                  stroke="#FF6B00"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"/>

                        <path d="M14 10L15.5 12L14 14"
                              stroke="#FF6B00"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"/>

                        <path d="M12.8 9L11.2 15"
                              stroke="#FF6B00"
                              stroke-width="2"
                              stroke-linecap="round"/>
                      </svg>
                    </div>
                    <div className="cpCouponCardNewInfo">
                      <div className="cpCouponCardNewTitle">
                        {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`}
                      </div>
                      <div className="cpCouponCardNewMin">
                        {c.min_order_amount ? `Đơn từ ${formatVnd(c.min_order_amount)}` : 'Áp dụng mọi đơn hàng'}
                      </div>
                    </div>
                    <button
                      className="cpCouponCardNewSaveBtn"
                      onClick={() => handleCopyCode(c.code)}
                    >
                      Dùng
                    </button>
                  </div>

                  {showRemaining !== null && showLimit !== null && (
                    <>
                      <div className="cpCouponCardNewDivider" />
                      <div className="cpCouponCardNewUsageRow">
                        <div className="cpCouponCardNewUsageText">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          <span>Còn <strong style={{color: '#ff6b2b'}}>{showRemaining}/{showLimit}</strong> lượt</span>
                        </div>
                        <div className="cpCouponCardNewUsageBar">
                          <div
                            className="cpCouponCardNewUsageFill"
                            style={{ width: `${Math.max(0, Math.min(100, ((showLimit - showRemaining) / showLimit) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {c.end_at && (
                    <>
                      <div className="cpCouponCardNewDivider" />
                      <div className="cpCouponCardNewUsageRow">
                        <div className="cpCouponCardNewUsageText">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          <span>HSD: <strong style={{color: '#ff6b2b'}}>{new Date(c.end_at).toLocaleDateString('vi-VN')}</strong></span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="cpCouponCardNewCodeBox" onClick={() => handleCopyCode(c.code)}>
                    <div className="cpCouponCardNewCodeLeft" style={{ overflow: 'hidden' }}>
                      <svg style={{ flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.code}</span>
                    </div>
                    <div className="cpCouponCardNewCopy">
                      <svg style={{ flexShrink: 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
