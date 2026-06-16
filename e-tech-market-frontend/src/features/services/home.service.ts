import { apiFetch } from '@/configs/api.config'

// Use any to avoid type conflicts with existing services
export type HomeData = any

/** Unified home data - replaces 8 separate API calls with 1 */
export async function fetchHomeData(): Promise<HomeData> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  return apiFetch<HomeData>('/api/home', { token })
}