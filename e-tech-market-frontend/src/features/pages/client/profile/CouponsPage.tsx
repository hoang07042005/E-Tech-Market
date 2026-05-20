import { useEffect, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/pages/CheckoutPage.css' // Reuse the modal and coupon styling

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

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    apiFetch<CouponPublic[]>('/api/me/coupons', { token })
      .then((res) => {
        if (!cancelled && Array.isArray(res)) setActiveCoupons(res)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
        <div className="coCouponList" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {activeCoupons.map((c) => (
            <div key={c.id} className="coCouponItem" style={{ flexWrap: 'wrap' }}>
              <div className="coCouponItemLeft" style={{ width: '100%' }}>
                <div className="coCouponItemCode" style={{ fontSize: '1.25rem' }}>{c.code}</div>
                <div className="coCouponItemValue">
                  {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`}
                </div>
                {c.min_order_amount && (
                  <div className="coCouponItemMin">
                    Đơn tối thiểu {formatVnd(c.min_order_amount)}
                  </div>
                )}
                {c.end_at && (
                  <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '8px' }}>
                    HSD: {new Date(c.end_at).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
              <button 
                type="button" 
                className="coGhostBtn" 
                style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}
                onClick={() => {
                  navigator.clipboard.writeText(c.code)
                  alert('Đã lưu mã vào bộ nhớ tạm!')
                }}
              >
                Sao chép mã
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
