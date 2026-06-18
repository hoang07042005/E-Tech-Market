import { renderWithProviders as render } from '../utils/test-utils';
import '@testing-library/jest-dom'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProductDetailPage from '../../features/pages/client/products/ProductDetailPage'

const createIntersectionObserverMock = () => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
})
import * as productService from '../../features/services/products.service'
import * as cartService from '../../features/services/cart.service'
import { GlobalToastProvider } from '../../components/GlobalToastProvider'

const mockProduct = {
  id: 1,
  category_id: 2,
  name: 'Test Product',
  slug: 'test-product',
  description: 'Nice product',
  short_description: 'Should buy this',
  price: '100000',
  brand: 'TestBrand',
  sku: 'TESTSKU',
  stock_quantity: 10,
  is_active: true,
  is_featured: false,
  is_new: false,
  main_image_url: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  avg_rating: 4,
  reviews_count: 5,
  variants: [
    {
      id: 2,
      product_id: 1,
      variant_name: 'Default',
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
  specs: [],
  reviews: [],
  faqs: [],
  news: [],
  videos: [],
}

const queryClient = new QueryClient()

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
  queryClient.clear()

  vi.spyOn(productService, 'fetchProductBySlug').mockResolvedValue(mockProduct)
  vi.spyOn(productService, 'fetchProducts').mockResolvedValue({
    data: [],
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  })
  vi.spyOn(cartService, 'addToCart').mockImplementation(() => undefined)
})

describe('ProductDetailPage Component', () => {
  it('renders product details and allows adding to cart', async () => {
    render(
      <GlobalToastProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/products/test-product']}>
            <Routes>
              <Route path="/products/:slug" element={<ProductDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </GlobalToastProvider>
    )

    const productTitleNodes = await screen.findAllByText(/Test Product/i)
    expect(productTitleNodes.length).toBeGreaterThan(0)
    expect(screen.getByText(/Nice product/i)).toBeInTheDocument()

    const addButton = screen.getByRole('button', { name: /THÊM VÀO GIỎ/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(cartService.addToCart).toHaveBeenCalled()
    })
  })
})
