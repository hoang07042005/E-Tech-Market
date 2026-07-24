import { apiFetch } from '@/configs/api.config'

// 🔒 Token is sent via httpOnly cookie automatically - no need to pass token param

// Users & Roles
export const fetchRoles = <T>() => apiFetch<T>('/api/admin/roles')
export const updateRole = <T>(id: number, body: any) => apiFetch<T>(`/api/admin/roles/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const fetchUsers = <T>(query: string) => apiFetch<T>(`/api/admin/users?${query}`)
export const fetchUserDetail = <T>(id: number) => apiFetch<T>(`/api/admin/users/${id}`)
export const updateUser = <T>(id: number, body: any) => apiFetch<T>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteUser = <T>(id: number) => apiFetch<T>(`/api/admin/users/${id}`, { method: 'DELETE' })

// Orders
export const fetchOrders = <T>(query: string) => apiFetch<T>(`/api/admin/orders?${query}`)
export const fetchOrderDetail = <T>(id: number) => apiFetch<T>(`/api/admin/orders/${id}`)
export const updateOrder = <T>(id: number, body: any) => apiFetch<T>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteOrder = <T>(id: number) => apiFetch<T>(`/api/admin/orders/${id}`, { method: 'DELETE' })
export const processOrderReturn = <T>(id: number, action: 'approve' | 'reject' | 'refunded', body: any) => {
  const isFormData = body instanceof FormData
  return apiFetch<T>(`/api/admin/orders/${id}/return-request/${action}`, {
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
  })
}

export const fetchDeliveryStaffs = <T>() => apiFetch<T>('/api/admin/orders/delivery-staff')

// Settings & Shipping
export const fetchSettings = <T>() => apiFetch<T>('/api/admin/settings')
export const updateSettings = <T>(body: any) => apiFetch<T>('/api/admin/settings', { method: 'POST', body: JSON.stringify(body) })
export const fetchZones = <T>() => apiFetch<T>('/api/admin/shipping/zones')
export const createZone = <T>(body: any) => apiFetch<T>('/api/admin/shipping/zones', { method: 'POST', body: JSON.stringify(body) })
export const updateZone = <T>(id: number, body: any) => apiFetch<T>(`/api/admin/shipping/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteZone = <T>(id: number) => apiFetch<T>(`/api/admin/shipping/zones/${id}`, { method: 'DELETE' })
export const fetchMethods = <T>() => apiFetch<T>('/api/admin/shipping/methods')
export const createMethod = <T>(body: any) => apiFetch<T>('/api/admin/shipping/methods', { method: 'POST', body: JSON.stringify(body) })
export const updateMethod = <T>(id: number, body: any) => apiFetch<T>(`/api/admin/shipping/methods/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteMethod = <T>(id: number) => apiFetch<T>(`/api/admin/shipping/methods/${id}`, { method: 'DELETE' })

// Flash Sales
export const fetchFlashSales = <T>() => apiFetch<T>('/api/admin/flash-sales')
export const fetchFlashSaleDetail = <T>(id: number) => apiFetch<T>(`/api/admin/flash-sales/${id}`)

// Shop QnA
export const fetchShopQna = <T>(status: 'pending' | 'all' = 'pending') =>
  apiFetch<T>(`/api/admin/shop-qna?status=${status}`)
export const fetchPendingQna = <T>() => fetchShopQna<T>('pending')
export const deleteShopQna = <T>(productId: number, qnaId: number) =>
  apiFetch<T>(`/api/admin/products/${productId}/shop-qna/${qnaId}`, { method: 'DELETE' })

// Coupons
export const fetchCoupons = <T>(page: number, limit: number) => apiFetch<T>(`/api/admin/coupons?page=${page}&limit=${limit}`)

// Contacts
export const fetchContacts = <T>(url: string) => apiFetch<T>(url)
export const handleContact = <T>(id: number, body: any) => apiFetch<T>(`/api/admin/contact-messages/${id}/handle`, { method: 'PATCH', body: JSON.stringify(body) })

// Blog
export const fetchBlogPosts = <T>() => apiFetch<T>('/api/admin/blog-posts')
export const fetchBlogCategories = <T>() => apiFetch<T>('/api/blog/categories')
export const createBlogCategory = <T>(body: any) => apiFetch<T>('/api/admin/blog-categories', { method: 'POST', body: JSON.stringify(body) })

// Reviews
export const fetchReviews = <T>(url: string) => apiFetch<T>(url)

// Dashboard
export const fetchDashboardStats = <T>(range: string, startDate?: string, endDate?: string, resolution?: string) => {
  let url = `/api/admin/dashboard/stats?range=${encodeURIComponent(range)}`
  if (resolution) {
    url += `&resolution=${encodeURIComponent(resolution)}`
  }
  if (range === 'custom' && startDate && endDate) {
    url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return apiFetch<T>(url)
}
export const fetchNotifications = <T>(url: string) => apiFetch<T>(url)