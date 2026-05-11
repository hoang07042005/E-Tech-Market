import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

import AuthMarketingColumn from './AuthMarketingColumn'
import './AuthPage.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (!token || !email) return false
    if (password.length < 8) return false
    if (password !== confirmPassword) return false
    return true
  }, [confirmPassword, email, loading, password, token])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          token,
          password,
          password_confirmation: confirmPassword,
        }),
      })
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setError(message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const missingParams = !token || !email

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

  return (
    <div className="authPageRoot">
      <div className="authPageInner">
        <div className="authPageGrid">
          <AuthMarketingColumn
            eyebrow="BẢO MẬT TÀI KHOẢN"
            title={
              <>
                Đặt lại<br />
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
                <h2 className="authCardTitle">Đặt lại mật khẩu</h2>
                <p className="authCardSub">
                  {missingParams ? 'Link không hợp lệ hoặc thiếu tham số.' : `Tài khoản: ${email}`}
                </p>
              </div>

              {done ? (
                <div className="authForm">
                  <div className="authError" style={{ borderColor: 'rgba(34, 197, 94, 0.35)', color: '#86efac', background: 'rgba(34, 197, 94, 0.08)' }}>
                    Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.
                  </div>
                  <button type="button" className="authSubmit" onClick={() => navigate('/login')}>
                    ĐI ĐẾN ĐĂNG NHẬP
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="authForm">
                  <div className="authField">
                    <label className="authFieldLabel">Mật khẩu mới</label>
                    <input
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      className="authInput"
                      placeholder="••••••••"
                      type="password"
                      required
                      minLength={8}
                      disabled={missingParams}
                    />
                  </div>

                  <div className="authField">
                    <label className="authFieldLabel">Xác nhận mật khẩu mới</label>
                    <input
                      value={confirmPassword}
                      onChange={(ev) => setConfirmPassword(ev.target.value)}
                      className="authInput"
                      placeholder="••••••••"
                      type="password"
                      required
                      minLength={8}
                      disabled={missingParams}
                    />
                  </div>

                  {error && <div className="authError">{error}</div>}

                  <button type="submit" disabled={!canSubmit} className="authSubmit">
                    {loading ? 'ĐANG LƯU...' : 'CẬP NHẬT MẬT KHẨU'}
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

