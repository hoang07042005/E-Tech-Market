import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/configs/api.config'
import ConfirmModal from '@/components/ConfirmModal'
import '@/styles/admin/CategoryPage.css' // Reuse CategoryPage CSS since it fits the admin layout perfectly
import { fetchAdminBanners, deleteAdminBanner, saveAdminBanner, type Banner } from '@/features/services/admin/banners.admin.service'

const resolveImageUrl = (url?: string | null) => {
  if (!url) return 'https://via.placeholder.com/150x50'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function BannerAdminPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteBanner, setPendingDeleteBanner] = useState<Banner | null>(null)
  
  const token = localStorage.getItem('token')

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link_url: '',
    is_active: true,
    sort_order: 0
  })

  const fetchBanners = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAdminBanners(token)
      setBanners(data)
    } catch (err: any) {
      setError(err.message || 'Không tải được banners.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleOpenModal = (banner?: Banner) => {
    setImageFile(null)
    if (banner) {
      setEditingBanner(banner)
      setFormData({
        title: banner.title || '',
        description: banner.description || '',
        link_url: banner.link_url || '',
        is_active: banner.is_active,
        sort_order: banner.sort_order || 0
      })
    } else {
      setEditingBanner(null)
      setFormData({ title: '', description: '', link_url: '', is_active: true, sort_order: 0 })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!editingBanner && !imageFile) {
      alert('Vui lòng chọn ảnh cho banner mới.')
      return
    }

    try {
      const payload = new FormData()
      if (formData.title) payload.append('title', formData.title)
      if (formData.description) payload.append('description', formData.description)
      if (formData.link_url) payload.append('link_url', formData.link_url)
      payload.append('is_active', formData.is_active ? '1' : '0')
      payload.append('sort_order', formData.sort_order.toString())

      if (imageFile) {
        payload.append('image', imageFile)
      }

      await saveAdminBanner(payload, editingBanner?.id, token)
      setIsModalOpen(false)
      fetchBanners()
    } catch (err: any) {
      setError(err.message || 'Lưu banner thất bại.')
    }
  }

  const handleDelete = (banner: Banner) => {
    setPendingDeleteBanner(banner)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteBanner) return
    const id = pendingDeleteBanner.id
    setConfirmOpen(false)
    setPendingDeleteBanner(null)
    try {
      await deleteAdminBanner(id, token)
      fetchBanners()
    } catch (err: any) {
      alert(err.message || 'Xóa banner thất bại.')
    }
  }

  return (
    <div className="catAdminRoot">
      <div className="catHeader">
        <div className="catHeaderLeft">
          <h2 className="catAdminTitle">Quản lý Banners</h2>
          <p className="catAdminSub">Cập nhật banner trang chủ cho cửa hàng</p>
        </div>
        <button className="catAddBtn" onClick={() => handleOpenModal()}>
          <PlusIcon />
          <span>Thêm banner</span>
        </button>
      </div>

      {error && <div className="catErrorBanner">{error}</div>}

      <div className="catTableWrap">
        {isLoading ? (
          <table className="catTable">
            <thead>
              <tr>
                <th>ẢNH BANNER</th>
                <th>TIÊU ĐỀ</th>
                <th>LIÊN KẾT</th>
                <th>THỨ TỰ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={6}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '60%' : '80%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="catTable">
            <thead>
              <tr>
                <th>ẢNH BANNER</th>
                <th>TIÊU ĐỀ</th>
                <th>LIÊN KẾT</th>
                <th>THỨ TỰ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Chưa có banner. Bấm «Thêm banner» để tạo mới.
                  </td>
                </tr>
              ) : (
                banners.map(banner => (
                  <tr key={banner.id}>
                    <td>
                      <img 
                        src={resolveImageUrl(banner.image_url)} 
                        alt={banner.title || 'Banner'} 
                        style={{ width: '150px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{banner.title || '—'}</span></td>
                    <td><code className="catSlug">{banner.link_url || '—'}</code></td>
                    <td>{banner.sort_order}</td>
                    <td>
                      <span className={`catStatus ${banner.is_active ? 'active' : 'inactive'}`}>
                        {banner.is_active ? 'HIỂN THỊ' : 'TẮT'}
                      </span>
                    </td>
                    <td>
                      <div className="catActions">
                        <button className="catEdit" onClick={() => handleOpenModal(banner)}><EditIcon /></button>
                        <button className="catDelete" onClick={() => handleDelete(banner)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="catModalOverlay">
          <div className="catModal">
            <div className="catModalHeader">
              <h3>{editingBanner ? 'Sửa banner' : 'Tạo banner mới'}</h3>
              <button className="catCloseModal" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="catForm">
              <div className="catFormRow">
                <div className="catFormField">
                  <label>TIÊU ĐỀ (Tùy chọn)</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="VD: Khuyến mãi mùa hè"
                  />
                </div>
                <div className="catFormField">
                  <label>LIÊN KẾT ĐẾN TRANG (Tùy chọn)</label>
                  <input 
                    type="text" 
                    value={formData.link_url} 
                    onChange={e => setFormData({...formData, link_url: e.target.value})} 
                    placeholder="VD: /products?sale=summer"
                  />
                </div>
              </div>

              <div className="catFormField" style={{ marginBottom: '16px' }}>
                <label>NỘI DUNG / MÔ TẢ (Tùy chọn)</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="VD: Trải nghiệm đỉnh cao của kỹ thuật hiệu năng cao..."
                  style={{ padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', width: '100%', minHeight: '60px', fontFamily: 'inherit' }}
                />
              </div>

              <div className="catFormRow">
                <div className="catFormField">
                  <label>THỨ TỰ HIỂN THỊ</label>
                  <input 
                    type="number" 
                    value={formData.sort_order} 
                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} 
                    placeholder="VD: 0, 1, 2"
                  />
                </div>
                <div className="catFormField">
                  <label>TRẠNG THÁI</label>
                  <div className="catToggleWrap">
                    <input 
                      type="checkbox" 
                      id="catStatusToggle"
                      checked={formData.is_active} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    />
                    <label htmlFor="catStatusToggle" className="catToggleLabel">Hiển thị trên trang chủ</label>
                  </div>
                </div>
              </div>

              <div className="catFormField">
                <label>ẢNH BANNER {editingBanner ? '(Chọn để thay đổi)' : '*'}</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files?.[0]) setImageFile(e.target.files[0])
                  }}
                  style={{ padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', width: '100%' }}
                />
                {editingBanner?.image_url && !imageFile && (
                  <div style={{ marginTop: '8px' }}>
                    <img src={resolveImageUrl(editingBanner.image_url)} alt="Current" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                  </div>
                )}
              </div>

              <div className="catModalFooter">
                <button type="button" className="catCancelBtn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="catSubmitBtn">{editingBanner ? 'Cập nhật' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận xóa banner"
        message={
          pendingDeleteBanner ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p>Bạn có chắc chắn muốn xóa banner này không?</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img
                  src={resolveImageUrl(pendingDeleteBanner.image_url)}
                  alt={pendingDeleteBanner.title || 'Banner'}
                  style={{ width: 96, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <div>
                  <strong>{pendingDeleteBanner.title || 'Banner không tên'}</strong>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>{pendingDeleteBanner.link_url || 'Không có liên kết'}</div>
                  {pendingDeleteBanner.description ? (
                    <div style={{ marginTop: 4, color: '#64748b' }}>{pendingDeleteBanner.description}</div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            'Bạn có chắc chắn muốn xóa banner này?'
          )
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingDeleteBanner(null)
        }}
      />
    </div>
  )
}

function PlusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> }
function EditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> }
function TrashIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> }
