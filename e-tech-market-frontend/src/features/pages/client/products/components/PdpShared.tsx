/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useMemo } from 'react'
import { API_BASE_URL } from '@/configs/api.config'
import type { Product, ProductVariant, ProductShopQnaPublic, Video } from '@/features/services/products.service'
import { apiFetch } from '@/configs/api.config'

export const resolveImageUrl = (url: string | null) => {
  if (!url) return 'https://via.placeholder.com/600'
  const s = url.trim()
  if (!s) return 'https://via.placeholder.com/600'
  if (/^https?:\/\//i.test(s)) {
    try {
      const urlObj = new URL(s)
      if (urlObj.hostname === 'nginx' || urlObj.hostname === 'localhost') {
        const path = s.replace(/^https?:\/\/[^/]+/, '')
        return window.location.origin + path
      }
    } catch { /* keep original */ }
    return s
  }
  return `${API_BASE_URL}${s.startsWith('/') ? s : `/${s}`}`
}

export function renderVideoPlayer(videoUrl: string, title?: string | null) {
  if (!videoUrl) return null

  let embedUrl = ''
    const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/)
  if (ytMatch) {
    embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
  } else {
    const vimeoMatch = videoUrl.match(/(?:vimeo\.com\/)(?:video\/)?(\d+)/)
    if (vimeoMatch) {
      embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`
    }
  }

  if (embedUrl) {
    return (
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title={title || 'Product Video'}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  const videoSrc = videoUrl.startsWith('http') ? videoUrl : `${API_BASE_URL}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`
  return (
    <video
      src={videoSrc}
      controls
      preload="metadata"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

export const SHOP_REPLY_AVATAR_SRC =
  (import.meta.env.VITE_SHOP_REPLY_AVATAR_URL as string | undefined)?.trim() || '/logoEtech.png'

export async function fetchProductShopQnasPublic(slug: string): Promise<ProductShopQnaPublic[]> {
  try {
    return await apiFetch<ProductShopQnaPublic[]>(
      `/api/products/${encodeURIComponent(slug)}/shop-qna`,
    )
  } catch {
    return []
  }
}

export function scrollToPdpShopQnaForm() {
  document.getElementById('pdp-shop-qna-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function qnaAvatarInitial(name: string) {
  const t = name.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

export function avatarInitial(name: string) {
  const t = (name || '').trim()
  return t ? t.charAt(0).toUpperCase() : 'U'
}

export type ProductSpecRow = NonNullable<Product['specs']>[number]

/** Màu ưu tiên cột admin `color`; thiếu thì một nhãn tổng quát để không gộp nhầm. */
export function variantColorLabel(v: ProductVariant): string {
  const c = (v.color ?? '').trim()
  if (c) return c
  return 'Tuỳ chọn'
}

/** Dung lượng/cấu hình: `configuration` hoặc trích trong `variant_name`. */
export function variantStorageLabel(v: ProductVariant): string {
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

export type VariantFacetModel = {
  variants: ProductVariant[]
  colors: string[]
  storages: string[]
  byColorStorage: Map<string, ProductVariant>
  repByColor: Map<string, ProductVariant>
}

export function buildVariantFacetModel(variants: ProductVariant[]): VariantFacetModel {
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

export type ProductMediaItem =
  | { type: 'image'; url: string }
  | { type: 'video'; url: string; thumbnailUrl?: string | null; video: Video }

type PdpThumbStripProps = {
  mediaItems: ProductMediaItem[]
  selectedImg: string | null
  onSelectImage: (url: string) => void
}

export function PdpThumbStrip({ mediaItems, selectedImg, onSelectImage }: PdpThumbStripProps) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const visibleCount = windowWidth <= 768 ? 5 : PDP_THUMB_VISIBLE
  const [thumbWindowStart, setThumbWindowStart] = useState(0)
  const thumbTotal = mediaItems.length
  const showThumbNav = thumbTotal > visibleCount
  const thumbMaxStart = Math.max(0, thumbTotal - visibleCount)
  const thumbStart = Math.min(thumbWindowStart, thumbMaxStart)
  const thumbsToRender = showThumbNav
    ? mediaItems.slice(thumbStart, thumbStart + visibleCount)
    : mediaItems

  const pick = (url: string) => {
    onSelectImage(url)
    if (!showThumbNav) return
    const idx = mediaItems.findIndex(item => item.url === url)
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
      aria-label="Thư viện ảnh và video"
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
        {thumbsToRender.map((item, i) => {
          const globalIdx = showThumbNav ? thumbStart + i : i
          const isActive = selectedImg === item.url || (!selectedImg && i === 0 && !showThumbNav)
          const thumbUrl = item.type === 'video' ? (item.thumbnailUrl || '') : item.url
          return (
            <button
              key={`${item.url}-${globalIdx}`}
              type="button"
              className={`pdpThumb ${isActive ? 'active' : ''}`}
              onClick={() => pick(item.url)}
              aria-label={`Chọn media ${globalIdx + 1}`}
              style={{ position: 'relative' }}
            >
              {thumbUrl ? (
                <img src={resolveImageUrl(thumbUrl)} alt="" style={{ objectFit: item.type === 'video' ? 'cover' : 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '10px' }}>
                  Video
                </div>
              )}
              {item.type === 'video' && (
                <div className="pdpThumbPlayOverlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                </div>
              )}
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

export function PdpFacetVariantPicker({
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


export function Stars({ value }: { value: number }) {
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

export function ratingLabel(rating: number) {
  const r = Math.round(Math.max(1, Math.min(5, rating)))
  if (r >= 5) return 'Tuyệt vời'
  if (r === 4) return 'Rất tốt'
  if (r === 3) return 'Tốt'
  if (r === 2) return 'Tạm ổn'
  return 'Chưa hài lòng'
}

export function timeAgoVi(iso: string | undefined | null) {
  if (!iso) return 'gần đây'
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


export function IconPaperPlane({ className }: { className?: string }) {return (<svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden><path  fill="currentColor"  d="m2 21 21-9L2 3v7l13 4-13 4v7z"/></svg>)}
export function IconQnaChatBubble({ className }: { className?: string }) {return (<svg className={className} viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden><path  d="M5 17.5v-13A1.5 1.5 0 0 1 6.5 3h13A1.5 1.5 0 0 1 21 4.5V15a1.5 1.5 0 0 1-1.5 1.5h-11L5 21l.5-3.5"  stroke="currentColor"  strokeWidth="1.8"  strokeLinejoin="round"/></svg>)}
