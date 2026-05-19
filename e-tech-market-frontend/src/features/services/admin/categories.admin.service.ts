import { apiFetch } from '@/configs/api.config'

export interface Category {
  id: number
  name: string
  slug: string
  parent_id: number | null
  is_active: boolean
  description?: string
  image?: string | null
}

export const fetchAdminCategories = (token: string | null) => {
  return apiFetch<Category[]>('/api/admin/categories', { token })
}

export const deleteAdminCategory = (id: number, token: string | null) => {
  return apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE', token })
}

export const saveAdminCategory = (payload: FormData, id: number | null | undefined, token: string | null) => {
  if (id) {
    payload.set('_method', 'PUT')
    return apiFetch(`/api/admin/categories/${id}`, {
      method: 'POST',
      body: payload,
      token
    })
  } else {
    return apiFetch('/api/admin/categories', {
      method: 'POST',
      body: payload,
      token
    })
  }
}
