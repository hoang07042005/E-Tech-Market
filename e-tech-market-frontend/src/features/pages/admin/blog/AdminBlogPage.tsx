import { useEffect, useState } from 'react'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import ConfirmModal from '@/components/ConfirmModal'
import '@/styles/admin/AdminPage.css' // Reuse styles
import '@/styles/admin/AdminBlogPage.css'
import { useAuthStore } from '@/features/store/useAuthStore'

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
  // 🔒 Token is sent via httpOnly cookie automatically
  const userStr = useAuthStore((state) => state.userStr)
  const hasAuth = !!userStr
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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeletePost, setPendingDeletePost] = useState<BlogPost | null>(null)

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

  if (loading) {
    return (
      <div  className="adminblogpage-style-1">
        <div  className="adminblogpage-style-2">
          <div className="admSkeletonBar adminblogpage-style-3"  />
          <div className="admSkeletonBar adminblogpage-style-4"  />
        </div>
        <div className="adminTableWrap">
          <table className="adminTable">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '70%' : '90%' }} />
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
  if (error) return <div  className="adminblogpage-style-5">Lỗi: {error}</div>

  return (
    <div  className="adminblogpage-style-6">
      <div  className="adminblogpage-style-7">
        <h2  className="adminblogpage-style-8">Quản lý Tin tức (Blog)</h2>
        <button className="adminBtnPrimary" onClick={() => handleOpenForm()}>
          + Thêm Bài Viết
        </button>
      </div>

      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              {/* <th>ID</th> */}
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
                {/* <td>{p.id}</td> */}
                <td>
                  {p.thumbnail_url ? (
                    <img src={resolveImageUrl(p.thumbnail_url)} alt=""   className="adminblogpage-style-9" />
                  ) : '—'}
                </td>
                <td  className="adminblogpage-style-10">
                  {p.title}
                </td>
                <td>{p.category?.name || '—'}</td>
                <td>
                  {p.is_published ? (
                    <span  className="adminblogpage-style-11">Đã xuất bản</span>
                  ) : (
                    <span  className="adminblogpage-style-12">Bản nháp</span>
                  )}
                </td>
                <td>{new Date(p.published_at || new Date()).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="adminBtnSecondary adminblogpage-style-13"  onClick={() => handleOpenForm(p)}>Sửa</button>
                  <button className="adminBtnDanger" onClick={() => handleDelete(p)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Xác nhận xóa bài viết"
        message={
          pendingDeletePost ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p>Bạn có chắc chắn muốn xóa bài viết này không?</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {pendingDeletePost.thumbnail_url ? (
                  <img
                    src={resolveImageUrl(pendingDeletePost.thumbnail_url)}
                    alt={pendingDeletePost.title}
                    style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                ) : (
                  <div style={{ width: 84, height: 56, borderRadius: 8, background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#6b7280', fontSize: 12 }}>
                    Không có ảnh
                  </div>
                )}
                <div>
                  <strong>{pendingDeletePost.title}</strong>
                  <div style={{ color: '#6b7280' }}>
                    {pendingDeletePost.slug}
                  </div>
                  <div style={{ marginTop: 4, color: '#64748b' }}>
                    {pendingDeletePost.category?.name || 'Không có danh mục'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            'Bạn có chắc chắn muốn xóa bài viết này?'
          )
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingDeletePost(null)
        }}
      />

      {isFormOpen && (
        <div  className="adminblogpage-style-14">
          <div  className="adminblogpage-style-15">
            <h2>{editingPost ? 'Sửa bài viết' : 'Thêm bài viết mới'}</h2>
            <form onSubmit={handleSubmit}  className="adminblogpage-style-16">
              <div>
                <label  className="adminblogpage-style-17">Tiêu đề *</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} 
                  required 
                />
              </div>

              <div  className="adminblogpage-style-18">
                <div  className="adminblogpage-style-19">
                  <div  className="adminblogpage-style-20">
                    <label  className="adminblogpage-style-21">Danh mục</label>
                    <button 
                      type="button" 
                      onClick={async () => {
                        const name = window.prompt('Nhập tên danh mục mới:')
                        if (!name || !name.trim() || !hasAuth) return
                        try {
                          const res = await apiFetch<BlogCategory>('/api/admin/blog-categories', {
                            method: 'POST',
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
                <div  className="adminblogpage-style-22">
                  <label  className="adminblogpage-style-23">Ảnh Thumbnail</label>
                  <div  className="adminblogpage-style-24">
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
                      style={{ width: '100%', padding: '6px', borderRadius: '8px', border: '1px solid #ccc' }} 
                    />
                  </div>
                  {formData.thumbnail_url && (
                    <div  className="adminblogpage-style-25">
                      <img src={resolveImageUrl(formData.thumbnail_url)} alt="Thumbnail"   className="adminblogpage-style-26" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label  className="adminblogpage-style-27">Mô tả ngắn (Excerpt)</label>
                <textarea 
                  value={formData.excerpt} 
                  onChange={e => setFormData({ ...formData, excerpt: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '60px' }} 
                />
              </div>

              <div>
                <label  className="adminblogpage-style-28">Nội dung (HTML) *</label>
                <textarea 
                  value={formData.content} 
                  onChange={e => setFormData({ ...formData, content: e.target.value })} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minHeight: '200px', fontFamily: 'monospace' }} 
                  required 
                />
              </div>

              <div  className="adminblogpage-style-29">
                <label  className="adminblogpage-style-30">
                  <input 
                    type="checkbox" 
                    checked={formData.is_published} 
                    onChange={e => setFormData({ ...formData, is_published: e.target.checked })} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  Xuất bản bài viết
                </label>
              </div>

              <div  className="adminblogpage-style-31">
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
