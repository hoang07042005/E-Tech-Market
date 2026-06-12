import { apiFetch, API_BASE_URL } from '@/configs/api.config'

export interface Category {
  id: number
  name: string
}

export interface AdminProductList {
  id: number
  name: string
  slug: string
  price: string
  brand: string | null
  category_id: number
  category?: Category
  is_active: boolean
  description: string | null
  main_image_url: string | null
  images?: any[]
  variants?: any[]
}

export const fetchAdminProducts = async (token: string | null) => {
  const res = await apiFetch<any>('/api/admin/products?per_page=100', { token })
  return (Array.isArray(res) ? res : res?.data || []) as AdminProductList[]
}

export const deleteAdminProduct = (id: number, token: string | null) => {
  return apiFetch(`/api/admin/products/${id}`, { method: 'DELETE', token })
}

export const fetchAdminProductDetail = <T>(id: number, token: string | null) => {
  return apiFetch<T>(`/api/admin/products/${id}`, { token })
}

export const fetchAdminCategories = <T>(token: string | null) => {
  return apiFetch<T>('/api/admin/categories', { token })
}

export const saveAdminProduct = async <T>(data: FormData, id: number | null | undefined, token: string | null) => {
  const url = id ? `/api/admin/products/${id}` : '/api/admin/products'
  return apiFetch<T>(url, {
    method: 'POST',
    token,
    body: data
  })
}
