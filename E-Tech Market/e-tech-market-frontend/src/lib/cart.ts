export type CartItem = {
  key: string
  product_id: number
  slug: string
  name: string
  price: number
  image_url: string | null
  variant_id: number | null
  variant_label: string | null
  quantity: number
}

export type CartState = {
  items: CartItem[]
}

const CART_KEY = 'cart'

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function getCart(): CartState {
  const parsed = safeParseJson<CartState>(localStorage.getItem(CART_KEY))
  if (!parsed || !Array.isArray(parsed.items)) return { items: [] }
  return {
    items: parsed.items.filter(Boolean).map((it) => ({
      ...it,
      quantity: Math.max(1, Number(it.quantity) || 1),
    })),
  }
}

export function setCart(next: CartState) {
  localStorage.setItem(CART_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('cart-change'))
}

export function cartItemKey(product_id: number, variant_id: number | null) {
  return `${product_id}:${variant_id ?? 'base'}`
}

export function addToCart(item: Omit<CartItem, 'key'>, qty: number) {
  const quantity = Math.max(1, Math.floor(qty || 1))
  const state = getCart()
  const key = cartItemKey(item.product_id, item.variant_id)
  const idx = state.items.findIndex((x) => x.key === key)
  if (idx >= 0) {
    state.items[idx] = {
      ...state.items[idx],
      quantity: state.items[idx].quantity + quantity,
    }
  } else {
    state.items.unshift({ ...item, key, quantity })
  }
  setCart(state)
}

export function updateCartQuantity(key: string, qty: number) {
  const nextQty = Math.max(1, Math.floor(qty || 1))
  const state = getCart()
  const idx = state.items.findIndex((x) => x.key === key)
  if (idx < 0) return
  state.items[idx] = { ...state.items[idx], quantity: nextQty }
  setCart(state)
}

export function removeFromCart(key: string) {
  const state = getCart()
  setCart({ items: state.items.filter((x) => x.key !== key) })
}

export function clearCart() {
  setCart({ items: [] })
}

export function cartCount(state?: CartState) {
  const s = state ?? getCart()
  return s.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
}

export function cartTotal(state?: CartState) {
  const s = state ?? getCart()
  return s.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0)
}

