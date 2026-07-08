import { useEffect, useState } from 'react'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import { fetchFlashSales, fetchFlashSaleDetail } from '@/features/services/admin/api.admin.service'
import '@/styles/admin/AdminPage.css'
import '@/styles/admin/AdminFlashSalePage.css'

type Product = {
  id: number
  name: string
  price: number
  main_image_url: string | null
  variants?: Array<{
    id: number
    variant_name: string
    price: number
    image_url: string | null
  }>
}

type FlashSaleItem = {
  id: number
  product_id: number
  variant_id: number | null
  flash_sale_price: number
  quantity_limit: number | null
  sold_quantity: number
  product: Product
  variant?: {
    id: number
    variant_name: string
  } | null
}

type FlashSale = {
  id: number
  name: string
  start_at: string
  end_at: string
  status: 'active' | 'waiting' | 'ended' | 'paused'
  items_count?: number
  items?: FlashSaleItem[]
}

type FilterStatus = 'all' | 'active' | 'waiting' | 'ended' | 'paused'

export default function AdminFlashSalePage() {
  const hasAuth = true // Phía sau ProtectedRoute
  const [sales, setSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  
  // State phục vụ tìm kiếm và bộ lọc
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const getStatus = (sale: FlashSale) => {
    const start = new Date(sale.start_at)
    const end = new Date(sale.end_at)

    if (sale.status === 'paused') return { type: 'paused', label: 'Tạm dừng', color: '#64748b', bg: '#f1f5f9' }
    if (sale.status === 'ended' || now > end) return { type: 'ended', label: 'Đã kết thúc', color: '#e11d48', bg: '#fff1f2' }
    if (now < start) return { type: 'waiting', label: 'Sắp diễn ra', color: '#2563eb', bg: '#dbeafe' }
    return { type: 'active', label: 'Đang diễn ra', color: '#16a34a', bg: '#dcfce7' }
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null)
  const [formData, setFormData] = useState<{
    name: string,
    start_at: string,
    end_at: string,
    status: 'active' | 'waiting' | 'ended' | 'paused'
  }>({
    name: '',
    start_at: '',
    end_at: '',
    status: 'active'
  })

  // Items state
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false)
  const [currentSale, setCurrentSale] = useState<FlashSale | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [addItemData, setAddItemData] = useState({
    product_id: '',
    variant_id: '',
    flash_sale_price: '',
    quantity_limit: ''
  })

  // Bulk state
  const [activeItemTab, setActiveItemTab] = useState<'single' | 'bulk'>('single')
  const [bulkDiscountPercentage, setBulkDiscountPercentage] = useState('')
  const [bulkQuantityLimit, setBulkQuantityLimit] = useState('')
  const [isBulkApplying, setIsBulkApplying] = useState(false)

  const selectedProduct = availableProducts.find(p => String(p.id) === addItemData.product_id)

  const loadSales = async () => {
    if (!hasAuth) return
    setLoading(true)
    try {
      const res = await fetchFlashSales<FlashSale[]>()
      setSales(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    if (!hasAuth) return
    try {
      const res = await apiFetch<any>('/api/admin/products?per_page=100')
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      setAvailableProducts(data)
    } catch (e: any) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadSales()
    loadProducts()
  }, [])

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasAuth) return
    try {
      if (editingSale) {
        await apiFetch(`/api/admin/flash-sales/${editingSale.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        })
      } else {
        await apiFetch('/api/admin/flash-sales', {
          method: 'POST',
          body: JSON.stringify(formData)
        })
      }
      setIsFormOpen(false)
      loadSales()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleOpenItems = async (sale: FlashSale) => {
    if (!hasAuth) return
    try {
      const fullSale = await fetchFlashSaleDetail<FlashSale>(sale.id)
      setCurrentSale(fullSale)
      setIsItemsModalOpen(true)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasAuth || !currentSale) return
    try {
      await apiFetch(`/api/admin/flash-sales/${currentSale.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: Number(addItemData.product_id),
          variant_id: addItemData.variant_id ? Number(addItemData.variant_id) : null,
          flash_sale_price: Number(addItemData.flash_sale_price),
          quantity_limit: addItemData.quantity_limit ? Number(addItemData.quantity_limit) : null
        })
      })
      handleOpenItems(currentSale)
      setAddItemData({ product_id: '', variant_id: '', flash_sale_price: '', quantity_limit: '' })
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBulkDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasAuth || !currentSale) return
    if (!bulkDiscountPercentage) {
      alert('Vui lòng nhập phần trăm giảm giá!')
      return
    }
    const percent = Number(bulkDiscountPercentage)
    if (isNaN(percent) || percent < 1 || percent > 99) {
      alert('Phần trăm giảm giá phải từ 1 đến 99%!')
      return
    }
    if (!confirm(`Bạn có chắc chắn muốn giảm giá đồng loạt ${percent}% cho TẤT CẢ sản phẩm trong cửa hàng cho chiến dịch này không?`)) {
      return
    }
    setIsBulkApplying(true)
    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/flash-sales/${currentSale.id}/bulk-discount`, {
        method: 'POST',
        body: JSON.stringify({
          discount_percentage: percent,
          quantity_limit: bulkQuantityLimit ? Number(bulkQuantityLimit) : null
        })
      })
      alert(res.message)
      handleOpenItems(currentSale)
      setBulkDiscountPercentage('')
      setBulkQuantityLimit('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsBulkApplying(false)
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    if (!hasAuth || !currentSale) return
    if (!confirm('Xóa sản phẩm này khỏi Flash Sale?')) return
    try {
      await apiFetch(`/api/admin/flash-sales/${currentSale.id}/items/${itemId}`, {
        method: 'DELETE'
      })
      handleOpenItems(currentSale)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDeleteSale = async (saleId: number) => {
    if (!hasAuth) return
    if (!confirm('Bạn có chắc chắn muốn XÓA vĩnh viễn chiến dịch Flash Sale này không?\n\n⚠️ Lưu ý: Tất cả sản phẩm trong chiến dịch cũng sẽ bị xóa theo.')) return
    try {
      await apiFetch(`/api/admin/flash-sales/${saleId}`, {
        method: 'DELETE'
      })
      loadSales()
    } catch (e: any) {
      alert(e.message)
    }
  }

  // --- LOGIC LỌC & TÌM KIẾM CHIẾN DỊCH ---
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusObj = getStatus(sale);
    const matchesStatus = statusFilter === 'all' || statusObj.type === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- ĐẾM SỐ LƯỢNG CHO METRICS ---
  const activeCount = sales.filter(s => getStatus(s).type === 'active').length;
  const waitingCount = sales.filter(s => getStatus(s).type === 'waiting').length;
  const totalProductsInActive = sales.reduce((acc, s) => acc + (s.items_count || 0), 0);

  // Định dạng ngày giờ hiển thị gọn gàng hơn
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return (
      <div className="fs-time-cell">
        <span className="fs-time-clock">{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="fs-time-date">{date.toLocaleDateString('vi-VN')}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="adminContentCard fs-loading-card">
        <div className="fs-skeleton-header">
          <div className="admSkeletonBar" style={{ width: '200px', height: '28px' }} />
          <div className="admSkeletonBar" style={{ width: '140px', height: '40px', borderRadius: '8px' }} />
        </div>
        <div className="adminTableWrap">
          <table className="adminTable">
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonCell" style={{ padding: '16px 0' }}>
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '75%' : '55%', height: '16px' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="fs-dashboard-container">
      {/* 🚀 1. Tiêu đề Trang chính */}
      <div className="fs-main-header">
        <div className="fs-title-area">
          <h2 className="fs-page-title">Quản lý Flash Sale</h2>
          <p className="fs-page-subtitle">Thiết lập cấu hình thời gian và sản phẩm khuyến mãi chớp nhoáng theo dòng sự kiện.</p>
        </div>
        <button className="fs-btn-primary" onClick={() => { setEditingSale(null); setFormData({ name: '', start_at: '', end_at: '', status: 'active' }); setIsFormOpen(true); }}>
          <span className="fs-btn-icon">+</span> Tạo Chiến Dịch Mới
        </button>
      </div>

      {/* 📊 2. Thẻ Thống kê nhanh */}
      <div className="fs-metrics-grid">
        <div className="fs-metric-card m-active">
          <div className="fs-metric-icon">⚡</div>
          <div className="fs-metric-body">
            <span className="fs-metric-num">{activeCount}</span>
            <span className="fs-metric-label">Chiến dịch đang chạy</span>
          </div>
        </div>
        <div className="fs-metric-card m-waiting">
          <div className="fs-metric-icon">⏳</div>
          <div className="fs-metric-body">
            <span className="fs-metric-num">{waitingCount}</span>
            <span className="fs-metric-label">Chiến dịch sắp tới</span>
          </div>
        </div>
        <div className="fs-metric-card m-total">
          <div className="fs-metric-icon">📦</div>
          <div className="fs-metric-body">
            <span className="fs-metric-num">{totalProductsInActive}</span>
            <span className="fs-metric-label">Tổng sản phẩm phân bổ</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="adm-fs-style-6">Lỗi kết nối hệ thống: {error}</div>
      )}

      {/* 🔍 3. Khu vực Tìm kiếm và Bộ lọc Tab */}
      <div className="fs-filter-wrapper">
        <div className="fs-search-box">
          <span className="fs-search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm chiến dịch theo tên..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button className="fs-clear-search" onClick={() => setSearchTerm('')}>&times;</button>}
        </div>
        
        <div className="fs-filter-tabs">
          {(['all', 'active', 'waiting', 'ended', 'paused'] as const).map((tab) => {
            const labelMap: Record<FilterStatus, string> = {
              all: 'Tất cả',
              active: 'Đang chạy',
              waiting: 'Sắp tới',
              ended: 'Đã kết thúc',
              paused: 'Tạm dừng'
            };
            return (
              <button
                key={tab}
                className={`fs-tab-btn ${statusFilter === tab ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab)}
              >
                {labelMap[tab]}
              </button>
            )
          })}
        </div>
      </div>

      {/* 📅 4. Bảng danh sách chính */}
      <div className="adminTableWrap fs-main-table-wrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>ID</th>
              <th>Tên chiến dịch</th>
              <th>Thời gian bắt đầu</th>
              <th>Thời gian kết thúc</th>
              <th>Số sản phẩm</th>
              <th>Trạng thái</th>
              <th style={{ width: '200px', textAlign: 'center' }}>Thao tác vận hành</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="fs-empty-table">
                  📭 Không tìm thấy chương trình Flash Sale nào phù hợp tiêu chí lọc.
                </td>
              </tr>
            ) : (
              filteredSales.map(s => {
                const status = getStatus(s);
                return (
                  <tr key={s.id} className="fs-row-interactive">
                    <td><span className="fs-txt-id">#{s.id}</span></td>
                    <td><strong className="fs-txt-name">{s.name}</strong></td>
                    <td>{formatDateTime(s.start_at)}</td>
                    <td>{formatDateTime(s.end_at)}</td>
                    <td>
                      <span className="fs-badge-count">📦 {s.items_count || 0} sản phẩm</span>
                    </td>
                    <td>
                      <span className="fs-status-pill" style={{ background: status.bg, color: status.color }}>
                        <span className="fs-status-dot" style={{ 
                          background: status.color,
                          animation: status.type === 'active' ? 'pulse-green 2s infinite' : 'none'
                        }}></span>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <div className="fs-action-group">
                        <button className="fs-action-btn b-items" onClick={() => handleOpenItems(s)} title="Quản lý sản phẩm khuyến mãi">
                          Sản phẩm
                        </button>
                        <button className="fs-icon-btn b-edit" onClick={() => {
                          setEditingSale(s);
                          const formatInput = (dateStr: string) => {
                            if (!dateStr) return '';
                            const date = new Date(dateStr);
                            if (isNaN(date.getTime())) return '';
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hours}:${minutes}`;
                          };

                          setFormData({
                            name: s.name,
                            start_at: formatInput(s.start_at),
                            end_at: formatInput(s.end_at),
                            status: s.status
                          });
                          setIsFormOpen(true);
                        }} title="Chỉnh sửa thông tin chiến dịch">
                          <EditIcon />
                        </button>
                        <button className="fs-icon-btn b-delete" onClick={() => handleDeleteSale(s.id)} title="Xóa vĩnh viễn chiến dịch">
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 🛠️ Modal Form: Tạo hoặc hiệu chỉnh Chiến Dịch */}
      {isFormOpen && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-box max-w-form animate-fade-in">
            <div className="fs-modal-header border-b">
              <div>
                <h3 className="fs-modal-title">
                  {editingSale ? '✨ Cập Nhật Thông Tin Flash Sale' : '🚀 Cấu Hình Chiến Dịch Mới'}
                </h3>
                <p className="fs-modal-subtitle">Thiết lập thông tin tên gọi cốt lõi và thời gian tự động mở/đóng.</p>
              </div>
              <button className="fs-modal-close" onClick={() => setIsFormOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmitSale} className="fs-form-body">
              <div className="fs-form-group">
                <label className="fs-form-label">Tên chiến dịch Flash Sale</label>
                <input
                  type="text"
                  className="fs-form-input focus-effect"
                  placeholder="Ví dụ: Đại Tiệc Giáng Sinh 12.12 - Khung Giờ Vàng"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="fs-form-grid-2">
                <div className="fs-form-group">
                  <label className="fs-form-label">Thời gian bắt đầu kích hoạt</label>
                  <input
                    type="datetime-local"
                    className="fs-form-input focus-effect"
                    value={formData.start_at}
                    onChange={e => setFormData({ ...formData, start_at: e.target.value })}
                    required
                />
                </div>
                <div className="fs-form-group">
                  <label className="fs-form-label">Thời gian kết thúc tự động</label>
                  <input
                    type="datetime-local"
                    className="fs-form-input focus-effect"
                    value={formData.end_at}
                    onChange={e => setFormData({ ...formData, end_at: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="fs-form-group bg-light-panel">
                <label className="fs-form-label">Trạng thái cấu hình vận hành</label>
                <select
                  className="fs-form-select focus-effect"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Hoạt động tự động (Đẩy ra client theo giờ hẹn)</option>
                  <option value="waiting">Chờ phê duyệt / Lưu tạm thời</option>
                  <option value="paused">Khóa tạm ngưng (Ẩn hoàn toàn khỏi hệ thống)</option>
                  <option value="ended">Đã kết thúc chiến dịch sớm</option>
                </select>
                <p className="fs-input-hint">
                  * Hệ thống sẽ kiểm tra điều kiện thời gian thực để chuyển đổi trạng thái hiển thị tự động khi bạn cài đặt ở chế độ "Hoạt động tự động".
                </p>
              </div>

              <div className="fs-modal-footer">
                <button type="button" className="fs-btn-secondary" onClick={() => setIsFormOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="fs-btn-primary px-lg">
                  {editingSale ? 'Lưu thay đổi' : 'Tạo và kích hoạt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📦 Modal quản lý danh sách sản phẩm (Items) - ĐÃ CHUYỂN THÀNH 2 CỘT */}
      {isItemsModalOpen && currentSale && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-box max-w-items animate-fade-in">
            {/* Header Modal */}
            <div className="fs-modal-header border-b">
              <div>
                <div className="fs-modal-title-with-icon">
                  <span className="fs-title-icon-badge">🎯</span>
                  <h3 className="fs-modal-title">Phân bổ sản phẩm tham gia khuyến mãi</h3>
                </div>
                <p className="fs-modal-subtitle">
                  Đang thao tác trên chiến dịch: <strong className="txt-highlight">{currentSale.name}</strong>
                </p>
              </div>
              <button className="fs-modal-close" onClick={() => setIsItemsModalOpen(false)}>&times;</button>
            </div>

            {/* Khung chia 2 cột chính */}
            <div className="fs-modal-split-layout">
              
              {/* ⬅️ CỘT TRÁI: Khu vực các mục cấu hình thêm sản phẩm */}
              <div className="fs-modal-left-column">
                <div className="fs-inner-tabs">
                  <button
                    type="button"
                    className={`fs-inner-tab-btn ${activeItemTab === 'single' ? 'active' : ''}`}
                    onClick={() => setActiveItemTab('single')}
                  >
                    ➕ Thêm đơn lẻ
                  </button>
                  <button
                    type="button"
                    className={`fs-inner-tab-btn ${activeItemTab === 'bulk' ? 'active' : ''}`}
                    onClick={() => setActiveItemTab('bulk')}
                  >
                    ⚡ Giảm đồng loạt
                  </button>
                </div>

                {activeItemTab === 'single' ? (
                  <div className="fs-tab-content-panel side-form">
                    <div className="fs-form-group">
                      <label className="fs-form-label">1. Tìm & Chọn mặt hàng chính</label>
                      <select
                        className="fs-form-select focus-effect"
                        value={addItemData.product_id}
                        onChange={e => setAddItemData({ ...addItemData, product_id: e.target.value, variant_id: '' })}
                        required
                      >
                        <option value="">-- Tìm tên sản phẩm --</option>
                        {availableProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({Number(p.price).toLocaleString()}đ)</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="fs-form-group">
                      <label className="fs-form-label">2. Chọn phiên bản thuộc tính</label>
                      <select
                        className="fs-form-select focus-effect"
                        value={addItemData.variant_id}
                        onChange={e => {
                          const vId = e.target.value;
                          const variant = selectedProduct?.variants?.find(v => String(v.id) === vId);
                          setAddItemData({
                            ...addItemData,
                            variant_id: vId,
                            flash_sale_price: variant ? String(variant.price) : addItemData.flash_sale_price
                          });
                        }}
                        disabled={!selectedProduct || !selectedProduct.variants?.length}
                      >
                        <option value="">-- Toàn bộ phiên bản mặc định --</option>
                        {selectedProduct?.variants?.map(v => (
                          <option key={v.id} value={v.id}>{v.variant_name} ({Number(v.price).toLocaleString()}đ)</option>
                        ))}
                      </select>
                    </div>

                    <div className="fs-form-group">
                      <label className="fs-form-label">3. Giá Flash Sale mong muốn</label>
                      <div className="fs-input-prefix-wrapper">
                        <input
                          type="number"
                          className="fs-form-input focus-effect input-price-highlight"
                          placeholder="Nhập giá giảm..."
                          value={addItemData.flash_sale_price}
                          onChange={e => setAddItemData({ ...addItemData, flash_sale_price: e.target.value })}
                          required
                        />
                        <span className="fs-input-unit-tag">₫</span>
                      </div>
                    </div>
                    
                    <div className="fs-form-group">
                      <label className="fs-form-label">4. Giới hạn số lượng mở bán</label>
                      <input
                        type="number"
                        className="fs-form-input focus-effect"
                        placeholder="∞ (Bán không giới hạn)"
                        value={addItemData.quantity_limit}
                        onChange={e => setAddItemData({ ...addItemData, quantity_limit: e.target.value })}
                      />
                    </div>

                    <button onClick={handleAddItem} type="button" className="fs-btn-primary w-100 h-input mt-sm">
                      Thêm vào danh sách →
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleBulkDiscount} className="fs-tab-content-panel bg-orange-tint side-form">
                    <div className="fs-info-notice-bar">
                      💡 Tự động cấu hình giảm giá nhanh cho toàn sàn dựa theo % dựa trên giá gốc gốc.
                    </div>

                    <div className="fs-form-group">
                      <label className="fs-form-label">1. Mức chiết khấu giảm giá (%)</label>
                      <div className="fs-input-prefix-wrapper">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          className="fs-form-input focus-effect font-bold-orange"
                          placeholder="Ví dụ: 10, 25, 50..."
                          value={bulkDiscountPercentage}
                          onChange={e => setBulkDiscountPercentage(e.target.value)}
                          required
                        />
                        <span className="fs-input-unit-tag">%</span>
                      </div>
                    </div>

                    <div className="fs-form-group">
                      <label className="fs-form-label">2. Giới hạn suất mua / sản phẩm</label>
                      <input
                        type="number"
                        min="1"
                        className="fs-form-input focus-effect"
                        placeholder="∞ (Vô hạn)"
                        value={bulkQuantityLimit}
                        onChange={e => setBulkQuantityLimit(e.target.value)}
                      />
                    </div>

                    <button type="submit" disabled={isBulkApplying} className="fs-btn-gradient w-100 h-input mt-sm">
                      {isBulkApplying ? 'Đang xử lý hàng loạt...' : '⚡ Kích Hoạt Đồng Loạt'}
                    </button>
                  </form>
                )}
              </div>

              {/* ➡️ CỘT PHẢI: Hiển thị danh sách sản phẩm phân bổ hiện tại */}
              <div className="fs-modal-right-column">
                <h4 className="fs-section-small-title">Danh sách sản phẩm được phân bổ hiện tại</h4>
                <div className="adminTableWrap modal-scrollbar-custom layout-split-table">
                  <table className="adminTable">
                    <thead>
                      <tr>
                        <th>Sản phẩm / Thuộc tính</th>
                        <th style={{ width: '130px' }}>Giá Flash Sale</th>
                        <th style={{ width: '100px' }}>Kho giới hạn</th>
                        <th style={{ width: '140px' }}>Tiến độ bán</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!currentSale.items || currentSale.items.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="fs-empty-table-sub">
                            <div className="fs-empty-icon">📭</div>
                            Chưa có sản phẩm nào được thiết lập giá ưu đãi cho khung giờ này.
                          </td>
                        </tr>
                      ) : (
                        currentSale.items.map(item => (
                          <tr key={item.id} className="fs-sub-row">
                            <td>
                              <div className="fs-product-meta-block">
                                <div className="fs-product-thumb">
                                  <img
                                    src={
                                      (item.variant?.id &&
                                        selectedProduct?.variants?.find(v => v.id === item.variant?.id)?.image_url)
                                        ? `${API_BASE_URL}${selectedProduct.variants.find(v => v.id === item.variant?.id)?.image_url}`
                                        : (item.product?.main_image_url
                                          ? `${API_BASE_URL}${item.product?.main_image_url}`
                                          : '/placeholder.png')
                                    }
                                    alt={item.product?.name}
                                  />
                                </div>
                                <div className="fs-product-info">
                                  <div className="fs-p-name">{item.product?.name || 'Sản phẩm đã gỡ khỏi kho'}</div>
                                  {item.variant ? (
                                    <div className="fs-p-variant">{item.variant.variant_name}</div>
                                  ) : (
                                    <div className="fs-p-all-variant">Mặc định</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="fs-p-sale-price">{Number(item.flash_sale_price).toLocaleString()}đ</span>
                            </td>
                            <td>
                              <span className={`fs-p-limit-badge ${item.quantity_limit ? '' : 'infinite'}`}>
                                {item.quantity_limit || 'Vô hạn'}
                              </span>
                            </td>
                            <td>
                              <div className="fs-progress-block">
                                <div className="fs-progress-bar-bg">
                                  <div
                                    className="fs-progress-bar-fill"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (item.sold_quantity / (item.quantity_limit || 100)) * 100
                                      )}%`
                                    }}
                                  />
                                </div>
                                <span className="fs-progress-text">Đã bán: <strong>{item.sold_quantity}</strong></span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="fs-p-btn-remove" onClick={() => handleRemoveItem(item.id)}>
                                Gỡ bỏ
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div> {/* Kết thúc Split Layout */}
          </div>
        </div>
      )}
    </div>
  )
}

function EditIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> }
function DeleteIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> }

const styles = `
@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
`
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style")
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}