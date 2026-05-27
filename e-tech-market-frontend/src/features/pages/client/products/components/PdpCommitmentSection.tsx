import type { Product } from '@/features/services/products.service'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

function CommitIconPhoneCheck() {return (<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke="currentColor" strokeWidth="1.55" /><path d="M10 5.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path  d="M10.2 12.3l1.35 1.35 3.45-3.4"  stroke="currentColor"  strokeWidth="1.45"  strokeLinecap="round"  strokeLinejoin="round"/><path d="M10 18.2h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" /></svg>)}
function CommitIconShieldCheck() {return (<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path  d="M12 21.5c4.5-2.2 7.5-5.8 7.5-10.4V6.2L12 3.5 4.5 6.2v4.9c0 4.6 3 8.2 7.5 10.4Z"  stroke="currentColor"  strokeWidth="1.55"  strokeLinejoin="round"/><path  d="M9 12.2l2 2 4.2-4.1"  stroke="currentColor"  strokeWidth="1.45"  strokeLinecap="round"  strokeLinejoin="round"/></svg>)}
function CommitIconCpu() {return (<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="7.2" y="7.2" width="9.6" height="9.6" rx="1.4" stroke="currentColor" strokeWidth="1.45" /><rect x="9.7" y="9.7" width="4.6" height="4.6" rx="0.5" stroke="currentColor" strokeWidth="1.15" /><path  d="M12 5.2v2M12 16.8v2M16.8 12h2M5.2 12H7M9 5.2v1.9M15 5.2v1.9M9 17v1.9M15 17v1.9M5.2 9h2M16.8 9h2M5.2 15h2M16.8 15h2"  stroke="currentColor"  strokeWidth="1.15"  strokeLinecap="round"/></svg>)}
function CommitIconPriceTag() {return (<svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path  d="M4.5 9.8V7.2A1.7 1.7 0 0 1 6.2 5.5h2.6l10.7 10.7v2.6a1.7 1.7 0 0 1-1.7 1.7h-2.6L4.5 12.4v-2.6Z"  stroke="currentColor"  strokeWidth="1.45"  strokeLinejoin="round"/><circle cx="7.3" cy="7.3" r="1.35" fill="currentColor" /><path  d="M12.2 14.2l2.1 2.1 3.6-3.6"  stroke="currentColor"  strokeWidth="1.35"  strokeLinecap="round" strokeLinejoin="round"/></svg>)}

export function PdpCommitmentSection({ product }: { product: Product }) {
  const commitmentItems = useMemo(() => {
    const catSlugRaw = (product?.category?.slug ?? '').trim().toLowerCase()
    const catNameRaw = (product?.category?.name ?? '').trim().toLowerCase()
    const hay = `${catSlugRaw} ${catNameRaw}`.trim()

    type CommitItem = { key: string; icon: ReactNode; text: ReactNode }

    const common: CommitItem[] = [
      {
        key: 'authentic-seal',
        icon: <CommitIconPhoneCheck />,
        text: 'Hàng mới, chính hãng — nguyên seal (tuỳ lô hàng) / serial rõ ràng.',
      },
      {
        key: 'warranty',
        icon: <CommitIconShieldCheck />,
        text: (
          <>
            Bảo hành <b>12 tháng</b> theo chính sách hãng/nhà phân phối. Hỗ trợ{' '}
            <span className="pdpLink">đổi mới</span> nếu lỗi phần cứng nhà sản xuất trong thời gian quy định.
          </>
        ),
      },
      {
        key: 'vat',
        icon: <CommitIconPriceTag />,
        text: (
          <>
            Giá sản phẩm <b>đã bao gồm thuế VAT</b>, có hỗ trợ{' '}
            <span className="pdpLink pdpCommitLinkAccent">hoàn thuế VAT - Tax Refund</span> cho khách du lịch.
          </>
        ),
      },
    ]

    const phoneTablet: CommitItem[] = [
      common[0],
      common[1],
      {
        key: 'setup',
        icon: <CommitIconCpu />,
        text: 'Hỗ trợ cài đặt ban đầu, kiểm tra ngoại quan & chức năng trước khi giao (nếu khách yêu cầu).',
      },
      common[2],
    ]

    const laptopPcMac: CommitItem[] = [
      common[0],
      common[1],
      {
        key: 'install',
        icon: <CommitIconCpu />,
        text: 'Hỗ trợ cài đặt hệ điều hành/driver cơ bản và test máy trước khi giao.',
      },
      common[2],
    ]

    const components: CommitItem[] = [
      {
        key: 'authentic-serial',
        icon: <CommitIconPhoneCheck />,
        text: 'Hàng mới — tem/serial chuẩn, đúng thông số cấu hình.',
      },
      {
        key: 'doa',
        icon: <CommitIconShieldCheck />,
        text: (
          <>
            Hỗ trợ <b>đổi mới</b> nếu lỗi khi vừa nhận (DOA) theo chính sách. Bảo hành theo hãng/NSX.
          </>
        ),
      },
      {
        key: 'compatibility',
        icon: <CommitIconCpu />,
        text: 'Hỗ trợ tư vấn tương thích linh kiện (main/CPU/RAM/SSD/PSU) trước khi mua.',
      },
      common[2],
    ]

    const monitor: CommitItem[] = [
      common[0],
      {
        key: 'panel-warranty',
        icon: <CommitIconShieldCheck />,
        text: 'Bảo hành theo hãng — hỗ trợ kiểm tra màn (hở sáng/điểm chết) khi nhận hàng theo quy định.',
      },
      {
        key: 'packing',
        icon: <CommitIconCpu />,
        text: 'Đóng gói chống sốc, hỗ trợ kiểm hàng khi nhận.',
      },
      common[2],
    ]

    const audio: CommitItem[] = [
      common[0],
      {
        key: 'warranty-audio',
        icon: <CommitIconShieldCheck />,
        text: 'Bảo hành theo hãng — hỗ trợ kiểm tra kết nối, màng loa trước khi nhận.',
      },
      common[2],
    ]

    const watches: CommitItem[] = [
      common[0],
      {
        key: 'warranty-watch',
        icon: <CommitIconShieldCheck />,
        text: 'Bảo hành theo chính sách hãng. Lưu ý: Không bảo hành vào nước (kể cả có tính năng kháng nước).',
      },
      {
        key: 'setup',
        icon: <CommitIconCpu />,
        text: 'Hỗ trợ kết nối với điện thoại tại cửa hàng.',
      },
      common[2],
    ]

    if (hay.includes('điện thoại') || hay.includes('máy tính bảng') || hay.includes('ipad') || hay.includes('iphone')) return phoneTablet
    if (hay.includes('laptop') || hay.includes('pc') || hay.includes('macbook') || hay.includes('imac')) return laptopPcMac
    if (hay.includes('linh kiện') || hay.includes('cpu') || hay.includes('vga') || hay.includes('mainboard')) return components
    if (hay.includes('màn hình')) return monitor
    if (hay.includes('âm thanh') || hay.includes('tai nghe') || hay.includes('loa')) return audio
    if (hay.includes('đồng hồ') || hay.includes('smartwatch')) return watches

    return common
  }, [product])

  return (
    <div className="pdpCommitments">
      <h3 className="pdpCommitTitle">Cam kết sản phẩm</h3>
      <div className="pdpCommitGrid">
        {commitmentItems.map((item) => (
          <div key={item.key} className="pdpCommitItem">
            <span className="pdpCommitIcon" aria-hidden>
              {item.icon}
            </span>
            <span className="pdpCommitText">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
