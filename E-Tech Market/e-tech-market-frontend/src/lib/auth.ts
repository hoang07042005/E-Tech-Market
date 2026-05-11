import { apiFetch } from './api'

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
  token: string
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

export async function me(token: string): Promise<any> {
  return apiFetch<any>('/api/me', { method: 'GET', token })
}

export async function logout(token: string): Promise<void> {
  await apiFetch<any>('/api/auth/logout', {
    method: 'POST',
    token,
  })
}

