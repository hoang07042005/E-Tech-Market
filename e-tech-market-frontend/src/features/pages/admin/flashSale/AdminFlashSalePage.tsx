import { useEffect, useState } from 'react'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import { fetchFlashSales, fetchFlashSaleDetail } from '@/features/services/admin/api.admin.service'
import '@/styles/admin/AdminPage.css'

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

export default function AdminFlashSalePage() {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [sales, setSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const getStatus = (sale: FlashSale) => {
    const start = new Date(sale.start_at)
    const end = new Date(sale.end_at)

    if (sale.status === 'paused') return { label: 'Tạm dừng', color: '#64748b', bg: '#f1f5f9' }
    if (sale.status === 'ended' || now > end) return { label: 'Đã kết thúc', color: '#e11d48', bg: '#fff1f2' }
    if (now < start) return { label: 'Sắp diễn ra', color: '#2563eb', bg: '#dbeafe' }
    return { label: 'Đang diễn ra', color: '#16a34a', bg: '#dcfce7' }
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
    if (!token) return
    setLoading(true)
    try {
      const res = await fetchFlashSales<FlashSale[]>(token)
      setSales(res)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    if (!token) return
    try {
      // For simplicity, just get all products. In real app, use search/pagination
      const res = await apiFetch<Product[]>('/api/admin/products', { token })
      setAvailableProducts(res)
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
    if (!token) return
    try {
      if (editingSale) {
        await apiFetch(`/api/admin/flash-sales/${editingSale.id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(formData)
        })
      } else {
        await apiFetch('/api/admin/flash-sales', {
          method: 'POST',
          token,
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
    if (!token) return
    try {
      const fullSale = await fetchFlashSaleDetail<FlashSale>(sale.id, token)
      setCurrentSale(fullSale)
      setIsItemsModalOpen(true)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !currentSale) return
    try {
      await apiFetch(`/api/admin/flash-sales/${currentSale.id}/items`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          product_id: Number(addItemData.product_id),
          variant_id: addItemData.variant_id ? Number(addItemData.variant_id) : null,
          flash_sale_price: Number(addItemData.flash_sale_price),
          quantity_limit: addItemData.quantity_limit ? Number(addItemData.quantity_limit) : null
        })
      })
      handleOpenItems(currentSale) // Refresh items
      setAddItemData({ product_id: '', variant_id: '', flash_sale_price: '', quantity_limit: '' })
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBulkDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !currentSale) return
    if (!bulkDiscountPercentage) {
      alert('Vui lòng nhập phần trăm giảm giá!')
      return
    }
    const percent = Number(bulkDiscountPercentage)
    if (isNaN(percent) || percent < 1 || percent > 99) {
      alert('Phần trăm giảm giá phải từ 1 đến 99%!')
      return
    }
    if (!confirm(`Bạn có chắc chắn muốn giảm giá đồng loạt ${percent}% cho TẤT CẢ sản phẩm trong cửa hàng cho chiến dịch này không? Việc này sẽ ghi đè giá bán hiện tại của các sản phẩm đã có mặt trong chiến dịch.`)) {
      return
    }
    setIsBulkApplying(true)
    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/flash-sales/${currentSale.id}/bulk-discount`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          discount_percentage: percent,
          quantity_limit: bulkQuantityLimit ? Number(bulkQuantityLimit) : null
        })
      })
      alert(res.message)
      handleOpenItems(currentSale) // Refresh items list
      setBulkDiscountPercentage('')
      setBulkQuantityLimit('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setIsBulkApplying(false)
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    if (!token || !currentSale) return
    if (!confirm('Xóa sản phẩm này khỏi Flash Sale?')) return
    try {
      await apiFetch(`/api/admin/flash-sales/${currentSale.id}/items/${itemId}`, {
        method: 'DELETE',
        token
      })
      handleOpenItems(currentSale)
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) {
    return (
      <div className="adminContentCard">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div className="admSkeletonBar" style={{ width: '250px', height: '32px' }} />
          <div className="admSkeletonBar" style={{ width: '150px', height: '40px' }} />
        </div>
        <div className="adminTableWrap">
          <table className="adminTable">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '80%' : '60%' }} />
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
    <div className="adminContentCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Quản lý Flash Sale</h2>
        <button className="adminBtnPrimary" onClick={() => { setEditingSale(null); setFormData({ name: '', start_at: '', end_at: '', status: 'active' }); setIsFormOpen(true); }}>
          + Tạo Chiến Dịch
        </button>
      </div>

      {error && (
        <div style={{ 
          color: '#d93025', 
          background: '#fce8e6', 
          padding: '12px 16px', 
          borderRadius: '5px', 
          marginBottom: '24px',
          fontWeight: 600,
          border: '1px solid #f5c2c7'
        }}>
          Lỗi: {error}
        </div>
      )}

      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên chiến dịch</th>
              <th>Thời gian bắt đầu</th>
              <th>Thời gian kết thúc</th>
              <th>Sản phẩm</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td><strong>{s.name}</strong></td>
                <td>{new Date(s.start_at).toLocaleString('vi-VN')}</td>
                <td>{new Date(s.end_at).toLocaleString('vi-VN')}</td>
                <td>{s.items_count} sản phẩm</td>
                 <td>
                  {(() => {
                    const status = getStatus(s)
                    return (
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: status.bg,
                        color: status.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: status.color,
                          animation: s.status === 'active' && now >= new Date(s.start_at) && now <= new Date(s.end_at) ? 'pulse-green 2s infinite' : 'none'
                        }}></span>
                        {status.label}
                      </span>
                    )
                  })()}
                </td>
                <td>
                  <button className="adminBtnSecondary" style={{ marginRight: '8px' }} onClick={() => handleOpenItems(s)}>Sản phẩm</button>
                  <button className="adminBtnSecondary" style={{ marginRight: '8px' }} onClick={() => {
                    setEditingSale(s);

                    // Chuyển đổi sang giờ địa phương của trình duyệt để khớp với danh sách
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
                  }}><EditIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sale Form Modal */}
      {isFormOpen && (
        <div className="adminModalOverlay" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="adminModalContent" style={{
            maxWidth: '540px',
            borderRadius: '5px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                {editingSale ? '✨ Hiệu chỉnh Flash Sale' : '🚀 Tạo Chiến Dịch Mới'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Thiết lập khoảng thời gian và tên gọi cho chương trình giảm giá chớp nhoáng.</p>
            </div>

            <form onSubmit={handleSubmitSale} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Tên chiến dịch</label>
                <input
                  type="text"
                  className="adminInput"
                  style={{ borderRadius: '5px', padding: '12px 16px', border: '1.5px solid #e2e8f0', transition: 'all 0.2s' }}
                  placeholder="Ví dụ: Sale sập sàn 12.12"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Bắt đầu</label>
                  <input
                    type="datetime-local"
                    className="adminInput"
                    style={{ borderRadius: '5px', padding: '12px 16px', border: '1.5px solid #e2e8f0' }}
                    value={formData.start_at}
                    onChange={e => setFormData({ ...formData, start_at: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Kết thúc</label>
                  <input
                    type="datetime-local"
                    className="adminInput"
                    style={{ borderRadius: '5px', padding: '12px 16px', border: '1.5px solid #e2e8f0' }}
                    value={formData.end_at}
                    onChange={e => setFormData({ ...formData, end_at: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{
                background: 'none',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Trạng thái quản lý</label>
                <select
                  className="adminInput"
                  style={{ borderRadius: '5px', padding: '10px 16px', border: '1.5px solid #e2e8f0' }}
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Hoạt động (Tự động theo thời gian)</option>
                  <option value="waiting">Chờ duyệt / Sắp tới</option>
                  <option value="paused">Tạm dừng (Ẩn hoàn toàn)</option>
                  <option value="ended">Đã kết thúc</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  * Trạng thái "Hoạt động" sẽ tự động chuyển sang "Đã kết thúc" khi hết giờ.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="adminBtnSecondary"
                  style={{ borderRadius: '5px', padding: '12px 24px', fontWeight: 600 }}
                  onClick={() => setIsFormOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adminBtnPrimary"
                  style={{
                    borderRadius: '5px',
                    padding: '12px 32px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.3)'
                  }}
                >
                  {editingSale ? 'Cập nhật' : 'Tạo ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Items Modal */}
      {isItemsModalOpen && currentSale && (
        <div className="adminModalOverlay" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <div className="adminModalContent" style={{
            maxWidth: '1000px',
            width: '95%',
            borderRadius: '5px',
            padding: '40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📦</span>
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Danh sách sản phẩm</h3>
                </div>
                <p style={{ color: '#64748b', margin: 0 }}>
                  Chiến dịch: <span style={{ fontWeight: 700, color: '#f97316' }}>{currentSale.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsItemsModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  color: '#64748b'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                &times;
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '24px 28px 28px 28px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '32px',
              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
            }}>
              {/* Tab Header */}
              <div style={{
                display: 'flex',
                gap: '12px',
                borderBottom: '1.5px solid #e2e8f0',
                paddingBottom: '14px',
                marginBottom: '24px'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveItemTab('single')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: activeItemTab === 'single' ? '#ea580c' : 'transparent',
                    color: activeItemTab === 'single' ? '#fff' : '#64748b',
                    boxShadow: activeItemTab === 'single' ? '0 4px 6px -1px rgba(234, 88, 12, 0.2)' : 'none'
                  }}
                >
                  ➕ Thêm từng sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => setActiveItemTab('bulk')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: activeItemTab === 'bulk' ? '#ea580c' : 'transparent',
                    color: activeItemTab === 'bulk' ? '#fff' : '#64748b',
                    boxShadow: activeItemTab === 'bulk' ? '0 4px 6px -1px rgba(234, 88, 12, 0.2)' : 'none'
                  }}
                >
                  ⚡ Giảm giá đồng loạt cả Shop
                </button>
              </div>

              {activeItemTab === 'single' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>1. Chọn sản phẩm</label>
                      <select
                        className="adminInput"
                        style={{ borderRadius: '5px', border: '1.5px solid #cbd5e1', padding: '10px 16px', height: '48px' }}
                        value={addItemData.product_id}
                        onChange={e => setAddItemData({ ...addItemData, product_id: e.target.value, variant_id: '' })}
                        required
                      >
                        <option value="">-- Tìm chọn sản phẩm trong kho --</option>
                        {availableProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Gốc: {Number(p.price).toLocaleString()}đ)</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>2. Phiên bản áp dụng</label>
                      <select
                        className="adminInput"
                        style={{
                          borderRadius: '5px',
                          border: '1.5px solid #cbd5e1',
                          padding: '10px 16px',
                          height: '48px',
                          background: (!selectedProduct || !selectedProduct.variants?.length) ? '#f1f5f9' : 'white'
                        }}
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
                        <option value="">-- Tất cả phiên bản / Mặc định --</option>
                        {selectedProduct?.variants?.map(v => (
                          <option key={v.id} value={v.id}>{v.variant_name} (Gốc: {Number(v.price).toLocaleString()}đ)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '20px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>3. Giá Sale đặc biệt (VNĐ)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          className="adminInput"
                          style={{ borderRadius: '5px', border: '1.5px solid #cbd5e1', padding: '10px 16px 10px 40px', height: '48px', fontWeight: 600, color: '#f97316' }}
                          placeholder="Nhập giá giảm..."
                          value={addItemData.flash_sale_price}
                          onChange={e => setAddItemData({ ...addItemData, flash_sale_price: e.target.value })}
                          required
                        />
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>₫</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>4. Giới hạn suất mua</label>
                      <input
                        type="number"
                        className="adminInput"
                        style={{ borderRadius: '5px', border: '1.5px solid #cbd5e1', padding: '10px 16px', height: '48px' }}
                        placeholder="∞ (Vô hạn)"
                        value={addItemData.quantity_limit}
                        onChange={e => setAddItemData({ ...addItemData, quantity_limit: e.target.value })}
                      />
                    </div>
                    <button
                      onClick={handleAddItem}
                      type="button"
                      className="adminBtnPrimary"
                      style={{
                        borderRadius: '5px',
                        padding: '0 40px',
                        height: '48px',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #df8947ff 0%, #f49b0cff 100%)',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Thêm vào danh sách
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBulkDiscount} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#fff7ed',
                    border: '1px solid #ffedd5',
                    color: '#c2410c',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    lineHeight: '1.5'
                  }}>
                    💡 <strong>Tính năng giảm giá đồng loạt:</strong> Hệ thống sẽ tự động tính toán giá giảm theo % của từng sản phẩm (và tất cả các phiên bản của sản phẩm) dựa trên giá bán gốc hiện tại, và tự động thêm chúng vào chiến dịch Flash Sale này.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '20px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>1. Mức giảm giá (%)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          className="adminInput"
                          style={{ borderRadius: '5px', border: '1.5px solid #cbd5e1', padding: '10px 40px 10px 16px', height: '48px', fontWeight: 700, color: '#ea580c' }}
                          placeholder="Ví dụ: 10, 20, 50..."
                          value={bulkDiscountPercentage}
                          onChange={e => setBulkDiscountPercentage(e.target.value)}
                          required
                        />
                        <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 700 }}>%</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>2. Giới hạn suất mua mỗi SP</label>
                      <input
                        type="number"
                        min="1"
                        className="adminInput"
                        style={{ borderRadius: '5px', border: '1.5px solid #cbd5e1', padding: '10px 16px', height: '48px' }}
                        placeholder="∞ (Vô hạn)"
                        value={bulkQuantityLimit}
                        onChange={e => setBulkQuantityLimit(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isBulkApplying}
                      className="adminBtnPrimary"
                      style={{
                        borderRadius: '5px',
                        padding: '0 40px',
                        height: '48px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #ea580c 0%, #ca8a04 100%)',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)',
                        color: 'white',
                        cursor: isBulkApplying ? 'not-allowed' : 'pointer',
                        opacity: isBulkApplying ? 0.7 : 1
                      }}
                    >
                      {isBulkApplying ? 'Đang áp dụng...' : '⚡ Áp Dụng Giảm Đồng Loạt'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div
              className="adminTableWrap"
              style={{
                flex: 1,
                overflowY: 'auto',
                borderRadius: '16px',
                border: '1px solid #f1f5f9',

                /* Ẩn scrollbar */
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <style>
                {`
      .adminTableWrap::-webkit-scrollbar {
        display: none;
      }
    `}
              </style>

              <table className="adminTable">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ background: '#f8fafc' }}>Sản phẩm / Phiên bản</th>
                    <th style={{ background: '#f8fafc' }}>Giá Flash Sale</th>
                    <th style={{ background: '#f8fafc' }}>Giới hạn</th>
                    <th style={{ background: '#f8fafc' }}>Đã bán</th>
                    <th style={{ background: '#f8fafc', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {(!currentSale.items || currentSale.items.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                        Chưa có sản phẩm nào trong chiến dịch này.
                      </td>
                    </tr>
                  ) : (
                    currentSale.items.map(item => (
                      <tr key={item.id} style={{ transition: 'all 0.2s' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc'
                              }}
                            >
                              <img
                                src={
                                  (item.variant?.id &&
                                    selectedProduct?.variants?.find(v => v.id === item.variant?.id)?.image_url)
                                    ? `${API_BASE_URL}${selectedProduct.variants.find(v => v.id === item.variant?.id)?.image_url}`
                                    : (item.product.main_image_url
                                      ? `${API_BASE_URL}${item.product.main_image_url}`
                                      : '/placeholder.png')
                                }
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                alt={item.product.name}
                              />
                            </div>

                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {item.product.name}
                              </div>

                              {item.variant ? (
                                <div style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 600 }}>
                                  Phiên bản: {item.variant.variant_name}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Tất cả phiên bản
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: '#f97316' }}>
                            {Number(item.flash_sale_price).toLocaleString()}đ
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: item.quantity_limit ? '#f1f5f9' : '#fff7ed',
                              color: item.quantity_limit ? '#475569' : '#c2410c',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            {item.quantity_limit || 'Vô hạn'}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '8px',
                                background: '#e2e8f0',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.sold_quantity / (item.quantity_limit || 100)) * 100
                                  )}%`,
                                  height: '100%',
                                  background: '#10b981'
                                }}
                              />
                            </div>

                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                              {item.sold_quantity}
                            </span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="adminBtnDanger"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: '#fff1f2',
                              color: '#e11d48',
                              border: 'none'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#ffe4e6'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fff1f2'}
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            🗑️ Gỡ bỏ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




function EditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> }

const styles = `
@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
`

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style")
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}