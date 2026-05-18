import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { apiFetch } from '@/configs/api.config'
import {
  fetchProductBySlug,
  fetchProducts,
  type Product,
  type ProductShopQnaPublic,
  type ProductVariant,
  type ProductFaq,
  type ProductNews,
  type ProductReview,
} from '@/features/services/products.service'
import { API_BASE_URL } from '@/configs/api.config'
import { addToCart } from '@/features/services/cart.service'
import { fetchWishlist, toggleWishlist } from '@/features/services/wishlist.service'
import { HeartIcon } from '@/components/icons/HeartIcon'
import { addToCompare, getCompareList, removeFromCompare } from '@/features/services/compare.service'
import '@/styles/pages/ProductDetailPage.css'
import Skeleton from '@/components/Skeleton'

const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/600'
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

const SHOP_REPLY_AVATAR_SRC =
  (import.meta.env.VITE_SHOP_REPLY_AVATAR_URL as string | undefined)?.trim() || '/logoEtech.png'

async function fetchProductShopQnasPublic(slug: string): Promise<ProductShopQnaPublic[]> {
  try {
    return await apiFetch<ProductShopQnaPublic[]>(
      `/api/products/${encodeURIComponent(slug)}/shop-qna`,
    )
  } catch {
    return []
  }
}

function scrollToPdpShopQnaForm() {
  document.getElementById('pdp-shop-qna-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function qnaAvatarInitial(name: string) {
  const t = name.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

function avatarInitial(name: string) {
  const t = (name || '').trim()
  return t ? t.charAt(0).toUpperCase() : 'U'
}

function IconPaperPlane({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="m2 21 21-9L2 3v7l13 4-13 4v7z"
      />
    </svg>
  )
}

function IconQnaChatBubble({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden>
      <path
        d="M5 17.5v-13A1.5 1.5 0 0 1 6.5 3h13A1.5 1.5 0 0 1 21 4.5V15a1.5 1.5 0 0 1-1.5 1.5h-11L5 21l.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type ProductSpecRow = NonNullable<Product['specs']>[number]

/** Màu ưu tiên cột admin `color`; thiếu thì một nhãn tổng quát để không gộp nhầm. */
function variantColorLabel(v: ProductVariant): string {
  const c = (v.color ?? '').trim()
  if (c) return c
  return 'Tuỳ chọn'
}

/** Dung lượng/cấu hình: `configuration` hoặc trích trong `variant_name`. */
function variantStorageLabel(v: ProductVariant): string {
  const cfg = (v.configuration ?? '').trim()
  if (cfg) return cfg
  const m = (v.variant_name ?? '').match(/\b(\d+)\s*(GB|TB)\b/i)
  return m ? `${m[1]}${m[2].toUpperCase()}` : ''
}

function storageKeyNorm(s: string): string {
  return s.replace(/\s+/g, '').toUpperCase()
}

function storageSortRank(label: string): number {
  const t = storageKeyNorm(label)
  const m = t.match(/^(\d+(?:\.\d+)?)(GB|TB)$/)
  if (!m) return 1e9
  const n = parseFloat(m[1])
  return m[2] === 'TB' ? n * 1024 : n
}

type VariantFacetModel = {
  variants: ProductVariant[]
  colors: string[]
  storages: string[]
  byColorStorage: Map<string, ProductVariant>
  repByColor: Map<string, ProductVariant>
}

function buildVariantFacetModel(variants: ProductVariant[]): VariantFacetModel {
  const colors: string[] = []
  const colorSeen = new Set<string>()
  const stSet = new Set<string>()
  const byColorStorage = new Map<string, ProductVariant>()
  const repByColor = new Map<string, ProductVariant>()
  for (const v of variants) {
    const col = variantColorLabel(v)
    const st = variantStorageLabel(v)
    if (!colorSeen.has(col)) {
      colorSeen.add(col)
      colors.push(col)
    }
    if (st) stSet.add(st)
    if (st) {
      const key = `${col}\0${storageKeyNorm(st)}`
      byColorStorage.set(key, v)
    }
    if (!repByColor.has(col)) repByColor.set(col, v)
  }
  const storages = [...stSet].sort((a, b) => storageSortRank(a) - storageSortRank(b))
  return { variants, colors, storages, byColorStorage, repByColor }
}

/** Khớp màu + dung lượng; nếu combo không có thì lấy bản khác cùng màu hoặc cùng dung lượng. */
function resolveVariantByFacet(
  facet: VariantFacetModel,
  color: string,
  storage: string,
): ProductVariant {
  const withSt = storage
    ? facet.byColorStorage.get(`${color}\0${storageKeyNorm(storage)}`)
    : undefined
  if (withSt) return withSt
  const sameColor = facet.variants.find(v => variantColorLabel(v) === color)
  if (sameColor) return sameColor
  const sameSt = storage
    ? facet.variants.find(v => variantStorageLabel(v) === storage)
    : undefined
  if (sameSt) return sameSt
  return facet.variants[0]
}

const PDP_THUMB_VISIBLE = 7

type PdpThumbStripProps = {
  allImages: string[]
  selectedImg: string | null
  onSelectImage: (url: string) => void
}

function PdpThumbStrip({ allImages, selectedImg, onSelectImage }: PdpThumbStripProps) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const visibleCount = windowWidth <= 768 ? 5 : PDP_THUMB_VISIBLE
  const [thumbWindowStart, setThumbWindowStart] = useState(0)
  const thumbTotal = allImages.length
  const showThumbNav = thumbTotal > visibleCount
  const thumbMaxStart = Math.max(0, thumbTotal - visibleCount)
  const thumbStart = Math.min(thumbWindowStart, thumbMaxStart)
  const thumbsToRender = showThumbNav
    ? allImages.slice(thumbStart, thumbStart + visibleCount)
    : allImages

  const pick = (img: string) => {
    onSelectImage(img)
    if (!showThumbNav) return
    const idx = allImages.indexOf(img)
    if (idx < 0) return
    setThumbWindowStart(s => {
      const effective = Math.min(s, thumbMaxStart)
      if (idx < effective) return idx
      if (idx >= effective + visibleCount) return idx - visibleCount + 1
      return effective
    })
  }


  return (
    <div
      className={`pdpThumbRow${showThumbNav ? ' pdpThumbRow--paged' : ''}`}
      aria-label="Thư viện ảnh"
    >
      {showThumbNav && (
        <button
          type="button"
          className="pdpThumbNav pdpThumbNav--prev"
          disabled={thumbStart <= 0}
          onClick={() => setThumbWindowStart(Math.max(0, thumbStart - 1))}
          aria-label="Xem ảnh nhỏ phía trước"
        >
          ‹
        </button>
      )}
      <div className="pdpThumbCol">
        {thumbsToRender.map((img, i) => {
          const globalIdx = showThumbNav ? thumbStart + i : i
          return (
            <button
              key={`${img}-${globalIdx}`}
              type="button"
              className={`pdpThumb ${selectedImg === img ? 'active' : ''}`}
              onClick={() => pick(img)}
              aria-label={`Chọn ảnh ${globalIdx + 1}`}
            >
              <img src={resolveImageUrl(img)} alt="" />
            </button>
          )
        })}
      </div>
      {showThumbNav && (
        <button
          type="button"
          className="pdpThumbNav pdpThumbNav--next"
          disabled={thumbStart >= thumbMaxStart}
          onClick={() => setThumbWindowStart(Math.min(thumbMaxStart, thumbStart + 1))}
          aria-label="Xem ảnh nhỏ tiếp theo"
        >
          ›
        </button>
      )}
    </div>
  )
}

type PdpFacetVariantPickerProps = {
  facet: VariantFacetModel
  product: Product
  selectedVariant: ProductVariant | null
  onSelectVariant: (v: ProductVariant) => void
}

function PdpFacetVariantPicker({
  facet,
  product,
  selectedVariant,
  onSelectVariant,
}: PdpFacetVariantPickerProps) {
  const [showAllStorages, setShowAllStorages] = useState(false)
  const selColor = selectedVariant ? variantColorLabel(selectedVariant) : facet.colors[0]
  const rawSt = selectedVariant ? variantStorageLabel(selectedVariant) : ''
  const selStorage =
    facet.storages.find(s => storageKeyNorm(s) === storageKeyNorm(rawSt)) ??
    facet.storages[0]

  useEffect(() => {
    // reset on product/variant context change
    queueMicrotask(() => setShowAllStorages(false))
  }, [selColor, facet.storages.length, product.id])

  const { visibleStorages, canToggleStorages } = useMemo(() => {
    const MAX_COLLAPSED = 6
    const all = facet.storages
    const canToggle = all.length > MAX_COLLAPSED
    if (!canToggle || showAllStorages) return { visibleStorages: all, canToggleStorages: canToggle }

    const selectedKey = storageKeyNorm(selStorage)
    const selectedInAll = all.find(s => storageKeyNorm(s) === selectedKey)
    const base = all.slice(0, MAX_COLLAPSED - 1) // reserve slot 6 for "Xem thêm"
    if (selectedInAll && !base.some(s => storageKeyNorm(s) === selectedKey)) {
      base[MAX_COLLAPSED - 2] = selectedInAll
    }
    return { visibleStorages: base, canToggleStorages: true }
  }, [facet.storages, selStorage, showAllStorages])

  return (
    <div className="pdpFacetVariant">
      {facet.colors.length > 1 && (
        <div className="pdpFacetSection">
          <span className="pdpFacetHeading">Màu sắc</span>
          <div className="pdpFacetChipRow pdpFacetChipRow--colors" role="list">
            {facet.colors.map(col => {
              const rep = facet.repByColor.get(col)!
              const active = col === selColor
              return (
                <button
                  key={col}
                  type="button"
                  role="listitem"
                  className={`pdpFacetColorChip ${active ? 'is-active' : ''}`}
                  onClick={() =>
                    onSelectVariant(resolveVariantByFacet(facet, col, selStorage))
                  }
                  aria-pressed={active}
                >
                  <span className="pdpFacetColorChip__img">
                    <img
                      src={resolveImageUrl(rep.image_url || product.main_image_url)}
                      alt=""
                    />
                  </span>
                  <span className="pdpFacetColorChip__label">{col}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {facet.storages.length > 0 && (
        <div className="pdpFacetSection">
          <span className="pdpFacetHeading">Phiên bản</span>
          <div className="pdpFacetChipRow pdpFacetChipRow--storages" role="list">
            {visibleStorages.map(st => {
              const vOpt = facet.byColorStorage.get(
                `${selColor}\0${storageKeyNorm(st)}`,
              )
              const disabled = !vOpt
              const active = storageKeyNorm(st) === storageKeyNorm(selStorage)
              const priceStr = vOpt
                ? `${parseFloat(vOpt.effective_price.toString()).toLocaleString('vi-VN')} đ`
                : '—'
              return (
                <button
                  key={st}
                  type="button"
                  role="listitem"
                  disabled={disabled}
                  className={`pdpFacetStorageChip ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    if (vOpt) onSelectVariant(vOpt)
                  }}
                  aria-pressed={active && !disabled}
                >
                  <span className="pdpFacetStorageChip__cap">{st}</span>
                  <span className="pdpFacetStorageChip__price">{priceStr}</span>
                </button>
              )
            })}

            {canToggleStorages && !showAllStorages && (
              <button
                type="button"
                className="pdpFacetStorageChip pdpFacetStorageChip--more"
                onClick={() => setShowAllStorages(true)}
                aria-expanded="false"
              >
                <span className="pdpFacetStorageChip__cap">Xem thêm</span>
                <span className="pdpFacetStorageChip__price">phiên bản khác</span>
              </button>
            )}

            {canToggleStorages && showAllStorages && (
              <button
                type="button"
                className="pdpFacetStorageChip pdpFacetStorageChip--more"
                onClick={() => setShowAllStorages(false)}
                aria-expanded="true"
              >
                <span className="pdpFacetStorageChip__cap">Thu gọn</span>
                <span className="pdpFacetStorageChip__price">phiên bản</span>
              </button>
            )}
          </div>
        </div>
      )}
      {selectedVariant?.stock_quantity === 0 && (
        <p className="pdpFacetStockNote">Phiên bản này đang hết hàng.</p>
      )}
    </div>
  )
}

import { useSearchParams } from 'react-router-dom'

export default function ProductDetailPage() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const variantIdParam = searchParams.get('variant')

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImg, setSelectedImg] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [qty, setQty] = useState(1)
  const [openFaqId, setOpenFaqId] = useState<number | null>(null)
  const [isRichExpanded, setIsRichExpanded] = useState(false)
  const [canExpandRich, setCanExpandRich] = useState(false)
  const richRef = useRef<HTMLDivElement | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [expPerformance, setExpPerformance] = useState(5)
  const [expBattery, setExpBattery] = useState(5)
  const [expCamera, setExpCamera] = useState(5)
  const [reviewImages, setReviewImages] = useState<File[]>([])
  const [reviewFilter, setReviewFilter] = useState<
    'all' | 'with_images' | 'verified' | 'star_5' | 'star_4' | 'star_3' | 'star_2' | 'star_1'
  >('all')
  const [shopQnas, setShopQnas] = useState<ProductShopQnaPublic[]>([])
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaGuestName, setQaGuestName] = useState('')
  const [qaSending, setQaSending] = useState(false)
  const [qaFlash, setQaFlash] = useState<string | null>(null)
  const [qaError, setQaError] = useState<string | null>(null)
  const [buyerLoggedIn, setBuyerLoggedIn] = useState(false)
  const [qnaShopOpenById, setQnaShopOpenById] = useState<Record<number, boolean>>({})

  const isInCompare = useMemo(() => {
    if (!product) return false
    return getCompareList().some(p => p.id === product.id)
  }, [product?.id])

  async function toggleCompare() {
    if (!product) return
    if (isInCompare) {
      removeFromCompare(product.id)
    } else {
      const res = addToCompare({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image_url: resolveImageUrl(product.main_image_url),
        price: selectedVariant ? selectedVariant.effective_price : 0,
      })
      if (!res.success && res.message) {
        alert(res.message)
      }
    }
  }

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const hasAuth = !!token
  const [wishSet, setWishSet] = useState<Set<number>>(() => new Set())

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
      common[1],
      {
        key: 'connect',
        icon: <CommitIconCpu />,
        text: 'Hỗ trợ kết nối/cài đặt cơ bản (app, EQ) nếu cần.',
      },
      common[2],
    ]

    const accessories: CommitItem[] = [
      {
        key: 'quality',
        icon: <CommitIconPhoneCheck />,
        text: 'Hàng mới — đúng chuẩn thông số (PD/QC/GaN… nếu có).',
      },
      {
        key: 'warranty-acc',
        icon: <CommitIconShieldCheck />,
        text: 'Bảo hành theo sản phẩm — hỗ trợ đổi mới nhanh nếu lỗi nhà sản xuất theo quy định.',
      },
      common[2],
    ]

    const isPhoneTablet = /dien-thoai|điện thoại|tablet|may-tinh-bang|ipad|iphone/.test(hay)
    const isLaptopPcMac = /laptop|mac|macbook|pc|may-tinh|máy tính/.test(hay)
    const isComponents = /linh-kien|linh kiện|cpu|ram|ssd|vga|gpu|main/.test(hay)
    const isMonitor = /man-hinh|màn hình|monitor/.test(hay)
    const isAudio = /tai-nghe|tai nghe|loa|audio|airpods/.test(hay)
    const isAccessories = /phu-kien|phụ kiện|cap|cáp|sac|sạc|chuot|chuột|ban-phim|bàn phím/.test(hay)

    if (isComponents) return components
    if (isMonitor) return monitor
    if (isAudio) return audio
    if (isLaptopPcMac) return laptopPcMac
    if (isPhoneTablet) return phoneTablet
    if (isAccessories) return accessories
    return common
  }, [product?.category?.name, product?.category?.slug])

  const visibleReviews: ProductReview[] = useMemo(() => [...(product?.reviews ?? [])], [product?.reviews])

  const reviewStats = useMemo(() => {
    const total = visibleReviews.length
    if (total === 0) {
      return {
        total: 0,
        avg: 0,
        counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>,
        exp: {
          performance: { avg: 0, count: 0 },
          battery: { avg: 0, count: 0 },
          camera: { avg: 0, count: 0 },
        },
      }
    }
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
    let sum = 0
    let perfSum = 0, perfCount = 0
    let batSum = 0, batCount = 0
    let camSum = 0, camCount = 0
    for (const r of visibleReviews) {
      const rating = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5
      counts[rating] += 1
      sum += rating

      const p = r.exp_performance
      if (typeof p === 'number' && p >= 1 && p <= 5) {
        perfSum += p
        perfCount += 1
      }
      const b = r.exp_battery
      if (typeof b === 'number' && b >= 1 && b <= 5) {
        batSum += b
        batCount += 1
      }
      const c = r.exp_camera
      if (typeof c === 'number' && c >= 1 && c <= 5) {
        camSum += c
        camCount += 1
      }
    }
    const avg = sum / total
    return {
      total,
      avg,
      counts,
      exp: {
        performance: { avg: perfCount ? perfSum / perfCount : 0, count: perfCount },
        battery: { avg: batCount ? batSum / batCount : 0, count: batCount },
        camera: { avg: camCount ? camSum / camCount : 0, count: camCount },
      },
    }
  }, [visibleReviews])

  const mergedDisplaySpecs = useMemo(() => {
    const raw = product?.specs ?? []
    const vid = selectedVariant?.id
    const common = raw.filter(s => s.product_variant_id == null || s.product_variant_id === undefined)
    const forVariant =
      vid != null ? raw.filter(s => Number(s.product_variant_id) === vid) : []
    const map = new Map<string, ProductSpecRow>()
    const order: string[] = []
    const mergeKey = (s: ProductSpecRow) => `${s.spec_group ?? ''}\0${s.spec_key ?? ''}`
    for (const s of common) {
      const key = mergeKey(s)
      order.push(key)
      map.set(key, s)
    }
    for (const s of forVariant) {
      const key = mergeKey(s)
      map.set(key, s)
      if (!order.includes(key)) order.push(key)
    }
    return order.map(k => map.get(k)!)
  }, [product?.specs, selectedVariant?.id])

  const variantFacetModel = useMemo(() => {
    const list = product?.variants
    if (!list?.length) return null
    return buildVariantFacetModel(list)
  }, [product?.variants])

  const showVariantFacetUi =
    !!variantFacetModel &&
    variantFacetModel.colors.length >= 1 &&
    (variantFacetModel.colors.length >= 2 || variantFacetModel.storages.length >= 2)

  const filteredReviews = useMemo(() => {
    const base = [...visibleReviews].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    if (reviewFilter === 'all') return base
    if (reviewFilter === 'with_images') return base // chưa lưu ảnh review, giữ UI filter
    if (reviewFilter === 'verified') return base.filter(r => !!r.order_id)
    if (reviewFilter === 'star_5') return base.filter(r => Math.round(r.rating) === 5)
    if (reviewFilter === 'star_4') return base.filter(r => Math.round(r.rating) === 4)
    if (reviewFilter === 'star_3') return base.filter(r => Math.round(r.rating) === 3)
    if (reviewFilter === 'star_2') return base.filter(r => Math.round(r.rating) === 2)
    return base.filter(r => Math.round(r.rating) === 1)
  }, [reviewFilter, visibleReviews])

  const activeFlashSale = useMemo(() => {
    if (!product?.flash_sale_items?.length) return null
    // Assuming only one active flash sale per product for simplicity
    return product.flash_sale_items[0]
  }, [product])

  const [flashTimeLeft, setFlashTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    if (!activeFlashSale) {
      setFlashTimeLeft(null)
      return
    }

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(activeFlashSale.flash_sale.end_at).getTime()
      const diff = end - now

      if (diff <= 0) {
        clearInterval(timer)
        setFlashTimeLeft(null)
      } else {
        setFlashTimeLeft({
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeFlashSale])

  useEffect(() => {
    if (slug) {
      queueMicrotask(() => {
        setLoading(true)
        setOpenFaqId(null)
        setIsRichExpanded(false)
      })
      fetchProductBySlug(slug)
        .then(res => {
          setProduct(res)
          setRelatedProducts([])
          setSelectedImg(res.main_image_url)
          setQty(1)

          // Handle variant selection from URL parameter
          if (res.variants && res.variants.length > 0) {
            let targetVariant = res.variants[0]
            if (variantIdParam) {
              const matched = res.variants.find(v => String(v.id) === variantIdParam)
              if (matched) targetVariant = matched
            }
            setSelectedVariant(targetVariant)
            
            // Also update main image if variant has its own image
            if (targetVariant.image_url) {
              setSelectedImg(targetVariant.image_url)
            }
          } else {
            setSelectedVariant(null)
          }

          const faqsSorted = [...(res.faqs ?? [])]
            .filter(f => f.is_active !== false)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          setOpenFaqId(faqsSorted[0]?.id ?? null)
        })
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra'),
        )
        .finally(() => setLoading(false))
    }
  }, [slug, variantIdParam])

  useEffect(() => {
    const el = richRef.current
    if (!el) return

    const COLLAPSED_PX = 680
    const update = () => {
      // scrollHeight includes overflow content; if greater than collapsed size, show the button
      setCanExpandRich(el.scrollHeight > COLLAPSED_PX + 10)
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [product?.rich_html])

  useEffect(() => {
    if (!product?.category_id || !product?.id) return
    fetchProducts({ category_id: product.category_id, limit: 20 })
      .then(res => {
        const list = (res.data || []).filter(p => p.id !== product.id).slice(0, 5)
        setRelatedProducts(list)
      })
      .catch(() => {
        setRelatedProducts([])
      })
  }, [product?.category_id, product?.id])

  useEffect(() => {
    let cancelled = false
    if (!slug) return
    const t = localStorage.getItem('token')
    Promise.resolve().then(async () => {
      if (!t) {
        if (!cancelled) setBuyerLoggedIn(false)
        return
      }
      try {
        await apiFetch<{ name?: string }>('/api/me', { token: t })
        if (!cancelled) setBuyerLoggedIn(true)
      } catch {
        if (!cancelled) setBuyerLoggedIn(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!hasAuth || !token) {
      queueMicrotask(() => setWishSet(new Set()))
      return
    }
    fetchWishlist(token)
      .then((items) => setWishSet(new Set(items.map((i) => i.product_id))))
      .catch(() => setWishSet(new Set()))
  }, [hasAuth, token])

  async function onToggleLike(productId: number) {
    if (!token) {
      navigate('/login')
      return
    }

    // Optimistic UI
    setWishSet((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })

    try {
      const status = await toggleWishlist(token, productId)
      setWishSet((prev) => {
        const next = new Set(prev)
        if (status === 'added') next.add(productId)
        else next.delete(productId)
        return next
      })
    } catch {
      // rollback
      setWishSet((prev) => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
    }
  }

  const refreshShopQnas = useCallback(async () => {
    const slugCur = product?.slug
    if (!slugCur) return
    setShopQnas(await fetchProductShopQnasPublic(slugCur))
  }, [product?.slug])

  useEffect(() => {
    const slugCur = product?.slug
    if (!slugCur) return
    let cancelled = false
    fetchProductShopQnasPublic(slugCur).then((rows) => {
      if (!cancelled) setShopQnas(rows)
    })
    return () => {
      cancelled = true
    }
  }, [product?.slug])

  if (loading) {
    return (
      <div className="pdpPage" style={{ paddingTop: '100px' }}>
        <div className="ppContainer">
          <div className="pdpMainGrid">
            {/* Gallery Skeleton */}
            <div className="pdpGallery">
            <div className="pdpGallerySkeleton">
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div className="pdpThumbSkeletonWrap" style={{ display: 'flex', flexDirection: 'row', gap: '12px', overflowX: 'auto', width: '100%' }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} width="70px" height="70px" borderRadius="8px" style={{ flexShrink: 0 }} />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <Skeleton width="100%" height="400px" borderRadius="16px" />
                </div>
              </div>
            </div>
          </div>

            {/* Info Skeleton */}
            <div className="pdpInfo">
              <Skeleton width="150px" height="14px" style={{ marginBottom: '16px' }} />
              <Skeleton width="90%" height="40px" style={{ marginBottom: '12px' }} />
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <Skeleton width="100px" height="20px" />
                <Skeleton width="100px" height="20px" />
              </div>
              <Skeleton width="200px" height="48px" style={{ marginBottom: '32px' }} />
              
              <div style={{ marginBottom: '32px' }}>
                <Skeleton width="120px" height="18px" style={{ marginBottom: '16px' }} />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} width="80px" height="40px" borderRadius="20px" />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
                <Skeleton width="140px" height="56px" borderRadius="28px" />
                <Skeleton width="200px" height="56px" borderRadius="28px" />
              </div>

              <div className="pdpCommitments" style={{ border: 'none', padding: 0 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                    <Skeleton width="24px" height="24px" borderRadius="50%" />
                    <Skeleton width="80%" height="16px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) return <div className="pdpError">Product not found. <Link to="/products">Back to store</Link></div>

  const images = product.images || []
  const rawImages = product.main_image_url ? [product.main_image_url, ...images.map(i => i.image_url)] : images.map(i => i.image_url)
  // Ensure unique images
  const allImages = Array.from(new Set(rawImages.filter(Boolean)))

  const visibleFaqs: ProductFaq[] = [...(product.faqs ?? [])]
    .filter(f => f.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const visibleNews: ProductNews[] = [...(product.news ?? [])]
    .filter(n => n.is_active !== false)
    .sort((a, b) => {
      const ap = a.published_at ? Date.parse(a.published_at) : 0
      const bp = b.published_at ? Date.parse(b.published_at) : 0
      if (bp !== ap) return bp - ap
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })

  // moved above (hooks must run before early returns)

  return (
    <>
      <Helmet>
        <title>{product.name} | E-Tech Market</title>
        <meta name="description" content={product.short_description || product.description || `Mua ${product.name} giá rẻ tại E-Tech Market.`} />
      </Helmet>
      <div className="pdpPage">
      <div className="ppContainer">
        <nav className="pdpBreadcrumb">
          <Link to="/">Home</Link> / <Link to="/products">Store</Link> / <span>{product.name}</span>
        </nav>

        <div className="pdpMainGrid">
          {/* Image Gallery */}
          <div className="pdpGallery">
            <div className="pdpGalleryGrid">
              <div className="pdpMainImageWrap">
                <img src={resolveImageUrl(selectedImg || product.main_image_url)} alt={product.name} className="pdpMainImage" />
              </div>
              {allImages.length > 1 && (
                <PdpThumbStrip
                  key={product.id}
                  allImages={allImages}
                  selectedImg={selectedImg}
                  onSelectImage={setSelectedImg}
                />
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="pdpInfo">
            {activeFlashSale && flashTimeLeft && (
              <div className="pdpFlashSaleHeader">
                <div className="pdpFlashSaleTitle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>FLASH SALE ĐANG DIỄN RA</span>
                </div>
                <div className="pdpFlashSaleTimer">
                  <span>KẾT THÚC TRONG</span>
                  <div className="timerBox">{String(flashTimeLeft.h).padStart(2, '0')}</div>
                  <span>:</span>
                  <div className="timerBox">{String(flashTimeLeft.m).padStart(2, '0')}</div>
                  <span>:</span>
                  <div className="timerBox">{String(flashTimeLeft.s).padStart(2, '0')}</div>
                </div>
              </div>
            )}

            <div className="pdpPriceRow">
              <span className="pdpPrice">
                {activeFlashSale 
                  ? `${parseFloat(activeFlashSale.flash_sale_price.toString()).toLocaleString('vi-VN')} đ`
                  : parseFloat(selectedVariant ? selectedVariant.effective_price.toString() : '0').toLocaleString('vi-VN') + ' đ'
                }
              </span>
              {(activeFlashSale || (selectedVariant && selectedVariant.effective_price < parseFloat(selectedVariant.price))) && (
                <span className="pdpOldPrice">
                  {activeFlashSale 
                    ? `${parseFloat(selectedVariant ? selectedVariant.price : '0').toLocaleString('vi-VN')} đ`
                    : parseFloat(selectedVariant!.price).toLocaleString('vi-VN') + ' đ'
                  }
                </span>
              )}
            </div>

            {/* Variants: facet (màu + dung lượng) hoặc danh sách gọn */}
            {product.variants && product.variants.length > 0 && (
              <div className="pdpConfigurator">
                {showVariantFacetUi && variantFacetModel ? (
                  <PdpFacetVariantPicker
                    facet={variantFacetModel}
                    product={product}
                    selectedVariant={selectedVariant}
                    onSelectVariant={setSelectedVariant}
                  />
                ) : (
                  <div className="pdpConfigGroup">
                    <label>Chọn phiên bản</label>
                    <div className="pdpVariantFallback">
                      {product.variants.map((v, i) => {
                        const isActive = selectedVariant?.id === v.id
                        return (
                          <button
                            key={v.id ?? i}
                            type="button"
                            className={`pdpVariantFallbackChip ${isActive ? 'is-active' : ''}`}
                            onClick={() => setSelectedVariant(v)}
                          >
                            <span className="pdpVariantFallbackChip__name">{v.variant_name}</span>
                            <span className="pdpVariantFallbackChip__meta">
                              {[variantColorLabel(v), variantStorageLabel(v)]
                                .filter(Boolean)
                                .join(' · ') || 'Chi tiết trong tên'}
                            </span>
                            <span className="pdpVariantFallbackChip__price">
                              {parseFloat(v.effective_price.toString()).toLocaleString('vi-VN')} đ
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="pdpShortDesc">
              {product.description}
            </p>

            <div className="pdpMeta">
              <div className="pdpMetaItem">
                <span className="label">CATEGORY</span>
                <span className="value">{product.category?.name || 'Electronics'}</span>
              </div>
              <div className="pdpMetaItem">
                <span className="label">SKU</span>
                <span className="value">{selectedVariant ? selectedVariant.sku : 'N/A'}</span>
              </div>
              <div className="pdpMetaItem">
                <span className="label">AVAILABILITY</span>
                <span className={`value stock ${selectedVariant && selectedVariant.stock_quantity === 0 ? 'out' : ''}`}>
                  {selectedVariant 
                    ? (selectedVariant.stock_quantity > 0 ? `IN STOCK (${selectedVariant.stock_quantity})` : 'OUT OF STOCK')
                    : 'IN STOCK'}
                </span>
              </div>
            </div>

            <div className="pdpActions">
              <div className="pdpQtyWrap">
                <button
                  type="button"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  aria-label="Giảm số lượng"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  aria-label="Số lượng"
                />
                <button
                  type="button"
                  onClick={() => setQty(q => q + 1)}
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="pdpAddBtn"
                onClick={() => {
                  const v = selectedVariant
                  const priceStr = v ? v.effective_price.toString() : '0'
                  const price = activeFlashSale
                    ? Number.parseFloat(activeFlashSale.flash_sale_price.toString())
                    : Number.parseFloat(priceStr)
                  
                  const variantLabel =
                    v
                      ? [variantColorLabel(v), variantStorageLabel(v)]
                          .filter(Boolean)
                          .join(' · ') ||
                        v.variant_name
                      : null
                  addToCart(
                    {
                      product_id: product.id,
                      slug: product.slug,
                      name: product.name,
                      price: Number.isFinite(price) ? price : 0,
                      image_url: resolveImageUrl(v?.image_url || product.main_image_url),
                      variant_id: v?.id ?? null,
                      variant_label: variantLabel,
                      quantity: 1,
                    },
                    qty,
                  )
                }}
              >
                THÊM VÀO GIỎ
              </button>

              <button
                type="button"
                className={`pdpCompareBtn ${isInCompare ? 'is-active' : ''}`}
                onClick={toggleCompare}
                title="So sánh sản phẩm"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 3h5v5M4 20l7-7M21 3l-7 7M15 14l6 6M9 3H4v5M3 21l7-7M3 3l7 7M14 15l7 7"></path>
                </svg>
                <span>{isInCompare ? 'ĐÃ THÊM' : 'SO SÁNH'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section - Two Columns */}
        <div className="pdpBottomGrid">
          <div className="pdpSpecsSide">
            {/* Specifications Section - Table Style */}
            <div className="pdpSpecsSection">
              <div className="pdpSpecsHeader">
                <h3 className="pdpSectionTitle">Thông số kỹ thuật</h3>
              </div>
              
              {mergedDisplaySpecs.length > 0 ? (
                <div className="pdpSpecsTable">
                  {Object.entries(
                    mergedDisplaySpecs.reduce(
                      (acc: Record<string, ProductSpecRow[]>, spec: ProductSpecRow) => {
                        const group = spec.spec_group || 'Thông tin khác'
                        if (!acc[group]) acc[group] = []
                        acc[group].push(spec)
                        return acc
                      },
                      {} as Record<string, ProductSpecRow[]>,
                    )
                  ).map(([groupName, groupSpecs], idx) => (
                    <div key={idx} className="pdpTableRow">
                      <div className="pdpTableKey">{groupName}</div>
                      <div className="pdpTableValue">
                        {groupSpecs.map((s, i) => (
                          <div key={i} className="vValueLine">
                            <span className="vInnerKey">{s.spec_key}: </span>
                            <span className="vInnerVal">{s.spec_value} {s.spec_unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pdpNoData">Chưa có thông số kỹ thuật.</p>
              )}
            </div>
          </div>

          <div className="pdpSidebarSide">
            {/* Product Commitments */}
            <div className="pdpCommitments">
              <h3 className="pdpCommitTitle">Cam kết sản phẩm</h3>
              <div className="pdpCommitGrid">
                {commitmentItems.map((item) => (
                  <div key={item.key} className="pdpCommitCard">
                    <div className="pdpCommitIcon" aria-hidden>
                      {item.icon}
                    </div>
                    <p className="pdpCommitText">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <section className="pdpFaqSection" aria-labelledby="pdp-faq-mau-title">
              <h3 id="pdp-faq-mau-title" className="pdpFaqMainTitle">
                Câu hỏi thường gặp{' '}
                <span className="pdpFaqTitleEyebrow">về sản phẩm</span>
              </h3>
              <p className="pdpFaqSidebarLead">
                Các gợi ý được cửa hàng soạn trước — xem chung cho mọi phiên bản.
              </p>
              {visibleFaqs.length > 0 ? (
                <ul className="pdpFaqList">
                  {visibleFaqs.map(faq => {
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
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="pdpRelatedSection" aria-label="Sản phẩm liên quan">
            <div className="pdpRelatedHeader">
              <h3 className="pdpRelatedTitle">Sản phẩm liên quan</h3>
            </div>
            <div className="pdpRelatedGrid">
              {relatedProducts.map(rp => (
                <div key={rp.id} className="pdpRelatedCard">
                  <Link to={`/products/${rp.slug}`} className="pdpRelatedTop">
                    <div className="pdpRelatedImgWrap">
                      <img
                        src={resolveImageUrl(rp.main_image_url)}
                        alt={rp.name}
                        className="pdpRelatedImg"
                        loading="lazy"
                      />
                    </div>
                  </Link>

                  <div className="pdpRelatedInfo">
                    <Link to={`/products/${rp.slug}`} className="pdpRelatedNameLink">
                      <div className="pdpRelatedName">{rp.name}</div>
                    </Link>

                    <div className="pdpRelatedPriceRow">
                      <div className="pdpRelatedPrice">{parseFloat(rp.price).toLocaleString('vi-VN')}đ</div>
                    </div>

                    {(rp.short_description || rp.description) && (
                      <div className="pdpRelatedDesc">
                        {rp.short_description || rp.description}
                      </div>
                    )}

                    <button
                      type="button"
                      className="pdpRelatedFavBtn"
                      aria-label={wishSet.has(rp.id) ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
                      onClick={() => onToggleLike(rp.id)}
                    >
                      <span className="pdpRelatedFavIcon" aria-hidden>
                        <HeartIcon filled={wishSet.has(rp.id)} size={18} />
                      </span>
                      <span>{wishSet.has(rp.id) ? 'Đã yêu thích' : 'Yêu thích'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {product.rich_html && (
          <section className="pdpRichSection" aria-label="Nội dung sản phẩm">
            <div
              className={[
                'pdpRichGrid',
                isRichExpanded ? 'is-expanded' : '',
                visibleNews.length > 0 ? '' : 'is-no-news',
              ].filter(Boolean).join(' ')}
            >
              <div className="pdpRichLeft">
                <div className="pdpRichCard">
                  <div
                    ref={richRef}
                    className={`pdpRichContent ${!isRichExpanded ? 'is-collapsed' : ''}`}
                    dangerouslySetInnerHTML={{ __html: product.rich_html }}
                  />
                  {canExpandRich && (
                    <div className="pdpRichActions">
                      <button
                        type="button"
                        className="pdpRichToggleBtn"
                        onClick={() => setIsRichExpanded(v => !v)}
                        aria-expanded={isRichExpanded}
                      >
                        {isRichExpanded ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {visibleNews.length > 0 && (
                <div className="pdpRichRight">
                  <section className="pdpNewsSection" aria-labelledby="pdp-news-title">
                    <div className="pdpNewsHead">
                      <h3 id="pdp-news-title" className="pdpNewsTitle">Tin tức sản phẩm</h3>
                      <Link to={`/products/${product.slug}#product-news`} className="pdpNewsAllLink">Xem tất cả</Link>
                    </div>
                    <div className="pdpNewsMiniList" id="product-news">
                      {visibleNews.slice(0, 7).map(item => (
                        <Link key={item.id} to={`/product-news/${item.slug}`} className="pdpNewsMiniCard">
                          <span className="pdpNewsMiniThumb" aria-hidden>
                            {item.thumbnail_url ? (
                              <img src={resolveImageUrl(item.thumbnail_url)} alt="" />
                            ) : (
                              <span className="pdpNewsMiniThumbPh" />
                            )}
                          </span>
                          <span className="pdpNewsMiniTitle">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="pdpReviewsSection" aria-label="Đánh giá sản phẩm">
          <div className="pdpReviewsHeader">
            <h3 className="pdpReviewsTitle">Đánh giá {product.name}</h3>
          </div>

          <div className="pdpReviewsSummary">
            <div className="pdpReviewsScore">
              <div className="pdpScoreBig">
                {reviewStats.avg ? reviewStats.avg.toFixed(1) : '0.0'}
                <span className="pdpScoreSmall">/5</span>
              </div>
              <div className="pdpStarsRow">
                <Stars value={reviewStats.avg} />
              </div>
              <div className="pdpReviewsCount">{reviewStats.total} lượt đánh giá</div>
              <button type="button" className="pdpWriteReviewBtn" onClick={() => setIsReviewModalOpen(true)}>
                Viết đánh giá
              </button>
            </div>

            <div className="pdpReviewsBars">
              {[5,4,3,2,1].map(star => {
                const s = star as 1|2|3|4|5
                const count = reviewStats.counts[s]
                const pct = reviewStats.total ? (count / reviewStats.total) * 100 : 0
                return (
                  <div key={star} className="pdpBarRow">
                    <span className="pdpBarLabel">{star}</span>
                    <span className="pdpBarStar">★</span>
                    <div className="pdpBarTrack">
                      <div className="pdpBarFill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="pdpBarCount">{count} đánh giá</span>
                  </div>
                )
              })}
            </div>

            <div className="pdpReviewsExp">
              <div className="pdpReviewsExpTitle">Đánh giá theo trải nghiệm</div>
              <div className="pdpReviewsExpList">
                <div className="pdpExpStatRow">
                  <div className="pdpExpStatLabel">Hiệu năng</div>
                  <div className="pdpExpStatStars"><Stars value={reviewStats.exp.performance.avg} /></div>
                  <div className="pdpExpStatRight">
                    {reviewStats.exp.performance.count ? `${reviewStats.exp.performance.avg.toFixed(0)}/5` : '0/5'}
                    <span className="pdpExpStatMeta">({reviewStats.exp.performance.count} đánh giá)</span>
                  </div>
                </div>
                <div className="pdpExpStatRow">
                  <div className="pdpExpStatLabel">Thời lượng pin</div>
                  <div className="pdpExpStatStars"><Stars value={reviewStats.exp.battery.avg} /></div>
                  <div className="pdpExpStatRight">
                    {reviewStats.exp.battery.count ? `${reviewStats.exp.battery.avg.toFixed(0)}/5` : '0/5'}
                    <span className="pdpExpStatMeta">({reviewStats.exp.battery.count} đánh giá)</span>
                  </div>
                </div>
                <div className="pdpExpStatRow">
                  <div className="pdpExpStatLabel">Chất lượng camera</div>
                  <div className="pdpExpStatStars"><Stars value={reviewStats.exp.camera.avg} /></div>
                  <div className="pdpExpStatRight">
                    {reviewStats.exp.camera.count ? `${reviewStats.exp.camera.avg.toFixed(0)}/5` : '0/5'}
                    <span className="pdpExpStatMeta">({reviewStats.exp.camera.count} đánh giá)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pdpReviewsFilters" aria-label="Lọc đánh giá theo">
            <div className="pdpReviewsFiltersLabel">Lọc đánh giá theo</div>
            <div className="pdpReviewChips">
              <button type="button" className={`pdpChip ${reviewFilter === 'all' ? 'active' : ''}`} onClick={() => setReviewFilter('all')}>Tất cả</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'with_images' ? 'active' : ''}`} onClick={() => setReviewFilter('with_images')}>Có hình ảnh</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'verified' ? 'active' : ''}`} onClick={() => setReviewFilter('verified')}>Đã mua hàng</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'star_5' ? 'active' : ''}`} onClick={() => setReviewFilter('star_5')}>5 sao</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'star_4' ? 'active' : ''}`} onClick={() => setReviewFilter('star_4')}>4 sao</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'star_3' ? 'active' : ''}`} onClick={() => setReviewFilter('star_3')}>3 sao</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'star_2' ? 'active' : ''}`} onClick={() => setReviewFilter('star_2')}>2 sao</button>
              <button type="button" className={`pdpChip ${reviewFilter === 'star_1' ? 'active' : ''}`} onClick={() => setReviewFilter('star_1')}>1 sao</button>
            </div>
          </div>

          <div className="pdpReviewsList">
            {filteredReviews.length === 0 ? (
              <div className="pdpNoReviews">Chưa có đánh giá nào.</div>
            ) : (
              filteredReviews.slice(0, 5).map(r => (
                <div key={r.id} className="pdpReviewItem">
                  <div className="pdpReviewLeft">
                    <div className="pdpReviewAvatar" aria-hidden>
                      {r.user?.avatar_url ? (
                        <img
                          className="pdpAvatarImg"
                          src={resolveImageUrl(r.user.avatar_url)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        avatarInitial(r.user?.name || 'U')
                      )}
                    </div>
                    <div className="pdpReviewName">{r.user?.name || 'Người dùng'}</div>
                  </div>
                  <div className="pdpReviewRight">
                    <div className="pdpReviewStars">
                      <Stars value={r.rating} />
                      <span className="pdpReviewLabel">{ratingLabel(r.rating)}</span>
                    </div>
                    <div className="pdpReviewPills">
                      {typeof r.exp_performance === 'number' && (
                        <span className="pdpReviewPill">Hiệu năng {r.exp_performance >= 5 ? 'Siêu mạnh mẽ' : ratingLabel(r.exp_performance)}</span>
                      )}
                      {typeof r.exp_battery === 'number' && (
                        <span className="pdpReviewPill">Thời lượng pin {r.exp_battery >= 5 ? 'Cực khủng' : ratingLabel(r.exp_battery)}</span>
                      )}
                      {typeof r.exp_camera === 'number' && (
                        <span className="pdpReviewPill">Chất lượng camera {r.exp_camera >= 5 ? 'Chụp đẹp, chuyên nghiệp' : ratingLabel(r.exp_camera)}</span>
                      )}
                      {!!r.order_id && <span className="pdpReviewPill verified">Đã mua hàng</span>}
                    </div>
                    {r.comment && <div className="pdpReviewComment">{r.comment}</div>}
                    <div className="pdpReviewTime">
                      <span className="pdpReviewClock" aria-hidden>🕒</span>
                      Đánh giá đã đăng vào {timeAgoVi(r.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

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
                const token = localStorage.getItem('token')
                setQaSending(true)
                try {
                  const res = await apiFetch<{ message?: string }>(
                    `/api/products/${encodeURIComponent(product.slug)}/shop-qna`,
                    {
                      method: 'POST',
                      token: token || undefined,
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

        {isReviewModalOpen && (
          <div className="pdpReviewModalOverlay" onClick={() => setIsReviewModalOpen(false)}>
            <div className="pdpReviewModal" onClick={e => e.stopPropagation()}>
              <div className="pdpReviewModalHead">
                <div className="pdpReviewModalTitle">Đánh giá &amp; nhận xét</div>
                <button type="button" className="pdpReviewModalClose" onClick={() => setIsReviewModalOpen(false)}>×</button>
              </div>
              <div className="pdpReviewModalBody">
                <div className="pdpReviewProductRow">
                  <div className="pdpReviewMascot" aria-hidden>
                    <span>★</span>
                  </div>
                  <div className="pdpReviewProductName">{product.name}</div>
                </div>

                <div className="pdpReviewSection">
                  <div className="pdpReviewSectionTitle">Đánh giá chung</div>
                  <RatingRow value={reviewRating} onChange={setReviewRating} />
                  <div className="pdpReviewScale">
                    <span>Rất tệ</span>
                    <span>Tệ</span>
                    <span>Bình thường</span>
                    <span>Tốt</span>
                    <span>Tuyệt vời</span>
                  </div>
                </div>

                <div className="pdpReviewSection">
                  <div className="pdpReviewSectionTitle">Theo trải nghiệm</div>
                  <ExperienceRow label="Hiệu năng" value={expPerformance} onChange={setExpPerformance} rightText={expPerformance >= 5 ? 'Siêu mạnh mẽ' : ratingLabel(expPerformance)} />
                  <ExperienceRow label="Thời lượng pin" value={expBattery} onChange={setExpBattery} rightText={expBattery >= 5 ? 'Cực khủng' : ratingLabel(expBattery)} />
                  <ExperienceRow label="Chất lượng camera" value={expCamera} onChange={setExpCamera} rightText={expCamera >= 5 ? 'Chụp đẹp, chuyên nghiệp' : ratingLabel(expCamera)} />
                </div>

                <div className="pdpReviewField">
                  <textarea
                    className="pdpReviewTextarea"
                    rows={5}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Xin mời chia sẻ một số cảm nhận về sản phẩm (nhập tối thiểu 15 kí tự)"
                  />
                </div>

                <div className="pdpReviewUploadRow">
                  <label className="pdpReviewUploadBtn">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={e => {
                        const files = Array.from(e.target.files || [])
                        if (files.length === 0) return
                        setReviewImages(prev => [...prev, ...files].slice(0, 5))
                        e.currentTarget.value = ''
                      }}
                    />
                    <span className="pdpReviewUploadIcon" aria-hidden>📷</span>
                    <span>Thêm hình ảnh</span>
                  </label>

                  {reviewImages.length > 0 && (
                    <div className="pdpReviewThumbs">
                      {reviewImages.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="pdpReviewThumb">
                          <img src={URL.createObjectURL(f)} alt="" />
                          <button
                            type="button"
                            className="pdpReviewThumbRemove"
                            onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="pdpReviewModalFoot">
                <button
                  type="button"
                  className="pdpReviewSubmit"
                  onClick={async () => {
                    const token = localStorage.getItem('token')
                    if (!token) {
                      alert('Vui lòng đăng nhập để đánh giá.')
                      return
                    }
                    if ((reviewComment || '').trim().length < 15) {
                      alert('Vui lòng nhập tối thiểu 15 kí tự.')
                      return
                    }
                    try {
                      await apiFetch(`/api/products/${product.id}/reviews`, {
                        method: 'POST',
                        token,
                        body: JSON.stringify({
                          rating: reviewRating,
                          exp_performance: expPerformance,
                          exp_battery: expBattery,
                          exp_camera: expCamera,
                          comment: reviewComment || null,
                        }),
                      })
                      setIsReviewModalOpen(false)
                      // refresh product data
                      const updated = await fetchProductBySlug(product.slug)
                      setProduct(updated)
                    } catch (e: unknown) {
                      alert(e instanceof Error ? e.message : 'Gửi đánh giá thất bại.')
                    }
                  }}
                >
                  GỬI ĐÁNH GIÁ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

function Stars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value))
  const full = Math.floor(v)
  const half = v - full >= 0.5
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'full'
    if (i === full && half) return 'half'
    return 'empty'
  })
  return (
    <span className="pdpStars">
      {stars.map((t, i) => (
        <span key={i} className={`pdpStar ${t}`}>★</span>
      ))}
    </span>
  )
}

function ratingLabel(rating: number) {
  const r = Math.round(Math.max(1, Math.min(5, rating)))
  if (r >= 5) return 'Tuyệt vời'
  if (r === 4) return 'Rất tốt'
  if (r === 3) return 'Tốt'
  if (r === 2) return 'Tạm ổn'
  return 'Chưa hài lòng'
}

function RatingRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const v = Math.round(Math.max(1, Math.min(5, value)))
  return (
    <div className="pdpRatingRow">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1
        const active = star <= v
        return (
          <button
            key={star}
            type="button"
            className={`pdpRatingStar ${active ? 'active' : ''}`}
            onClick={() => onChange(star)}
            aria-label={`${star} sao`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

function ExperienceRow({
  label,
  value,
  onChange,
  rightText,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  rightText: string
}) {
  return (
    <div className="pdpExpRow">
      <div className="pdpExpLabel">{label}</div>
      <div className="pdpExpStars">
        <RatingRow value={value} onChange={onChange} />
      </div>
      <div className="pdpExpRight">{rightText}</div>
    </div>
  )
}

function timeAgoVi(iso: string) {
  let t = Date.parse(iso)
  if (!isFinite(t)) {
    // common server formats: "YYYY-MM-DD HH:mm:ss"
    const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T')
    t = Date.parse(normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`)
  }
  if (!isFinite(t)) return 'gần đây'
  const diff = Date.now() - t
  if (diff < 0) return 'vừa xong'
  const m = Math.floor(diff / (60 * 1000))
  if (m <= 0) return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ngày trước`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo} tháng trước`
  const y = Math.floor(mo / 12)
  return `${y} năm trước`
}

function CommitIconPhoneCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke="currentColor" strokeWidth="1.55" />
      <path d="M10 5.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M10.2 12.3l1.35 1.35 3.45-3.4"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18.2h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
    </svg>
  )
}

function CommitIconShieldCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path
        d="M12 21.5c4.5-2.2 7.5-5.8 7.5-10.4V6.2L12 3.5 4.5 6.2v4.9c0 4.6 3 8.2 7.5 10.4Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.2l2 2 4.2-4.1"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommitIconCpu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <rect x="7.2" y="7.2" width="9.6" height="9.6" rx="1.4" stroke="currentColor" strokeWidth="1.45" />
      <rect x="9.7" y="9.7" width="4.6" height="4.6" rx="0.5" stroke="currentColor" strokeWidth="1.15" />
      <path
        d="M12 5.2v2M12 16.8v2M16.8 12h2M5.2 12H7M9 5.2v1.9M15 5.2v1.9M9 17v1.9M15 17v1.9M5.2 9h2M16.8 9h2M5.2 15h2M16.8 15h2"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CommitIconPriceTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
      <path
        d="M4.5 9.8V7.2A1.7 1.7 0 0 1 6.2 5.5h2.6l10.7 10.7v2.6a1.7 1.7 0 0 1-1.7 1.7h-2.6L4.5 12.4v-2.6Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <circle cx="7.3" cy="7.3" r="1.35" fill="currentColor" />
      <path
        d="M12.2 14.2l2.1 2.1 3.6-3.6"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
