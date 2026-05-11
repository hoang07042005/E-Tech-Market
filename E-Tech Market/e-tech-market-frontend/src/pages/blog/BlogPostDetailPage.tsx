import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch, API_BASE_URL } from '../../lib/api'
import { Helmet } from 'react-helmet-async'

type BlogPost = {
  id: number
  title: string
  slug: string
  content: string
  thumbnail_url: string | null
  published_at: string
  meta_title: string | null
  meta_description: string | null
  category: {
    id: number
    name: string
    slug: string
  } | null
  author: {
    id: number
    name: string
    avatar_url: string | null
  } | null
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/1200x600'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function BlogPostDetailPage() {
  const { slug } = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiFetch<BlogPost>(`/api/blog/posts/${slug}`)
      .then((res) => {
        if (active) setPost(res)
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return <div style={{ padding: '80px', textAlign: 'center' }}>Đang tải bài viết...</div>
  }

  if (!post) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Không tìm thấy bài viết</h1>
        <Link to="/blog" style={{ color: 'var(--et-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
          Quay lại trang Blog
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--et-surface)', minHeight: '100vh', paddingBottom: '80px' }}>
      <Helmet>
        <title>{post.meta_title || post.title} | E-Tech Blog</title>
        {post.meta_description && <meta name="description" content={post.meta_description} />}
      </Helmet>

      {/* Header Image */}
      <div style={{ width: '100%', height: '50vh', position: 'relative', background: '#000' }}>
        <img 
          src={resolveImageUrl(post.thumbnail_url)} 
          alt={post.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '60px 24px 40px', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {post.category && (
              <span style={{ background: 'var(--et-primary)', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', display: 'inline-block' }}>
                {post.category.name}
              </span>
            )}
            <h1 style={{ color: '#fff', fontSize: '3rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 20px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {post.title}
            </h1>
            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <span style={{ fontWeight: 600 }}>Tác giả: {post.author?.name || 'Ban biên tập'}</span>
              <span>•</span>
              <span>{new Date(post.published_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px' }}>
        <div 
          className="rich-text-content"
          style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#334155' }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div style={{ marginTop: '60px', paddingTop: '40px', borderTop: '1px solid var(--et-border)', display: 'flex', justifyContent: 'center' }}>
          <Link to="/blog" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--et-bg)', color: 'var(--et-text)', border: '1px solid var(--et-border)', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    </div>
  )
}
