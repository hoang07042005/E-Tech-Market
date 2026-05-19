import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function NotFoundPage() {
  return (
    <div className="et-not-found-container" style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      background: 'var(--et-bg-page, #f8fafc)',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>
      <Helmet>
        <title>Không tìm thấy trang - E-Tech Market</title>
        <meta name="description" content="Rất tiếc, trang bạn yêu cầu không tồn tại hoặc đã bị gỡ bỏ." />
      </Helmet>

      <div style={{
        maxWidth: '520px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Visual 404 Text */}
        <div style={{
          position: 'relative',
          fontSize: '120px',
          fontWeight: '900',
          lineHeight: '1',
          background: 'linear-gradient(135deg, var(--et-primary, #2563eb) 0%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '24px',
          letterSpacing: '-2px',
        }}>
          404
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '800',
          color: '#0f172a',
          marginBottom: '16px',
        }}>
          Không tìm thấy trang bạn yêu cầu
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#64748b',
          lineHeight: '1.6',
          marginBottom: '36px',
        }}>
          Rất tiếc, liên kết này có thể đã lỗi thời, trang đã bị đổi tên hoặc không tồn tại trên hệ thống của chúng tôi.
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Link
            to="/"
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, var(--et-primary, #2563eb) 0%, var(--et-secondary, #1d4ed8) 100%)',
              color: '#ffffff',
              borderRadius: '14px',
              fontWeight: '600',
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            Quay lại trang chủ
          </Link>
          <Link
            to="/products"
            style={{
              padding: '12px 28px',
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              fontWeight: '600',
              fontSize: '15px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Xem sản phẩm
          </Link>
        </div>
      </div>
    </div>
  )
}
