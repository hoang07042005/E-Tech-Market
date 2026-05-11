import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import '../css_admin/CategoryPage.css'

interface Category {
  id: number
  name: string
  slug: string
  parent_id: number | null
  is_active: boolean
  description?: string
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const token = localStorage.getItem('token')

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent_id: '',
    is_active: true,
    description: ''
  })

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch<Category[]>('/api/admin/categories', { token })
      setCategories(data)
    } catch (err: any) {
      setError(err.message || 'Không tải được danh mục.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleOpenModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat)
      setFormData({
        name: cat.name,
        slug: cat.slug,
        parent_id: cat.parent_id?.toString() || '',
        is_active: cat.is_active,
        description: cat.description || ''
      })
    } else {
      setEditingCategory(null)
      setFormData({ name: '', slug: '', parent_id: '', is_active: true, description: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        ...formData,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
      }

      if (editingCategory) {
        await apiFetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          token
        })
      } else {
        await apiFetch('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
          token
        })
      }
      setIsModalOpen(false)
      fetchCategories()
    } catch (err: any) {
      setError(err.message || 'Lưu danh mục thất bại.')
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Xóa danh mục này?')) {
      try {
        await apiFetch(`/api/admin/categories/${id}`, {
          method: 'DELETE',
          token
        })
        fetchCategories()
      } catch (err: any) {
        alert(err.message || 'Xóa danh mục thất bại.')
      }
    }
  }

  return (
    <div className="catAdminRoot">
      <div className="catHeader">
        <div className="catHeaderLeft">
          <h2 className="catAdminTitle">Quản lý danh mục</h2>
          <p className="catAdminSub">Tổ chức cấu trúc và phân loại cửa hàng</p>
        </div>
        <button className="catAddBtn" onClick={() => handleOpenModal()}>
          <PlusIcon />
          <span>Thêm danh mục</span>
        </button>
      </div>

      {error && <div className="catErrorBanner">{error}</div>}

      <div className="catTableWrap">
        {isLoading ? (
          <div className="catLoading">Đang tải dữ liệu…</div>
        ) : (
          <table className="catTable">
            <thead>
              <tr>
                <th>TÊN DANH MỤC</th>
                <th>SLUG URL</th>
                <th>CHA</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Chưa có danh mục. Bấm «Thêm danh mục» để bắt đầu.
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <div className="catNameCell">
                        <div className="catFolderIcon"><FolderIcon /></div>
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td><code className="catSlug">{cat.slug}</code></td>
                    <td>
                      <span className="catParent">
                        {cat.parent_id ? categories.find(c => c.id === cat.parent_id)?.name : 'Cấp gốc'}
                      </span>
                    </td>
                    <td>
                      <span className={`catStatus ${cat.is_active ? 'active' : 'inactive'}`}>
                        {cat.is_active ? 'HIỂN THỊ' : 'TẮT'}
                      </span>
                    </td>
                    <td>
                      <div className="catActions">
                        <button className="catEdit" onClick={() => handleOpenModal(cat)}><EditIcon /></button>
                        <button className="catDelete" onClick={() => handleDelete(cat.id)}><TrashIcon /></button>
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
              <h3>{editingCategory ? 'Sửa danh mục' : 'Tạo danh mục mới'}</h3>
              <button className="catCloseModal" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="catForm">
              <div className="catFormRow">
                <div className="catFormField">
                  <label>TÊN DANH MỤC</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="VD: Laptop gaming"
                    required 
                  />
                </div>
                <div className="catFormField">
                  <label>SLUG URL</label>
                  <input 
                    type="text" 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value})} 
                    placeholder="VD: laptop-gaming"
                  />
                </div>
              </div>

              <div className="catFormRow">
                <div className="catFormField">
                  <label>DANH MỤC CHA</label>
                  <div className="catSelectWrap">
                    <select 
                      value={formData.parent_id} 
                      onChange={e => setFormData({...formData, parent_id: e.target.value})}
                      className="catPremiumSelect"
                    >
                      <option value="">Không (cấp gốc)</option>
                      {categories.filter(c => c.id !== editingCategory?.id).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <div className="catSelectArrow">▾</div>
                  </div>
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
                    <label htmlFor="catStatusToggle" className="catToggleLabel">Hiển thị trên cửa hàng</label>
                  </div>
                </div>
              </div>

              <div className="catFormField">
                <label>MÔ TẢ</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Mô tả danh mục (không bắt buộc)…"
                />
              </div>

              <div className="catModalFooter">
                <button type="button" className="catCancelBtn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="catSubmitBtn">{editingCategory ? 'Cập nhật' : 'Tạo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function PlusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> }
function FolderIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> }
function EditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> }
function TrashIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> }
