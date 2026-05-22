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

export const fetchActiveBanners = () => {
  return apiFetch<Banner[]>('/api/banners')
}
