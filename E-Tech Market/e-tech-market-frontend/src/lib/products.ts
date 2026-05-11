import { apiFetch } from './api'

export type ProductVariant = {
  id: number
  product_id: number
  variant_name: string
  color: string | null
  configuration: string | null
  sku: string | null
  price: string
  stock_quantity: number
  is_active: boolean
  image_url?: string | null
}

export type ProductFaq = {
  id: number
  product_id?: number
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

export type ProductNews = {
  id: number
  product_id: number
  title: string
  slug: string
  content_html: string
  thumbnail_url: string | null
  sort_order: number
  is_active: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ProductShopQnaPublic = {
  id: number
  user_id?: number | null
  asker_display_name: string
  question: string
  answer: string | null
  answered_at: string | null
  /** Thời điểm khách gửi câu hỏi (API cũ có thể thiếu). */
  created_at?: string
  user?: { id: number; name?: string | null; avatar_url?: string | null } | null
}

export type ProductReview = {
  id: number
  product_id: number
  user_id: number
  order_id: number | null
  rating: number
  exp_performance?: number | null
  exp_battery?: number | null
  exp_camera?: number | null
  comment: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  user?: { id: number; name: string; avatar_url?: string | null } | null
}

export type Product = {
  id: number
  category_id: number
  name: string
  slug: string
  description: string | null
  rich_html?: string | null
  short_description: string | null
  price: string
  old_price: string | null
  brand: string | null
  sku: string | null
  stock_quantity: number
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  main_image_url: string | null
  created_at: string
  updated_at: string
  category?: Category
  images?: { id: number, image_url: string }[]
  specs?: {
    id?: number
    spec_group: string
    spec_key: string
    spec_value: string
    spec_unit: string
    product_variant_id?: number | null
    sort_order?: number
  }[]
  variants?: ProductVariant[]
  faqs?: ProductFaq[]
  news?: ProductNews[]
  reviews?: ProductReview[]
  /** Tổng hợp từ API list `/products` (không phải lúc nào cũng có). */
  avg_rating?: number | string | null
  reviews_count?: number | null
  flash_sale_items?: {
    id: number
    flash_sale_price: number
    quantity_limit: number | null
    sold_quantity: number
    flash_sale: {
      id: number
      name: string
      start_at: string
      end_at: string
      is_active: boolean
    }
  }[]
}

export type Category = {
  id: number
  name: string
  slug: string
  image: string | null
  parent_id: number | null
  is_active: boolean
  children?: Category[]
}

export type PaginatedResponse<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export async function fetchProducts(params: Record<string, unknown> = {}): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.set(key, val.toString())
    }
  })
  
  const queryString = query.toString()
  return apiFetch<PaginatedResponse<Product>>(`/api/products${queryString ? `?${queryString}` : ''}`)
}

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories')
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  return apiFetch<Product>(`/api/products/${slug}`)
}

export async function fetchProductNewsBySlug(slug: string): Promise<ProductNews> {
  return apiFetch<ProductNews>(`/api/product-news/${slug}`)
}
