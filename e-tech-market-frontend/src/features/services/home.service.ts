import { apiFetch } from '@/configs/api.config'

// Use any to avoid type conflicts with existing services
export type HomeData = any

/** Unified home data - replaces 8 separate API calls with 1 */
// 🔒 Token is sent via httpOnly cookie automatically
export async function fetchHomeData(): Promise<HomeData> {
  return apiFetch<HomeData>('/api/home')
}