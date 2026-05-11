import { useEffect, useState } from 'react'
import { apiFetch, API_BASE_URL } from '../../lib/api'
import '../css_admin/AdminPage.css'

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
  is_active: boolean
  items_count?: number
  items?: FlashSaleItem[]
}

export default function AdminFlashSalePage() {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [sales, setSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    start_at: '',
    end_at: '',
    is_active: true
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

  const selectedProduct = availableProducts.find(p => String(p.id) === addItemData.product_id)

  const loadSales = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await apiFetch<FlashSale[]>('/api/admin/flash-sales', { token })
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
      const fullSale = await apiFetch<FlashSale>(`/api/admin/flash-sales/${sale.id}`, { token })
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

  if (loading) return <div style={{ padding: '20px' }}>Đang tải...</div>

  return (
    <div className="adminContentCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Quản lý Flash Sale</h2>
        <button className="adminBtnPrimary" onClick={() => { setEditingSale(null); setFormData({ name: '', start_at: '', end_at: '', is_active: true }); setIsFormOpen(true); }}>
          + Tạo Chiến Dịch
        </button>
      </div>

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
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    background: s.is_active ? '#e6f4ea' : '#fce8e6',
                    color: s.is_active ? '#1e7e34' : '#d93025'
                  }}>
                    {s.is_active ? 'Kích hoạt' : 'Tạm dừng'}
                  </span>
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
                      is_active: s.is_active
                    });
                    setIsFormOpen(true);
                  }}>Sửa</button>
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
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
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
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>Trạng thái hoạt động</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cho phép hiển thị ngay khi tới giờ</div>
                </div>
                <label className="adminSwitch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input
                    type="checkbox"
                    style={{ opacity: 0, width: 0, height: 0 }}
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: formData.is_active ? '#f97316' : '#cbd5e1',
                    transition: '.4s',
                    borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px', width: '18px',
                      left: formData.is_active ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.4s',
                      borderRadius: '50%'
                    }}></span>
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="adminBtnSecondary"
                  style={{ borderRadius: '12px', padding: '12px 24px', fontWeight: 600 }}
                  onClick={() => setIsFormOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adminBtnPrimary"
                  style={{
                    borderRadius: '12px',
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
                  <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Danh sách sản phẩm</h3>
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
              padding: '28px',
              borderRadius: '5px',
              border: '1px solid #e2e8f0',
              marginBottom: '32px',
              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
            }}>
              <h4 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#f97316', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '0.8rem' }}>+</span>
                Thêm sản phẩm vào chương trình
              </h4>

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
                        style={{ borderRadius: '5px', border: '1.5px solid #cbd5e1', padding: '10px 16px 10px 40px', height: '48px', fontWeight: 800, color: '#f97316' }}
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
                      fontWeight: 800,
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
                          <span style={{ fontWeight: 800, color: '#f97316' }}>
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
