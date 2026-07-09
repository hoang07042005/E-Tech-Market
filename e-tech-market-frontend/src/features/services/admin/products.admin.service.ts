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

export interface AdminDeletedProductVariant {
  id: number
  product_id: number
  variant_name: string | null
  stock_quantity: number | null
  image_url: string | null
  deleted_at: string | null
}

export const fetchAdminDeletedProductVariants = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/products/deleted-variants?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedProductVariant[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedProductVariant[]
}

export const hardDeleteAdminDeletedProductVariants = (variantIds: number[]) => {
  return apiFetch('/api/admin/products/deleted-variants/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant_ids: variantIds })
  })
}
