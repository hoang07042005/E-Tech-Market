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
        <div  className="adm-fs-style-1">
          <div className="admSkeletonBar adm-fs-style-2"  />
          <div className="admSkeletonBar adm-fs-style-3"  />
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
      <div  className="adm-fs-style-4">
        <h2  className="adm-fs-style-5">Quản lý Flash Sale</h2>
        <button className="adminBtnPrimary" onClick={() => { setEditingSale(null); setFormData({ name: '', start_at: '', end_at: '', status: 'active' }); setIsFormOpen(true); }}>
          + Tạo Chiến Dịch
        </button>
      </div>

      {error && (
        <div  className="adm-fs-style-6">
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
                  <button className="adminBtnSecondary adm-fs-style-7"  onClick={() => handleOpenItems(s)}>Sản phẩm</button>
                  <button className="adminBtnSecondary adm-fs-style-8"  onClick={() => {
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
        <div className="adminModalOverlay adm-fs-style-9" >
          <div className="adminModalContent adm-fs-style-10" >
            <div  className="adm-fs-style-11">
              <h3  className="adm-fs-style-12">
                {editingSale ? '✨ Hiệu chỉnh Flash Sale' : '🚀 Tạo Chiến Dịch Mới'}
              </h3>
              <p  className="adm-fs-style-13">Thiết lập khoảng thời gian và tên gọi cho chương trình giảm giá chớp nhoáng.</p>
            </div>

            <form onSubmit={handleSubmitSale}  className="adm-fs-style-14">
              <div  className="adm-fs-style-15">
                <label  className="adm-fs-style-16">Tên chiến dịch</label>
                <input
                  type="text"
                  className="adminInput adm-fs-style-17"
                  
                  placeholder="Ví dụ: Sale sập sàn 12.12"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div  className="adm-fs-style-18">
                <div>
                  <label  className="adm-fs-style-19">Bắt đầu</label>
                  <input
                    type="datetime-local"
                    className="adminInput adm-fs-style-20"
                    
                    value={formData.start_at}
                    onChange={e => setFormData({ ...formData, start_at: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label  className="adm-fs-style-21">Kết thúc</label>
                  <input
                    type="datetime-local"
                    className="adminInput adm-fs-style-22"
                    
                    value={formData.end_at}
                    onChange={e => setFormData({ ...formData, end_at: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div  className="adm-fs-style-23">
                <label  className="adm-fs-style-24">Trạng thái quản lý</label>
                <select
                  className="adminInput adm-fs-style-25"
                  
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Hoạt động (Tự động theo thời gian)</option>
                  <option value="waiting">Chờ duyệt / Sắp tới</option>
                  <option value="paused">Tạm dừng (Ẩn hoàn toàn)</option>
                  <option value="ended">Đã kết thúc</option>
                </select>
                <p  className="adm-fs-style-26">
                  * Trạng thái "Hoạt động" sẽ tự động chuyển sang "Đã kết thúc" khi hết giờ.
                </p>
              </div>

              <div  className="adm-fs-style-27">
                <button
                  type="button"
                  className="adminBtnSecondary adm-fs-style-28"
                  
                  onClick={() => setIsFormOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adminBtnPrimary adm-fs-style-29"
                  
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
        <div className="adminModalOverlay adm-fs-style-30" >
          <div className="adminModalContent adm-fs-style-31" >
            <div  className="adm-fs-style-32">
              <div>
                <div  className="adm-fs-style-33">
                  <span  className="adm-fs-style-34">📦</span>
                  <h3  className="adm-fs-style-35">Danh sách sản phẩm</h3>
                </div>
                <p  className="adm-fs-style-36">
                  Chiến dịch: <span  className="adm-fs-style-37">{currentSale.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsItemsModalOpen(false)}
                style={{
                  background: 'var(--admin-card-bg)',
                  border: '1px solid var(--admin-border)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  color: 'var(--admin-text-s)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.14)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--admin-card-bg)'}
              >
                &times;
              </button>
            </div>

            <div  className="adm-fs-style-38">
              {/* Tab Header */}
              <div  className="adm-fs-style-39">
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
                <div  className="adm-fs-style-40">
                  <div  className="adm-fs-style-41">
                    <div>
                      <label  className="adm-fs-style-42">1. Chọn sản phẩm</label>
                      <select
                        className="adminInput adm-fs-style-43"
                        
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
                      <label  className="adm-fs-style-44">2. Phiên bản áp dụng</label>
                      <select
                        className="adminInput"
                        style={{
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          borderRadius: '5px',
                          border: '1.5px solid var(--admin-border)',
                          padding: '10px 16px',
                          height: '48px',
                          background: (!selectedProduct || !selectedProduct.variants?.length) ? '#0f172a' : 'var(--admin-card-bg)',
                          color: 'var(--admin-text-p)'
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

                  <div  className="adm-fs-style-45">
                    <div>
                      <label  className="adm-fs-style-46">3. Giá Sale đặc biệt (VNĐ)</label>
                      <div  className="adm-fs-style-47">
                        <input
                          type="number"
                          className="adminInput adm-fs-style-48"
                          
                          placeholder="Nhập giá giảm..."
                          value={addItemData.flash_sale_price}
                          onChange={e => setAddItemData({ ...addItemData, flash_sale_price: e.target.value })}
                          required
                        />
                        <span  className="adm-fs-style-49">₫</span>
                      </div>
                    </div>
                    <div>
                      <label  className="adm-fs-style-50">4. Giới hạn suất mua</label>
                      <input
                        type="number"
                        className="adminInput adm-fs-style-51"
                        
                        placeholder="∞ (Vô hạn)"
                        value={addItemData.quantity_limit}
                        onChange={e => setAddItemData({ ...addItemData, quantity_limit: e.target.value })}
                      />
                    </div>
                    <button
                      onClick={handleAddItem}
                      type="button"
                      className="adminBtnPrimary adm-fs-style-52"
                      
                    >
                      Thêm vào danh sách
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBulkDiscount}  className="adm-fs-style-53">
                  <div  className="adm-fs-style-54">
                    💡 <strong>Tính năng giảm giá đồng loạt:</strong> Hệ thống sẽ tự động tính toán giá giảm theo % của từng sản phẩm (và tất cả các phiên bản của sản phẩm) dựa trên giá bán gốc hiện tại, và tự động thêm chúng vào chiến dịch Flash Sale này.
                  </div>

                  <div  className="adm-fs-style-55">
                    <div>
                      <label  className="adm-fs-style-56">1. Mức giảm giá (%)</label>
                      <div  className="adm-fs-style-57">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          className="adminInput adm-fs-style-58"
                          
                          placeholder="Ví dụ: 10, 20, 50..."
                          value={bulkDiscountPercentage}
                          onChange={e => setBulkDiscountPercentage(e.target.value)}
                          required
                        />
                        <span  className="adm-fs-style-59">%</span>
                      </div>
                    </div>
                    <div>
                      <label  className="adm-fs-style-60">2. Giới hạn suất mua mỗi SP</label>
                      <input
                        type="number"
                        min="1"
                        className="adminInput adm-fs-style-61"
                        
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
              className="adminTableWrap adm-fs-style-62"
              
            >
              <style>
                {`
      .adminTableWrap::-webkit-scrollbar {
        display: none;
      }
    `}
              </style>

              <table className="adminTable">
                <thead  className="adm-fs-style-63">
                  <tr>
                    <th  className="adm-fs-style-64">Sản phẩm / Phiên bản</th>
                    <th  className="adm-fs-style-65">Giá Flash Sale</th>
                    <th  className="adm-fs-style-66">Giới hạn</th>
                    <th  className="adm-fs-style-67">Đã bán</th>
                    <th  className="adm-fs-style-68">Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {(!currentSale.items || currentSale.items.length === 0) ? (
                    <tr>
                      <td colSpan={5}  className="adm-fs-style-69">
                        <div  className="adm-fs-style-70">📭</div>
                        Chưa có sản phẩm nào trong chiến dịch này.
                      </td>
                    </tr>
                  ) : (
                    currentSale.items.map(item => (
                      <tr key={item.id}  className="adm-fs-style-71">
                        <td>
                          <div  className="adm-fs-style-72">
                            <div
                              
                             className="adm-fs-style-73">
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
                              <div  className="adm-fs-style-74">
                                {item.product.name}
                              </div>

                              {item.variant ? (
                                <div  className="adm-fs-style-75">
                                  Phiên bản: {item.variant.variant_name}
                                </div>
                              ) : (
                                <div  className="adm-fs-style-76">
                                  Tất cả phiên bản
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span  className="adm-fs-style-77">
                            {Number(item.flash_sale_price).toLocaleString()}đ
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: item.quantity_limit ? '#0f172a' : 'rgba(249, 115, 22, 0.14)',
                              color: item.quantity_limit ? 'var(--admin-text-s)' : '#fb923c',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            {item.quantity_limit || 'Vô hạn'}
                          </span>
                        </td>

                        <td>
                          <div  className="adm-fs-style-78">
                            <div
                              
                             className="adm-fs-style-79">
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

                            <span  className="adm-fs-style-80">
                              {item.sold_quantity}
                            </span>
                          </div>
                        </td>

                        <td  className="adm-fs-style-81">
                          <button
                            className="adminBtnDanger adm-fs-style-82"
                            
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
