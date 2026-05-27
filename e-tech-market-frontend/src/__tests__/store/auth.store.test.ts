import { describe, it, expect, beforeEach } from 'vitest'
import {
  AUTH_SESSION_DURATION_MS,
  AUTH_EXPIRES_AT_KEY,
  setAuthSessionExpiry,
  clearAuthSessionExpiry,
  ensureAuthExpiryMigrated,
  getAuthExpiresAtMs,
  isAuthSessionExpired,
  performAuthSessionExpiry,
} from '@/features/store/auth.store'

beforeEach(() => {
  localStorage.clear()
})

describe('AUTH_SESSION_DURATION_MS', () => {
  it('should be 24 hours in ms', () => {
    expect(AUTH_SESSION_DURATION_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('setAuthSessionExpiry', () => {
  it('stores expiry timestamp in localStorage', () => {
    const before = Date.now()
    setAuthSessionExpiry()
    const stored = Number(localStorage.getItem(AUTH_EXPIRES_AT_KEY))
    expect(stored).toBeGreaterThanOrEqual(before + AUTH_SESSION_DURATION_MS)
  })
})

describe('clearAuthSessionExpiry', () => {
  it('removes the expiry key', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, '12345')
    clearAuthSessionExpiry()
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBeNull()
  })
})

describe('ensureAuthExpiryMigrated', () => {
  it('clears expiry if no token present', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, '12345')
    ensureAuthExpiryMigrated()
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBeNull()
  })

  it('sets expiry if token exists but no expiry set', () => {
    localStorage.setItem('token', 'test-token')
    ensureAuthExpiryMigrated()
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).not.toBeNull()
  })

  it('does not overwrite existing expiry', () => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, '99999999999999')
    ensureAuthExpiryMigrated()
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBe('99999999999999')
  })
})

describe('getAuthExpiresAtMs', () => {
  it('returns null when no expiry stored', () => {
    expect(getAuthExpiresAtMs()).toBeNull()
  })

  it('returns parsed number when valid', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, '1234567890')
    expect(getAuthExpiresAtMs()).toBe(1234567890)
  })

  it('returns null for non-numeric value', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, 'not-a-number')
    expect(getAuthExpiresAtMs()).toBeNull()
  })
})

describe('isAuthSessionExpired', () => {
  it('returns false when no expiry stored', () => {
    expect(isAuthSessionExpired()).toBe(false)
  })

  it('returns false when expiry is in the future', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + 100000))
    expect(isAuthSessionExpired()).toBe(false)
  })

  it('returns true when expiry is in the past', () => {
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() - 1000))
    expect(isAuthSessionExpired()).toBe(true)
  })
})

describe('performAuthSessionExpiry', () => {
  it('clears token, user, pending_payment, and expiry', () => {
    localStorage.setItem('token', 'abc')
    localStorage.setItem('user', '{"id":1}')
    localStorage.setItem('pending_payment', '{}')
    localStorage.setItem(AUTH_EXPIRES_AT_KEY, '12345')

    performAuthSessionExpiry()

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('pending_payment')).toBeNull()
    expect(localStorage.getItem(AUTH_EXPIRES_AT_KEY)).toBeNull()
  })
})
