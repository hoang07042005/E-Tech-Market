import { describe, it, expect } from 'vitest'
import {
  resolveImageUrl,
  qnaAvatarInitial,
  avatarInitial,
  variantColorLabel,
  variantStorageLabel,
  buildVariantFacetModel,
  ratingLabel,
  timeAgoVi,
} from '@/features/pages/client/products/components/PdpShared'
import type { ProductVariant } from '@/features/services/products.service'

// ---------- resolveImageUrl ----------
describe('resolveImageUrl', () => {
  it('returns placeholder when url is null', () => {
    expect(resolveImageUrl(null)).toBe('https://via.placeholder.com/600')
  })

  it('returns the same url when it starts with http', () => {
    const url = 'https://example.com/img.jpg'
    expect(resolveImageUrl(url)).toBe(url)
  })

  it('returns the same url when it starts with http (non-https)', () => {
    const url = 'http://example.com/img.jpg'
    expect(resolveImageUrl(url)).toBe(url)
  })

  it('prepends API_BASE_URL for relative paths starting with /', () => {
    const result = resolveImageUrl('/storage/products/abc.jpg')
    expect(result).toContain('/storage/products/abc.jpg')
  })

  it('prepends API_BASE_URL with / for relative paths without leading /', () => {
    const result = resolveImageUrl('storage/products/abc.jpg')
    expect(result).toContain('/storage/products/abc.jpg')
  })
})

// ---------- qnaAvatarInitial ----------
describe('qnaAvatarInitial', () => {
  it('returns first char uppercase for normal name', () => {
    expect(qnaAvatarInitial('hoang')).toBe('H')
  })

  it('returns ? for empty string', () => {
    expect(qnaAvatarInitial('')).toBe('?')
  })

  it('trims whitespace before extracting initial', () => {
    expect(qnaAvatarInitial('  nguyen  ')).toBe('N')
  })
})

// ---------- avatarInitial ----------
describe('avatarInitial', () => {
  it('returns first char uppercase', () => {
    expect(avatarInitial('test')).toBe('T')
  })

  it('returns U for empty or falsy input', () => {
    expect(avatarInitial('')).toBe('U')
  })
})

// ---------- variantColorLabel ----------
describe('variantColorLabel', () => {
  const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
    id: 1,
    product_id: 1,
    variant_name: 'Test',
    sku: 'SKU-1',
    price: '1000',
    effective_price: 1000,
    stock_quantity: 10,
    is_active: true,
    color: null,
    configuration: null,
    discount_type: null,
    discount_value: null,
    discount_start_at: null,
    discount_end_at: null,
    image_url: null,
    ...overrides,
  })

  it('returns the color when provided', () => {
    expect(variantColorLabel(makeVariant({ color: 'Đen' }))).toBe('Đen')
  })

  it('returns "Tuỳ chọn" when color is null', () => {
    expect(variantColorLabel(makeVariant({ color: null }))).toBe('Tuỳ chọn')
  })

  it('returns "Tuỳ chọn" when color is empty string', () => {
    expect(variantColorLabel(makeVariant({ color: '  ' }))).toBe('Tuỳ chọn')
  })
})

// ---------- variantStorageLabel ----------
describe('variantStorageLabel', () => {
  const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
    id: 1,
    product_id: 1,
    variant_name: 'Test',
    sku: 'SKU-1',
    price: '1000',
    effective_price: 1000,
    stock_quantity: 10,
    is_active: true,
    color: null,
    configuration: null,
    discount_type: null,
    discount_value: null,
    discount_start_at: null,
    discount_end_at: null,
    image_url: null,
    ...overrides,
  })

  it('returns configuration when provided', () => {
    expect(variantStorageLabel(makeVariant({ configuration: '256GB' }))).toBe('256GB')
  })

  it('extracts GB from variant_name when no configuration', () => {
    expect(variantStorageLabel(makeVariant({ variant_name: 'iPhone 15 128 GB' }))).toBe('128GB')
  })

  it('extracts TB from variant_name', () => {
    expect(variantStorageLabel(makeVariant({ variant_name: 'MacBook 1 TB' }))).toBe('1TB')
  })

  it('returns empty string when no match', () => {
    expect(variantStorageLabel(makeVariant({ variant_name: 'Basic' }))).toBe('')
  })
})

// ---------- buildVariantFacetModel ----------
describe('buildVariantFacetModel', () => {
  const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
    id: 1,
    product_id: 1,
    variant_name: 'Test',
    sku: 'SKU-1',
    price: '1000',
    effective_price: 1000,
    stock_quantity: 10,
    is_active: true,
    color: null,
    configuration: null,
    discount_type: null,
    discount_value: null,
    discount_start_at: null,
    discount_end_at: null,
    image_url: null,
    ...overrides,
  })

  it('builds model with unique colors', () => {
    const variants = [
      makeVariant({ id: 1, color: 'Đen', configuration: '128GB' }),
      makeVariant({ id: 2, color: 'Đen', configuration: '256GB' }),
      makeVariant({ id: 3, color: 'Trắng', configuration: '128GB' }),
    ]
    const model = buildVariantFacetModel(variants)
    expect(model.colors).toEqual(['Đen', 'Trắng'])
  })

  it('sorts storages by capacity', () => {
    const variants = [
      makeVariant({ id: 1, color: 'Đen', configuration: '512GB' }),
      makeVariant({ id: 2, color: 'Đen', configuration: '128GB' }),
      makeVariant({ id: 3, color: 'Đen', configuration: '1TB' }),
    ]
    const model = buildVariantFacetModel(variants)
    expect(model.storages).toEqual(['128GB', '512GB', '1TB'])
  })

  it('handles empty variants array', () => {
    const model = buildVariantFacetModel([])
    expect(model.colors).toEqual([])
    expect(model.storages).toEqual([])
  })
})

// ---------- ratingLabel ----------
describe('ratingLabel', () => {
  it('returns "Tuyệt vời" for rating 5', () => {
    expect(ratingLabel(5)).toBe('Tuyệt vời')
  })

  it('returns "Rất tốt" for rating 4', () => {
    expect(ratingLabel(4)).toBe('Rất tốt')
  })

  it('returns "Tốt" for rating 3', () => {
    expect(ratingLabel(3)).toBe('Tốt')
  })

  it('returns "Tạm ổn" for rating 2', () => {
    expect(ratingLabel(2)).toBe('Tạm ổn')
  })

  it('returns "Chưa hài lòng" for rating 1', () => {
    expect(ratingLabel(1)).toBe('Chưa hài lòng')
  })

  it('clamps out-of-range values', () => {
    expect(ratingLabel(10)).toBe('Tuyệt vời')
    expect(ratingLabel(0)).toBe('Chưa hài lòng')
  })
})

// ---------- timeAgoVi ----------
describe('timeAgoVi', () => {
  it('returns "vừa xong" for a time less than 1 minute ago', () => {
    const now = new Date().toISOString()
    expect(timeAgoVi(now)).toBe('vừa xong')
  })

  it('returns minutes format', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgoVi(d)).toBe('5 phút trước')
  })

  it('returns hours format', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(timeAgoVi(d)).toBe('3 giờ trước')
  })

  it('returns days format', () => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(timeAgoVi(d)).toBe('7 ngày trước')
  })

  it('handles non-ISO date format (YYYY-MM-DD HH:mm:ss)', () => {
    const d = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const formatted = d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
    const result = timeAgoVi(formatted)
    expect(result).toMatch(/giờ trước/)
  })

  it('returns "gần đây" for unparseable date', () => {
    expect(timeAgoVi('not-a-date')).toBe('gần đây')
  })
})
