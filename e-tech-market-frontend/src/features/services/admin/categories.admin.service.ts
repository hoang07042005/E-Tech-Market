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

// 🔒 Token is sent via httpOnly cookie automatically
export const fetchAdminCategories = () => {
  return apiFetch<Category[]>('/api/admin/categories')
}

export const fetchAdminCategoriesByType = (type?: 'product' | 'video') => {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  return apiFetch<Category[]>(`/api/admin/categories${qs}`)
}

export const deleteAdminCategory = (id: number) => {
  return apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
}

export const saveAdminCategory = (payload: FormData, id: number | null | undefined) => {
  if (id) {
    payload.set('_method', 'PUT')
    return apiFetch(`/api/admin/categories/${id}`, {
      method: 'POST',
      body: payload,
    })
  } else {
    return apiFetch('/api/admin/categories', {
      method: 'POST',
      body: payload,
    })
  }
}