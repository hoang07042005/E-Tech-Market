import React, { useState, useEffect } from 'react'
import { API_BASE_URL, apiFetch } from '@/configs/api.config'
import '@/styles/admin/CategoryPage.css'
import { fetchAdminVideoCategories } from '@/features/services/admin/video-categories.admin.service'
import { fetchAdminVideos, deleteAdminVideo, saveAdminVideo, type Video } from '@/features/services/admin/videos.admin.service'
import type { VideoCategory } from '@/features/services/admin/video-categories.admin.service'
import '@/styles/admin/VideoAdminPage.css'
import ConfirmModal from '@/components/ConfirmModal'

interface SimpleProduct {
  id: number
  name: string
}

const resolveThumbnailUrl = (url?: string | null) => {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function VideoAdminPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [products, setProducts] = useState<SimpleProduct[]>([])
  const [categories, setCategories] = useState<VideoCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // File inputs
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  // 🔒 Token is sent via httpOnly cookie automatically

  // Form State
  const [formData, setFormData] = useState({
    linked_type: 'product' as 'product' | 'general', // 'product' = liên kết SP, 'general' = video chung
    product_id: '',
    category_id: '',
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    is_active: true,
    sort_order: 0
  }) 

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [videoData, productData, categoryData] = await Promise.all([
        fetchAdminVideos(),
        apiFetch<any>('/api/admin/products?per_page=100'),
        fetchAdminVideoCategories()
      ])
      setVideos(videoData)
      const prodArr = Array.isArray(productData?.data) ? productData.data : (Array.isArray(productData) ? productData : [])
      setProducts(prodArr)
      setCategories(Array.isArray(categoryData) ? categoryData : [])
    } catch (err: any) {
      setError(err.message || 'Không tải được dữ liệu.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenModal = (video?: Video) => {
    setVideoFile(null)
    setThumbnailFile(null)
    setError(null)
    if (video) {
      setEditingVideo(video)
      setFormData({
        linked_type: video.product_id ? 'product' : 'general',
        product_id: video.product_id ? video.product_id.toString() : '',
        category_id: (video.video_category_id ?? video.category_id ?? video.category?.id ?? video.video_category?.id ?? video.videoCategory?.id ?? null)?.toString() || '',
        title: video.title || '',
        description: video.description || '',
        video_url: video.video_url || '',
        thumbnail_url: video.thumbnail_url || '',
        is_active: video.is_active,
        sort_order: video.sort_order || 0
      })
    } else {
      setEditingVideo(null)
      setFormData({
        linked_type: 'product',
        product_id: '',
        category_id: '',
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        is_active: true,
        sort_order: 0
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!editingVideo && !formData.video_url && !videoFile) {
      setError('Vui lòng nhập URL video hoặc tải lên tệp video.')
      return
    }

    try {
      const payload = new FormData()

      if (formData.linked_type === 'product') {
        // Liên kết sản phẩm => gửi product_id, video_category_id = rỗng
        if (formData.product_id) {
          payload.append('product_id', formData.product_id)
        } else {
          payload.append('product_id', '')
        }
        payload.append('video_category_id', '')
      } else {
        // Video chung => gửi video_category_id, product_id = rỗng
        payload.append('product_id', '')
        if (formData.category_id) {
          payload.append('video_category_id', formData.category_id)
        } else {
          payload.append('video_category_id', '')
        }
      }

      if (formData.title) payload.append('title', formData.title)
      if (formData.description) payload.append('description', formData.description)
      if (formData.video_url) payload.append('video_url', formData.video_url)
      if (formData.thumbnail_url) payload.append('thumbnail_url', formData.thumbnail_url)
      payload.append('is_active', formData.is_active ? '1' : '0')
      payload.append('sort_order', formData.sort_order.toString())

      if (videoFile) {
        payload.append('video_file', videoFile)
      }
      if (thumbnailFile) {
        payload.append('thumbnail_file', thumbnailFile)
      }

      await saveAdminVideo(payload, editingVideo?.id)
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.message || 'Lưu video thất bại.')
    }
  }

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteVideo, setPendingDeleteVideo] = useState<Video | null>(null)

  const handleDelete = (video: Video) => {
    setPendingDeleteVideo(video)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    const video = pendingDeleteVideo
    setConfirmOpen(false)
    setPendingDeleteVideo(null)
    if (!video) return
    try {
      await deleteAdminVideo(video.id)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Xóa video thất bại.')
    }
  }

  const isLinkedToProduct = formData.linked_type === 'product'

  return (
    <div className="catAdminRoot">
      <div className="catHeader">
        <div className="catHeaderLeft">
          <h2 className="catAdminTitle">Quản lý Videos sản phẩm</h2>
          <p className="catAdminSub">Cấu hình video giới thiệu sản phẩm hoặc video truyền thông theo danh mục</p>
        </div>
        <button className="catAddBtn" onClick={() => handleOpenModal()}>
          <PlusIcon />
          <span>Thêm video</span>
        </button>
      </div>

      {error && <div className="catErrorBanner">{error}</div>}

      <div className="catTableWrap">
        {isLoading ? (
          <table className="catTable">
            <thead>
              <tr>
                <th>HÌNH THU NHỎ</th>
                <th>TIÊU ĐỀ</th>
                <th>LIÊN KẾT</th>
                <th>VIDEO URL / SOURCE</th>
                <th>THỨ TỰ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
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
        ) : (
          <table className="catTable">
            <thead>
              <tr>
                <th>HÌNH THU NHỎ</th>
                <th>TIÊU ĐỀ</th>
                <th>LIÊN KẾT</th>
                <th>VIDEO URL / SOURCE</th>
                <th>THỨ TỰ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={8}  className="videoadminpage-style-1">
                    Chưa có video nào. Bấm «Thêm video» để tạo mới.
                  </td>
                </tr>
              ) : (
                videos.map(video => {
                  const thumb = resolveThumbnailUrl(video.thumbnail_url)
                  const linkedCategory = video.videoCategory ?? video.video_category ?? video.category
                  return (
                    <tr key={video.id}>
                      <td>
                        {thumb ? (
                          <img 
                            src={thumb} 
                            alt={video.title || 'Video thumbnail'} 
                            
                           className="videoadminpage-style-2" />
                        ) : (
                          <div  className="videoadminpage-style-3">
                            Không có ảnh
                          </div>
                        )}
                      </td>
                      <td><span  className="videoadminpage-style-4">{video.title || '—'}</span></td>
                      {/* <td>
                        <span  className="videoadminpage-style-5">
                          {video.description || '—'}
                        </span>
                      </td> */}
                      <td>
                        {video.product ? (
                          <span  className="videoadminpage-style-6">
                            📦 {video.product.name}
                          </span>
                        ) : linkedCategory ? (
                          <span  className="videoadminpage-style-7">
                            🏷️ {linkedCategory.name}
                          </span>
                        ) : (
                          <span  className="videoadminpage-style-8">Video chung</span>
                        )}
                      </td>
                      <td>
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="catSlug videoadminpage-style-9" >
                          {video.video_url}
                        </a>
                      </td>
                      <td>{video.sort_order}</td>
                      <td>
                        <span className={`catStatus ${video.is_active ? 'active' : 'inactive'}`}>
                          {video.is_active ? 'HIỂN THỊ' : 'TẮT'}
                        </span>
                      </td>
                      <td>
                        <div className="catActions">
                          <button className="catEdit" onClick={() => handleOpenModal(video)}><EditIcon /></button>
                          <button className="catDelete" onClick={() => handleDelete(video)}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="catModalOverlay">
          <div className="catModal videoadminpage-style-10" >
            <div className="catModalHeader">
              <h3>{editingVideo ? 'Cập nhật video' : 'Thêm video mới'}</h3>
              <button className="catCloseModal" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="catForm">

              {/* Loại video: liên kết sản phẩm hay video chung */}
              <div className="catFormField videoadminpage-style-11" >
                <label>LOẠI VIDEO</label>
                <div  className="videoadminpage-style-12">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500, color: isLinkedToProduct ? '#f97316' : '#64748b' }}>
                    <input
                      type="radio"
                      name="linked_type"
                      value="product"
                      checked={isLinkedToProduct}
                      onChange={() => setFormData({ ...formData, linked_type: 'product', category_id: '' })}
                      style={{ accentColor: '#f97316' }}
                    />
                    📦 Liên kết sản phẩm
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500, color: !isLinkedToProduct ? '#60a5fa' : '#64748b' }}>
                    <input
                      type="radio"
                      name="linked_type"
                      value="general"
                      checked={!isLinkedToProduct}
                      onChange={() => setFormData({ ...formData, linked_type: 'general', product_id: '' })}
                      style={{ accentColor: '#60a5fa' }}
                    />
                    🏷️ Video theo danh mục (không gắn SP)
                  </label>
                </div>
              </div>

              <div className="catFormRow">
                <div className="catFormField">
                  <label>TIÊU ĐỀ VIDEO</label>
                  <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="VD: Trên tay mở hộp iPhone 15 Pro Max"
                  />
                </div>

                {/* Chỉ hiện chọn SẢN PHẨM khi linked_type = product */}
                {isLinkedToProduct ? (
                  <div className="catFormField">
                    <label>SẢN PHẨM LIÊN KẾT</label>
                    <select
                      value={formData.product_id}
                      onChange={e => setFormData({...formData, product_id: e.target.value})}
                      style={{ padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', width: '100%', height: '42px' }}
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Chỉ hiện chọn DANH MỤC khi linked_type = general */
                  <div className="catFormField">
                    <label>DANH MỤC</label>
                    <select
                      value={formData.category_id}
                      onChange={e => setFormData({...formData, category_id: e.target.value})}
                      style={{ padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', width: '100%', height: '42px' }}
                    >
                      <option value="">-- Không chọn danh mục --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {/* <div  className="videoadminpage-style-13">
                      <a href="/admin/categories?type=video"  className="videoadminpage-style-14">Quản lý danh mục (thêm/ sửa loại 'video')</a>
                    </div> */}
                  </div>
                )}
              </div>

              <div className="catFormField videoadminpage-style-15" >
                <label>NỘI DUNG / MÔ TẢ NGẮN</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Mô tả ngắn về video, tính năng nổi bật hoặc thông điệp chính"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', resize: 'vertical' }}
                />
              </div>

              <div className="catFormField videoadminpage-style-16" >
                <label>URL VIDEO (YouTube, Vimeo hoặc liên kết ngoài)</label>
                <input 
                  type="text" 
                  value={formData.video_url} 
                  onChange={e => setFormData({...formData, video_url: e.target.value})} 
                  placeholder="VD: https://www.youtube.com/watch?v=..."
                  disabled={!!videoFile}
                />
              </div>

              <div className="catFormField videoadminpage-style-17" >
                <label>HOẶC TẢI LÊN VIDEO TỪ THIẾT BỊ (Hỗ trợ MP4, WebM)</label>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setVideoFile(e.target.files[0])
                    } else {
                      setVideoFile(null)
                    }
                  }}
                  style={{ padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', width: '100%' }}
                  disabled={!!formData.video_url}
                />
              </div>

              <div className="catFormField videoadminpage-style-18" >
                <label>URL HÌNH THU NHỎ (THUMBNAIL URL)</label>
                <input 
                  type="text" 
                  value={formData.thumbnail_url} 
                  onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} 
                  placeholder="VD: https://img.youtube.com/vi/.../maxresdefault.jpg"
                  disabled={!!thumbnailFile}
                />
              </div>

              <div className="catFormField videoadminpage-style-19" >
                <label>HOẶC TẢI LÊN HÌNH THU NHỎ (THUMBNAIL FILE)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      setThumbnailFile(e.target.files[0])
                    } else {
                      setThumbnailFile(null)
                    }
                  }}
                  style={{ padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '6px', background: 'var(--admin-card-bg)', color: 'var(--admin-text-p)', width: '100%' }}
                  disabled={!!formData.thumbnail_url}
                />
              </div>

              <div className="catFormRow">
                <div className="catFormField">
                  <label>THỨ TỰ HIỂN THỊ</label>
                  <input 
                    type="number" 
                    value={formData.sort_order} 
                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} 
                  />
                </div>
                <div className="catFormField">
                  <label>TRẠNG THÁI</label>
                  <div className="catToggleWrap">
                    <input 
                      type="checkbox" 
                      id="videoStatusToggle"
                      checked={formData.is_active} 
                      onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    />
                    <label htmlFor="videoStatusToggle" className="catToggleLabel">Kích hoạt hiển thị</label>
                  </div>
                </div>
              </div>

              {error && <div className="catErrorBanner videoadminpage-style-20" >{error}</div>}

              <div className="catModalFooter">
                <button type="button" className="catCancelBtn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="catSubmitBtn">{editingVideo ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xoá video"
        message={
          pendingDeleteVideo ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p>Bạn có chắc chắn muốn xóa video này không?</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {pendingDeleteVideo.thumbnail_url ? (
                  <img
                    src={resolveThumbnailUrl(pendingDeleteVideo.thumbnail_url) || undefined}
                    alt={pendingDeleteVideo.title || 'Video thumbnail'}
                    style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                ) : (
                  <div style={{ width: 84, height: 56, borderRadius: 8, background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#6b7280', fontSize: 12 }}>
                    Không có ảnh
                  </div>
                )}
                <div>
                  <strong>{pendingDeleteVideo.title || 'Video không tên'}</strong>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>{pendingDeleteVideo.video_url || 'Không có URL'}</div>
                </div>
              </div>
            </div>
          ) : (
            'Bạn có chắc chắn muốn xóa video này?'
          )
        }
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteVideo(null) }}
      />
    </div>
  )
}

function PlusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> }
function EditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> }
function TrashIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> }
