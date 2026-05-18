import { useCallback, useEffect, useRef, useState } from 'react'

export function legalSpyLineFromViewportPx(firstSectionId: string): number {
  const headerEl = document.querySelector<HTMLElement>('.hfHeader')
  const headerH = Math.ceil(headerEl?.getBoundingClientRect().height ?? 72)
  const sectionRef = document.getElementById(firstSectionId)
  const scrollMt = sectionRef
    ? Number.parseFloat(window.getComputedStyle(sectionRef).scrollMarginTop) || 92
    : 92
  return headerH + Math.ceil(scrollMt) + 14
}

export function legalActiveSectionId(sectionIds: readonly string[]): string {
  if (!sectionIds.length) return ''
  const spy = legalSpyLineFromViewportPx(sectionIds[0])
  let chosen = sectionIds[0]
  let bestTop = Number.NEGATIVE_INFINITY
  let found = false

  for (const id of sectionIds) {
    const el = document.getElementById(id)
    if (!el) continue
    const top = el.getBoundingClientRect().top
    if (top <= spy) {
      if (!found || top > bestTop) {
        found = true
        bestTop = top
        chosen = id
      }
    }
  }

  return found ? chosen : sectionIds[0]
}

/**
 * Theo dõi TOC cho trang tài liệu pháp lý (điều khoản, bảo mật).
 */
export function useLegalDocToc(sectionIds: readonly string[]) {
  const fallback = sectionIds[0] ?? ''

  const [activeId, setActiveId] = useState<string>(fallback)
  const ignoreSpyUntilMs = useRef(0)

  const syncActiveFromScroll = useCallback(() => {
    if (!sectionIds.length) return
    if (performance.now() < ignoreSpyUntilMs.current) return
    setActiveId(legalActiveSectionId(sectionIds))
  }, [sectionIds])

  const scrollToId = useCallback(
    (id: string, behavior: ScrollBehavior = 'smooth') => {
      setActiveId(id)
      ignoreSpyUntilMs.current = performance.now() + 900
      document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' })
      window.setTimeout(() => {
        ignoreSpyUntilMs.current = 0
        setActiveId(legalActiveSectionId(sectionIds))
      }, 950)
    },
    [sectionIds],
  )

  useEffect(() => {
    if (!sectionIds.length) return undefined
    syncActiveFromScroll()
    let ticking = false
    const onScrollOrResize = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        syncActiveFromScroll()
      })
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [syncActiveFromScroll, sectionIds.length])

  return { activeId, scrollToId }
}
