import { apiFetch } from '@/configs/api.config'

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

// 🔒 Token is sent via httpOnly cookie automatically
export const fetchAdminProducts = async () => {
  const res = await apiFetch<any>('/api/admin/products?per_page=100')
  return (Array.isArray(res) ? res : res?.data || []) as AdminProductList[]
}

export const deleteAdminProduct = (id: number) => {
  return apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
}

export const fetchAdminProductDetail = <T>(id: number) => {
  return apiFetch<T>(`/api/admin/products/${id}`)
}

export const fetchAdminCategories = <T>() => {
  return apiFetch<T>('/api/admin/categories')
}

export const saveAdminProduct = async <T>(data: FormData, id: number | null | undefined) => {
  const url = id ? `/api/admin/products/${id}` : '/api/admin/products'
  return apiFetch<T>(url, {
    method: 'POST',
    body: data
  })
}