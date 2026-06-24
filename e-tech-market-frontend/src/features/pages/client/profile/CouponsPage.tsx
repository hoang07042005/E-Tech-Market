import { useEffect, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import { useAuthStore } from '@/features/store/useAuthStore'
import '@/styles/pages/HomePage.css'

type CouponPublic = {
  id: number
  code: string
  coupon_type: 'fixed' | 'percentage'
  value: number
  min_order_amount: number | null
  start_at: string | null
  end_at: string | null
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
    alert('Đã lưu mã vào bộ nhớ tạm!')
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {activeCoupons.map((c) => (
            <div key={c.id} className="hpCouponCard" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="hpCouponCardTop">
                <div className="hpCouponInfo">
                  <div className="hpCouponValue">
                    {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`}
                  </div>
                  {c.min_order_amount ? (
                    <div className="hpCouponMin">Đơn tối thiểu {formatVnd(c.min_order_amount)}</div>
                  ) : (
                    <div className="hpCouponMin">Không giới hạn đơn</div>
                  )}
                  {c.end_at && (
                    <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                      HSD: {new Date(c.end_at).toLocaleDateString('vi-VN')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="hpCouponSaveBtn"
                  onClick={() => handleCopyCode(c.code)}
                >
                  Lưu mã
                </button>
              </div>
              <div className="hpCouponDivider" />
              <div className="hpCouponCardBottom" onClick={() => handleCopyCode(c.code)}>
                <span className="hpCouponCode">{c.code}</span>
                <span className="hpCouponCopyAction">Sao chép</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
