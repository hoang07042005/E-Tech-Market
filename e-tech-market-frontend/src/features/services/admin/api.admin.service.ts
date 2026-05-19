import { apiFetch } from '@/configs/api.config'

// Users & Roles
export const fetchRoles = <T>(token: string | null) => apiFetch<T>('/api/admin/roles', { token })
export const fetchUsers = <T>(query: string, token: string | null) => apiFetch<T>(`/api/admin/users?${query}`, { token })
export const fetchUserDetail = <T>(id: number, token: string | null) => apiFetch<T>(`/api/admin/users/${id}`, { token })
export const updateUser = <T>(id: number, body: any, token: string | null) => apiFetch<T>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body), token })
export const deleteUser = <T>(id: number, token: string | null) => apiFetch<T>(`/api/admin/users/${id}`, { method: 'DELETE', token })

// Orders
export const fetchOrders = <T>(query: string, token: string | null) => apiFetch<T>(`/api/admin/orders?${query}`, { token })
export const fetchOrderDetail = <T>(id: number, token: string | null) => apiFetch<T>(`/api/admin/orders/${id}`, { token })
export const updateOrder = <T>(id: number, body: any, token: string | null) => apiFetch<T>(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body), token })
export const processOrderReturn = <T>(id: number, action: 'approve' | 'reject' | 'refunded', body: any, token: string | null) => {
  const isFormData = body instanceof FormData
  return apiFetch<T>(`/api/admin/orders/${id}/return-request/${action}`, {
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
    token
  })
}

// Settings & Shipping
export const fetchSettings = <T>(token: string | null) => apiFetch<T>('/api/admin/settings', { token })
export const updateSettings = <T>(body: any, token: string | null) => apiFetch<T>('/api/admin/settings', { method: 'POST', body: JSON.stringify(body), token })
export const fetchZones = <T>(token: string | null) => apiFetch<T>('/api/admin/shipping/zones', { token })
export const createZone = <T>(body: any, token: string | null) => apiFetch<T>('/api/admin/shipping/zones', { method: 'POST', body: JSON.stringify(body), token })
export const updateZone = <T>(id: number, body: any, token: string | null) => apiFetch<T>(`/api/admin/shipping/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body), token })
export const deleteZone = <T>(id: number, token: string | null) => apiFetch<T>(`/api/admin/shipping/zones/${id}`, { method: 'DELETE', token })
export const fetchMethods = <T>(token: string | null) => apiFetch<T>('/api/admin/shipping/methods', { token })
export const createMethod = <T>(body: any, token: string | null) => apiFetch<T>('/api/admin/shipping/methods', { method: 'POST', body: JSON.stringify(body), token })
export const updateMethod = <T>(id: number, body: any, token: string | null) => apiFetch<T>(`/api/admin/shipping/methods/${id}`, { method: 'PATCH', body: JSON.stringify(body), token })
export const deleteMethod = <T>(id: number, token: string | null) => apiFetch<T>(`/api/admin/shipping/methods/${id}`, { method: 'DELETE', token })

// Flash Sales
export const fetchFlashSales = <T>(token: string | null) => apiFetch<T>('/api/admin/flash-sales', { token })
export const fetchFlashSaleDetail = <T>(id: number, token: string | null) => apiFetch<T>(`/api/admin/flash-sales/${id}`, { token })

// Shop QnA
export const fetchPendingQna = <T>(token: string | null) => apiFetch<T>('/api/admin/shop-qna/pending', { token })

// Coupons
export const fetchCoupons = <T>(page: number, limit: number, token: string | null) => apiFetch<T>(`/api/admin/coupons?page=${page}&limit=${limit}`, { token })

// Contacts
export const fetchContacts = <T>(url: string, token: string | null) => apiFetch<T>(url, { token })
export const handleContact = <T>(id: number, body: any, token: string | null) => apiFetch<T>(`/api/admin/contact-messages/${id}/handle`, { method: 'PATCH', body: JSON.stringify(body), token })

// Blog
export const fetchBlogPosts = <T>(token: string | null) => apiFetch<T>('/api/admin/blog-posts', { token })
export const fetchBlogCategories = <T>(token: string | null) => apiFetch<T>('/api/blog/categories', { token })
export const createBlogCategory = <T>(body: any, token: string | null) => apiFetch<T>('/api/admin/blog-categories', { method: 'POST', body: JSON.stringify(body), token })

// Reviews
export const fetchReviews = <T>(url: string, token: string | null) => apiFetch<T>(url, { token })

// Dashboard
export const fetchDashboardStats = <T>(range: string, token: string | null, startDate?: string, endDate?: string) => {
  let url = `/api/admin/dashboard/stats?range=${encodeURIComponent(range)}`
  if (range === 'custom' && startDate && endDate) {
    url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
  }
  return apiFetch<T>(url, { token })
}
export const fetchNotifications = <T>(url: string, token: string | null) => apiFetch<T>(url, { token })
