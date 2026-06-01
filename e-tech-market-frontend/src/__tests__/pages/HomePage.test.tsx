import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../features/pages/client/home/HomePage'
import * as productService from '../../features/services/products.service'
import * as bannerService from '../../features/services/client/banners.client.service'
import * as compareService from '../../features/services/compare.service'
import * as apiConfig from '../../configs/api.config'

const createIntersectionObserverMock = () => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
})

const featuredProduct = {
  id: 1,
  category_id: 2,
  name: 'Test Product',
  slug: 'test-product',
  description: 'Test description',
  short_description: 'A great product',
  price: '100000',
  brand: 'TestBrand',
  sku: 'TESTSKU',
  stock_quantity: 10,
  is_active: true,
  is_featured: true,
  is_new: false,
  main_image_url: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  variants: [
    {
      id: 1,
      product_id: 1,
      variant_name: 'Base',
      color: null,
      configuration: null,
      sku: 'TEST-SKU',
      price: '100000',
      discount_type: null,
      discount_value: null,
      discount_start_at: null,
      discount_end_at: null,
      effective_price: 100000,
      stock_quantity: 10,
      is_active: true,
      image_url: null,
    },
  ],
  avg_rating: 4.5,
  reviews_count: 10,
}

beforeEach(() => {
  vi.clearAllMocks()

  const intersectionObserverMock = createIntersectionObserverMock()
  const IntersectionObserver = vi.fn(function () {
    return intersectionObserverMock
  })
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: IntersectionObserver,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(window, 'IntersectionObserver', {
    value: IntersectionObserver,
    configurable: true,
    writable: true,
  })

  const storageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem(key: string) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
      },
      setItem(key: string, value: string) {
        store[key] = String(value)
      },
      removeItem(key: string) {
        delete store[key]
      },
      clear() {
        store = {}
      },
    }
  })()

  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(window, 'localStorage', {
    value: storageMock,
    configurable: true,
    writable: true,
  })

  vi.spyOn(productService, 'fetchProducts').mockResolvedValue({
    data: [featuredProduct],
    current_page: 1,
    last_page: 1,
    total: 1,
    per_page: 10,
  })
  vi.spyOn(apiConfig, 'apiFetch').mockImplementation(async (url: string) => {
    if (url.includes('/api/coupons')) return [] as any
    if (url.includes('/api/reviews')) return [] as any
    if (url.includes('/api/blog/posts')) return { data: [] } as any
    if (url.includes('/api/videos')) return [] as any
    return null as any
  })
  vi.spyOn(productService, 'fetchCategories').mockResolvedValue([])
  vi.spyOn(bannerService, 'fetchActiveBanners').mockResolvedValue([])
  vi.spyOn(compareService, 'getCompareList').mockReturnValue([])
})

describe('HomePage Component', () => {
  it('renders featured products and calls homepage services', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Test Product/i).length).toBeGreaterThan(0)
    })

    expect(productService.fetchProducts).toHaveBeenCalled()
    expect(productService.fetchCategories).toHaveBeenCalled()
    expect(bannerService.fetchActiveBanners).toHaveBeenCalled()
    expect(screen.getAllByText(/A great product/i).length).toBeGreaterThan(0)
  })

  it('shows placeholder image for products without media urls', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )

    const productImages = await screen.findAllByAltText(/Test Product/i)
    expect(productImages.length).toBeGreaterThan(0)
    const img = productImages[0] as HTMLImageElement
    expect(img.src).toContain('https://via.placeholder.com/400')
  })
})
