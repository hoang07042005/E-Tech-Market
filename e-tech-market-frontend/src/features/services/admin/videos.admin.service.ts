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
  products?: {
    id: number
    name: string
    main_image_url?: string | null
  }[] | null
  category?: VideoCategory | null
  videoCategory?: VideoCategory | null
  video_category?: VideoCategory | null
}

// 🔒 Token is sent via httpOnly cookie automatically
export const fetchAdminVideos = (productId?: number | null) => {
  let url = '/api/admin/videos'
  if (productId) {
    url += `?product_id=${productId}`
  }
  return apiFetch<Video[]>(url)
}

export const fetchAdminVideoDetail = (id: number) => {
  return apiFetch<Video>(`/api/admin/videos/${id}`)
}

export const deleteAdminVideo = (id: number) => {
  return apiFetch(`/api/admin/videos/${id}`, { method: 'DELETE' })
}

export interface VideoFormPayload {
  linked_type: 'product' | 'general'
  product_ids: string[]
  category_id: string
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  is_active: boolean
  sort_order: number
}

export const buildVideoPayload = (formData: VideoFormPayload) => {
  const payload = new FormData()

  if (formData.linked_type === 'product') {
    if (formData.product_ids && formData.product_ids.length > 0) {
      formData.product_ids.forEach((id, index) => {
        if (id.trim()) {
          payload.append(`product_ids[${index}]`, id.trim())
        }
      })
    }
    payload.append('video_category_id', '')
  } else {
    if (formData.category_id?.trim()) {
      payload.append('video_category_id', formData.category_id.trim())
    }
    // No product_ids
  }

  if (formData.title?.trim()) payload.append('title', formData.title.trim())
  if (formData.description?.trim()) payload.append('description', formData.description.trim().slice(0, 2500))
  if (formData.video_url?.trim()) payload.append('video_url', formData.video_url.trim())
  if (formData.thumbnail_url?.trim()) payload.append('thumbnail_url', formData.thumbnail_url.trim())

  payload.append('is_active', formData.is_active ? '1' : '0')
  payload.append('sort_order', String(formData.sort_order ?? 0))

  return payload
}

export const saveAdminVideo = async (data: FormData, id: number | null | undefined) => {
  const url = id ? `/api/admin/videos/${id}` : '/api/admin/videos'

  if (id) {
    data.append('_method', 'PUT')
  }

  const response = await apiFetch<Video>(url, {
    method: 'POST',
    body: data,
  })
  return response
}