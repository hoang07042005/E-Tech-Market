import { describe, it, expect } from 'vitest'
import { buildVideoPayload } from '@/features/services/admin/videos.admin.service'

describe('buildVideoPayload', () => {
  it('keeps nullable fields in payload so backend can normalize them', () => {
    const payload = buildVideoPayload({
      linked_type: 'general',
      product_id: '',
      category_id: '',
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      is_active: true,
      sort_order: 0,
    })

    expect(payload.get('product_id')).toBe('')
    expect(payload.get('video_category_id')).toBe('')
  })

  it('includes a selected category id for general videos', () => {
    const payload = buildVideoPayload({
      linked_type: 'general',
      product_id: '',
      category_id: '7',
      title: 'Demo',
      description: 'Desc',
      video_url: 'https://example.com/video',
      thumbnail_url: '',
      is_active: true,
      sort_order: 2,
    })

    expect(payload.get('video_category_id')).toBe('7')
    expect(payload.get('title')).toBe('Demo')
    expect(payload.get('video_url')).toBe('https://example.com/video')
  })
})
