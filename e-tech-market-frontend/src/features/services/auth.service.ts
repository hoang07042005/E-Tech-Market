import { apiFetch } from '@/configs/api.config'

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
  // 🔒 Token is primarily in httpOnly cookie, but also returned for legacy fallback checks
  token?: string
  user: any
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function me(): Promise<any> {
  return apiFetch<any>('/api/me', { method: 'GET' })
}

export async function logout(): Promise<void> {
  await apiFetch<any>('/api/auth/logout', {
    method: 'POST',
  })
}

