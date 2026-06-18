import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { apiFetch } from '@/configs/api.config'
import { API_BASE_URL } from '@/configs/api.config'
import '@/styles/pages/VideoPage.css'

interface Category {
  id: number
  name: string
  slug: string
}

interface Product {
  id: number
  name: string
  slug: string
  main_image_url: string | null
  price: string | number
  short_description?: string | null
}

interface Video {
  id: number
  product_id?: number | null
  category_id?: number | null
  video_category_id?: number | null
  title?: string | null
  description?: string | null
  video_url: string
  thumbnail_url?: string | null
  sort_order?: number
  is_active: boolean
  product?: Product | null
  category?: Category | null
  video_category?: Category | null
}

type NormalizedVideo = Video & {
  _catId: number | null
  _catObj: Category | null
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/400x250'
  const s = url.trim()
  if (!s) return 'https://via.placeholder.com/400x250'
  // Already absolute URL - check if hostname is accessible
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      // If hostname is 'nginx' (Docker network hostname), replace with current origin
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* keep original */
    }
    return s
  }
  return `${API_BASE_URL}${s.startsWith('/') ? s : `/${s}`}`
}

export default function VideoPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<NormalizedVideo[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filter: 'all' | 'product' | 'general' | `cat-{id}`
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    let mounted = true
    setLoading(true)

    apiFetch<Video[]>('/api/videos')
      .then((videoRes) => {
        if (mounted) {
          const videosNorm = (Array.isArray(videoRes) ? videoRes : []).map(v => ({
            ...v,
            _catId: v.video_category_id ?? v.category_id ?? null,
            _catObj: v.video_category ?? v.category ?? null
          }))

          setVideos(videosNorm)

          const uniqueCategories = Array.from(
            new Map(
              videosNorm
                .filter(v => v._catObj)
                .map(v => [v._catObj!.id, v._catObj!])
            ).values()
          )

          setCategories(uniqueCategories)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Lỗi tải video')
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const filteredVideos = useMemo(() => {
    if (filter === 'product') return videos.filter(v => !!v.product_id)
    if (filter === 'general') return videos.filter(v => !v.product_id && !v._catId)
    if (filter.startsWith('cat-')) {
      const catId = parseInt(filter.replace('cat-', ''))
      return videos.filter(v => v._catId === catId)
    }
    return videos
  }, [videos, filter])

  return (
    <>
      <Helmet>
        <title>Video giới thiệu công nghệ | E-Tech Market</title>
        <meta name="description" content="Xem video giới thiệu và review sản phẩm công nghệ tại E-Tech Market." />
      </Helmet>

      <div className="clientVideoPage">
        <div className="cvContainer">
          <nav className="cvBreadcrumb">
            <Link to="/">Trang chủ</Link> / <span>Video</span>
          </nav>

          <header className="cvHeader">
            <h1 className="cvTitle">Video giới thiệu công nghệ</h1>
            <p className="cvSubtitle">Khám phá các sản phẩm công nghệ qua những thước phim thực tế và review chi tiết.</p>
          </header>

          <div className="cvFilterRow">
            <div className="cvFilterChips">
              {/* Tab cố định */}
              <button
                type="button"
                className={`cvChip ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`cvChip ${filter === 'product' ? 'active' : ''}`}
                onClick={() => setFilter('product')}
              >
                Có sản phẩm
              </button>

              {/* Danh mục động - chỉ hiện danh mục có video */}
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cvChip ${filter === `cat-${cat.id}` ? 'active' : ''}`}
                  onClick={() => setFilter(`cat-${cat.id}`)}
                >
                  {cat.name}
                </button>
              ))}

              {/* "Video chung" = không có sản phẩm & không có danh mục */}
              {videos.some(v => !v.product_id && !v._catId) && (
                <button
                  type="button"
                  className={`cvChip ${filter === 'general' ? 'active' : ''}`}
                  onClick={() => setFilter('general')}
                >
                  Video chung
                </button>
              )}
            </div>
            <div className="cvCount">Hiển thị {filteredVideos.length} video</div>
          </div>

          {loading ? (
            <div className="cvLoading">
              <div className="cvSpinner"></div>
              <span>Đang tải danh sách video...</span>
            </div>
          ) : error ? (
            <div className="cvError">
              <p>{error}</p>
              <button type="button" onClick={() => window.location.reload()}>Tải lại</button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="cvEmpty">Không tìm thấy video nào.</div>
          ) : (
            <div className="cvGrid">
              {filteredVideos.map((video) => (
                <div key={video.id} className="cvCard" onClick={() => navigate(`/videos/${video.id}`)}>
                  <div className="cvThumbnailWrap">
                    <img
                      src={resolveImageUrl(video.thumbnail_url || (video.product?.main_image_url ?? null))}
                      alt={video.title || 'Product Video'}
                      className="cvThumbnail"
                    />
                    <div className="cvPlayOverlay">
                      <div className="cvPlayBtn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                          <polygon points="6 4 20 12 6 20 6 4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="cvCardBody">
                    <div>
                      <h3 className="cvCardTitle">{video.title || 'Video giới thiệu'}</h3>
                      {video.description ? (
                        <p className="cvCardDesc">{video.description}</p>
                      ) : video.product?.short_description ? (
                        <p className="cvCardDesc">{video.product.short_description}</p>
                      ) : null}
                    </div>
                    {video.product ? (
                      <div className="cvProductLinkBadge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {video.product.name}
                      </div>
                    ) : video._catObj ? (
                      <div className="cvCategoryBadge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        {video._catObj.name}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
