import { useEffect, useState } from 'react'
import { apiFetch, API_BASE_URL } from '../../lib/api'
import '../css_admin/AdminPage.css' // Reuse styles

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
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function AdminBlogPage() {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [postsRes, catsRes] = await Promise.all([
        apiFetch<{ data: BlogPost[] }>('/api/admin/blog-posts', { token }),
        apiFetch<BlogCategory[]>('/api/blog/categories', { token })
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
        meta_title: '', // Not returned by default, would need to fetch full post if needed
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
    if (!token) return
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
          token,
          body: JSON.stringify(payload)
        })
      } else {
        await apiFetch('/api/admin/blog-posts', {
          method: 'POST',
          token,
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

  const handleDelete = async (id: number) => {
    if (!token) return
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return
    try {
      await apiFetch(`/api/admin/blog-posts/${id}`, { method: 'DELETE', token })
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) return <div style={{ padding: '20px' }}>Đang tải...</div>
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Lỗi: {error}</div>

  return (
    <div style={{ padding: '24px', background: 'var(--et-surface)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Quản lý Tin tức (Blog)</h2>
        <button className="adminBtnPrimary" onClick={() => handleOpenForm()}>
          + Thêm Bài Viết
        </button>
      </div>

      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hình ảnh</th>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  {p.thumbnail_url ? (
                    <img src={resolveImageUrl(p.thumbnail_url)} alt="" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : '—'}
                </td>
                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.title}
                </td>
                <td>{p.category?.name || '—'}</td>
                <td>
                  {p.is_published ? (
                    <span style={{ color: 'green', fontWeight: 'bold' }}>Đã xuất bản</span>
                  ) : (
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Bản nháp</span>
                  )}
                </td>
                <td>{new Date(p.published_at || new Date()).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="adminBtnSecondary" style={{ marginRight: '8px' }} onClick={() => handleOpenForm(p)}>Sửa</button>
                  <button className="adminBtnDanger" onClick={() => handleDelete(p.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', width: '800px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px' }}>
            <h2>{editingPost ? 'Sửa bài viết' : 'Thêm bài viết mới'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Tiêu đề *</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 'bold', display: 'block' }}>Danh mục</label>
                    <button 
                      type="button" 
                      onClick={async () => {
                        const name = window.prompt('Nhập tên danh mục mới:')
                        if (!name || !name.trim() || !token) return
                        try {
                          const res = await apiFetch<BlogCategory>('/api/admin/blog-categories', {
                            method: 'POST',
                            token,
                            body: JSON.stringify({ name: name.trim() })
                          })
                          setCategories(prev => [...prev, res])
                          setFormData({ ...formData, blog_category_id: res.id.toString() })
                        } catch (e: any) {
                          alert('Lỗi tạo danh mục: ' + e.message)
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--et-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0 }}
                    >
                      + Thêm mới
                    </button>
                  </div>
                  <select 
                    value={formData.blog_category_id} 
                    onChange={e => setFormData({ ...formData, blog_category_id: e.target.value })} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Ảnh Thumbnail</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !token) return
                        const fd = new FormData()
                        fd.append('file', file)
                        try {
                          const res = await apiFetch<{ url: string }>('/api/admin/uploads/blog-thumbnail', {
                            method: 'POST',
                            token,
                            body: fd
                          })
                          setFormData({ ...formData, thumbnail_url: res.url })
                        } catch (err: any) {
                          alert('Lỗi tải ảnh: ' + err.message)
                        }
                      }}
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', border: '1px solid #ccc' }} 
                    />
                  </div>
                  {formData.thumbnail_url && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={resolveImageUrl(formData.thumbnail_url)} alt="Thumbnail" style={{ height: '80px', borderRadius: '4px', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Mô tả ngắn (Excerpt)</label>
                <textarea 
                  value={formData.excerpt} 
                  onChange={e => setFormData({ ...formData, excerpt: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '60px' }} 
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Nội dung (HTML) *</label>
                <textarea 
                  value={formData.content} 
                  onChange={e => setFormData({ ...formData, content: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '200px', fontFamily: 'monospace' }} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_published} 
                    onChange={e => setFormData({ ...formData, is_published: e.target.checked })} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  Xuất bản bài viết
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="adminBtnSecondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>Hủy</button>
                <button type="submit" className="adminBtnPrimary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu bài viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
