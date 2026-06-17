import { apiFetch } from '@/configs/api.config'

export interface VideoCategory {
  id: number
  name: string
  slug: string
  is_active: boolean
  description?: string
  sort_order?: number | null
}

export type Category = VideoCategory

// 🔒 Token is sent via httpOnly cookie automatically
export const fetchAdminVideoCategories = () => {
  return apiFetch<VideoCategory[]>('/api/admin/video-categories')
}

export const deleteAdminVideoCategory = (id: number) => {
  return apiFetch(`/api/admin/video-categories/${id}`, { method: 'DELETE' })
}

export const saveAdminVideoCategory = (
  payload: FormData,
  id: number | null | undefined,
) => {
  if (id) {
    payload.set('_method', 'PUT')
    return apiFetch(`/api/admin/video-categories/${id}`, {
      method: 'POST',
      body: payload,
    })
  }

  return apiFetch('/api/admin/video-categories', {
    method: 'POST',
    body: payload,
  })
}