/** Thời gian phiên đăng nhập (frontend + đồng bộ backend token 24h). */
export const AUTH_SESSION_DURATION_MS = 24 * 60 * 60 * 1000

export const AUTH_EXPIRES_AT_KEY = 'auth_expires_at'

export const AUTH_EXPIRED_EVENT = 'etech-auth-expired'

export function setAuthSessionExpiry(): void {
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + AUTH_SESSION_DURATION_MS))
}

export function clearAuthSessionExpiry(): void {
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY)
}

/**
 * Nếu còn token nhưng chưa có mốc hết hạn (phiên cũ), gán ngay +24h kể từ lần mở trang này.
 */
export function ensureAuthExpiryMigrated(): void {
  if (!localStorage.getItem('token')) {
    clearAuthSessionExpiry()
    return
  }
  if (!localStorage.getItem(AUTH_EXPIRES_AT_KEY)) {
    setAuthSessionExpiry()
  }
}

export function getAuthExpiresAtMs(): number | null {
  const raw = localStorage.getItem(AUTH_EXPIRES_AT_KEY)
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function isAuthSessionExpired(): boolean {
  const at = getAuthExpiresAtMs()
  if (at == null) return false
  return Date.now() > at
}

/** Xóa token/user + mốc thời gian; báo app để chuyển trang đăng nhập nếu cần. */
export function performAuthSessionExpiry(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('pending_payment')
  clearAuthSessionExpiry()
  window.dispatchEvent(new Event('auth-change'))
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}
