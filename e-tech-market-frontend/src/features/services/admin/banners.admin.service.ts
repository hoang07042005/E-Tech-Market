import { apiFetch } from '@/configs/api.config'

export interface Banner {
  id: number
  title: string | null
  description: string | null
  image_url: string
  link_url: string | null
  is_active: boolean
  sort_order: number
}

// 🔒 Token is sent via httpOnly cookie automatically
export const fetchAdminBanners = () => {
  return apiFetch<Banner[]>('/api/admin/banners')
}

export const fetchAdminBannerDetail = (id: number) => {
  return apiFetch<Banner>(`/api/admin/banners/${id}`)
}

export const deleteAdminBanner = (id: number) => {
  return apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
}

export const saveAdminBanner = async (data: FormData, id: number | null | undefined) => {
  const url = id ? `/api/admin/banners/${id}` : '/api/admin/banners'
  if (id) {
    data.append('_method', 'PUT') // Laravel requires _method=PUT for multipart form updates
  }

  const response = await apiFetch<Banner>(url, {
    method: 'POST', // Always POST for FormData in Laravel, use _method=PUT for updates
    body: data,
  })

  return response
}