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

export const fetchAdminVideoCategories = (token: string | null) => {
  return apiFetch<VideoCategory[]>('/api/admin/video-categories', { token })
}

export const deleteAdminVideoCategory = (id: number, token: string | null) => {
  return apiFetch(`/api/admin/video-categories/${id}`, { method: 'DELETE', token })
}

export const saveAdminVideoCategory = (
  payload: FormData,
  id: number | null | undefined,
  token: string | null
) => {
  if (id) {
    payload.set('_method', 'PUT')
    return apiFetch(`/api/admin/video-categories/${id}`, {
      method: 'POST',
      body: payload,
      token
    })
  }

  return apiFetch('/api/admin/video-categories', {
    method: 'POST',
    body: payload,
    token
  })
}
