import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

import AuthMarketingColumn from './AuthMarketingColumn'
import './AuthPage.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.trim().length > 0 && !loading, [email, loading])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlBg = html.style.backgroundColor
    const prevBodyBg = body.style.backgroundColor
    html.style.backgroundColor = '#000000'
    body.style.backgroundColor = '#000000'
    return () => {
      html.style.backgroundColor = prevHtmlBg
      body.style.backgroundColor = prevBodyBg
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setError(message || 'Không thể gửi yêu cầu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authPageRoot">
      <div className="authPageInner">
        <div className="authPageGrid">
          <AuthMarketingColumn
            eyebrow="KHÔI PHỤC TÀI KHOẢN"
            title={
              <>
                Khôi phục<br />
                <span className="authGradientText">mật khẩu</span>.
              </>
            }
          />
          <div className="authRight">
            <div className="authCard">
              <div className="authMobileMascot" aria-hidden="true">
                <img src="/linh-vat.png" alt="" className="authMobileMascotImg" draggable={false} />
              </div>
              <div className="authCardHeader">
                <h2 className="authCardTitle">Quên mật khẩu</h2>
                <p className="authCardSub">
                  Nhập email bạn đã đăng ký. Nếu email tồn tại, hệ thống sẽ gửi link đặt lại mật khẩu.
                </p>
              </div>

              {done ? (
                <div className="authForm">
                  <div className="authError" style={{ borderColor: 'rgba(249, 115, 22, 0.35)', color: '#fdba74', background: 'rgba(249, 115, 22, 0.08)' }}>
                    Yêu cầu đã được ghi nhận. Vui lòng kiểm tra email để đặt lại mật khẩu.
                  </div>
                  <button type="button" className="authSubmit" onClick={() => navigate('/login')}>
                    QUAY LẠI ĐĂNG NHẬP
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="authForm">
                  <div className="authField">
                    <label className="authFieldLabel">Email</label>
                    <input
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      className="authInput"
                      placeholder="Địa chỉ email của bạn"
                      type="email"
                      required
                    />
                  </div>

                  {error && <div className="authError">{error}</div>}

                  <button type="submit" disabled={!canSubmit} className="authSubmit">
                    {loading ? 'ĐANG GỬI...' : 'GỬI LINK ĐẶT LẠI'}
                  </button>

                  <div className="authSwitchWrap">
                    <button type="button" onClick={() => navigate('/login')} className="authSwitchBtn">
                      Quay lại đăng nhập
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

