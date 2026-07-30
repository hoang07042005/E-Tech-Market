
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import '@/styles/pages/BlogPage.css'

type BlogPost = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  thumbnail_url: string | null
  published_at: string
  reading_time?: number
  views?: number
  category: {
    id: number
    name: string
    slug: string
  } | null
  author: {
    id: number
    name: string
  } | null
  isProductNews?: boolean
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/1200x600'
  const s = url.trim()
  if (!s) return 'https://via.placeholder.com/1200x600'
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

const getCategoryColor = (slug?: string) => {
  if (!slug) return '#6b7280';
  switch (slug) {
    case 'tin-san-pham': return '#ef4444'; // Red
    case 'cong-nghe': return '#3b82f6'; // Blue
    case 'khuyen-mai': return '#f59e0b'; // Amber
    case 'danh-gia': return '#10b981'; // Emerald
    case 'huong-dan': return '#8b5cf6'; // Purple
    case 'tren-tay': return '#ec4899'; // Pink
    case 'tin-tuc': return '#06b6d4'; // Cyan
    case 'kham-pha': return '#eab308'; // Yellow
    case 'thu-thuat': return '#f97316'; // Orange
    case 'phu-kien': return '#6366f1'; // Indigo
    default:
      const colors = [
        '#f43f5e', '#d946ef', '#0ea5e9', '#14b8a6', 
        '#22c55e', '#84cc16', '#a855f7', '#64748b'
      ];
      let hash = 0;
      for (let i = 0; i < slug.length; i++) {
        hash = slug.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
  }
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null)
  const [newsletterLoading, setNewsletterLoading] = useState(false)

  useEffect(() => {
    let active = true
    
    Promise.all([
      apiFetch<{ data: BlogPost[] }>('/api/blog/posts').catch(() => ({ data: [] })),
      apiFetch<{ data: any[] }>('/product-news').catch(() => ({ data: [] }))
    ]).then(([postsRes, newsRes]) => {
      if (active) {
        const blogPosts = postsRes.data || []
        
        // Map product news to match BlogPost type
        const productNews: BlogPost[] = (newsRes.data || []).map((news: any) => ({
          id: parseInt(`999${news.id}`), // Prevent ID collision
          title: news.title,
          slug: news.slug,
          excerpt: news.content_html ? news.content_html.replace(/<[^>]+>/g, '').substring(0, 120) + '...' : 'Thông tin mới về sản phẩm',
          thumbnail_url: news.thumbnail_url || news.thumbnail_path,
          published_at: news.published_at || news.created_at,
          reading_time: 3,
          views: ((news.id || 1) * 83) % 400 + 150, // Fake views that are stable per post
          category: {
            id: 9999,
            name: 'Tin Sản Phẩm',
            slug: 'tin-san-pham'
          },
          author: null,
          isProductNews: true // Custom flag
        }))
        
        const allPosts = [...blogPosts, ...productNews].sort((a, b) => 
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        )
        
        setPosts(allPosts)
      }
    }).finally(() => {
      if (active) setLoading(false)
    })
    
    return () => { active = false }
  }, [])

  const categories = useMemo(() => {
    const map: Record<string, { id: number; name: string; slug: string; count: number }> = {}
    posts.forEach(p => {
      if (p.category) {
        if (!map[p.category.slug]) {
          map[p.category.slug] = {
            id: p.category.id,
            name: p.category.name,
            slug: p.category.slug,
            count: 0,
          }
        }
        map[p.category.slug].count++
      }
    })
    return Object.values(map)
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'all') return posts
    return posts.filter(p => p.category?.slug === activeFilter)
  }, [posts, activeFilter])

  const featuredPost = posts[0]
  const recentPosts = filteredPosts.slice(1)
  const trendingPosts = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3)

  const submitNewsletter = async () => {
    const email = newsletterEmail.trim()
    if (!email || newsletterLoading) return
    setNewsletterLoading(true)
    setNewsletterMessage(null)
    try {
      await apiFetch('/api/newsletter/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ email, source: 'blog' }),
      })
      setNewsletterEmail('')
      setNewsletterMessage('Da dang ky nhan tin.')
    } catch (e) {
      setNewsletterMessage(e instanceof Error ? e.message : 'Khong dang ky duoc email.')
    } finally {
      setNewsletterLoading(false)
    }
  }

  if (loading) return (
    <div className="blogPage">
      <div className="ppContainer" style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="adminLoader" style={{ margin: '0 auto 20px' }}></div>
        <p>Đang tải tin tức mới nhất...</p>
      </div>
    </div>
  )

  return (
    <div className="blogPage">
      <div className="ppContainer">
        {/* Hero Section */}
        {featuredPost && activeFilter === 'all' && (
          <div className="blogHero">
            <img src={resolveImageUrl(featuredPost.thumbnail_url)} alt={featuredPost.title} className="blogHeroImg" />
            <div className="blogHeroContent">
              <span className="blogHeroTag" style={{ background: getCategoryColor(featuredPost.category?.slug) }}>
                {featuredPost.category?.name || 'Tin tức'}
              </span>
              <h1 className="blogHeroTitle">
                <Link to={featuredPost.isProductNews ? `/product-news/${featuredPost.slug}` : `/blog/${featuredPost.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {featuredPost.title}
                </Link>
              </h1>
              <p className="blogHeroExcerpt">{featuredPost.excerpt}</p>
              <div className="blogHeroMeta">
                <span>📅 {new Date(featuredPost.published_at).toLocaleDateString('vi-VN')}</span>
                <span>⏱️ {featuredPost.reading_time} phút đọc</span>
              </div>
            </div>
          </div>
        )}

        <div className="blogMainGrid">
          <div className="blogContentArea">
            <div className="blogSectionTitleRow">
              <h2 className="blogSectionTitle">Tin tức mới nhất</h2>
              <div className="blogFilters">
                <button
                  className={`blogFilterBtn ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  Tất cả
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`blogFilterBtn ${activeFilter === cat.slug ? 'active' : ''}`}
                    onClick={() => setActiveFilter(cat.slug)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="blogPostsGrid">
              {(activeFilter === 'all' ? recentPosts : filteredPosts).map(post => (
                <div className="blogCard" key={post.id}>
                  <div className="blogCardThumbWrap">
                    <Link to={post.isProductNews ? `/product-news/${post.slug}` : `/blog/${post.slug}`}>
                      <img src={resolveImageUrl(post.thumbnail_url)} alt={post.title} className="blogCardThumb" />
                    </Link>
                    {post.category && (
                      <span className="blogCardTag" style={{ background: getCategoryColor(post.category.slug) }}>
                        {post.category.name}
                      </span>
                    )}
                  </div>
                  <div className="blogCardBody">
                    <span className="blogCardDate">{new Date(post.published_at).toLocaleDateString('vi-VN')}</span>
                    <Link to={post.isProductNews ? `/product-news/${post.slug}` : `/blog/${post.slug}`} className="blogCardTitle">{post.title}</Link>
                    <p className="blogCardExcerpt">{post.excerpt}</p>
                    <Link to={post.isProductNews ? `/product-news/${post.slug}` : `/blog/${post.slug}`} className="blogCardMore">Đọc thêm →</Link>
                  </div>
                </div>
              ))}
            </div>

            {filteredPosts.length > 6 && (
              <button className="blogLoadMore">Xem thêm bài viết</button>
            )}
          </div>

          {/* Sidebar */}
          <aside className="blogSidebar">
            <div className="blogSidebarWidget blogNewsletter">
              <div className="blogNewsletterIcon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h3 className="blogNewsletterTitle">Đăng ký nhận tin công nghệ mới nhất</h3>
              <p className="blogNewsletterDesc">Cập nhật những đánh giá, xu hướng và mẹo hay công nghệ hàng tuần vào hộp thư của bạn.</p>
              <input
                type="email"
                placeholder="Email của bạn"
                className="blogNewsletterInput"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitNewsletter()
                }}
              />
              <button className="blogNewsletterBtn" disabled={newsletterLoading} onClick={() => void submitNewsletter()}>
                {newsletterLoading ? 'Đang đăng ký...' : 'Đăng ký ngay'}
              </button>
              {newsletterMessage && <span className="blogNewsletterNote">{newsletterMessage}</span>}
              <span className="blogNewsletterNote">Chúng tôi tôn trọng quyền riêng tư của bạn.</span>
            </div>

            <div className="blogSidebarWidget">
              <h3 className="blogWidgetTitle">Đọc nhiều nhất</h3>
              <div className="blogTrendingList">
                {trendingPosts.map(post => (
                  <Link to={post.isProductNews ? `/product-news/${post.slug}` : `/blog/${post.slug}`} className="blogTrendingItem" key={post.id}>
                    <img src={resolveImageUrl(post.thumbnail_url)} alt={post.title} className="blogTrendingThumb" />
                    <div className="blogTrendingInfo">
                      <h4 className="blogTrendingTitle">{post.title}</h4>
                      <span className="blogTrendingViews">{(post.views || 0).toLocaleString()} lượt xem</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="blogSidebarWidget">
              <h3 className="blogWidgetTitle">Chuyên mục</h3>
              <div className="blogCatList">
                {categories.map(cat => (
                  <Link to={`/blog?category=${cat.slug}`} className="blogCatItem" key={cat.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: getCategoryColor(cat.slug) }}></span>
                      <span>{cat.name}</span>
                    </div>
                    <span className="blogCatCount">{cat.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
