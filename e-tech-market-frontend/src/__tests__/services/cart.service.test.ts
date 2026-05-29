import {
  addToCart,
  getCart,
  cartCount,
  cartTotal,
  cartItemKey,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  safeParseJson,
} from '@/features/services/cart.service'
import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  localStorage.clear()
})

describe('cart.service', () => {
  it('safeParseJson returns null for malformed json', () => {
    expect(safeParseJson('not-json')).toBeNull()
    expect(safeParseJson(null)).toBeNull()
  })

  it('addToCart creates new item and increments count', () => {
    const item = {
      product_id: 1,
      slug: 'p-1',
      name: 'P1',
      price: 10,
      image_url: null,
      variant_id: null,
      variant_label: null,
      quantity: 1,
    }
    addToCart(item, 2)
    const state = getCart()
    expect(state.items.length).toBe(1)
    expect(cartCount(state)).toBe(2)
    expect(cartTotal(state)).toBe(20)
  })

  it('addToCart increments existing item quantity', () => {
    const item = {
      product_id: 2,
      slug: 'p-2',
      name: 'P2',
      price: 5,
      image_url: null,
      variant_id: 10,
      variant_label: 'XL',
      quantity: 1,
    }
    addToCart(item, 1)
    addToCart(item, 3)
    const state = getCart()
    expect(state.items.length).toBe(1)
    expect(cartCount(state)).toBe(4)
    expect(cartTotal(state)).toBe(20)
  })

  it('updateCartQuantity updates correctly', () => {
    const item = {
      product_id: 3,
      slug: 'p-3',
      name: 'P3',
      price: 7,
      image_url: null,
      variant_id: null,
      variant_label: null,
      quantity: 1,
    }
    addToCart(item, 1)
    const key = cartItemKey(3, null)
    updateCartQuantity(key, 5)
    const state = getCart()
    expect(cartCount(state)).toBe(5)
    expect(cartTotal(state)).toBe(35)
  })

  it('removeFromCart removes item', () => {
    const item = {
      product_id: 4,
      slug: 'p-4',
      name: 'P4',
      price: 3,
      image_url: null,
      variant_id: null,
      variant_label: null,
      quantity: 1,
    }
    addToCart(item, 1)
    const key = cartItemKey(4, null)
    removeFromCart(key)
    const state = getCart()
    expect(state.items.length).toBe(0)
    expect(cartCount(state)).toBe(0)
  })

  it('clearCart empties cart', () => {
    const item = {
      product_id: 5,
      slug: 'p-5',
      name: 'P5',
      price: 2,
      image_url: null,
      variant_id: null,
      variant_label: null,
      quantity: 1,
    }
    addToCart(item, 1)
    clearCart()
    expect(getCart().items.length).toBe(0)
  })
})
