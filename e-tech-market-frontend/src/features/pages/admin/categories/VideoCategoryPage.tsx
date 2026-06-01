import React, { useState, useEffect } from 'react'
import '@/styles/admin/CategoryPage.css'
import ConfirmModal from '@/components/ConfirmModal'

import {
  fetchAdminVideoCategories,
  deleteAdminVideoCategory,
  saveAdminVideoCategory,
  type Category
} from '@/features/services/admin/video-categories.admin.service'

export default function VideoCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<Category | null>(null)

  const token = localStorage.getItem('token')

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    sort_order: 0
  })

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAdminVideoCategories(token)
      setCategories(data)
    } catch (err: any) {
      setError(err.message || 'Không tải được danh mục video.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat)
      setFormData({
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        is_active: cat.is_active,
        sort_order: cat.sort_order ?? 0
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        is_active: true,
        sort_order: 0
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const payload = new FormData()
      payload.append('name', formData.name)
      if (formData.slug) payload.append('slug', formData.slug)
      payload.append('description', formData.description)
      payload.append('is_active', formData.is_active ? '1' : '0')
      payload.append('sort_order', String(formData.sort_order ?? 0))

      await saveAdminVideoCategory(payload, editingCategory?.id, token)
      setIsModalOpen(false)
      fetchCategories()
    } catch (err: any) {
      setError(err.message || 'Lưu danh mục video thất bại.')
    }
  }

  const handleDelete = (category: Category) => {
    setPendingDeleteCategory(category)
    setConfirmOpen(true)
  }

  const handleCancelDelete = () => {
    setConfirmOpen(false)
    setPendingDeleteCategory(null)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteCategory) return
    setConfirmOpen(false)

    try {
      await deleteAdminVideoCategory(pendingDeleteCategory.id, token)
      setPendingDeleteCategory(null)
      fetchCategories()
    } catch (err: any) {
      alert(err.message || 'Xóa danh mục video thất bại.')
    }
  }

  return (
    <div className="catAdminRoot">
      <div className="catHeader">
        <div className="catHeaderLeft">
          <h2 className="catAdminTitle">Quản lý danh mục video</h2>
          <p className="catAdminSub">Danh sách danh mục video theo schema ID / Tên / Slug / Mô tả / Trạng thái / Thứ tự</p>
        </div>

        <button className="catAddBtn" onClick={() => openModal()}>
          <PlusIcon />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {error && <div className="catErrorBanner">{error}</div>}

      <div className="catTableWrap">
        {isLoading ? (
          <table className="catTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>TÊN DANH MỤC</th>
                <th>SLUG</th>
                <th>MÔ TẢ</th>
                <th>TRẠNG THÁI</th>
                <th>THỨ TỰ</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '65%' : '80%' }} />
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
                <th>ID</th>
                <th>TÊN DANH MỤC</th>
                <th>SLUG</th>
                <th>MÔ TẢ</th>
                <th>TRẠNG THÁI</th>
                <th>THỨ TỰ</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Chưa có danh mục video. Bấm «Thêm danh mục» để bắt đầu.
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id}>
                    <td>{cat.id}</td>
                    <td>{cat.name}</td>
                    <td><code className="catSlug">{cat.slug}</code></td>
                    <td style={{ maxWidth: 320 }}>
                      <span style={{ display: 'inline-block', whiteSpace: 'normal', lineHeight: 1.5 }}>
                        {cat.description || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`catStatus ${cat.is_active ? 'active' : 'inactive'}`}>
                        {cat.is_active ? 'HIỂN THỊ' : 'TẮT'}
                      </span>
                    </td>
                    <td>{cat.sort_order ?? 0}</td>
                    <td>
                      <div className="catActions">
                        <button className="catEdit" onClick={() => openModal(cat)}><EditIcon /></button>
                        <button className="catDelete" onClick={() => handleDelete(cat)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="catModalOverlay">
          <div className="catModal">
            <div className="catModalHeader">
              <h3>{editingCategory ? 'Sửa danh mục video' : 'Tạo danh mục video'}</h3>
              <button className="catCloseModal" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="catForm">
              <div className="catFormRow">
                <div className="catFormField">
                  <label>TÊN DANH MỤC</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Hướng dẫn sử dụng"
                    required
                  />
                </div>

                <div className="catFormField">
                  <label>SLUG</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="VD: huong-dan-su-dung"
                  />
                </div>
              </div>

              <div className="catFormRow">
                <div className="catFormField">
                  <label>THỨ TỰ</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) || 0 })}
                  />
                </div>

                <div className="catFormField">
                  <label>TRẠNG THÁI</label>
                  <div className="catToggleWrap">
                    <input
                      type="checkbox"
                      id="videoCategoryStatus"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label htmlFor="videoCategoryStatus" className="catToggleLabel">Hiển thị</label>
                  </div>
                </div>
              </div>

              <div className="catFormField">
                <label>MÔ TẢ</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn cho danh mục video"
                  rows={5}
                />
              </div>

              <div className="catModalFooter">
                <button type="button" className="catCancelBtn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="catSubmitBtn">
                  {editingCategory ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận xóa danh mục video"
        message={
          pendingDeleteCategory ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p>Bạn có chắc chắn muốn xóa danh mục video này không?</p>
              <div>
                <strong>{pendingDeleteCategory.name}</strong>
                <div style={{ color: '#6b7280', marginTop: 4 }}>
                  <code>{pendingDeleteCategory.slug || 'Không có slug'}</code>
                </div>
                {pendingDeleteCategory.description ? (
                  <div style={{ marginTop: 8, color: '#374151' }}>
                    {pendingDeleteCategory.description}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            'Bạn có chắc chắn muốn xóa danh mục video này?'
          )
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  )
}

