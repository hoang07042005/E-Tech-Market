import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const createIntersectionObserverMock = () => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
})

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    AreaChart: ({ children }: any) => <div>{children}</div>,
    Area: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    PieChart: ({ children }: any) => <div>{children}</div>,
    Pie: ({ children }: any) => <div>{children}</div>,
    Cell: () => <div />,
  }
})

import DashboardPage from '../../features/pages/admin/dashboard/DashboardPage'
import * as adminService from '../../features/services/admin/api.admin.service'
import * as apiConfig from '../../configs/api.config'

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
  localStorage.setItem('token', 'fake-token')
  vi.spyOn(apiConfig, 'apiFetch').mockImplementation(async (url: string) => {
    if (url.includes('/api/admin/dashboard/stats')) {
      return {
        kpi: {
          revenue_30d: 100000,
          current_orders: 42,
          total_products: 13,
          new_customers_7d: 8,
          avg_order_value_30d: 50000,
          low_stock_variants: 3,
          low_stock_threshold: 10,
        },
        analytics: {
          revenue_7d: [],
          top_categories_30d: [],
        },
      } as any
    }
    if (url.includes('/api/admin/products')) {
      return { data: [] } as any
    }
    return null as any
  })
})

describe('DashboardPage Component', () => {
  it('renders dashboard KPIs from admin stats API', async () => {
    vi.spyOn(adminService, 'fetchDashboardStats').mockResolvedValue({
      kpi: {
        revenue_30d: 100000,
        current_orders: 42,
        total_products: 13,
        new_customers_7d: 8,
        avg_order_value_30d: 50000,
        low_stock_variants: 3,
        low_stock_threshold: 10,
      },
      analytics: {
        revenue_7d: [],
        top_categories_30d: [],
      },
      recent_orders: [],
      recent_reviews: [],
      top_customers: [],
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Tổng doanh thu/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/100\.?0?K đ/i)).toBeInTheDocument()
      expect(screen.getByText(/42/i)).toBeInTheDocument()
      expect(screen.getByText(/13/i)).toBeInTheDocument()
    })
  })
})
