import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  categories?: { id: number; name: string }[]
}

function formatVnd(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')} đ`
}

function getDaysRemaining(endAt: string | null) {
  if (!endAt) return null;
  const diff = Date.parse(endAt) - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function TicketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5H9a2 2 0 0 0-2 2v2a2 2 0 0 1 0 4v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2a2 2 0 0 1 0-4V7a2 2 0 0 0-2-2Z"></path>
      <path d="M9 9h.01"></path>
      <path d="M15 9h.01"></path>
      <path d="M9 15h.01"></path>
      <path d="M15 15h.01"></path>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
      <path d="M3 3v5h5"></path>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

export default function CouponsPage() {
  const [activeCoupons, setActiveCoupons] = useState<CouponPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'available' | 'expiring' | 'used'>('all')

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
  }, [userStr])

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Đã lưu mã vào bộ nhớ tạm!')
  }

  // Helper to check if a coupon is available
  const isAvailable = (c: CouponPublic) => {
    const expired = getDaysRemaining(c.end_at) === 0;
    const exhausted = c.max_uses_per_user ? (c.user_usage_count || 0) >= c.max_uses_per_user : false;
    return !expired && !exhausted;
  };

  const isExpiring = (c: CouponPublic) => {
    if (!isAvailable(c)) return false;
    const days = getDaysRemaining(c.end_at);
    return days !== null && days > 0 && days <= 5;
  };

  const isUsed = (c: CouponPublic) => (c.user_usage_count || 0) > 0;

  // Derived statistics
  const totalCount = activeCoupons.length;
  const availableCount = useMemo(() => activeCoupons.filter(isAvailable).length, [activeCoupons]);
  const expiringCount = useMemo(() => activeCoupons.filter(isExpiring).length, [activeCoupons]);
  const usedCount = useMemo(() => activeCoupons.filter(isUsed).length, [activeCoupons]);

  // Featured vouchers (first 3 for demo)
  const featuredCoupons = activeCoupons.slice(0, 3);

  // Filtered list
  const filteredCoupons = useMemo(() => {
    if (tab === 'all') return activeCoupons;
    if (tab === 'available') return activeCoupons.filter(isAvailable);
    if (tab === 'expiring') return activeCoupons.filter(isExpiring);
    if (tab === 'used') return activeCoupons.filter(isUsed);
    return activeCoupons;
  }, [activeCoupons, tab]);

  if (loading) {
    return <div style={{ padding: '20px 0', color: 'var(--et-text-muted)' }}>Đang tải kho voucher...</div>
  }

  const renderTicket = (c: CouponPublic, variant: 'featured' | 'list', index: number) => {
    const isDisabled = variant === 'list' && tab === 'used';
    const daysRemaining = getDaysRemaining(c.end_at);
    
    const showLimit = c.max_uses_per_user || null;
    const showRemaining = showLimit !== null ? Math.max(0, showLimit - (c.user_usage_count || 0)) : null;

    return (
      <div key={`${c.id}-${index}`} className={`cpTicketCard ${variant} ${isDisabled ? 'disabled' : ''}`}>
        <div className="cpTicketLeft">
          <div className="cpTicketLeftTop">Giảm ngay</div>
          <div className="cpTicketLeftValue">
            {c.coupon_type === 'percentage' ? (
              <>{c.value}<span>%</span></>
            ) : (
              <>{Math.floor(c.value / 1000)}<span>K</span></>
            )}
          </div>
          <div className="cpTicketLeftBottom">
            {c.min_order_amount ? `Đơn từ ${formatVnd(c.min_order_amount)}` : 'Áp dụng mọi đơn'}
          </div>
        </div>
        <div className="cpTicketRight">
          {variant === 'featured' ? (
            <>
              <div className="cpFeaturedRightTop">
                <div className="cpFeaturedIconBox">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10V6C21 4.9 20.1 4 19 4H5C3.9 4 3 4.9 3 6V10C4.1 10 5 10.9 5 12C5 13.1 4.1 14 3 14V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V14C19.9 14 19 13.1 19 12C19 10.9 19.9 10 21 10Z" stroke="#FF6B00" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M10 10L8.5 12L10 14" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 10L15.5 12L14 14" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.8 9L11.2 15" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="cpFeaturedInfo">
                  <div className="cpFeaturedTitle">
                    {c.coupon_type === 'percentage' ? `Giảm ${c.value}%` : `Giảm ${formatVnd(c.value)}`}
                  </div>
                  <div className="cpFeaturedMin">
                    {c.min_order_amount ? `Đơn từ ${formatVnd(c.min_order_amount)}` : 'Áp dụng mọi đơn hàng'}
                  </div>
                </div>
                <button className="cpFeaturedSaveBtn" onClick={() => handleCopyCode(c.code)}>
                  Lưu
                </button>
              </div>

              {showLimit !== null && showRemaining !== null && (
                <>
                  <div className="cpFeaturedDivider" />
                  <div className="cpFeaturedUsageRow">
                    <div className="cpFeaturedUsageText">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <span>Còn <strong style={{color: '#ff6b2b'}}>{showRemaining}/{showLimit}</strong> lượt</span>
                    </div>
                    <div className="cpFeaturedUsageBar">
                      <div className="cpFeaturedUsageFill" style={{ width: `${Math.max(0, Math.min(100, ((showLimit - showRemaining) / showLimit) * 100))}%` }} />
                    </div>
                  </div>
                </>
              )}

              <div className="cpFeaturedCodeBox" onClick={() => handleCopyCode(c.code)}>
                <div className="cpFeaturedCodeLeft">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  <span>{c.code}</span>
                </div>
                <div className="cpFeaturedCopy">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="cpTicketRightMain">
                <div className="cpTicketInfoCol">
                  <div className="cpTicketType">
                    {c.categories && c.categories.length > 0 
                      ? `Áp dụng cho: ${c.categories.map((cat: any) => cat.name).join(', ')}` 
                      : 'Cho mọi sản phẩm'}
                  </div>
                  <div className="cpTicketCodeRow">
                    <span className="cpTicketCodeText">{c.code}</span>
                    <button className="cpTicketCopyBtn" onClick={() => handleCopyCode(c.code)}>
                      <CopyIcon />
                    </button>
                  </div>
                  <div className="cpTicketDesc">
                    {c.coupon_type === 'percentage' ? `Giảm ${c.value}% tối đa 300K` : `Giảm ${formatVnd(c.value)} cho đơn hàng từ ${formatVnd(c.min_order_amount || 0)}`}
                  </div>
                </div>
                
                <div className="cpTicketMetaCol">
                  {c.end_at && (
                    <>
                      <div className="cpTicketMetaRow">
                        <ClockIcon /> HSD: {new Date(c.end_at).toLocaleDateString('vi-VN')}
                      </div>
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <div className="cpTicketMetaRow">
                          <ClockIcon /> Còn {daysRemaining} ngày
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="cpTicketActionCol">
                <div className="cpTicketConditions">
                  Điều kiện áp dụng 
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                {isDisabled ? (
                  <button className="cpTicketUseBtn" disabled>ĐÃ SỬ DỤNG</button>
                ) : (
                  <button className="cpTicketUseBtn" onClick={() => handleCopyCode(c.code)}>SỬ DỤNG</button>
                )}  
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="cpRoot">
      {/* HEADER */}
      <div className="cpHeader">
        <div>
          <h1 className="cpHeaderTitle">Kho vouchers</h1>
          <p className="cpHeaderSub">Quản lý và sử dụng các voucher của bạn</p>
        </div>
        {/* Placeholder for illustration */}
        <div style={{ opacity: 0.5 }}>
           {/* Illustration placeholder */}
        </div>
      </div>

      {/* SUMMARY GRID */}
      <div className="cpSummaryGrid">
        <div className="cpSummaryCard">
          <div className="cpSummaryIcon orange"><TicketIcon /></div>
          <div className="cpSummaryInfo">
            <span className="cpSummaryLabel">Tổng vouchers</span>
            <span className="cpSummaryValue">{totalCount}</span>
            <span className="cpSummarySub">Voucher</span>
          </div>
        </div>
        <div className="cpSummaryCard">
          <div className="cpSummaryIcon green"><TicketIcon /></div>
          <div className="cpSummaryInfo">
            <span className="cpSummaryLabel">Voucher khả dụng</span>
            <span className="cpSummaryValue">{availableCount}</span>
            <span className="cpSummarySub">Voucher</span>
          </div>
        </div>
        <div className="cpSummaryCard">
          <div className="cpSummaryIcon yellow"><ClockIcon /></div>
          <div className="cpSummaryInfo">
            <span className="cpSummaryLabel">Sắp hết hạn</span>
            <span className="cpSummaryValue">{expiringCount}</span>
            <span className="cpSummarySub">Voucher</span>
          </div>
        </div>
        <div className="cpSummaryCard">
          <div className="cpSummaryIcon blue"><RefreshIcon /></div>
          <div className="cpSummaryInfo">
            <span className="cpSummaryLabel">Đã sử dụng</span>
            <span className="cpSummaryValue">{usedCount}</span>
            <span className="cpSummarySub">Lượt</span>
          </div>
        </div>
      </div>

      {activeCoupons.length === 0 ? (
        <div className="cp-empty-state">
          <div className="cp-empty-icon">
            <TicketIcon />
          </div>
          <h3 className="cp-empty-title">Bạn chưa có mã giảm giá nào</h3>
          <p className="cp-empty-desc">Rất tiếc, hiện tại bạn chưa có mã giảm giá nào. Hãy mua sắm ngay để có cơ hội nhận các voucher ưu đãi hấp dẫn!</p>
          <Link to="/products" className="cp-empty-btn">Mua sắm ngay</Link>
        </div>
      ) : (
        <>
          {/* FEATURED SECTION */}
          {featuredCoupons.length > 0 && (
            <div>
              <div className="cpSectionTitleRow">
                <div className="cpSectionTitle"><span>Voucher</span> nổi bật</div>
                <Link to="#" className="cpSectionLink">Xem tất cả</Link>
              </div>
              <div className="cpFeaturedSlider">
                {featuredCoupons.map((c, i) => renderTicket(c, 'featured', i))}
              </div>
            </div>
          )}

          {/* LIST SECTION */}
          <div>
            <div className="cpSectionTitleRow">
              <div className="cpSectionTitle"><span>Danh</span> sách voucher</div>
            </div>
            
            <div className="cpFilterRow">
              <div className="cpTabs">
                <div className={`cpTab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>Tất cả ({totalCount})</div>
                <div className={`cpTab ${tab === 'available' ? 'active' : ''}`} onClick={() => setTab('available')}>Khả dụng ({availableCount})</div>
                <div className={`cpTab ${tab === 'expiring' ? 'active' : ''}`} onClick={() => setTab('expiring')}>Sắp hết hạn ({expiringCount})</div>
                <div className={`cpTab ${tab === 'used' ? 'active' : ''}`} onClick={() => setTab('used')}>Đã sử dụng ({usedCount})</div>
              </div>
              <select className="cpSortSelect">
                <option value="newest">Mới nhất</option>
                <option value="expiring">Sắp hết hạn</option>
              </select>
            </div>

            <div className="cpListContainer">
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((c, i) => renderTicket(c, 'list', i))
              ) : (
                <div className="cp-empty-state" style={{ padding: '20px', background: 'transparent', border: 'none' }}>
                  Không có voucher nào trong mục này.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
