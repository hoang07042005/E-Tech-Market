import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { login, register } from '@/features/services/auth.service'
import { GoogleLoginButton } from './GoogleLoginButton'
import { setAuthSessionExpiry } from '@/features/store/auth.store'

import '@/styles/pages/AuthPage.css'
import AuthMarketingColumn from './AuthMarketingColumn'

type Mode = 'login' | 'register'

type MeUser = {
  name: string
  email: string
}

export default function AuthPage({
  initialMode = 'register',
  onAuthed,
}: {
  initialMode?: Mode
  onAuthed?: (user: MeUser) => void
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = initialMode
  const sessionExpired = searchParams.get('session') === 'expired'

  const [user, setUser] = useState<MeUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionExpired) return
    setSearchParams({}, { replace: true })
  }, [sessionExpired, setSearchParams])

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agreed: true,
  })

  const canSubmit = useMemo(() => {
    if (mode === 'login') return !!loginForm.email && !!loginForm.password
    return (
      !!registerForm.name &&
      !!registerForm.email &&
      !!registerForm.password &&
      registerForm.password === registerForm.confirmPassword &&
      registerForm.agreed
    )
  }, [loginForm.email, loginForm.password, mode, registerForm])

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

  useEffect(() => {
    // No token in localStorage for httpOnly cookie auth.
    // If the user has a valid session cookie, App.tsx will resolve /api/me.
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      if (mode === 'login') {
        const res = await login(loginForm)
        // 🔒 Token is stored in httpOnly cookie, handled automatically by browser
        localStorage.setItem('user', JSON.stringify(res.user))
        setAuthSessionExpiry()
        window.dispatchEvent(new Event('auth-change'))
        setUser(res.user as MeUser)
        onAuthed?.(res.user as MeUser)
        navigate('/')
        return
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.')
        return
      }
      if (!registerForm.agreed) {
        setError('Bạn cần đồng ý điều khoản và chính sách bảo mật.')
        return
      }

      const res = await register({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        phone: registerForm.phone,
      })

      // 🔒 Token is stored in httpOnly cookie, handled automatically by browser
      localStorage.setItem('user', JSON.stringify(res.user))
      setAuthSessionExpiry()
      window.dispatchEvent(new Event('auth-change'))
      setUser(res.user as MeUser)
      onAuthed?.(res.user as MeUser)
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null
      setError(message || 'Đăng nhập hoặc đăng ký thất bại. Vui lòng thử lại.')
    }
  }

  if (user) return null

  return (
    <div className="authPageRoot">
      <div className="authPageInner">
        <div className="authPageGrid">
          <AuthMarketingColumn
            title={
              mode === 'login' ? (
                <>
                  Chào mừng<br />
                  <span className="authGradientText">trở lại</span>.
                </>
              ) : (
                <>
                  Cùng<br />
                  <span className="authGradientText">đồng hành</span>.
                </>
              )
            }
          />

          <div className="authRight">
            <div className="authCard">
              <div className="authMobileMascot" aria-hidden="true">
                <img src="/linh-vat.png" alt="" className="authMobileMascotImg" draggable={false} />
              </div>
              <div className="authCardHeader">
                <h2 className="authCardTitle">
                  {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </h2>
                <p className="authCardSub">
                  {mode === 'login'
                    ? 'Nhập email và mật khẩu để vào cửa hàng.'
                    : 'Tạo tài khoản để mua sắm và theo dõi đơn hàng.'}
                </p>
              </div>

              <form onSubmit={onSubmit} className="authForm">
                {mode === 'register' ? (
                  <div className="authFormGrid">
                    <div className="authField">
                      <label className="authFieldLabel">Họ và tên</label>
                      <input
                        value={registerForm.name}
                        onChange={(ev) => setRegisterForm(s => ({ ...s, name: ev.target.value }))}
                        className="authInput"
                        placeholder="Nguyễn Văn A"
                        type="text"
                        required
                      />
                    </div>
                    <div className="authField">
                      <label className="authFieldLabel">Email</label>
                      <input
                        value={registerForm.email}
                        onChange={(ev) => setRegisterForm(s => ({ ...s, email: ev.target.value }))}
                        className="authInput"
                        placeholder="ban@vidu.com"
                        type="email"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="authField">
                    <label className="authFieldLabel">Email</label>
                    <input
                      value={loginForm.email}
                      onChange={(ev) => setLoginForm(s => ({ ...s, email: ev.target.value }))}
                      className="authInput"
                      placeholder="Địa chỉ email của bạn"
                      type="email"
                      required
                    />
                  </div>
                )}

                {mode === 'register' && (
                  <>
                    <div className="authField">
                      <label className="authFieldLabel">Số điện thoại</label>
                      <input
                        value={registerForm.phone}
                        onChange={(ev) => setRegisterForm(s => ({ ...s, phone: ev.target.value }))}
                        className="authInput"
                        placeholder="0901234567"
                        type="tel"
                        required
                      />
                    </div>
                  </>
                )}

                <div className={mode === 'register' ? 'authFormGrid' : ''}>
                  <div className="authField">
                    <label className="authFieldLabel">Mật khẩu</label>
                    <input
                      value={mode === 'login' ? loginForm.password : registerForm.password}
                      onChange={(ev) => {
                        const v = ev.target.value
                        if (mode === 'login') setLoginForm(s => ({ ...s, password: v }))
                        else setRegisterForm(s => ({ ...s, password: v }))
                      }}
                      className="authInput"
                      placeholder="••••••••"
                      type="password"
                      required
                    />
                  </div>

                  {mode === 'register' && (
                    <div className="authField">
                      <label className="authFieldLabel">Xác nhận mật khẩu</label>
                      <input
                        value={registerForm.confirmPassword}
                        onChange={(ev) => setRegisterForm(s => ({ ...s, confirmPassword: ev.target.value }))}
                        className="authInput"
                        placeholder="••••••••"
                        type="password"
                        required
                      />
                    </div>
                  )}
                </div>

                {mode === 'register' && (
                  <div className="authCheckRow">
                    <input
                      id="auth-agree-56c92ad3"
                      type="checkbox"
                      checked={registerForm.agreed}
                      onChange={(ev) =>
                        setRegisterForm((s) => ({
                          ...s,
                          agreed: ev.target.checked,
                        }))
                      }
                      className="authCheckbox"
                    />
                    <label className="authCheckLabel" htmlFor="auth-agree-56c92ad3">
                      Tôi đồng ý với{' '}
                      <a
                        className="authCheckLink"
                        href="/dieu-khoan"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate('/dieu-khoan')
                        }}
                      >
                        điều khoản sử dụng
                      </a>{' '}
                      và{' '}
                      <a
                        className="authCheckLink"
                        href="/chinh-sach-bao-mat"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate('/chinh-sach-bao-mat')
                        }}
                      >
                        chính sách bảo mật
                      </a>
                      .
                    </label>
                  </div>
                )}

                {(sessionExpired || error) && (
                  <div className="authError">
                    {sessionExpired
                      ? 'Phiên đăng nhập đã hết hạn (24 giờ). Vui lòng đăng nhập lại.'
                      : error}
                  </div>
                )}

                <button type="submit" disabled={!canSubmit} className="authSubmit">
                  {mode === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'}
                </button>

                {mode === 'login' && (
                  <div className="authGoogleSection">
                    <div className="authDivider">
                      <span className="authDividerLine" />
                      <span className="authDividerText">hoặc</span>
                      <span className="authDividerLine" />
                    </div>
                    <GoogleLoginButton />
                  </div>
                )}

                {mode === 'login' ? (
                  <div className="authLoginFooterRow">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="authSwitchBtn authSwitchBtn--start"
                    >
                      Quên mật khẩu?
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="authSwitchBtn authSwitchBtn--end"
                    >
                      Chưa có tài khoản? Đăng ký
                    </button>
                  </div>
                ) : (
                  <div className="authSwitchWrap">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="authSwitchBtn"
                    >
                      Đã có tài khoản? Đăng nhập
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
