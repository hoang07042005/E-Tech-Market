import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { apiFetch } from '@/configs/api.config'
import { API_BASE_URL } from '@/configs/api.config'
import '@/styles/pages/VideoPage.css'

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
  title?: string | null
  description?: string | null
  video_url: string
  thumbnail_url?: string | null
  sort_order?: number
  is_active: boolean
  product?: Product | null
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/400x250'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function renderVideoPlayer(videoUrl: string, title?: string | null) {
  if (!videoUrl) return null

  let embedUrl = ''
  const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)
  if (ytMatch) {
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
  } else {
    const vimeoMatch = videoUrl.match(/(?:vimeo\.com\/)(?:video\/)?(\d+)/)
    if (vimeoMatch) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    }
  }

  if (embedUrl) {
    return (
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title={title || 'Product Video'}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
      />
    )
  }

  const videoSrc = videoUrl.startsWith('http') ? videoUrl : `${API_BASE_URL}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`
  return (
    <video
      src={videoSrc}
      controls
      autoPlay
      preload="metadata"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [video, setVideo] = useState<Video | null>(null)
  const [recommendations, setRecommendations] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!id) return

    setLoading(true)
    setError(null)

    // Fetch video detail and recommendations
    Promise.all([
      apiFetch<Video>(`/api/videos/${id}`),
      apiFetch<Video[]>('/api/videos')
    ])
      .then(([detailRes, listRes]) => {
        if (mounted) {
          setVideo(detailRes)
          if (Array.isArray(listRes)) {
            // Exclude current video from recommendations
            const filtered = listRes.filter((v) => v.id !== Number(id)).slice(0, 5)
            setRecommendations(filtered)
          }
          setLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Lỗi tải chi tiết video')
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="clientVideoPage">
        <div className="cvContainer">
          <div className="cvLoading">
            <div className="cvSpinner"></div>
            <span>Đang tải thông tin video...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="clientVideoPage">
        <div className="cvContainer">
          <div className="cvError">
            <p>{error || 'Không tìm thấy video yêu cầu'}</p>
            <button type="button" onClick={() => navigate('/videos')}>Quay lại danh sách</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{video.title ? `${video.title} | E-Tech Market` : 'Xem video giới thiệu công nghệ | E-Tech Market'}</title>
        <meta name="description" content={`Xem video review và giới thiệu sản phẩm: ${video.title || ''}`} />
      </Helmet>

      <div className="clientVideoPage">
        <div className="cvContainer">
          <nav className="cvBreadcrumb">
            <Link to="/">Trang chủ</Link> / <Link to="/videos">Videos</Link> / <span>{video.title}  </span>
          </nav>

          <div className="vdpLayout">
            {/* Left Main Section: Video Player */}
            <div className="vdpMain">
              <div className="vdpPlayerContainer">
                <div className="vdpPlayerWrap">
                  {renderVideoPlayer(video.video_url, video.title)}
                </div>
              </div>
              <h1 className="vdpTitle">{video.title || 'Video giới thiệu sản phẩm'}</h1>
              <div className="vdpMeta">
                <span className="vdpStatusBadge">Phát sóng trực tuyến</span>
              </div>
              <div className="vdpDivider"></div>
              
              {/* Product description / Video info */}
              <div className="vdpDescription">
                <h3>Về video này</h3>
                <p>
                  {video.description || video.product?.short_description || 'Đây là video giới thiệu trực quan, giúp bạn có cái nhìn khách quan và rõ nét nhất về thiết kế, tính năng và hiệu năng thực tế của sản phẩm. Video được tổng hợp và phân phối bởi E-Tech Market.'}
                </p>
              </div>
            </div>

            {/* Right Sidebar Section: Product Card & Recommended Videos */}
            <aside className="vdpSidebar">
              {/* Linked Product Card */}
              {video.product ? (
                <div className="vdpProductCard">
                  <h3 className="vdpSidebarTitle">Sản phẩm trong video</h3>
                  <div className="vdpProductInner">
                    <img
                      src={resolveImageUrl(video.product.main_image_url)}
                      alt={video.product.name}
                      className="vdpProductImg"
                    />
                    <div className="vdpProductInfo">
                      <h4 className="vdpProductName">{video.product.name}</h4>
                      <div className="vdpProductPrice">
                        {video.product.price ? parseFloat(video.product.price.toString()).toLocaleString('vi-VN') + ' đ' : 'Liên hệ'}
                      </div>
                    </div>
                  </div>
                  {video.product.short_description && (
                    <p className="vdpProductDesc">{video.product.short_description}</p>
                  )}
                  <button
                    type="button"
                    className="vdpProductBtn"
                    onClick={() => navigate(`/products/${video.product!.slug}`)}
                  >
                    Xem chi tiết sản phẩm
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="vdpProductCard vdpNoProduct">
                  <h3 className="vdpSidebarTitle">Sản phẩm</h3>
                  <p>Video tổng quan giới thiệu các giải pháp công nghệ tại E-Tech Market.</p>
                </div>
              )}

              {/* Recommended Videos */}
              {recommendations.length > 0 && (
                <div className="vdpRecsSection">
                  <h3 className="vdpSidebarTitle">Video đề xuất</h3>
                  <div className="vdpRecsList">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="vdpRecItem"
                        onClick={() => navigate(`/videos/${rec.id}`)}
                      >
                        <div className="vdpRecThumbWrap">
                          <img
                            src={resolveImageUrl(rec.thumbnail_url || (rec.product?.main_image_url ?? null))}
                            alt={rec.title || ''}
                            className="vdpRecThumb"
                          />
                          <div className="vdpRecPlay"><svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                          <polygon points="6 4 20 12 6 20 6 4" />
                        </svg></div>
                        </div>
                        <div className="vdpRecInfo">
                          <h4 className="vdpRecTitle">{rec.title}</h4>
                          {rec.product && <span className="vdpRecProduct">{rec.product.name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
