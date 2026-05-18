import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/configs/api.config'
import { fetchPendingQna } from '@/features/services/admin/api.admin.service'
import '@/styles/admin/ShopQnaInboxPage.css'

type PendingShopQna = {
  id: number
  product_id: number
  asker_display_name: string
  question: string
  created_at: string
  is_visible: boolean
  product?: { id: number; name: string; slug: string; is_active?: boolean } | null
}

export default function ShopQnaInboxPage() {
  const token = localStorage.getItem('token')
  const [items, setItems] = useState<PendingShopQna[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  async function load() {
    if (!token) {
      setError('Vui lòng đăng nhập admin.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchPendingQna<PendingShopQna[]>(token)
      setItems(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function submitAnswer(row: PendingShopQna) {
    const answer = (drafts[row.id] ?? '').trim()
    if (!answer.length) {
      alert('Vui lòng nhập nội dung trả lời.')
      return
    }
    if (!token) return
    setSavingId(row.id)
    try {
      await apiFetch(`/api/admin/products/${row.product_id}/shop-qna/${row.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ answer }),
      })
      setDrafts(d => {
        const next = { ...d }
        delete next[row.id]
        return next
      })
      setItems(prev => prev.filter(r => r.id !== row.id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gửi trả lời thất bại.')
    } finally {
      setSavingId(null)
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="sqInboxRoot">
      <header className="sqInboxHeader">
        <div>
          <h2 className="sqInboxTitle">Hỏi cửa hàng · chưa trả lời</h2>
          <p className="sqInboxLead">
            Khách đặt câu hỏi ở mục &quot;Hỏi và đáp&quot; trên trang chi tiết sản phẩm — các câu chờ cửa hàng hiển thị tại đây. Sau khi bạn gửi trả lời, khách và người xem khác sẽ thấy ngay trên trang đó.
          </p>
        </div>
        <button type="button" className="sqInboxRefresh" onClick={() => void load()} disabled={loading}>
          Làm mới
        </button>
      </header>

      {error && <div className="sqInboxError">{error}</div>}

      {loading ? (
        <ul className="sqInboxList">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="sqCard" style={{ minHeight: 200 }}>
              <div className="admSkeletonBar" style={{ width: '30%', height: 16, marginBottom: 16 }} />
              <div className="admSkeletonBar" style={{ width: '90%', height: 14, marginBottom: 12 }} />
              <div className="admSkeletonBar" style={{ width: '100%', height: 80 }} />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="sqInboxEmpty">Không có câu hỏi nào chờ xử lý.</div>
      ) : (
        <ul className="sqInboxList">
          {items.map(row => (
            <li key={row.id} className="sqCard">
              <div className="sqCardTop">
                <div className="sqCardMeta">
                  <span className="sqBadge">Chưa trả lời</span>
                  <span className="sqTime">{formatTime(row.created_at)}</span>
                </div>
                <div className="sqProductLine">
                  {row.product?.slug ? (
                    <Link to={`/products/${row.product.slug}`} target="_blank" rel="noopener noreferrer" className="sqProductLink">
                      {row.product.name}
                    </Link>
                  ) : (
                    <span className="sqProductMissing">Sản phẩm #{row.product_id} (thiếu dữ liệu)</span>
                  )}
                  {row.product && !row.product.is_active ? (
                    <span className="sqInactive">Đã ẩn</span>
                  ) : null}
                </div>
                <div className="sqAskerRow">
                  <span className="sqAskerLabel">Người hỏi</span>
                  <strong className="sqAskerName">{row.asker_display_name}</strong>
                </div>
              </div>
              <p className="sqQuestion">{row.question}</p>
              <textarea
                className="sqAnswerArea"
                rows={5}
                placeholder="Nội dung trả lời hiển thị công khai trên trang sản phẩm…"
                value={drafts[row.id] ?? ''}
                onChange={e =>
                  setDrafts(d => ({
                    ...d,
                    [row.id]: e.target.value,
                  }))
                }
              />
              <div className="sqCardActions">
                <button
                  type="button"
                  className="sqSendBtn"
                  disabled={savingId === row.id}
                  onClick={() => void submitAnswer(row)}
                >
                  {savingId === row.id ? 'Đang lưu…' : 'Đăng trả lời'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
