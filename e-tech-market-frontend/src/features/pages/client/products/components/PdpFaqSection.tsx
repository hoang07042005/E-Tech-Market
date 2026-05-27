import type { ProductFaq } from '@/features/services/products.service'

export function PdpFaqSection({
  visibleFaqs,
  openFaqId,
  setOpenFaqId,
}: {
  visibleFaqs: ProductFaq[]
  openFaqId: number | null
  setOpenFaqId: (id: number | null) => void
}) {
  return (
    <section className="pdpFaqSection" aria-labelledby="pdp-faq-mau-title">
      <h3 id="pdp-faq-mau-title" className="pdpFaqMainTitle">
        Câu hỏi thường gặp <span className="pdpFaqTitleEyebrow">về sản phẩm</span>
      </h3>
      <p className="pdpFaqSidebarLead">Các gợi ý được cửa hàng soạn trước — xem chung cho mọi phiên bản.</p>
      {visibleFaqs.length > 0 ? (
        <ul className="pdpFaqList">
          {visibleFaqs.map((faq) => {
            const expanded = openFaqId === faq.id
            return (
              <li key={faq.id} className="pdpFaqItem">
                <div className={`pdpFaqCard ${expanded ? 'pdpFaqCard--expanded' : ''}`}>
                  <button
                    type="button"
                    className="pdpFaqToggle"
                    aria-expanded={expanded}
                    aria-controls={`pdp-faq-ans-${faq.id}`}
                    id={`pdp-faq-q-${faq.id}`}
                    onClick={() => setOpenFaqId(expanded ? null : faq.id)}
                  >
                    <span className="pdpFaqQText">{faq.question}</span>
                    <span className={`pdpFaqIcon ${expanded ? 'pdpFaqIcon--up' : ''}`} aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {expanded && (
                    <div
                      id={`pdp-faq-ans-${faq.id}`}
                      role="region"
                      className="pdpFaqAnswer"
                      aria-labelledby={`pdp-faq-q-${faq.id}`}
                    >
                      {faq.answer.split('\n').map((para, idx) =>
                        para.trim() ? <p key={idx}>{para.trim()}</p> : null,
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="pdpFaqSidebarEmpty">Chưa có câu hỏi mẫu cho sản phẩm này.</p>
      )}
    </section>
  )
}
