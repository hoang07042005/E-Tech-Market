import { useEffect, useState } from 'react'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import ConfirmModal from '@/components/ConfirmModal'
import '@/styles/admin/AdminBlogPage.css' // File CSS làm mới ở dưới

type BlogCategory = {
  id: number
  name: string
  slug: string
}

type BlogPost = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  content: string
  thumbnail_url: string | null
  is_published: boolean
  published_at: string | null
  category: BlogCategory | null
  author: { id: number; name: string } | null
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return ''
  const s = url.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* keep original */ }
    return s
  }
  return `${API_BASE_URL}${s.startsWith('/') ? s : `/${s}`}`
}

export default function AdminBlogPage() {
  const hasAuth = true
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Quản lý tab hiển thị: 'posts' hoặc 'categories'
  const [activeTab, setActiveTab] = useState<'posts' | 'categories'>('posts')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    blog_category_id: '',
    excerpt: '',
    content: '',
    thumbnail_url: '',
    is_published: false,
    meta_title: '',
    meta_description: ''
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeletePost, setPendingDeletePost] = useState<BlogPost | null>(null)
  
  const [categoryConfirmOpen, setCategoryConfirmOpen] = useState(false)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<BlogCategory | null>(null)

  const loadData = async () => {
    if (!hasAuth) return
    setLoading(true)
    try {
      const [postsRes, catsRes] = await Promise.all([
        apiFetch<{ data: BlogPost[] }>('/api/admin/blog-posts'),
        apiFetch<BlogCategory[]>('/api/blog/categories')
      ])
      setPosts(postsRes.data)
      setCategories(catsRes)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const reloadCategories = async () => {
    try {
      const catsRes = await apiFetch<BlogCategory[]>('/api/blog/categories')
      setCategories(catsRes)
    } catch (e: any) {
      alert('Lỗi tải danh mục: ' + e.message)
    }
  }

  const handleOpenForm = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post)
      setFormData({
        title: post.title,
        blog_category_id: post.category?.id?.toString() || '',
        excerpt: post.excerpt || '',
        content: post.content,
        thumbnail_url: post.thumbnail_url || '',
        is_published: post.is_published,
        meta_title: '',
        meta_description: ''
      })
    } else {
      setEditingPost(null)
      setFormData({
        title: '',
        blog_category_id: categories[0]?.id?.toString() || '',
        excerpt: '',
        content: '',
        thumbnail_url: '',
        is_published: false,
        meta_title: '',
        meta_description: ''
      })
    }
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasAuth) return
    setSubmitting(true)

    const payload = {
      ...formData,
      blog_category_id: formData.blog_category_id ? Number(formData.blog_category_id) : null,
      is_published: !!formData.is_published
    }

    try {
      if (editingPost) {
        await apiFetch(`/api/admin/blog-posts/${editingPost.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        await apiFetch('/api/admin/blog-posts', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }
      setIsFormOpen(false)
      loadData()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (post: BlogPost) => {
    if (!hasAuth) return
    setPendingDeletePost(post)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!hasAuth || !pendingDeletePost) return
    const id = pendingDeletePost.id
    setConfirmOpen(false)
    setPendingDeletePost(null)
    try {
      await apiFetch(`/api/admin/blog-posts/${id}`, { method: 'DELETE' })
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleAddCategory = async () => {
    const name = window.prompt('Nhập tên danh mục mới:')
    if (!name || !name.trim() || !hasAuth) return
    try {
      await apiFetch<BlogCategory>('/api/admin/blog-categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      })
      await reloadCategories()
    } catch (e: any) {
      alert('Lỗi tạo danh mục: ' + e.message)
    }
  }

  const handleEditCategory = (category: BlogCategory) => {
    const newName = window.prompt('Nhập tên danh mục mới:', category.name)
    if (!newName || !newName.trim() || !hasAuth) return
    
    const submitEdit = async () => {
      try {
        await apiFetch<BlogCategory>(`/api/admin/blog-categories/${category.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: newName.trim() })
        })
        await reloadCategories()
      } catch (e: any) {
        alert('Lỗi cập nhật danh mục: ' + e.message)
      }
    }
    submitEdit()
  }

  const handleDeleteCategory = (category: BlogCategory) => {
    setPendingDeleteCategory(category)
    setCategoryConfirmOpen(true)
  }

  const confirmDeleteCategory = async () => {
    if (!hasAuth || !pendingDeleteCategory) return
    const categoryId = pendingDeleteCategory.id
    setCategoryConfirmOpen(false)
    setPendingDeleteCategory(null)
    try {
      await apiFetch(`/api/admin/blog-categories/${categoryId}`, { method: 'DELETE' })
      if (formData.blog_category_id === categoryId.toString()) {
        setFormData({ ...formData, blog_category_id: '' })
      }
      await reloadCategories()
    } catch (e: any) {
      alert('Lỗi xóa danh mục: ' + e.message)
    }
  }

  if (loading) {
    return (
      <div className="ab-container">
        <div className="ab-skeleton-header">
          <div className="ab-skeleton-bar w-200"></div>
          <div className="ab-skeleton-bar w-150"></div>
        </div>
        <div className="ab-table-card">
          <div className="ab-skeleton-row"></div>
          <div className="ab-skeleton-row"></div>
          <div className="ab-skeleton-row"></div>
        </div>
      </div>
    )
  }

  if (error) return <div className="ab-error-state">Lỗi hệ thống: {error}</div>

  return (
    <div className="ab-container">
      {/* Top Header Panel */}
      <div className="ab-header-panel">
        <div>
          <h2 className="ab-title">Quản trị nội dung Blog</h2>
          <p className="ab-subtitle">Quản lý các bài viết tin tức và danh mục hiển thị trên hệ thống.</p>
        </div>
        <div className="ab-header-actions">
          <button onClick={handleAddCategory} className="ab-btn ab-btn-outline">
            + Danh mục mới
          </button>
          <button onClick={() => handleOpenForm()} className="ab-btn ab-btn-primary">
            + Thêm bài viết
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ab-tabs-container">
        <button
          onClick={() => setActiveTab('posts')}
          className={`ab-tab-item ${activeTab === 'posts' ? 'active' : ''}`}
        >
          Bài viết ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`ab-tab-item ${activeTab === 'categories' ? 'active' : ''}`}
        >
          Danh mục ({categories.length})
        </button>
      </div>

      {/* TAB 1: BÀI VIẾT */}
      {activeTab === 'posts' && (
        <div className="ab-table-card">
          <table className="ab-modern-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.thumbnail_url ? (
                      <img src={resolveImageUrl(p.thumbnail_url)} alt="" className="ab-table-thumb" />
                    ) : (
                      <div className="ab-table-thumb-empty">N/A</div>
                    )}
                  </td>
                  <td className="ab-cell-title" title={p.title}>{p.title}</td>
                  <td>
                    <span className="ab-badge-category">{p.category?.name || '—'}</span>
                  </td>
                  <td>
                    {p.is_published ? (
                      <span className="ab-badge-status published">Đã xuất bản</span>
                    ) : (
                      <span className="ab-badge-status draft">Bản nháp</span>
                    )}
                  </td>
                  <td className="text-muted">
                    {new Date(p.published_at || new Date()).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="text-right actions-cell">
                    <button onClick={() => handleOpenForm(p)} className="btn-link-edit"><PencilIcon /></button>
                    <button onClick={() => handleDelete(p)} className="btn-link-delete"><TrashIcon /></button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="ab-empty-text">Chưa có bài viết nào được tạo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: DANH MỤC */}
      {activeTab === 'categories' && (
        <div className="ab-table-card max-w-3xl">
          <table className="ab-modern-table">
            <thead>
              <tr>
                <th>Tên danh mục</th>
                <th>Slug</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td className="text-muted">{c.slug || '—'}</td>
                  <td className="text-right actions-cell">
                    <button onClick={() => handleEditCategory(c)} className="btn-link-edit"><PencilIcon /></button>
                    <button onClick={() => handleDeleteCategory(c)} className="btn-link-delete"><TrashIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORM (BỐ CỤC 2 CỘT HIỆN ĐẠI) */}
      {isFormOpen && (
        <div className="ab-modal-overlay">
          <div className="ab-modal-box">
            <div className="ab-modal-header">
              <h3>{editingPost ? 'Cập nhật bài viết' : 'Tạo bài viết mới'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="ab-modal-close">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="ab-modal-form-body">
              {/* Cột trái: Nội dung chính (2 phần diện tích) */}
              <div className="ab-form-main-col">
                <div className="ab-form-group">
                  <label>Tiêu đề bài viết *</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                    placeholder="Nhập tiêu đề hấp dẫn..."
                    required 
                  />
                </div>

                <div className="ab-form-group">
                  <label>Mô tả ngắn (Excerpt)</label>
                  <textarea 
                    value={formData.excerpt} 
                    onChange={e => setFormData({ ...formData, excerpt: e.target.value })} 
                    className="h-80"
                    placeholder="Tóm tắt ngắn gọn nội dung bài viết..."
                  />
                </div>

                <div className="ab-form-group">
                  <label>Nội dung (HTML) *</label>
                  <textarea 
                    value={formData.content} 
                    onChange={e => setFormData({ ...formData, content: e.target.value })} 
                    className="h-240 font-mono"
                    placeholder="Hỗ trợ mã code HTML nội dung bài viết..."
                    required 
                  />
                </div>
              </div>

              {/* Cột phải: Metadata cấu hình (1 phần diện tích) */}
              <div className="ab-form-sidebar-col">
                <div className="ab-form-group">
                  <label>Danh mục bài viết</label>
                  <select
                    value={formData.blog_category_id}
                    onChange={e => setFormData({ ...formData, blog_category_id: e.target.value })}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="ab-form-group">
                  <label>Ảnh đại diện (Thumbnail)</label>
                  <label className="ab-upload-zone">
                    <span>Click để chọn hoặc tải file ảnh</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !hasAuth) return
                        const fd = new FormData()
                        fd.append('file', file)
                        try {
                          const res = await apiFetch<{ url: string }>('/api/admin/uploads/blog-thumbnail', {
                            method: 'POST',
                            body: fd
                          })
                          setFormData({ ...formData, thumbnail_url: res.url })
                        } catch (err: any) {
                          alert('Lỗi tải ảnh: ' + err.message)
                        }
                      }}
                    />
                  </label>
                  {formData.thumbnail_url && (
                    <div className="ab-thumb-preview-wrap">
                      <img src={resolveImageUrl(formData.thumbnail_url)} alt="Preview" />
                      <button 
                        type="button" 
                        onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                        className="ab-btn-remove-thumb"
                      >✕</button>
                    </div>
                  )}
                </div>

                <div className="ab-toggle-status-wrap">
                  <label className="ab-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={formData.is_published} 
                      onChange={e => setFormData({ ...formData, is_published: e.target.checked })} 
                    />
                    <div>
                      <strong>Xuất bản công khai</strong>
                      <p>Người dùng có thể đọc bài viết này ngay lập tức.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nút bấm ở chân Form */}
              <div className="ab-form-footer">
                <button type="button" onClick={() => setIsFormOpen(false)} className="ab-btn ab-btn-outline" disabled={submitting}>
                  Hủy bỏ
                </button>
                <button type="submit" className="ab-btn ab-btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu bài viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Các Modal xác nhận giữ nguyên logic */}
      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận xóa bài viết"
        message={
          pendingDeletePost && (
            <div className="ab-confirm-msg">
              <p>Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa bài viết sau?</p>
              <div className="ab-confirm-item-info">
                {pendingDeletePost.thumbnail_url && (
                  <img src={resolveImageUrl(pendingDeletePost.thumbnail_url)} alt="" />
                )}
                <div>
                  <h4>{pendingDeletePost.title}</h4>
                  <span>Danh mục: {pendingDeletePost.category?.name || 'Không'}</span>
                </div>
              </div>
            </div>
          )
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingDeletePost(null)
        }}
      />

      <ConfirmModal
        open={categoryConfirmOpen}
        title="Xác nhận xóa danh mục"
        message={
          pendingDeleteCategory && (
            <div className="ab-confirm-msg">
              <p>Bạn có chắc chắn muốn xóa danh mục <strong>"{pendingDeleteCategory.name}"</strong> không?</p>
              <p className="ab-warning-banner">⚠️ Lưu ý: Các bài viết thuộc danh mục này có thể bị ảnh hưởng.</p>
            </div>
          )
        }
        onConfirm={confirmDeleteCategory}
        onCancel={() => {
          setCategoryConfirmOpen(false)
          setPendingDeleteCategory(null)
        }}
      />
    </div>
  )
}


function PencilIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>)}
function TrashIcon() {return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>)}