import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '@/configs/api.config'
import { deleteShopQna, fetchShopQna } from '@/features/services/admin/api.admin.service'
import '@/styles/admin/ShopQnaInboxPage.css'

type PendingShopQna = {
  id: number
  product_id: number
  asker_display_name: string
  question: string
  answer?: string | null
  answered_at?: string | null
  created_at: string
  is_visible: boolean
  product?: { id: number; name: string; slug: string; is_active?: boolean } | null
}

export default function ShopQnaInboxPage() {
  const hasAuth = true // Always authenticated — behind ProtectedRoute
  const [items, setItems] = useState<PendingShopQna[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('all')

  async function load() {
    if (!hasAuth) {
      setError('Vui lòng đăng nhập admin.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const rows = await fetchShopQna<PendingShopQna[]>(filter)
      setItems(rows)
      setDrafts(
        rows.reduce<Record<number, string>>((next, row) => {
          if (row.answer) {
            next[row.id] = row.answer
          }
          return next
        }, {})
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [filter])

  async function submitAnswer(row: PendingShopQna) {
    const answer = (drafts[row.id] ?? '').trim()
    if (!answer.length) {
      alert('Vui lòng nhập nội dung trả lời.')
      return
    }
    if (!hasAuth) return

    setSavingId(row.id)
    try {
      const updated = await apiFetch<PendingShopQna>(`/api/admin/products/${row.product_id}/shop-qna/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ answer }),
      })
      setDrafts(d => {
        const next = { ...d }
        delete next[row.id]
        return next
      })
      setItems(prev => prev.map(r => (r.id === row.id ? { ...r, ...updated } : r)))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Gửi trả lời thất bại.')
    } finally {
      setSavingId(null)
    }
  }

  async function deleteQuestion(row: PendingShopQna) {
    if (!hasAuth) return
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này?')) {
      return
    }
    setDeletingId(row.id)
    try {
      await deleteShopQna<void>(row.product_id, row.id)
      setDrafts(d => {
        const next = { ...d }
        delete next[row.id]
        return next
      })
      setItems(prev => prev.filter(r => r.id !== row.id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Xóa câu hỏi thất bại.')
    } finally {
      setDeletingId(null)
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

  const titleSuffix = filter === 'pending' ? 'chưa trả lời' : 'tất cả'
  const leadText =
    filter === 'pending'
      ? 'Khách đặt câu hỏi ở mục "Hỏi và đáp" trên trang chi tiết sản phẩm — các câu chờ cửa hàng hiển thị tại đây.'
      : 'Khách đặt câu hỏi ở mục "Hỏi và đáp" trên trang chi tiết sản phẩm — tất cả câu hỏi hiển thị tại đây.'

  return (
    <div className="sqInboxRoot">
      <header className="sqInboxHeader">
        <div>
          <h2 className="sqInboxTitle">Hỏi cửa hàng · {titleSuffix}</h2>
          <p className="sqInboxLead">{leadText}</p>
          <div className="sqInboxFilter">
            <button
              type="button"
              className={filter === 'pending' ? 'sqFilterBtn sqFilterBtnActive' : 'sqFilterBtn'}
              onClick={() => setFilter('pending')}
              disabled={loading}
            >
              Chờ trả lời
            </button>
            <button
              type="button"
              className={filter === 'all' ? 'sqFilterBtn sqFilterBtnActive' : 'sqFilterBtn'}
              onClick={() => setFilter('all')}
              disabled={loading}
            >
              Tất cả
            </button>
          </div>
        </div>
        <button type="button" className="sqInboxRefresh" onClick={() => void load()} disabled={loading}>
          Làm mới
        </button>
      </header>

      {error && <div className="sqInboxError">{error}</div>}

      {loading ? (
        <ul className="sqInboxList">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="sqCard shopqnainboxpage-style-1">
              <div className="admSkeletonBar shopqnainboxpage-style-2" />
              <div className="admSkeletonBar shopqnainboxpage-style-3" />
              <div className="admSkeletonBar shopqnainboxpage-style-4" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="sqInboxEmpty">Không có câu hỏi nào.</div>
      ) : (
        <ul className="sqInboxList">
          {items.map(row => (
            <li key={row.id} className="sqCard">
              <div className="sqCardTop">
                <div className="sqCardMeta">
                  <span className="sqBadge">{row.answer ? 'Đã trả lời' : 'Chưa trả lời'}</span>
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
              {row.answer ? (
                <div className="sqCurrentAnswer">
                  <div className="sqCurrentAnswerLabel">Trả lời hiện tại</div>
                  <p className="sqCurrentAnswerText">{row.answer}</p>
                </div>
              ) : null}
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
                  className="sqDeleteBtn"
                  disabled={savingId === row.id || deletingId === row.id}
                  onClick={() => void deleteQuestion(row)}
                >
                  {deletingId === row.id ? 'Đang xóa…' : 'Xóa câu hỏi'}
                </button>
                <button
                  type="button"
                  className="sqSendBtn"
                  disabled={savingId === row.id || deletingId === row.id}
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
