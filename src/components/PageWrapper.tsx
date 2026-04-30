import { useRef } from 'react'
import type { FixedRegion } from '../types'
import { CANVAS } from '../constants'
import { getViewport } from '../store/viewport'

export type PageDef = {
  id: string
  x: number      // % of canvas
  y: number      // % of canvas
  width: number   // px on canvas
  height: number  // px on canvas
  fixed: boolean
  /**
   * Returns the JSX to render inside the page wrapper. Omit for an invisible
   * drag-blocker page (e.g. the header-zone). Keeping this on the PageDef
   * means every page config lives in one place — no external switch.
   */
  render?: () => React.ReactNode
  borderless?: boolean  // true = looks like a regular entity, no visible box
  rotate?: number       // degrees — visual rotation via CSS transform
}

function resolvePageCollisions(
  x: number, y: number,
  selfId: string, selfW: number, selfH: number,
  regions: FixedRegion[],
): { x: number; y: number } {
  const pw = (selfW / CANVAS) * 100
  const ph = (selfH / CANVAS) * 100
  for (const r of regions) {
    if (r.id === selfId) continue
    if (x < r.x + r.w && x + pw > r.x && y < r.y + r.h && y + ph > r.y) {
      const ol = (x + pw) - r.x
      const or_ = (r.x + r.w) - x
      const ot = (y + ph) - r.y
      const ob = (r.y + r.h) - y
      const min = Math.min(ol, or_, ot, ob)
      if (min === ol) x = r.x - pw - 0.3
      else if (min === or_) x = r.x + r.w + 0.3
      else if (min === ot) y = r.y - ph - 0.3
      else y = r.y + r.h + 0.3
    }
  }
  return { x, y }
}

type Props = {
  page: PageDef
  x: number
  y: number
  pageRegions: FixedRegion[]
  onPositionChange: (id: string, x: number, y: number) => void
  children: React.ReactNode
}

export function PageWrapper({ page, x, y, pageRegions, onPositionChange, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, startElX: 0, startElY: 0, dragging: false })

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    // Interactive child (link, button inside a page) — swallow so nothing
    // upstream reacts, but let the child's own handler run.
    if (target.closest('[data-interactive]')) {
      e.stopPropagation()
      return
    }
    // Fixed (non-draggable) pages: let the event bubble up to the viewport
    // so clicking on a page still pans the canvas.
    if (page.fixed) return

    e.stopPropagation()
    ref.current?.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startElX: x, startElY: y, dragging: true }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const z = getViewport().zoom
    const dx = (e.clientX - dragRef.current.startX) / z
    const dy = (e.clientY - dragRef.current.startY) / z
    const pctPerPx = CANVAS / 100
    let newX = dragRef.current.startElX + (dx / pctPerPx)
    let newY = dragRef.current.startElY + (dy / pctPerPx)
    const resolved = resolvePageCollisions(newX, newY, page.id, page.width, page.height, pageRegions)
    onPositionChange(page.id, resolved.x, resolved.y)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    ref.current?.releasePointerCapture(e.pointerId)
    dragRef.current.dragging = false
  }

  return (
    <div
      ref={ref}
      className={page.borderless ? 'page-wrapper page-wrapper-borderless' : 'page-wrapper'}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: page.width,
        height: page.height,
        cursor: page.fixed ? 'default' : 'grab',
        transform: page.rotate ? `rotate(${page.rotate}deg)` : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </div>
  )
}
