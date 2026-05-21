import { useState, useEffect } from 'react'
import { apiFetch } from '@/configs/api.config'
import '@/styles/admin/CouponsAdmin.css'

type Coupon = {
  id: number
  code: string
  coupon_type: 'percentage' | 'fixed'
  value: string
  min_order_amount: string | null
  start_at: string | null
  end_at: string | null
  max_uses: number | null
  max_uses_per_user: number | null
  is_active: boolean
  usages_count?: number
}

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState<Partial<Coupon> | null>(null)
  
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

  const fetchCoupons = async (currentPage: number) => {
    if (!token) return
    setLoading(true)
    try {
      const res = await apiFetch<any>(`/api/admin/coupons?page=${currentPage}&limit=10`, { token })
      setCoupons(res.data || [])
      setTotalPages(res.last_page || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons(page)
  }, [page])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !editData) return
    try {
      const isEdit = !!editData.id
      const url = isEdit ? `/api/admin/coupons/${editData.id}` : `/api/admin/coupons`
      const method = isEdit ? 'PUT' : 'POST'
      
      await apiFetch(url, {
        method,
        token,
        body: JSON.stringify(editData),
      })
      
      setShowModal(false)
      setEditData(null)
      fetchCoupons(page)
    } catch (err: any) {
      alert('Lỗi lưu mã giảm giá: ' + (err.message || ''))
    }
  }

  const deleteCoupon = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá mã giảm giá này?')) return
    if (!token) return
    try {
      await apiFetch(`/api/admin/coupons/${id}`, { method: 'DELETE', token })
      setCoupons((prev) => prev.filter((c) => c.id !== id))
    } catch {
      alert('Lỗi khi xoá.')
    }
  }

  const openNew = () => {
    setEditData({
      code: '',
      coupon_type: 'percentage',
      value: '',
      min_order_amount: '',
      is_active: true,
    })
    setShowModal(true)
  }

  return (
    <div className="adminPageContainer">
      <div className="adminPageHeader">
        <h2 className="adminPageTitle">Quản lý Mã giảm giá (Coupons)</h2>
        <div className="adminPageActions">
          <button className="adminBtnPrimary" onClick={openNew}>+ Tạo mã mới</button>
        </div>
      </div>

      <div className="adminTableWrap">
        {loading ? (
          <table className="adminTable">
            <thead>
              <tr>
                <th>Mã (Code)</th>
                <th>Loại giảm</th>
                <th>Giá trị</th>
                <th>Đơn tối thiểu</th>
                <th>Thời gian áp dụng</th>
                <th>Số lượt dùng</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={8}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '60%' : '80%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : coupons.length === 0 ? (
          <div className="adminEmpty">Chưa có mã giảm giá nào.</div>
        ) : (
          <table className="adminTable">
            <thead>
              <tr>
                <th>Mã (Code)</th>
                <th>Loại giảm</th>
                <th>Giá trị</th>
                <th>Đơn tối thiểu</th>
                <th>Thời gian áp dụng</th>
                <th>Số lượt dùng</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td>{c.coupon_type === 'percentage' ? 'Phần trăm (%)' : 'Cố định (VNĐ)'}</td>
                  <td>{c.coupon_type === 'percentage' ? `${Number(c.value)}%` : `${Number(c.value).toLocaleString('vi-VN')}đ`}</td>
                  <td>{c.min_order_amount ? `${Number(c.min_order_amount).toLocaleString('vi-VN')}đ` : 'Không'}</td>
                  <td>
                    <small>
                      Từ: {c.start_at ? new Date(c.start_at).toLocaleDateString('vi-VN') : 'Bất kỳ'}<br/>
                      Đến: {c.end_at ? new Date(c.end_at).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                    </small>
                  </td>
                  <td>{c.usages_count || 0} / {c.max_uses || '∞'}</td>
                  <td>
                    <span className={`adminStatusBadge ${c.is_active ? 'ok' : 'bad'}`}>
                      {c.is_active ? 'Đang bật' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 0 }}>
                      <button className="adminBtnSecondary" onClick={() => { setEditData(c); setShowModal(true) }}><PencilIcon /></button>
                      <button className="adminBtnDanger" onClick={() => deleteCoupon(c.id)}><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="adminPagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
        <span>Trang {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</button>
      </div>

      {showModal && editData && (
        <div className="adminModalOverlay" onClick={() => setShowModal(false)}>
          <div className="adminModalContent" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="adminModalHeader">
              <h3>{editData.id ? 'Sửa mã giảm giá' : 'Tạo mã mới'}</h3>
              <button className="adminModalClose" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="adminModalBody">
              <div className="adminFormGroup">
                <label>Mã Code (VD: SALE10)</label>
                <input required type="text" value={editData.code || ''} onChange={e => setEditData({ ...editData, code: e.target.value.toUpperCase() })} />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="adminFormGroup" style={{ flex: 1 }}>
                  <label>Loại giảm giá</label>
                  <select value={editData.coupon_type} onChange={e => setEditData({ ...editData, coupon_type: e.target.value as any })}>
                    <option value="percentage">Theo phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>
                <div className="adminFormGroup" style={{ flex: 1 }}>
                  <label>Giá trị giảm {editData.coupon_type === 'percentage' ? '(%)' : '(VNĐ)'}</label>
                  <input required type="number" min="0" step={editData.coupon_type === 'percentage' ? '1' : '1000'} value={editData.value || ''} onChange={e => setEditData({ ...editData, value: e.target.value })} />
                </div>
              </div>
              <div className="adminFormGroup">
                <label>Đơn hàng tối thiểu (VNĐ) - <i>Để trống nếu không yêu cầu</i></label>
                <input type="number" min="0" step="1000" value={editData.min_order_amount || ''} onChange={e => setEditData({ ...editData, min_order_amount: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="adminFormGroup" style={{ flex: 1 }}>
                  <label>Tổng lượt dùng tối đa</label>
                  <input type="number" min="1" value={editData.max_uses || ''} onChange={e => setEditData({ ...editData, max_uses: parseInt(e.target.value) || null })} />
                </div>
                <div className="adminFormGroup" style={{ flex: 1 }}>
                  <label>Lượt dùng/Khách</label>
                  <input type="number" min="1" value={editData.max_uses_per_user || ''} onChange={e => setEditData({ ...editData, max_uses_per_user: parseInt(e.target.value) || null })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="adminFormGroup" style={{ flex: 1 }}>
                  <label>Ngày bắt đầu</label>
                  <input type="datetime-local" value={editData.start_at ? editData.start_at.slice(0, 16) : ''} onChange={e => setEditData({ ...editData, start_at: e.target.value || null })} />
                </div>
                <div className="adminFormGroup" style={{ flex: 1 }}>
                  <label>Ngày kết thúc</label>
                  <input type="datetime-local" value={editData.end_at ? editData.end_at.slice(0, 16) : ''} onChange={e => setEditData({ ...editData, end_at: e.target.value || null })} />
                </div>
              </div>
              <div className="adminFormGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActive" checked={!!editData.is_active} onChange={e => setEditData({ ...editData, is_active: e.target.checked })} />
                <label htmlFor="isActive" style={{ margin: 0 }}>Kích hoạt mã này</label>
              </div>
              
              <div className="adminModalFooter" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="adminBtnSecondary" onClick={() => setShowModal(false)}>Huỷ</button>
                <button type="submit" className="adminBtnPrimary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



function PencilIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9"stroke="currentColor"strokeWidth="2"strokeLinecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"stroke="currentColor"strokeWidth="2"strokeLinejoin="round"/></svg>)}
function TrashIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16"stroke="currentColor"strokeWidth="2"strokeLinecap="round"/><path d="M10 11v6M14 11v6"stroke="currentColor"strokeWidth="2"strokeLinecap="round"/><path d="M6 7l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"stroke="currentColor"strokeWidth="2"strokeLinejoin="round"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"stroke="currentColor"strokeWidth="2"strokeLinejoin="round"/></svg>)}
