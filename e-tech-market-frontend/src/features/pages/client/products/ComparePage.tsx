
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCompareList, removeFromCompare, type CompareProduct } from '@/features/services/compare.service'
import { apiFetch, API_BASE_URL } from '@/configs/api.config'
import { type Product } from '@/features/services/products.service'
import '@/styles/pages/ComparePage.css'

const resolveImageUrl = (url: string | null | undefined) => {
  if (!url) return 'https://via.placeholder.com/400'
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  if (!path.startsWith('/storage/')) {
    return `${API_BASE_URL}/storage${path}`
  }
  return `${API_BASE_URL}${path}`
}

export default function ComparePage() {
  const [compareList, setCompareList] = useState<CompareProduct[]>(getCompareList())
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const update = () => setCompareList(getCompareList())
    window.addEventListener('compare-change', update)
    return () => window.removeEventListener('compare-change', update)
  }, [])

  useEffect(() => {
    if (compareList.length === 0) {
      setProducts([])
      return
    }

    setLoading(true)
    // Fetch full details for each product to get specs
    Promise.all(
      compareList.map(p => apiFetch<Product>(`/api/products/${p.slug}`))
    ).then(res => {
      setProducts(res)
    }).catch(err => {
      console.error('Failed to fetch compare details', err)
    }).finally(() => {
      setLoading(false)
    })
  }, [compareList])

  const specGroups = useMemo(() => {
    const groups: Record<string, Set<string>> = {}
    products.forEach(p => {
      p.specs?.forEach(s => {
        const group = s.spec_group || 'Thông tin khác'
        if (!groups[group]) groups[group] = new Set()
        groups[group].add(s.spec_key)
      })
    })
    return groups
  }, [products])

  const resolveSpecValue = (product: Product, group: string, key: string) => {
    const s = product.specs?.find(spec =>
      (spec.spec_group || 'Thông tin khác') === group && spec.spec_key === key
    )
    if (!s) return '—'
    return `${s.spec_value} ${s.spec_unit || ''}`.trim()
  }

  if (compareList.length === 0) {
    return (
      <div className="comparePage empty">
        <div className="compareEmptyContent">
          <div className="compareEmptyIcon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5M4 20l7-7M21 3l-7 7M15 14l6 6M9 3H4v5M3 21l7-7M3 3l7 7M14 15l7 7"></path>
            </svg>
          </div>
          <h1>Chưa có sản phẩm để so sánh</h1>
          <p>Vui lòng thêm ít nhất 2 sản phẩm để bắt đầu so sánh cấu hình.</p>
          <Link to="/products" className="compareBackBtn">Quay lại cửa hàng</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="comparePage">
      <div className="compareContainer">
        <div className="compareHeader">
          <h1>So sánh sản phẩm</h1>
          <p>Bảng so sánh chi tiết thông số kỹ thuật giữa các sản phẩm đã chọn.</p>
        </div>

        <div className="compareTableWrapper">
          <table className="compareTable">
            <thead>
              <tr>
                <th className="specLabelCol">Đặc điểm</th>
                {products.length > 0 ? (
                  products.map(p => (
                    <th key={p.id} className="productCol">
                      <div className="compareProductCard">
                        <button className="compareRemoveTop" onClick={() => removeFromCompare(p.id)}>×</button>
                        <img src={resolveImageUrl(p.main_image_url)} alt={p.name} />
                        <h3>{p.name}</h3>
                        <div className="comparePrice">{parseFloat(p.price).toLocaleString('vi-VN')} đ</div>
                        <Link to={`/products/${p.slug}`} className="compareViewBtn">Xem chi tiết</Link>
                      </div>
                    </th>
                  ))
                ) : (
                  compareList.map(p => (
                    <th key={p.id} className="productCol">
                      <div className="compareProductCard">
                        <button className="compareRemoveTop" onClick={() => removeFromCompare(p.id)}>×</button>
                        <h3>{p.name}</h3>
                        <div className="comparePrice">{p.price.toLocaleString('vi-VN')} đ</div>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={compareList.length + 1} className="compareLoading">
                    Đang tải dữ liệu so sánh...
                  </td>
                </tr>
              ) : (
                Object.entries(specGroups).map(([groupName, keys]) => (
                  <Fragment key={groupName}>
                    <tr className="groupRow">
                      <td colSpan={products.length + 1}>{groupName}</td>
                    </tr>
                    {Array.from(keys).map(key => (
                      <tr key={key}>
                        <td className="specLabel">{key}</td>
                        {products.map(p => (
                          <td key={p.id}>{resolveSpecValue(p, groupName, key)}</td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { Fragment } from 'react'
