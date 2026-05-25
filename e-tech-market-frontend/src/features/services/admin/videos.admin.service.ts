import { apiFetch } from '@/configs/api.config'

export interface VideoCategory {
  id: number
  name: string
  slug: string
  is_active?: boolean
  description?: string
  sort_order?: number | null
}

export interface Video {
  id: number
  product_id?: number | null
  video_category_id?: number | null
  category_id?: number | null
  title?: string | null
  description?: string | null
  video_url: string
  thumbnail_url?: string | null
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  product?: {
    id: number
    name: string
    main_image_url?: string | null
  } | null
  category?: VideoCategory | null
  videoCategory?: VideoCategory | null
  video_category?: VideoCategory | null
}

export const fetchAdminVideos = (token: string | null, productId?: number | null) => {
  let url = '/api/admin/videos'
  if (productId) {
    url += `?product_id=${productId}`
  }
  return apiFetch<Video[]>(url, { token })
}

export const fetchAdminVideoDetail = (id: number, token: string | null) => {
  return apiFetch<Video>(`/api/admin/videos/${id}`, { token })
}

export const deleteAdminVideo = (id: number, token: string | null) => {
  return apiFetch(`/api/admin/videos/${id}`, { method: 'DELETE', token })
}

export const saveAdminVideo = async (data: FormData, id: number | null | undefined, token: string | null) => {
  const url = id ? `/api/admin/videos/${id}` : '/api/admin/videos'
  
  if (id) {
    data.append('_method', 'PUT')
  }

  const response = await apiFetch<Video>(url, {
    method: 'POST',
    body: data,
    token,
  })
  return response
}
