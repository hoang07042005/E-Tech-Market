import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import '../css_pages/SecurityPage.css'

type SessionRow = {
  id: string
  name?: string | null
  created_at?: string | null
  last_used_at?: string | null
  is_current?: boolean
}

function fmtDateTimeVi(iso?: string | null) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  return new Date(t).toLocaleString('vi-VN')
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M10.3 4.2 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.2l1.6 1.6 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function SecurityPage() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null

  const [pwCur, setPwCur] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  const [backupCodes] = useState<string[]>(() => [
    'ABCD-1234-EFGH',
    'IJKL-5678-MNOP',
    'QRST-9012-UVWX',
    'YZAB-3456-CDEF',
    'GHIJ-7890-KLMN',
  ])

  const [sessions, setSessions] = useState<SessionRow[]>([])

  const currentSessionCount = useMemo(() => sessions.length, [sessions])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    apiFetch<{ data: SessionRow[] }>('/me/sessions', { token })
      .then((res) => {
        if (cancelled) return
        setSessions(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (cancelled) return
        setSessions([])
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const onChangePassword = async () => {
    setError(null)
    setSuccess(null)
    if (!token) {
      setError('Vui lòng đăng nhập lại để đổi mật khẩu.')
      return
    }
    if (!pwCur.trim() || !pwNew.trim() || !pwConfirm.trim()) {
      setError('Vui lòng điền đủ các trường mật khẩu.')
      return
    }
    if (pwNew.length < 8) {
      setError('Mật khẩu mới cần tối thiểu 8 ký tự.')
      return
    }
    if (pwNew !== pwConfirm) {
      setError('Xác nhận mật khẩu mới không khớp.')
      return
    }

    setBusy(true)
    try {
      await apiFetch('/me/password', {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          current_password: pwCur,
          new_password: pwNew,
        }),
      })
      setPwCur('')
      setPwNew('')
      setPwConfirm('')
      setSuccess('Đổi mật khẩu thành công.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể đổi mật khẩu.')
    } finally {
      setBusy(false)
    }
  }

  const revokeSession = (id: string) => {
    setSessions((p) => p.filter((s) => s.id !== id))
  }

  const logoutAll = () => {
    setSessions([])
  }

  return (
    <div className="secRoot">
      <section className="secTopCard" aria-label="Bảo mật tài khoản">
        <div className="secTopTitle">Bảo mật tài khoản</div>
        <div className="secTopDesc">
          Quản lý mật khẩu, xác thực và các phiên đăng nhập để bảo vệ an toàn cho tài khoản của bạn.
        </div>
      </section>

      <section className="secSectionCard">
        <div className="secSectionHead">
          <div className="secSectionHeadLeft">
            <span className="secIconOrange" aria-hidden="true">
              <WarningIcon />
            </span>
            <div>
              <div className="secSectionTitle">Thay đổi mật khẩu</div>
              <div className="secSectionSub">Cập nhật mật khẩu để an toàn hơn.</div>
            </div>
          </div>
        </div>

        <div className="secFormGrid">
          <div className="secField">
            <label>Mật khẩu hiện tại</label>
            <input type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="secField">
            <label>Mật khẩu mới</label>
            <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Tối thiểu 8 ký tự" />
          </div>
          <div className="secField" style={{ gridColumn: '1 / -1' }}>
            <label>Xác nhận mật khẩu mới</label>
            <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
          </div>
        </div>

        {success && <div className="secInlineSuccess">{success}</div>}
        {error && <div className="secInlineError">{error}</div>}

        <div className="secBtnRow">
          <button type="button" className="secPrimaryBtn" onClick={onChangePassword} disabled={busy}>
            {busy ? 'Đang xử lý…' : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </section>

      <section className="secSectionCard">
        <div className="secSwitchHead">
          <div className="secSectionHeadLeft">
            <span className="secIconOrange" aria-hidden="true">
              <ShieldIcon />
            </span>
            <div>
              <div className="secSectionTitle">Xác thực 2 lớp (2FA)</div>
              <div className="secSectionSub">Hiện tại {twoFaEnabled ? 'đang bật' : 'đang tắt'} bảo vệ 2FA.</div>
            </div>
          </div>
          <button
            type="button"
            className={twoFaEnabled ? 'pfSwitch pfSwitchOn' : 'pfSwitch'}
            onClick={() => setTwoFaEnabled((s) => !s)}
            aria-label="Bật tắt 2FA"
          >
            <span className="pfSwitchKnob" />
          </button>
        </div>

        <div className="sec2faBody">
          {twoFaEnabled ? (
            <div className="sec2faText">
              <div className="sec2faBadge">Đang bật 2FA</div>
              <div className="sec2faHint">
                Mã xác thực sẽ được yêu cầu khi bạn đăng nhập từ thiết bị mới.
              </div>

              <div className="secBackupBlock">
                <div className="secBackupTitle">Mã backup</div>
                <div className="secBackupGrid">
                  {backupCodes.slice(0, 4).map((c) => (
                    <div key={c} className="secBackupCode">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="sec2faText">
              <div className="sec2faBadge sec2faBadgeOff">2FA đang tắt</div>
              <div className="sec2faHint">Bật 2FA để tăng cường bảo mật cho tài khoản của bạn.</div>
            </div>
          )}
        </div>
      </section>

      <section className="secSectionCard">
        <div className="secSessionHead">
          <div>
            <div className="secSectionTitle">Quản lý phiên đăng nhập</div>
            <div className="secSectionSub">Có {currentSessionCount} phiên đăng nhập đang hoạt động.</div>
          </div>
          <button type="button" className="secDangerOutlineBtn" onClick={logoutAll} disabled={sessions.length === 0}>
            Đăng xuất khỏi tất cả thiết bị
          </button>
        </div>

        <div className="secSessionsGrid">
          {sessions.length === 0 ? (
            <div className="secEmpty">Không có phiên đăng nhập nào.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className={`secSessionCard ${s.is_current ? 'current' : ''}`}>
                <div className="secSessionTop">
                  <div>
                    <div className="secSessionDevice">{s.name || 'Thiết bị'}</div>
                    <div className="secSessionMeta">Đăng nhập: {fmtDateTimeVi(s.created_at)}</div>
                    <div className="secSessionLoc">Hoạt động gần nhất: {fmtDateTimeVi(s.last_used_at)}</div>
                  </div>
                  <button
                    type="button"
                    className="secRevokeBtn"
                    onClick={() => revokeSession(s.id)}
                    aria-label="Thu hồi phiên"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="secSessionBottom">
                  {s.is_current && <span className="secChip secChipOn">Đang hoạt động</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="secSectionCard secDangerZone">
        <div className="secSessionHead">
          <div>
            <div className="secDangerTitle">Khu vực nguy hiểm</div>
            <div className="secSectionSub" style={{ marginTop: 4 }}>
              Thao tác dưới đây có thể làm ảnh hưởng tài khoản của bạn.
            </div>
          </div>
          <button
            type="button"
            className="secDangerOutlineBtn"
            onClick={() => {
              // UI only
              alert('Chức năng sẽ được hoàn thiện ở bản sau.')
            }}
          >
            Xóa khỏi tài khoản
          </button>
        </div>
      </section>
    </div>
  )
}

