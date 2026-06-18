import { apiFetch, setAuthToken, getAuthToken, clearAuthToken } from '@/configs/api.config'

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  name: string
  email: string
  password: string
  phone?: string
  address_line?: string
  province?: string
  district?: string
  ward?: string
}

export type AuthResponse = {
  user: any
  token?: string
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  console.log('[login] Response:', res)
  // Store token in memory for Bearer auth (not localStorage for security)
  if (res.user) {
    try { localStorage.setItem("user", JSON.stringify(res.user)) } catch {}
    window.dispatchEvent(new Event("auth-change"))
  }
  if (res.token) {
    console.log('[login] Token received, storing in memory:', res.token.slice(0, 20) + '...')
    setAuthToken(res.token)
  } else {
    console.log('[login] No token in response!')
  }
  return res
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  // Store token in memory for Bearer auth (not localStorage for security)
  if (res.user) {
    try { localStorage.setItem("user", JSON.stringify(res.user)) } catch {}
    window.dispatchEvent(new Event("auth-change"))
  }
  if (res.token) {
    setAuthToken(res.token)
  }
  return res
}

export async function me(): Promise<any> {
  return apiFetch<any>('/api/me', { method: 'GET' })
}

export async function logout(): Promise<void> {
  await apiFetch<any>('/api/auth/logout', {
    method: 'POST',
  })
  clearAuthToken()
}

// Export for other modules to check auth state
export { getAuthToken }


