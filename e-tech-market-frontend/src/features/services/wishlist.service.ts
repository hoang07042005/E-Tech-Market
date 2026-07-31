import { apiFetch } from '@/configs/api.config'
import type { Product } from '@/features/services/products.service'

export type WishlistItem = {
  id: number
  user_id: number
  product_id?: number
  blog_post_id?: number
  video_id?: number
  product_news_id?: number
  created_at?: string
  product?: Product | null
  blog_post?: any | null
  video?: any | null
  product_news?: any | null
}

// 🔒 Token is sent via httpOnly cookie automatically - no need to pass token
export async function fetchWishlist(type: string = 'product'): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>(`/wishlist?type=${type}`)
}

export async function toggleWishlist(id: number, type: string = 'product'): Promise<'added' | 'removed'> {
  const res = await apiFetch<{ status: 'added' | 'removed' }>('/wishlist/toggle', {
    method: 'POST',
    body: JSON.stringify({ id, type }),
  })
  return res.status
}

