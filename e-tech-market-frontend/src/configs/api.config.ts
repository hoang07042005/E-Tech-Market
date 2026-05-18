import {
  ensureAuthExpiryMigrated,
  isAuthSessionExpired,
  performAuthSessionExpiry,
} from '@/features/store/auth.store'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(
  /\/+$/,
  '',
)


export type ApiError = {
  message?: string
  errors?: unknown
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
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  // Support both styles:
  // - API_BASE_URL = http://host:8000  + path = /api/...
  // - API_BASE_URL = http://host:8000/api + path = /...
  // Avoid double /api/api.
  const baseHasApi = API_BASE_URL.endsWith('/api')
  const pathHasApi = normalizedPath === '/api' || normalizedPath.startsWith('/api/')
  const effectivePath =
    baseHasApi && pathHasApi ? normalizedPath.slice(4) || '/' : !baseHasApi && !pathHasApi ? `/api${normalizedPath}` : normalizedPath

  const url = `${API_BASE_URL}${effectivePath}`

  if (typeof window !== 'undefined' && window.localStorage.getItem('token')) {
    ensureAuthExpiryMigrated()
    if (isAuthSessionExpired()) {
      performAuthSessionExpiry()
      throw new Error('Phiên đăng nhập đã hết hạn (24 giờ). Vui lòng đăng nhập lại.')
    }
  }

  const token = options.token ?? null
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    ...options,
    headers,
  })

  const data = await parseJsonSafe<ApiError & T>(res)
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && window.localStorage.getItem('token')) {
      performAuthSessionExpiry()
    }
    const fallbackText = data ? null : await res.text().catch(() => null)
    const message =
      data && typeof data.message === 'string'
        ? data.message
        : fallbackText && fallbackText.trim().length > 0
          ? `Request failed: ${res.status} (${fallbackText.slice(0, 140)})`
          : `Request failed: ${res.status}`
    throw new Error(message)
  }

  return (data as T) ?? ({} as T)
}

