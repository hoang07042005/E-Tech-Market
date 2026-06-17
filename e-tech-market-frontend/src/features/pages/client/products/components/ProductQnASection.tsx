import React from 'react'
import { qnaAvatarInitial, timeAgoVi, scrollToPdpShopQnaForm, SHOP_REPLY_AVATAR_SRC, resolveImageUrl, IconPaperPlane, IconQnaChatBubble } from './PdpShared'
import type { ProductShopQnaPublic, Product } from '@/features/services/products.service'
import { apiFetch } from '@/configs/api.config'

type ProductQnASectionProps = {
  product: Product;
  shopQnas: ProductShopQnaPublic[];
  qaQuestion: string;
  setQaQuestion: (q: string) => void;
  qaGuestName: string;
  setQaGuestName: (n: string) => void;
  qaSending: boolean;
  setQaSending: (s: boolean) => void;
  qaFlash: string | null;
  setQaFlash: (f: string | null) => void;
  qaError: string | null;
  setQaError: (e: string | null) => void;
  buyerLoggedIn: boolean;
  qnaShopOpenById: Record<number, boolean>;
  setQnaShopOpenById: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  refreshShopQnas: () => Promise<void>;
};

export function ProductQnASection({
  product,
  shopQnas,
  qaQuestion,
  setQaQuestion,
  qaGuestName,
  setQaGuestName,
  qaSending,
  setQaSending,
  qaFlash,
  setQaFlash,
  qaError,
  setQaError,
  buyerLoggedIn,
  qnaShopOpenById,
  setQnaShopOpenById,
  refreshShopQnas
}: ProductQnASectionProps) {
  return (
    <section className="pdpQnaPageEnd" id="pdp-hoi-dap" aria-labelledby="pdp-hoi-dap-main-title">
            <h2 id="pdp-hoi-dap-main-title" className="pdpQnaPageEndMainTitle">
              Hỏi và đáp
            </h2>

            <div className="pdpQnaUnifiedCard">
              <form
                id="pdp-shop-qna-form"
                className="pdpQnaUnifiedAsk"
                onSubmit={async e => {
                  e.preventDefault()
                  setQaError(null)
                  setQaFlash(null)
                  const q = qaQuestion.trim()
                  if (q.length < 5) {
                    setQaError('Vui lòng nhập câu hỏi tối thiểu 5 ký tự.')
                    return
                  }
                  if (!buyerLoggedIn && qaGuestName.trim().length < 2) {
                    setQaError('Vui lòng nhập tên hiển thị (hoặc đăng nhập).')
                    return
                  }
                  setQaSending(true)
                  try {
                    const res = await apiFetch<{ message?: string }>(
                      `/api/products/${encodeURIComponent(product.slug)}/shop-qna`,
                      {
                        method: 'POST',
                        body: JSON.stringify({
                          question: q,
                          ...(buyerLoggedIn ? {} : { guest_name: qaGuestName.trim() }),
                        }),
                      },
                    )
                    setQaQuestion('')
                    if (!buyerLoggedIn) setQaGuestName('')
                    setQaFlash(res.message ?? 'Đã gửi câu hỏi.')
                    await refreshShopQnas()
                  } catch (err: unknown) {
                    setQaError(err instanceof Error ? err.message : 'Không gửi được câu hỏi.')
                  } finally {
                    setQaSending(false)
                  }
                }}
              >
                <div className="pdpQnaAskMascot" aria-hidden>
                  <img src="/linh-vat.png" alt="" className="pdpQnaMascotImg" width={108} decoding="async" />
                </div>
                <div className="pdpQnaAskBody">
                  <h3 className="pdpQnaAskHeading">Hãy đặt câu hỏi cho chúng tôi</h3>
                  <p className="pdpQnaAskLead">
                    Đội ngũ E-Tech Market sẽ phản hồi trong thời gian sớm nhất trong giờ làm việc. Câu hỏi gửi sau 22h có thể được
                    trả lời vào sáng hôm sau.
                  </p>
                  {!buyerLoggedIn && (
                    <label className="pdpQnaGuestField">
                      <span className="pdpQnaGuestLabel">Tên hiển thị</span>
                      <input
                        type="text"
                        className="pdpQnaGuestInput"
                        value={qaGuestName}
                        onChange={e => setQaGuestName(e.target.value)}
                        placeholder="Ví dụ: Ngô Thị Vân Anh"
                        maxLength={120}
                        autoComplete="name"
                      />
                    </label>
                  )}
                  {buyerLoggedIn && (
                    <p className="pdpQnaLoggedNote">Bạn đang đăng nhập — câu hỏi sẽ hiển thị kèm tên tài khoản.</p>
                  )}
                  <div className="pdpQnaAskInputRow">
                    <textarea
                      className="pdpQnaQuestionInput"
                      name="question"
                      value={qaQuestion}
                      onChange={e => setQaQuestion(e.target.value)}
                      placeholder="Viết câu hỏi của bạn tại đây"
                      rows={2}
                      maxLength={2000}
                      required
                    />
                    <button type="submit" className="pdpQnaSubmitBtn" disabled={qaSending}>
                      <span>{qaSending ? 'Đang gửi…' : 'Gửi câu hỏi'}</span>
                      <IconPaperPlane className="pdpQnaSubmitIcon" aria-hidden />
                    </button>
                  </div>
                  {qaError && <p className="pdpQnaFormErr">{qaError}</p>}
                  {qaFlash && !qaError && <p className="pdpQnaFormOk">{qaFlash}</p>}
                </div>
              </form>

              <div className="pdpQnaUnifiedThreads">
                {shopQnas.length === 0 ? (
                  <p className="pdpQnaListEmpty">Chưa có câu hỏi nào. Hãy đặt câu hỏi đầu tiên ở ô phía trên.</p>
                ) : (
                  <ul className="pdpQnaThreadList pdpQnaThreadList--inCard">
                    {shopQnas.map(row => {
                      const hasAnswer = !!(row.answer && row.answer.trim())
                      const shopOpen = qnaShopOpenById[row.id] !== false
                      const tsQ = row.created_at ?? row.answered_at ?? ''
                      return (
                        <li key={row.id} className="pdpQnaThreadItem">
                          <div className="pdpQnaUserRow">
                            <div className="pdpQnaUserAvatar" aria-hidden>
                              {row.user?.avatar_url ? (
                                <img
                                  className="pdpAvatarImg"
                                  src={resolveImageUrl(row.user.avatar_url)}
                                  alt=""
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                qnaAvatarInitial(row.asker_display_name)
                              )}
                            </div>
                            <div className="pdpQnaUserBlock">
                              <div className="pdpQnaUserMeta">
                                <span className="pdpQnaUserName">{row.asker_display_name}</span>
                                {tsQ !== '' ? (
                                  <time className="pdpQnaUserTime" dateTime={tsQ}>
                                    {timeAgoVi(tsQ)}
                                  </time>
                                ) : null}
                              </div>
                              <p className="pdpQnaQuestionText">{row.question}</p>
                              <div className="pdpQnaThreadActions">
                                {/* <button type="button" className="pdpQnaActionLink" onClick={() => scrollToPdpShopQnaForm()}>
                                <IconQnaChatBubble aria-hidden />
                                Phản hồi
                              </button> */}
                                {hasAnswer ? (
                                  <button
                                    type="button"
                                    className="pdpQnaCollapseLink"
                                    onClick={() =>
                                      setQnaShopOpenById(prev => ({
                                        ...prev,
                                        [row.id]: !(prev[row.id] ?? true),
                                      }))
                                    }
                                  >
                                    <span className={`pdpQnaChevron ${shopOpen ? 'pdpQnaChevron--up' : ''}`} aria-hidden>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path
                                          d="M6 9l6 6 6-6"
                                          stroke="currentColor"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </span>
                                    {shopOpen ? 'Thu gọn phản hồi' : 'Xem phản hồi'}
                                  </button>
                                ) : (
                                  <span className="pdpQnaPendingBadge">Đang chờ cửa hàng</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {!hasAnswer ? (
                            <p className="pdpQnaPendingNote">Đang chờ cửa hàng trả lời. Bạn có thể gửi thêm câu hỏi khác phía trên.</p>
                          ) : shopOpen ? (
                            <div className="pdpQnaShopRow">
                              <div className="pdpQnaShopAvatar" aria-hidden>
                                <img
                                  className="pdpAvatarImg"
                                  src={SHOP_REPLY_AVATAR_SRC}
                                  alt=""
                                  decoding="async"
                                />
                              </div>
                              <div className="pdpQnaShopBlock">
                                <div className="pdpQnaShopMeta">
                                  <span className="pdpQnaShopName">Quản trị viên</span>
                                  <span className="pdpQnaShopBadge">QTV</span>
                                  {row.answered_at && (
                                    <time className="pdpQnaShopTime" dateTime={row.answered_at}>
                                      {timeAgoVi(row.answered_at)}
                                    </time>
                                  )}
                                </div>
                                <div className="pdpQnaShopAnswer">
                                  {row.answer!.split('\n').map((para, idx) =>
                                    para.trim() ? <p key={idx}>{para.trim()}</p> : null,
                                  )}
                                </div>
                                <button type="button" className="pdpQnaActionLink" onClick={() => scrollToPdpShopQnaForm()}>
                                  <IconQnaChatBubble aria-hidden />
                                  Phản hồi
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>

          
  )
}
