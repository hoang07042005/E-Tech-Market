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

export const fetchAdminProducts = (token: string | null) => {
  return apiFetch<AdminProductList[]>('/api/admin/products', { token })
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
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: data
  })
  
  const resData = await response.json() as { message?: string } & T
  if (!response.ok) {
    throw new Error(resData.message || 'Lỗi khi lưu sản phẩm')
  }
  return resData
}
