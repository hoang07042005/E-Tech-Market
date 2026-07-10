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

// ─── Products (soft-deleted) ────────────────────────────────────────────────

export interface AdminDeletedProduct {
  id: number
  name: string
  slug: string
  brand: string | null
  main_image_url: string | null
  is_active: boolean
  is_featured: boolean
  category?: { id: number; name: string } | null
  deleted_at: string | null
}

export const fetchAdminDeletedProducts = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/products?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedProduct[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedProduct[]
}

export const hardDeleteAdminDeletedProducts = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/products/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

// ─── Product News (soft-deleted) ────────────────────────────────────────────

export interface AdminDeletedProductNews {
  id: number
  product_id: number
  title: string
  slug: string
  thumbnail_url: string | null
  is_active: boolean
  published_at: string | null
  deleted_at: string | null
  product?: { id: number; name: string; slug: string } | null
}

export const fetchAdminDeletedProductNews = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/product-news?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedProductNews[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedProductNews[]
}

export const hardDeleteAdminDeletedProductNews = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/product-news/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

// ─── Product FAQs (soft-deleted) ────────────────────────────────────────────

export interface AdminDeletedProductFaq {
  id: number
  product_id: number
  question: string
  answer: string | null
  sort_order: number | null
  is_active: boolean
  deleted_at: string | null
  product?: { id: number; name: string; slug: string } | null
}

export const fetchAdminDeletedProductFaqs = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/product-faqs?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedProductFaq[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedProductFaq[]
}

export const hardDeleteAdminDeletedProductFaqs = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/product-faqs/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}
