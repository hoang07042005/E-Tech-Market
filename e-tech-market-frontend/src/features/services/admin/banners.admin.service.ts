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

export const fetchAdminBanners = (token: string | null) => {
  return apiFetch<Banner[]>('/api/admin/banners', { token })
}

export const fetchAdminBannerDetail = (id: number, token: string | null) => {
  return apiFetch<Banner>(`/api/admin/banners/${id}`, { token })
}

export const deleteAdminBanner = (id: number, token: string | null) => {
  return apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE', token })
}

export const saveAdminBanner = async (data: FormData, id: number | null | undefined, token: string | null) => {
  const url = id ? `/api/admin/banners/${id}` : '/api/admin/banners'
  if (id) {
    data.append('_method', 'PUT') // Laravel requires _method=PUT for multipart form updates
  }

  const response = await apiFetch<Banner>(url, {
    method: 'POST', // Always POST for FormData in Laravel, use _method=PUT for updates
    token,
    body: data,
  })

  return response
}
