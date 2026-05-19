import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at top left, #1e293b 0%, #0f172a 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            maxWidth: '560px',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '48px 32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Premium Alert Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              color: '#ef4444',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: '800',
              marginBottom: '12px',
              background: 'linear-gradient(to right, #f43f5e, #fb7185)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Đã xảy ra sự cố
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: '#94a3b8',
              lineHeight: '1.6',
              marginBottom: '32px',
            }}>
              Ứng dụng vừa gặp lỗi không mong muốn trong khi kết xuất. Chúng tôi xin lỗi vì sự bất tiện này.
            </p>

            {this.state.error && (
              <div style={{
                width: '100%',
                maxHeight: '160px',
                overflowY: 'auto',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#f43f5e',
                textAlign: 'left',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                marginBottom: '24px',
                wordBreak: 'break-all',
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px' }}>
                  {this.state.error.toString()}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: '#94a3b8' }}>
                  {this.state.errorInfo?.componentStack}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 28px',
                  background: 'linear-gradient(135deg, var(--et-primary, #2563eb) 0%, var(--et-secondary, #1d4ed8) 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                Về trang chủ
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 28px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
