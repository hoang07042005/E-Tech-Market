import { apiFetch } from '@/configs/api.config'

// ─── Blog Posts (soft-deleted) ───────────────────────────────────────────────

export interface AdminDeletedBlogPost {
  id: number
  title: string
  slug: string
  thumbnail_url: string | null
  is_published: boolean
  views: number
  published_at: string | null
  deleted_at: string | null
  category?: { id: number; name: string } | null
  author?: { id: number; name: string } | null
}

export const fetchAdminDeletedBlogPosts = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/blog-posts?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedBlogPost[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedBlogPost[]
}

export const hardDeleteAdminDeletedBlogPosts = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/blog-posts/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

// ─── Blog Comments (soft-deleted) ───────────────────────────────────────────

export interface AdminDeletedBlogComment {
  id: number
  blog_post_id: number
  author_name: string | null
  author_email: string | null
  content: string
  status: string | null
  deleted_at: string | null
  post?: { id: number; title: string; slug: string } | null
}

export const fetchAdminDeletedBlogComments = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/blog-comments?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedBlogComment[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedBlogComment[]
}

export const hardDeleteAdminDeletedBlogComments = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/blog-comments/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

// ─── Users (soft-deleted) ────────────────────────────────────────────────────

export interface AdminDeletedUser {
  id: number
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  deleted_at: string | null
}

export const fetchAdminDeletedUsers = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/users?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedUser[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedUser[]
}

export const hardDeleteAdminDeletedUsers = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/users/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

// ─── Categories (soft-deleted) ───────────────────────────────────────────────

export interface AdminDeletedCategory {
  id: number
  name: string
  slug: string
  type: string | null
  is_active: boolean
  sort_order: number | null
  deleted_at: string | null
  parent?: { id: number; name: string } | null
}

export const fetchAdminDeletedCategories = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/categories?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedCategory[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedCategory[]
}

export const hardDeleteAdminDeletedCategories = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/categories/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}

// ─── Reviews (soft-deleted) ──────────────────────────────────────────────────

export interface AdminDeletedReview {
  id: number
  product_id: number
  user_id: number
  rating: number
  comment: string
  status: string | null
  deleted_at: string | null
  product?: { id: number; name: string; slug: string } | null
  user?: { id: number; name: string; email: string } | null
}

export const fetchAdminDeletedReviews = async (perPage = 50) => {
  const res = await apiFetch<any>(`/api/admin/deleted-data/reviews?per_page=${perPage}`)
  if (Array.isArray(res)) return res as AdminDeletedReview[]
  return (res?.data ?? res?.items ?? []) as AdminDeletedReview[]
}

export const hardDeleteAdminDeletedReviews = (ids: number[]) => {
  return apiFetch('/api/admin/deleted-data/reviews/hard-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
}
