import { apiFetch } from '@/configs/api.config'
import type { Product } from '@/features/services/products.service'

export type WishlistItem = {
  id: number
  user_id: number
  product_id: number
  created_at?: string
  product: Product | null
}

// 🔒 Token is sent via httpOnly cookie automatically - no need to pass token
export async function fetchWishlist(): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>('/wishlist')
}

export async function toggleWishlist(product_id: number): Promise<'added' | 'removed'> {
  const res = await apiFetch<{ status: 'added' | 'removed' }>('/wishlist/toggle', {
    method: 'POST',
    body: JSON.stringify({ product_id }),
  })
  return res.status
}

