import { useState, useEffect } from 'react'
import { apiFetch } from '@/configs/api.config'
import ConfirmModal from '@/components/ConfirmModal'
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
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null)

  const hasAuth = true

  const fetchCoupons = async (currentPage: number) => {
    if (!hasAuth) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch<any>(`/api/admin/coupons?page=${currentPage}&limit=10`)
      const fetchedCoupons = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setCoupons(fetchedCoupons)
      setTotalPages(res?.last_page || res?.meta?.last_page || 1)
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
    if (!hasAuth || !editData) return
    try {
      const isEdit = !!editData.id
      const url = isEdit ? `/api/admin/coupons/${editData.id}` : `/api/admin/coupons`
      const method = isEdit ? 'PUT' : 'POST'
      
      await apiFetch(url, {
        method,
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
    if (!hasAuth) return
    try {
      await apiFetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      setCoupons((prev) => prev.filter((c) => c.id !== id))
      setShowDeleteModal(false)
      setCouponToDelete(null)
    } catch {
      alert('Lỗi khi xoá.')
    }
  }

  const requestDeleteCoupon = (coupon: Coupon) => {
    setCouponToDelete(coupon)
    setShowDeleteModal(true)
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
      {/* Header tầng trên */}
      <div className="adminPageHeader">
        <div>
          <h2 className="adminPageTitle">Quản lý Mã giảm giá</h2>
          <p className="adminPageSubtitle">Tạo, bật/tắt và theo dõi hiệu suất sử dụng các chương trình ưu đãi.</p>
        </div>
        <button className="adminBtnPrimary" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Tạo mã mới
        </button>
      </div>

      {/* Khu vực bảng dữ liệu */}
      <div className="adminTableWrap">
        {loading ? (
          <table className="adminTable">
            <thead>
              <tr>
                <th>Thông tin mã</th>
                <th>Ưu đãi</th>
                <th>Đơn tối thiểu</th>
                <th>Thời gian áp dụng</th>
                <th>Lượt sử dụng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '50%' : '70%' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : coupons.length === 0 ? (
          <div className="adminEmpty">
            <div className="adminEmptyIcon">🎫</div>
            <p>Chưa có mã giảm giá nào được tạo hệ thống.</p>
          </div>
        ) : (
          <table className="adminTable">
            <thead>
              <tr>
                <th>Thông tin mã</th>
                <th>Ưu đãi</th>
                <th>Đơn tối thiểu</th>
                <th>Thời gian áp dụng</th>
                <th>Lượt sử dụng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  {/* Cột mã code thiết kế dạng badge nổi bật */}
                  <td>
                    <div className="couponCodeBadge">{c.code}</div>
                  </td>
                  
                  {/* Cột thông tin ưu đãi */}
                  <td>
                    <div className="couponDiscountVal">
                      {c.coupon_type === 'percentage' ? `${Number(c.value)}%` : `${Number(c.value).toLocaleString('vi-VN')}đ`}
                    </div>
                    <div className="couponTypeSub">
                      {c.coupon_type === 'percentage' ? 'Giảm theo phần trăm' : 'Giảm số tiền cố định'}
                    </div>
                  </td>

                  {/* Đơn tối thiểu */}
                  <td>
                    <span className="couponMinOrder">
                      {c.min_order_amount ? `${Number(c.min_order_amount).toLocaleString('vi-VN')}đ` : '—'}
                    </span>
                  </td>

                  {/* Thời gian hiển thị đẹp như cột Flash Sale trước */}
                  <td>
                    <div className="couponTimeBlock">
                      <div className="timeItem">
                        <span className="timeLabel">Từ:</span>
                        <span className="timeValue">{c.start_at ? new Date(c.start_at).toLocaleDateString('vi-VN') : 'Bất kỳ'}</span>
                      </div>
                      <div className="timeItem">
                        <span className="timeLabel">Đến:</span>
                        <span className="timeValue">{c.end_at ? new Date(c.end_at).toLocaleDateString('vi-VN') : 'Vô hạn'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Tiến trình sử dụng (Thực tế / Tối đa) */}
                  <td>
                    <div className="couponUsage">
                      <strong>{c.usages_count || 0}</strong>
                      <span className="usageMax"> / {c.max_uses || '∞'}</span>
                    </div>
                  </td>

                  {/* Trạng thái hoạt động dạng Pill chấm tròn */}
                  <td>
                    <span className={`adminStatusBadge ${c.is_active ? 'ok' : 'bad'}`}>
                      <span className="statusDot"></span>
                      {c.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>

                  {/* Nhóm thao tác icon vuông đồng bộ */}
                  <td>
                    <div className="adminActionGroup">
                      <button className="adminBtnSecondary" title="Chỉnh sửa" onClick={() => { setEditData(c); setShowModal(true) }}>
                        <PencilIcon />
                      </button>
                      <button className="adminBtnDanger" title="Xóa mã" onClick={() => requestDeleteCoupon(c)}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Phân trang */}
      <div className="adminPagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span className="pageIndicator">Trang <b>{page}</b> / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      {/* Modal chỉnh sửa & tạo mới */}
      {showModal && editData && (
        <div className="adminModalOverlay" onClick={() => setShowModal(false)}>
          <div className="adminModalContent" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="adminModalHeader">
              <h3>{editData.id ? '✏️ Chỉnh sửa mã giảm giá' : '✨ Tạo mã giảm giá mới'}</h3>
              <button className="adminModalClose" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="adminModalBody">
              <div className="adminFormGroup">
                <label>Mã khuyến mãi (Code)</label>
                <input required type="text" placeholder="VD: NHALAM10, TET2026..." value={editData.code || ''} onChange={e => setEditData({ ...editData, code: e.target.value.toUpperCase() })} />
              </div>

              <div className="formRow">
                <div className="adminFormGroup">
                  <label>Loại hình</label>
                  <select value={editData.coupon_type} onChange={e => setEditData({ ...editData, coupon_type: e.target.value as any })}>
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (đ)</option>
                  </select>
                </div>
                <div className="adminFormGroup">
                  <label>Mức giảm {editData.coupon_type === 'percentage' ? '(%)' : '(đ)'}</label>
                  <input required type="number" min="0" step={editData.coupon_type === 'percentage' ? '1' : '1000'} value={editData.value || ''} onChange={e => setEditData({ ...editData, value: e.target.value })} />
                </div>
              </div>

              <div className="adminFormGroup">
                <label>Giá trị đơn hàng tối thiểu áp dụng (đ)</label>
                <input type="number" min="0" step="1000" placeholder="0đ (Bỏ trống nếu không yêu cầu)" value={editData.min_order_amount || ''} onChange={e => setEditData({ ...editData, min_order_amount: e.target.value })} />
              </div>

              <div className="formRow">
                <div className="adminFormGroup">
                  <label>Tổng lượt phát hành tối đa</label>
                  <input type="number" min="1" placeholder="Vô hạn (∞)" value={editData.max_uses || ''} onChange={e => setEditData({ ...editData, max_uses: parseInt(e.target.value) || null })} />
                </div>
                <div className="adminFormGroup">
                  <label>Giới hạn / Mỗi khách hàng</label>
                  <input type="number" min="1" placeholder="Không giới hạn" value={editData.max_uses_per_user || ''} onChange={e => setEditData({ ...editData, max_uses_per_user: parseInt(e.target.value) || null })} />
                </div>
              </div>

              <div className="formRow">
                <div className="adminFormGroup">
                  <label>Ngày bắt đầu hiệu lực</label>
                  <input type="datetime-local" value={editData.start_at ? editData.start_at.slice(0, 16) : ''} onChange={e => setEditData({ ...editData, start_at: e.target.value || null })} />
                </div>
                <div className="adminFormGroup">
                  <label>Ngày hết hạn</label>
                  <input type="datetime-local" value={editData.end_at ? editData.end_at.slice(0, 16) : ''} onChange={e => setEditData({ ...editData, end_at: e.target.value || null })} />
                </div>
              </div>

              <div className="adminFormCheckbox">
                <input type="checkbox" id="isActive" checked={!!editData.is_active} onChange={e => setEditData({ ...editData, is_active: e.target.checked })} />
                <label htmlFor="isActive">Kích hoạt và cho phép người dùng áp dụng mã ngay bây giờ</label>
              </div>
              
              <div className="adminModalFooter">
                <button type="button" className="modalBtnCancel" onClick={() => setShowModal(false)}>Đóng lại</button>
                <button type="submit" className="adminBtnPrimary">Lưu dữ liệu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteModal}
        title="Xác nhận xoá mã giảm giá"
        message={couponToDelete ? (
          <div className="deleteConfirmContent">
            <p>Hành động này không thể hoàn tác. Bạn có chắc muốn xóa vĩnh viễn mã giảm giá sau?</p>
            <div className="deleteCard">
              <strong>Mã: {couponToDelete.code}</strong>
              <span>Ưu đãi: {couponToDelete.coupon_type === 'percentage' ? `${Number(couponToDelete.value)}%` : `${Number(couponToDelete.value).toLocaleString('vi-VN')}đ`}</span>
            </div>
          </div>
        ) : 'Bạn có chắc chắn muốn xoá mã giảm giá này?'}
        onConfirm={() => { if (couponToDelete) void deleteCoupon(couponToDelete.id) }}
        onCancel={() => { setShowDeleteModal(false); setCouponToDelete(null) }}
      />
    </div>
  )
}


function PencilIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>)}
function TrashIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>)}