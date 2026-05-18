
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
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/1200x600'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
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
    apiFetch<{ data: BlogPost[] }>('/api/blog/posts')
      .then((res) => {
        if (active) {
          setPosts(res.data)
        }
      })
      .catch(console.error)
      .finally(() => {
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
              <span className="blogHeroTag">{featuredPost.category?.name || 'Tin tức'}</span>
              <h1 className="blogHeroTitle">
                <Link to={`/blog/${featuredPost.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
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
                    <Link to={`/blog/${post.slug}`}>
                      <img src={resolveImageUrl(post.thumbnail_url)} alt={post.title} className="blogCardThumb" />
                    </Link>
                    {post.category && <span className="blogCardTag">{post.category.name}</span>}
                  </div>
                  <div className="blogCardBody">
                    <span className="blogCardDate">{new Date(post.published_at).toLocaleDateString('vi-VN')}</span>
                    <Link to={`/blog/${post.slug}`} className="blogCardTitle">{post.title}</Link>
                    <p className="blogCardExcerpt">{post.excerpt}</p>
                    <Link to={`/blog/${post.slug}`} className="blogCardMore">Đọc thêm →</Link>
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
                  <Link to={`/blog/${post.slug}`} className="blogTrendingItem" key={post.id}>
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
                    <span>{cat.name}</span>
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
