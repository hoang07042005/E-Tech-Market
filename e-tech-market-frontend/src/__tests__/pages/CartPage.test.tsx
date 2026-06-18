import { renderWithProviders as render } from '../utils/test-utils';
import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CartPage from '../../features/pages/client/cart/CartPage'

const createIntersectionObserverMock = () => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
})
import * as productService from '../../features/services/products.service'

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

  localStorage.clear()
})

describe('CartPage Component', () => {
  it('shows empty cart state when there are no items', async () => {
    vi.spyOn(productService, 'fetchProducts').mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      per_page: 6,
    })

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Giỏ hàng của bạn đang trống/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quay lại cửa hàng/i })).toBeInTheDocument()
  })

  it('renders cart items and total price when cart has content', async () => {
    localStorage.setItem('cart', JSON.stringify({
      items: [
        {
          key: '1:null',
          product_id: 1,
          slug: 'test-product',
          name: 'Test Product',
          price: 120000,
          image_url: 'test.jpg',
          variant_id: null,
          variant_label: null,
          quantity: 1,
        },
      ],
    }))

    vi.spyOn(productService, 'fetchProducts').mockResolvedValue({
      data: [
        {
          id: 2,
          category_id: 3,
          name: 'Suggested Product',
          slug: 'suggested-product',
          description: 'Suggested item',
          short_description: 'Suggested',
          price: '200000',
          brand: 'BrandX',
          sku: 'SUGSKU',
          stock_quantity: 5,
          is_active: true,
          is_featured: false,
          is_new: false,
          main_image_url: null,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
          avg_rating: 4,
          reviews_count: 2,
          variants: [],
        },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
      per_page: 6,
    })

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Test Product/i)).toBeInTheDocument()
    expect(screen.getByText(/1 sản phẩm/i)).toBeInTheDocument()
    expect(screen.getAllByText(/120.000 đ/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Suggested Product/i)).toBeInTheDocument()
  })
})
