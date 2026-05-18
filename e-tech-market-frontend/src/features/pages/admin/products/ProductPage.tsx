import { useCallback, useMemo, useState, useEffect } from 'react'
import { API_BASE_URL } from '@/configs/api.config'
import { fetchAdminProducts, deleteAdminProduct } from '@/features/services/admin/products.admin.service'
import ProductForm from './ProductForm'
import '@/styles/admin/ProductPage.css'

interface ProductImage {
  id: number
  image_url: string
}

interface Category {
  id: number
  name: string
}

interface ProductVariant {
  id: number
  stock_quantity: number | null
}

interface Product {
  id: number
  name: string
  slug: string
  price: string
  brand: string | null
  category_id: number
  category?: Category
  is_active: boolean
  description: string | null
  main_image_url: string | null
  images?: ProductImage[]
  variants?: ProductVariant[]
}

function ClipboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4.5c0-.83.67-1.5 1.5-1.5h3c.83 0 1.5.67 1.5 1.5v1H9v-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function BanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 7.5l9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function WarningTriangleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 2.8 20.2c-.4.8.2 1.8 1.1 1.8h16.2c.9 0 1.5-1 .1-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m8.5 12.3 2.3 2.3 4.9-5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export default function ProductPage({
  createTick = 0,
  openEditId = null,
  openEditTick = 0,
}: {
  createTick?: number
  openEditId?: number | null
  openEditTick?: number
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Navigation state
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list')
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  // Filters (list view)
  const [q, setQ] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [brandFilter, setBrandFilter] = useState<string | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Pagination (list view)
  const PAGE_SIZE = 20
  const [page, setPage] = useState(1)

  const token = localStorage.getItem('token')

  const getErrMsg = (err: unknown) => {
    if (err && typeof err === 'object' && 'message' in err) {
      const msg = (err as { message?: unknown }).message
      if (typeof msg === 'string' && msg.trim()) return msg
    }
    return 'Không tải được danh sách sản phẩm.'
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAdminProducts(token)
      setProducts(data)
    } catch (err: unknown) {
      setError(getErrMsg(err))
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(t)
  }, [fetchData])

  const handleAdd = () => {
    setSelectedProductId(null)
    setViewMode('form')
  }

  useEffect(() => {
    if (!createTick) return
    const t = window.setTimeout(() => {
      setSelectedProductId(null)
      setViewMode('form')
    }, 0)
    return () => window.clearTimeout(t)
  }, [createTick])

  useEffect(() => {
    if (!openEditTick) return
    if (!openEditId) return
    const t = window.setTimeout(() => {
      setSelectedProductId(openEditId)
      setViewMode('form')
    }, 0)
    return () => window.clearTimeout(t)
  }, [openEditId, openEditTick])

  const handleEdit = (id: number) => {
    setSelectedProductId(id)
    setViewMode('form')
  }

  const handleSave = () => {
    setViewMode('list')
    fetchData()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Xóa vĩnh viễn sản phẩm này?')) {
      try {
        await deleteAdminProduct(id, token)
        fetchData()
      } catch (err: unknown) {
        alert(getErrMsg(err))
      }
    }
  }

  const categories = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of products) {
      if (p.category?.id != null && p.category?.name) map.set(p.category.id, p.category.name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const brands = useMemo(() => {
    const set = new Set<string>()
    for (const p of products) {
      const b = (p.brand || '').trim()
      if (b) set.add(b)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [products])

  const getTotalStock = (p: Product) => {
    const vs = p.variants || []
    let sum = 0
    for (const v of vs) sum += Math.max(0, Number(v.stock_quantity || 0))
    return sum
  }

  const stats = useMemo(() => {
    const total = products.length
    const active = products.filter(p => p.is_active).length
    let out = 0
    let low = 0
    for (const p of products) {
      const s = getTotalStock(p)
      if (s <= 0) out++
      else if (s < 10) low++
    }
    return { total, out, low, active }
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase()
    return products.filter(p => {
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false
      if (brandFilter !== 'all' && (p.brand || '').trim() !== brandFilter) return false
      if (statusFilter !== 'all' && (statusFilter === 'active') !== p.is_active) return false
      if (!query) return true
      const hay = `${p.name} ${(p.brand || '')} ${(p.category?.name || '')}`.toLowerCase()
      return hay.includes(query)
    })
  }, [products, q, categoryFilter, brandFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = Math.min(filteredProducts.length, pageStart + PAGE_SIZE)
  const pagedProducts = useMemo(() => {
    return filteredProducts.slice(pageStart, pageStart + PAGE_SIZE)
  }, [filteredProducts, pageStart])

  const pageNumbers = useMemo(() => {
    // show up to 7 buttons centered around current page
    const maxBtns = 7
    const half = Math.floor(maxBtns / 2)
    let start = Math.max(1, safePage - half)
    const end = Math.min(totalPages, start + maxBtns - 1)
    start = Math.max(1, end - maxBtns + 1)
    const arr: number[] = []
    for (let i = start; i <= end; i++) arr.push(i)
    return arr
  }, [safePage, totalPages])

  const clearFilters = () => {
    setQ('')
    setCategoryFilter('all')
    setBrandFilter('all')
    setStatusFilter('all')
  }

  if (viewMode === 'form') {
    return <ProductForm productId={selectedProductId} onSave={handleSave} onCancel={() => setViewMode('list')} />
  }

  return (
    <div className="prodAdminRoot">
      <div className="prodHeader">
        <div>
          <h2 className="prodTitle">Quản lý sản phẩm</h2>
          <p className="prodSub">Theo dõi và cập nhật hàng hóa theo danh mục</p>
        </div>
        <button className="prodAddBtn" onClick={handleAdd}>
          + Thêm sản phẩm
        </button>
      </div>

      {error && <div className="prodErrorBanner">{error}</div>}

      <div className="prodStatsGrid">
        <div className="prodStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--orange"><ClipboardIcon /></div>
            <div className="prodStatHint">+12% tháng này</div>
          </div>
          <div className="prodStatLabel">Tổng sản phẩm</div>
          <div className="prodStatValue">{stats.total.toLocaleString()}</div>
        </div>

        <div className="prodStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--red"><BanIcon /></div>
            <div className="prodStatHint prodStatHint--red">Cần nhập hàng</div>
          </div>
          <div className="prodStatLabel">Hết hàng</div>
          <div className="prodStatValue">{stats.out.toLocaleString()}</div>
        </div>

        <div className="prodStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--blue"><WarningTriangleIcon /></div>
            <div className="prodStatHint prodStatHint--blue">Dưới 10 dv</div>
          </div>
          <div className="prodStatLabel">Sắp hết hàng</div>
          <div className="prodStatValue">{stats.low.toLocaleString()}</div>
        </div>

        <div className="prodStatCard">
          <div className="prodStatTopRow">
            <div className="prodStatIcon prodStatIcon--green"><CheckCircleIcon /></div>
            <div className="prodStatHint prodStatHint--green">Đang hiển thị</div>
          </div>
          <div className="prodStatLabel">Sản phẩm kích hoạt</div>
          <div className="prodStatValue">{stats.active.toLocaleString()}</div>
        </div>
      </div>

      <div className="prodFiltersCard">
        <div className="prodFiltersGrid">
          <label className="prodFilterField prodFilterField--search">
            <span>Tìm theo Tên / SKU</span>
            <input
              value={q}
              onChange={e => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Ví dụ: iPhone 15 Pro..."
            />
          </label>

          <label className="prodFilterField">
            <span>Danh mục</span>
            <select
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                setPage(1)
              }}
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="prodFilterField">
            <span>Thương hiệu</span>
            <select
              value={brandFilter}
              onChange={e => {
                const v = e.target.value
                setBrandFilter(v === 'all' ? 'all' : v)
                setPage(1)
              }}
            >
              <option value="all">Tất cả thương hiệu</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>

          <label className="prodFilterField">
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={e => {
                const v = e.target.value
                if (v === 'active' || v === 'inactive' || v === 'all') setStatusFilter(v)
                setPage(1)
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hiển thị</option>
              <option value="inactive">Ẩn</option>
            </select>
          </label>

          <div className="prodFilterActions prodFilterActions--inline">
            <button
              type="button"
              className="prodClearBtn"
              onClick={() => {
                clearFilters()
                setPage(1)
              }}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      <div className="prodTableWrap">
        {isLoading ? (
          <table className="prodTable">
            <thead>
              <tr>
                <th>SẢN PHẨM</th>
                <th>DANH MỤC</th>
                <th>MÔ TẢ</th>
                <th>KHO HÀNG</th>
                <th>GIÁ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={7}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '70%' : '90%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            <table className="prodTable">
              <thead>
                <tr>
                  <th>SẢN PHẨM</th>
                  <th>DANH MỤC</th>
                  <th>MÔ TẢ</th>
                  <th>KHO HÀNG</th>
                  <th>GIÁ</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Không có sản phẩm phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="prodNameCell">
                          <div className="prodThumb">
                            {p.main_image_url && <img src={resolveImageUrl(p.main_image_url)} alt="" />}
                          </div>
                          <div className="prodInfo">
                            <span className="pName">{p.name}</span>
                            <span className="pBrand">{p.brand || 'Chưa có thương hiệu'}</span>
                          </div>
                        </div>
                      </td>
                      <td><span className="pCat">{p.category?.name}</span></td>
                      <td>
                        <div className="pDescCell">
                          {p.description?.trim() ? p.description : <span className="pDescMuted">Chưa có mô tả</span>}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const totalStock = getTotalStock(p)
                          const pct = Math.max(0, Math.min(100, Math.round((totalStock / 200) * 100)))
                          const level = pct >= 60 ? 'high' : pct >= 30 ? 'mid' : 'low'
                          return (
                            <div className="pInvCell">
                              <div className="pInvValue">{totalStock}</div>
                              <div className="pInvBar" title={`${totalStock} sản phẩm trong kho`}>
                                <div className={`pInvFill ${level}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })()}
                      </td>
                      <td><span className="pPrice">{Number(p.price).toLocaleString()} đ</span></td>
                      <td>
                        <span className={`pStatus ${p.is_active ? 'active' : 'inactive'}`}>
                          {p.is_active ? 'HOẠT ĐỘNG' : 'VÔ HIỆU'}
                        </span>
                      </td>
                      <td>
                        <div className="pActions">
                          <button
                            className="pIconBtn pEdit"
                            onClick={() => handleEdit(p.id)}
                            title="Sửa"
                            aria-label="Sửa"
                            type="button"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="pIconBtn pDelete"
                            onClick={() => handleDelete(p.id)}
                            title="Xóa"
                            aria-label="Xóa"
                            type="button"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredProducts.length > 0 && (
              <div className="prodPaginationBar">
                <div className="prodPaginationInfo">
                  Hiển thị <b>{pageStart + 1}</b>–<b>{pageEnd}</b> / <b>{filteredProducts.length}</b>
                </div>
                <div className="prodPaginationBtns">
                  <button
                    type="button"
                    className="prodPageBtn"
                    disabled={safePage <= 1}
                    onClick={() => setPage(s => Math.max(1, s - 1))}
                  >
                    Trước
                  </button>

                  {pageNumbers[0] > 1 && (
                    <>
                      <button type="button" className="prodPageBtn" onClick={() => setPage(1)}>1</button>
                      {pageNumbers[0] > 2 && <span className="prodPageDots">…</span>}
                    </>
                  )}

                  {pageNumbers.map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`prodPageBtn ${n === safePage ? 'isActive' : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}

                  {pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                      {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="prodPageDots">…</span>}
                      <button type="button" className="prodPageBtn" onClick={() => setPage(totalPages)}>{totalPages}</button>
                    </>
                  )}

                  <button
                    type="button"
                    className="prodPageBtn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(s => Math.min(totalPages, s + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
