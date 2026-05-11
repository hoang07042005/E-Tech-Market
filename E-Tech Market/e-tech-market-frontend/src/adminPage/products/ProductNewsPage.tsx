import { useEffect, useMemo, useState } from 'react'
import { apiFetch, API_BASE_URL } from '../../lib/api'
import '../css_admin/ProductNewsPage.css'

type ProductLite = {
  id: number
  name: string
  brand: string | null
  main_image_url: string | null
  category?: { id: number; name: string }
}

type NewsItem = {
  id: number
  product_id: number
  title: string
  slug: string
  content_html: string
  thumbnail_url: string | null
  sort_order: number
  is_active: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function ProductNewsPage() {
  const token = localStorage.getItem('token')

  const [products, setProducts] = useState<ProductLite[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingNews, setLoadingNews] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId],
  )

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    thumbnail_url: '',
    content_html: '',
    sort_order: 0,
    is_active: true,
  })

  const fetchProducts = async () => {
    setLoadingProducts(true)
    setError(null)
    try {
      const data = await apiFetch<ProductLite[]>('/api/admin/products', { token })
      setProducts(data)
      if (!selectedProductId && data.length > 0) setSelectedProductId(data[0].id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách sản phẩm.')
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchNews = async (productId: number) => {
    setLoadingNews(true)
    setError(null)
    try {
      const data = await apiFetch<NewsItem[]>(`/api/admin/products/${productId}/news`, { token })
      setNews(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được tin tức.')
      setNews([])
    } finally {
      setLoadingNews(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchProducts()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      queueMicrotask(() => {
        fetchNews(selectedProductId)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  const openCreate = () => {
    setEditing(null)
    setForm({
      title: '',
      thumbnail_url: '',
      content_html: '',
      sort_order: 0,
      is_active: true,
    })
    setIsEditorOpen(true)
  }

  const openEdit = (item: NewsItem) => {
    setEditing(item)
    setForm({
      title: item.title,
      thumbnail_url: item.thumbnail_url || '',
      content_html: item.content_html || '',
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
    })
    setIsEditorOpen(true)
  }

  const save = async () => {
    if (!selectedProductId) return
    if (thumbnailUploading) {
      alert('Ảnh thumbnail đang upload, vui lòng đợi xong rồi bấm Lưu.')
      return
    }
    if (!form.title.trim() || !form.content_html.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung HTML.')
      return
    }

    const payload = {
      title: form.title.trim(),
      thumbnail_url: form.thumbnail_url.trim() || null,
      content_html: form.content_html,
      sort_order: form.sort_order || 0,
      is_active: form.is_active,
    }

    try {
      if (editing) {
        await apiFetch(`/api/admin/products/${selectedProductId}/news/${editing.id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(`/api/admin/products/${selectedProductId}/news`, {
          method: 'POST',
          token,
          body: JSON.stringify({
            ...payload,
            published_at: new Date().toISOString(),
          }),
        })
      }
      setIsEditorOpen(false)
      setEditing(null)
      fetchNews(selectedProductId)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Lưu tin tức thất bại.')
    }
  }

  const uploadThumbnail = async (file: File) => {
    if (!token) throw new Error('Bạn chưa đăng nhập.')
    setThumbnailUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE_URL}/api/admin/uploads/product-news-thumbnail`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: fd,
      })
      const data = (await res.json()) as { url?: string; message?: string }
      if (!res.ok) throw new Error(data.message || 'Upload thất bại')
      if (!data.url) throw new Error('Không nhận được URL ảnh.')
      setForm(prev => ({ ...prev, thumbnail_url: data.url || '' }))
    } finally {
      setThumbnailUploading(false)
    }
  }

  const remove = async (item: NewsItem) => {
    if (!selectedProductId) return
    if (!confirm('Xóa tin tức này?')) return
    try {
      await apiFetch(`/api/admin/products/${selectedProductId}/news/${item.id}`, {
        method: 'DELETE',
        token,
      })
      fetchNews(selectedProductId)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại.')
    }
  }

  return (
    <div className="pnRoot">
      {error && <div className="pnError">{error}</div>}

      <div className="pnGrid">
        <div className="pnLeft">
          <div className="pnLeftHead">
            <div className="pnLeftTitle">Sản phẩm</div>
            {loadingProducts && <div className="pnTiny">Đang tải...</div>}
          </div>
          <div className="pnProductList">
            {products.map(p => {
              const active = p.id === selectedProductId
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`pnProdItem ${active ? 'active' : ''}`}
                  onClick={() => setSelectedProductId(p.id)}
                >
                  <div className="pnProdThumb">
                    {p.main_image_url ? <img src={resolveImageUrl(p.main_image_url)} alt="" /> : <div className="pnProdThumbPh" />}
                  </div>
                  <div className="pnProdInfo">
                    <div className="pnProdName">{p.name}</div>
                    <div className="pnProdMeta">{p.brand || '—'} • {p.category?.name || '—'}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pnRight">
          <div className="pnRightHead">
            <div>
              <div className="pnRightTitleMain">Tin tức sản phẩm</div>
              <div className="pnRightSub pnRightSubAccent">
                {selectedProduct ? selectedProduct.name : 'Chọn sản phẩm để quản lý tin.'}
              </div>
            </div>

            <button type="button" className="pnAddBtn" onClick={openCreate} disabled={!selectedProductId}>
              <span className="pnAddIcon" aria-hidden="true">+</span>
              <span className="pnAddLabel">Thêm tin</span>
            </button>
          </div>

          <div className="pnNewsWrap">
            {loadingNews ? (
              <div className="pnEmpty">Đang tải tin tức...</div>
            ) : news.length === 0 ? (
              <div className="pnEmpty">Chưa có tin tức cho sản phẩm này.</div>
            ) : (
              <div className="pnNewsList">
                {news.map(n => (
                  <div key={n.id} className="pnNewsCard">
                    <div className="pnNewsTop">
                      <div className="pnNewsTitle">{n.title}</div>
                      <div className="pnNewsActions">
                        <button type="button" className="pnBtn" onClick={() => openEdit(n)}>Sửa</button>
                        <button type="button" className="pnBtn danger" onClick={() => remove(n)}>Xóa</button>
                      </div>
                    </div>
                    <div className="pnNewsMeta">
                      <span className={`pnPill ${n.is_active ? 'on' : 'off'}`}>{n.is_active ? 'BẬT' : 'TẮT'}</span>
                      {n.published_at && (
                        <span className="pnMetaText">Đăng: {new Date(n.published_at).toLocaleString('vi-VN')}</span>
                      )}
                      <span className="pnMetaText">Thứ tự: {n.sort_order}</span>
                    </div>
                    <div className="pnHtmlHint">Nội dung HTML đã lưu (xem trước đơn giản):</div>
                    <div className="pnHtmlPreview" dangerouslySetInnerHTML={{ __html: n.content_html }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditorOpen && (
        <div className="pnModalOverlay" onClick={() => setIsEditorOpen(false)}>
          <div className="pnModal" onClick={e => e.stopPropagation()}>
            <div className="pnModalHead">
              <div className="pnModalTitle">{editing ? 'Sửa tin' : 'Thêm tin mới'}</div>
              <button type="button" className="pnModalClose" onClick={() => setIsEditorOpen(false)}>×</button>
            </div>

            <div className="pnModalBody">
              <div className="pnField">
                <label>Tiêu đề</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="pnField">
                <label>Ảnh thumbnail (tải lên)</label>
                <div className="pnUploadRow">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const f = e.target.files?.[0] || null
                      if (f) {
                        try {
                          await uploadThumbnail(f)
                        } catch (err: unknown) {
                          alert(err instanceof Error ? err.message : 'Upload thất bại')
                        }
                      }
                    }}
                  />
                  {thumbnailUploading && <span className="pnTiny">Đang upload...</span>}
                </div>
                {form.thumbnail_url && (
                  <div className="pnThumbPreview">
                    <img src={resolveImageUrl(form.thumbnail_url)} alt="" />
                    <button type="button" className="pnBtn danger" onClick={() => setForm({ ...form, thumbnail_url: '' })}>
                      Xóa ảnh
                    </button>
                  </div>
                )}
              </div>
              <div className="pnRow">
                <div className="pnField">
                  <label>Thứ tự sắp xếp</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value || '0', 10) })} />
                </div>
              </div>
              <div className="pnCheck">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <span>Đang bật</span>
              </div>
              <div className="pnField">
                <label>Nội dung HTML (dán từ website)</label>
                <textarea rows={10} value={form.content_html} onChange={e => setForm({ ...form, content_html: e.target.value })} />
                <div className="pnTiny">Hệ thống sẽ tự lọc thẻ nguy hiểm (script, onclick...).</div>
              </div>
            </div>

            <div className="pnModalFoot">
              <button type="button" className="pnBtn" onClick={() => setIsEditorOpen(false)}>Hủy</button>
              <button type="button" className="pnAddBtn" onClick={save} disabled={thumbnailUploading}>
                {thumbnailUploading ? 'Đang upload ảnh...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

