import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '../../lib/api'
import '../css_pages/ProductsPage.css' // Reuse similar grid layout

type BlogPost = {
  id: number
  title: string
  slug: string
  excerpt: string | null
  thumbnail_url: string | null
  published_at: string
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
  if (!url) return 'https://via.placeholder.com/600x400'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiFetch<{ data: BlogPost[] }>('/api/blog/posts')
      .then((res) => {
        if (active) setPosts(res.data)
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="ppPage" style={{ minHeight: '80vh', padding: '40px 0', background: 'var(--et-surface)' }}>
      <div className="ppContainer">
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--et-text)' }}>
          Tech Blog
        </h1>
        <p style={{ color: 'var(--et-text-muted)', marginBottom: '40px' }}>
          Tin tức công nghệ, đánh giá chuyên sâu và xu hướng mới nhất.
        </p>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--et-text-muted)' }}>Đang tải bài viết...</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--et-text-muted)', background: '#f8fafc', borderRadius: '12px' }}>
            Chưa có bài viết nào.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
            {posts.map((post) => (
              <div key={post.id} style={{ background: 'var(--et-bg)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--et-border)', transition: 'transform 0.3s' }}>
                <Link to={`/blog/${post.slug}`} style={{ display: 'block', height: '200px', overflow: 'hidden' }}>
                  <img 
                    src={resolveImageUrl(post.thumbnail_url)} 
                    alt={post.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  />
                </Link>
                <div style={{ padding: '24px' }}>
                  {post.category && (
                    <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--et-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      {post.category.name}
                    </span>
                  )}
                  <Link to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--et-text)', marginBottom: '12px', lineHeight: 1.4 }}>
                      {post.title}
                    </h2>
                  </Link>
                  {post.excerpt && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--et-text-muted)', marginBottom: '16px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.excerpt}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--et-border)', paddingTop: '16px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      {post.author ? post.author.name : 'Ban biên tập'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(post.published_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
