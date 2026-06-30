import {
  ensureAuthExpiryMigrated,
  isAuthSessionExpired,
  performAuthSessionExpiry,
} from '@/features/store/auth.store'

// Token storage - use localStorage to persist across Docker restarts
const TOKEN_KEY = 'etech_auth_token'

export function setAuthToken(token: string | null): void {
  console.log('[setAuthToken] Called with:', token ? token.slice(0, 20) + '...' : 'null')
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function clearAuthToken(): void {
  const current = getAuthToken()
  console.log('[clearAuthToken] Called, current value:', current ? current.slice(0, 20) + '...' : 'null')
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}

// During development (Vite), use relative path to leverage proxy which avoids CORS.
export const API_BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export type ApiError = {
  message?: string
  errors?: unknown
}

export class ApiRequestError extends Error {
  public readonly globalErrorNotified: boolean

  constructor(message: string, options: { globalErrorNotified?: boolean } = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.globalErrorNotified = options.globalErrorNotified ?? false
  }
}

export function notifyGlobalError(message: string) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('global-error', { detail: { message } }))
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    const ct = res.headers.get('content-type') || ''
    if (!ct.toLowerCase().includes('application/json')) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { silent401?: boolean } = {},
): Promise<T> {
  const { silent401 = false, ...fetchOptions } = options as RequestInit & { silent401?: boolean }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  let effectivePath: string
  if (!API_BASE_URL) {
    // Dev mode: dùng relative path qua proxy (ví dụ: /api/auth/login)
    effectivePath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`
  } else {
    // Prod mode: nối base URL với path (ví dụ: http://localhost:8000/api/auth/login)
    const needsApiPrefix = !normalizedPath.startsWith('/api')
    effectivePath = needsApiPrefix ? `${API_BASE_URL}/api${normalizedPath}` : `${API_BASE_URL}${normalizedPath}`
  }

  // Thêm version /v1/ vào path (chỉ /api/ -> /api/v1/, không thay đổi /api/v1/ hay /api/v2/)
  const versionedPath = effectivePath.replace(/^\/api\//, '/api/v1/').replace(/^\/api$/, '/api/v1');
  const url = versionedPath

  if (typeof window !== 'undefined') {
    ensureAuthExpiryMigrated()
    if (isAuthSessionExpired()) {
      performAuthSessionExpiry()
      throw new Error('Session expired. Please login again.')
    }
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  }

  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('[apiFetch] Token found, adding Bearer header', token.slice(0, 20) + '...')
  } else {
    console.log('[apiFetch] No token in memory')
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  })

  const data = await parseJsonSafe<ApiError & T>(res)
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken()
      if (!silent401) {
        performAuthSessionExpiry()
        const msg401 = (data && typeof data.message === 'string') ? data.message : `Request failed: ${res.status}`
        notifyGlobalError(msg401)
        throw new ApiRequestError(msg401, { globalErrorNotified: true })
      }
      // Silent 401: user simply not logged in, no toast
      throw new ApiRequestError('Unauthorized', { globalErrorNotified: true })
    }
    if (res.status === 403 && data && (data as any).requires_2fa) {
      throw { message: data.message, requires_2fa: true }
    }
    const fallbackText = data ? null : await res.text().catch(() => null)
    const message =
      data && typeof data.message === 'string'
        ? data.message
        : fallbackText && fallbackText.trim().length > 0
          ? `Request failed: ${res.status} (${fallbackText.slice(0, 140)})`
          : `Request failed: ${res.status}`
    notifyGlobalError(message)
    throw new ApiRequestError(message, { globalErrorNotified: true })
  }

  return (data as T) ?? ({} as T)
}