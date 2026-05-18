
export type CompareProduct = {
  id: number
  name: string
  slug: string
  image_url: string
  price: number
}

const STORAGE_KEY = 'etech_compare_list'

export function getCompareList(): CompareProduct[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  try {
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToCompare(product: CompareProduct): { success: boolean; message?: string } {
  const list = getCompareList()
  if (list.some(p => p.id === product.id)) {
    return { success: false, message: 'Sản phẩm đã có trong danh sách so sánh.' }
  }
  if (list.length >= 3) {
    return { success: false, message: 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm.' }
  }
  
  const newList = [...list, product]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
  window.dispatchEvent(new CustomEvent('compare-change'))
  return { success: true }
}

export function removeFromCompare(productId: number) {
  const list = getCompareList()
  const newList = list.filter(p => p.id !== productId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
  window.dispatchEvent(new CustomEvent('compare-change'))
}

export function clearCompare() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent('compare-change'))
}
