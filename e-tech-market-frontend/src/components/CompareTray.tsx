
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompareList, removeFromCompare, clearCompare, type CompareProduct } from '@/features/services/compare.service'
import { API_BASE_URL } from '@/configs/api.config'
import '@/styles/components/CompareTray.css'

const resolveImageUrl = (url: string | null | undefined) => {
  if (!url) return 'https://via.placeholder.com/400'
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  if (!path.startsWith('/storage/')) {
    return `${API_BASE_URL}/storage${path}`
  }
  return `${API_BASE_URL}${path}`
}

export default function CompareTray() {
  const [list, setList] = useState<CompareProduct[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const update = () => {
      const newList = getCompareList()
      setList(newList)
      if (newList.length > 0) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }
    update()
    window.addEventListener('compare-change', update)
    return () => window.removeEventListener('compare-change', update)
  }, [])

  if (list.length === 0 && !isVisible) return null

  return (
    <div className={`compareTray ${isVisible ? 'is-visible' : ''}`}>
      <div className="compareTrayInner">
        <div className="compareTrayHead">
          <span className="compareTrayTitle">So sánh sản phẩm ({list.length}/3)</span>
          <button className="compareTrayClose" onClick={() => setIsVisible(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="compareTrayList">
          {list.map(p => (
            <div key={p.id} className="compareTrayItem">
              <img src={resolveImageUrl(p.image_url)} alt={p.name} className="compareTrayImg" />
              <div className="compareTrayInfo">
                <span className="compareTrayName">{p.name}</span>
                <span className="compareTrayPrice">{p.price.toLocaleString('vi-VN')} đ</span>
              </div>
              <button className="compareTrayRemove" onClick={() => removeFromCompare(p.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          ))}
          {Array.from({ length: 3 - list.length }).map((_, i) => (
            <div key={`empty-${i}`} className="compareTrayItem empty">
              <div className="compareTrayPlaceholder">
                <span>+</span>
              </div>
              <span className="compareTrayPlaceholderText">Thêm để so sánh</span>
            </div>
          ))}
        </div>

        <div className="compareTrayActions">
          <button className="compareTrayClear" onClick={clearCompare}>Xoá hết</button>
          <Link 
            to="/compare" 
            className={`compareTrayBtn ${list.length < 2 ? 'is-disabled' : ''}`}
            onClick={(e) => list.length < 2 && e.preventDefault()}
          >
            SO SÁNH NGAY
          </Link>
        </div>
      </div>
      
      {!isVisible && list.length > 0 && (
        <button className="compareTrayTrigger" onClick={() => setIsVisible(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20l7-7M21 3l-7 7M15 14l6 6M9 3H4v5M3 21l7-7M3 3l7 7M14 15l7 7"></path>
          </svg>
          <span className="compareTrayCount">{list.length}</span>
        </button>
      )}
    </div>
  )
}
