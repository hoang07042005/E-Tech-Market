import { apiFetch } from './api'
import type { Product } from './products'

export type WishlistItem = {
  id: number
  user_id: number
  product_id: number
  created_at?: string
  product: Product | null
}

export async function fetchWishlist(token: string): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>('/wishlist', { token })
}

export async function toggleWishlist(token: string, product_id: number): Promise<'added' | 'removed'> {
  const res = await apiFetch<{ status: 'added' | 'removed' }>('/wishlist/toggle', {
    token,
    method: 'POST',
    body: JSON.stringify({ product_id }),
  })
  return res.status
}

