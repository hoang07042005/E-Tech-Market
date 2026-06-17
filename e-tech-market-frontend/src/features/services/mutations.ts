import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchWishlist, toggleWishlist, type WishlistItem } from './wishlist.service'
import { addToCart as cartServiceAddToCart, updateCartQuantity as cartServiceUpdateCartQuantity, removeFromCart as cartServiceRemoveFromCart, clearCart as cartServiceClearCart } from './cart.service'
import type { CartItem } from './cart.service'
import { apiFetch } from '@/configs/api.config'

export function useWishlistQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['wishlist', true],
    queryFn: fetchWishlist,
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export function useWishlistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product_id: number) => {
      return toggleWishlist(product_id)
    },
    onMutate: async (product_id) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['wishlist'] })

      // Snapshot the previous value
      const previousWishlist = queryClient.getQueryData<WishlistItem[]>(['wishlist', true])

      // Optimistically update to the new value
      if (previousWishlist) {
        const isLiked = previousWishlist.some(w => w.product_id === product_id)
        if (isLiked) {
          queryClient.setQueryData<WishlistItem[]>(['wishlist', true], old => old ? old.filter(w => w.product_id !== product_id) : [])
        } else {
          queryClient.setQueryData<WishlistItem[]>(['wishlist', true], old => [...(old || []), { product_id, user_id: 0, id: Date.now(), product: null }])
        }
      }

      return { previousWishlist }
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist', true], context.previousWishlist)
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })
}

export function useCartMutation() {
  const queryClient = useQueryClient()

  const addMutation = useMutation({
    mutationFn: async ({ item, qty }: { item: Omit<CartItem, 'key'>, qty: number }) => {
      // The cart.service.ts addToCart already updates localStorage optimistically and dispatches events.
      // But we will use the API call here and let the mutation handle the promise.
      const quantity = Math.max(1, Math.floor(qty || 1))
      return apiFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: quantity,
          unit_price: item.price
        })
      })
    },
    onMutate: async ({ item, qty }) => {
      // Optimistic update using the existing service function
      cartServiceAddToCart(item, qty)
    },
    // We don't need a strict rollback here for cart because the UI relies on cart.service which handles localStorage.
    // If we wanted full rollback, we'd snapshot the cart state.
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, qty, productId, variantId }: { key: string, qty: number, productId: number, variantId: number | null }) => {
      const nextQty = Math.max(1, Math.floor(qty || 1))
      return apiFetch(`/api/cart/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: nextQty, variant_id: variantId })
      })
    },
    onMutate: async ({ key, qty }) => {
      cartServiceUpdateCartQuantity(key, qty)
    }
  })

  const removeMutation = useMutation({
    mutationFn: async ({ key, productId, variantId }: { key: string, productId: number, variantId: number | null }) => {
      const qs = variantId ? `?variant_id=${variantId}` : ''
      return apiFetch(`/api/cart/items/${productId}${qs}`, { method: 'DELETE' })
    },
    onMutate: async ({ key }) => {
      cartServiceRemoveFromCart(key)
    }
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      return Promise.resolve() // The cart.service.ts clearCart loops over items and calls DELETE. We can just use the service.
    },
    onMutate: async () => {
      cartServiceClearCart()
    }
  })

  return {
    addToCart: addMutation.mutate,
    updateQuantity: updateMutation.mutate,
    removeFromCart: removeMutation.mutate,
    clearCart: clearMutation.mutate,
  }
}
