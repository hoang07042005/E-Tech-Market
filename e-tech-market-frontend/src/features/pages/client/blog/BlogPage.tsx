import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import '@/styles/pages/BlogPage.css'
import { useWishlistQuery, useWishlistMutation } from '@/features/services/mutations'
import { useAuthStore } from '@/features/store/useAuthStore'

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
  const s = slug.toLowerCase();
  if (s.includes('tin-san-pham')) return '#ef4444';
  if (s.includes('cong-nghe')) return '#3b82f6';
  if (s.includes('tu-van')) return '#14b8a6'; // Teal
  if (s.includes('khuyen-mai')) return '#f59e0b';
  if (s.includes('danh-gia')) return '#a855f7'; // Purple (matching screenshot)
  if (s.includes('huong-dan')) return '#8b5cf6';
  if (s.includes('tren-tay')) return '#10b981'; // Green (matching screenshot)
  if (s.includes('tin-tuc')) return '#06b6d4';
  if (s.includes('kham-pha')) return '#eab308';
  if (s.includes('thu-thuat')) return '#f97316';
  if (s.includes('phu-kien')) return '#6366f1';
  
  const colors = [
    '#f43f5e', '#d946ef', '#0ea5e9', '#14b8a6', 
    '#22c55e', '#84cc16', '#a855f7', '#64748b'
  ];
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function BlogPage() {
  const userStr = useAuthStore((state) => state.userStr)
  const hasAuth = !!userStr
  const { data: blogWishlists } = useWishlistQuery(hasAuth, 'blog')
  const { data: newsWishlists } = useWishlistQuery(hasAuth, 'news')
  const blogWishlistMutation = useWishlistMutation('blog')
  const newsWishlistMutation = useWishlistMutation('news')

  const isFavorited = (post: BlogPost) => {
    if (!hasAuth) return false
    if (post.isProductNews) {
      // For product news, ID was prefixed with 999
      const realId = post.id.toString().startsWith('999') ? parseInt(post.id.toString().substring(3)) : post.id
      return newsWishlists?.some(w => w.product_news_id === realId)
    }
    return blogWishlists?.some(w => w.blog_post_id === post.id)
  }

  const handleToggleFavorite = (e: React.MouseEvent, post: BlogPost) => {
    e.preventDefault()
    if (!hasAuth) {
      alert('Vui lòng đăng nhập để yêu thích!')
      return
    }
    if (post.isProductNews) {
      const realId = post.id.toString().startsWith('999') ? parseInt(post.id.toString().substring(3)) : post.id
      newsWishlistMutation.mutate(realId)
    } else {
      blogWishlistMutation.mutate(post.id)
    }
  }

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
              <div className="blogHeroMeta" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span>📅 {new Date(featuredPost.published_at).toLocaleDateString('vi-VN')}</span>
                <span>⏱️ {featuredPost.reading_time} phút đọc</span>
                <button 
                  onClick={(e) => handleToggleFavorite(e, featuredPost)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}
                >
                  <HeartIcon filled={isFavorited(featuredPost)} />
                </button>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="blogCardDate">{new Date(post.published_at).toLocaleDateString('vi-VN')}</span>
                      <button 
                        onClick={(e) => handleToggleFavorite(e, post)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <HeartIcon filled={isFavorited(post)} />
                      </button>
                    </div>
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

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#ef4444' : 'none'} stroke={filled ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  )
}

