import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ENTITIES } from './entities'
import type { FixedRegion } from './types'
import { CANVAS, PAN_LIMIT } from './constants'
import { useViewportZoom, getViewport, setZoomAnchored, setPan, setPanRubber, settlePan } from './store/viewport'
import { TopHeader } from './components/TopHeader'
import { ZoomCanvas } from './components/ZoomCanvas'
import { HandwritingEntity } from './components/HandwritingEntity'
import { MotionObstacle } from './components/MotionObstacle'
import { ScrollInputs } from './components/ScrollInputs'
import { PageWrapper } from './components/PageWrapper'
import { SectionPhotoGallery } from './components/SectionPhotoGallery'
import { SectionAbout } from './components/SectionAbout'
import type { MinimapShape } from './components/ScrollInputs'
import { PAGES } from './pages'
import { getWidgetSize, pxToPct } from './entities/sizes'
import {
  collectPageRegions,
  collectExtendedColliders,
  collectMinimapShapes,
  collectObstacleRects,
} from './entities/registry'

// Page definitions live in `src/pages/index.tsx` — each page carries its own
// render function so this file stays focused on canvas behavior.
// Entity sizing lives in `src/entities/sizes.ts`.

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

export default function App() {
  // Only re-renders App when zoom changes (not on pan)
  const zoom = useViewportZoom()

  // Entity positions (doodles + obstacles + accents + watermarks + images + sections)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const e of ENTITIES) pos[e.id] = { x: e.x, y: e.y }
    return pos
  })

  // Pinned state — initialized from entity definitions, toggleable at runtime
  const [pinnedState, setPinnedState] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {}
    for (const e of ENTITIES) {
      if (e.pinned !== undefined) state[e.id] = e.pinned
    }
    return state
  })

  // Active widget — only one at a time, null = none active
  const [activeWidget, setActiveWidget] = useState<string | null>(null)
  const activeWidgetRef = useRef<string | null>(null)
  activeWidgetRef.current = activeWidget

  // Drag-state hooks kept as no-ops — paragraphs now act as obstacles all the
  // time, so wrapping persists after you drop a paragraph on another.
  const handleDragStart = useCallback((_id: string) => {}, [])
  const handleDragEnd = useCallback((_id: string) => {}, [])

  // Page positions (for draggable pages)
  const [pagePositions, setPagePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const p of PAGES) pos[p.id] = { x: p.x, y: p.y }
    return pos
  })

  // Page frames — pages + anything the registry says is a page-region
  // (sections, active widget). Entities bump into these.
  const pageRegions: FixedRegion[] = useMemo(() => {
    const regions: FixedRegion[] = PAGES.map(p => ({
      id: p.id,
      x: pagePositions[p.id]?.x ?? p.x,
      y: pagePositions[p.id]?.y ?? p.y,
      w: pxToPct(p.width),
      h: pxToPct(p.height),
    }))
    regions.push(...collectPageRegions(ENTITIES, positions, activeWidget))
    return regions
  }, [pagePositions, positions, activeWidget])

  // Extended collision list — pages-only. Pages bump into:
  //   • everything in `pageRegions` (other pages, sections, widgets)
  //   • reflow paragraphs (so a dragged page can't cover a paragraph)
  //   • red obstacles / motion obstacles (so a page can't swallow them either)
  const pageCollisionRegions: FixedRegion[] = useMemo(
    () => [...pageRegions, ...collectExtendedColliders(ENTITIES, positions, activeWidget)],
    [pageRegions, positions, activeWidget],
  )

  // Minimap: pages (in declared order, skipping the invisible drag-blocker)
  // followed by entity shapes the registry tagged with a minimapType.
  const minimapShapes = useMemo<MinimapShape[]>(() => {
    const shapes: MinimapShape[] = PAGES
      .filter(p => p.id !== 'header-zone')
      .map(p => {
        const pos = pagePositions[p.id] ?? { x: p.x, y: p.y }
        return { id: p.id, type: 'page', x: pos.x, y: pos.y, w: p.width, h: p.height }
      })
    shapes.push(...collectMinimapShapes(ENTITIES, positions))
    return shapes
  }, [pagePositions, positions])

  // Obstacle rects for text reflow (rotation-adjusted AABB, capsule-shaped carve).
  const obstacleRects = useMemo(
    () => collectObstacleRects(ENTITIES, positions),
    [positions],
  )

  const viewportRef = useRef<HTMLDivElement>(null)

  const canvasDragRef = useRef<{
    startX: number; startY: number
    startPanX: number; startPanY: number
    active: boolean
  } | null>(null)

  const handleEntityPositionChange = useCallback((id: string, x: number, y: number) => {
    setPositions(prev => {
      const next = { ...prev, [id]: { x, y } }

      // If this is the active widget, push overlapping entities out of the way.
      // Size comes from the registry via the entity definition, not a hardcoded map.
      const widgetEntity = ENTITIES.find(e => e.id === id && e.category === 'widget')
      if (widgetEntity && activeWidgetRef.current === id) {
        const widgetSize = getWidgetSize(widgetEntity)
        const wW = pxToPct(widgetSize.w)
        const wH = pxToPct(widgetSize.h)
        const margin = 0.3 // canvas %

        for (const e of ENTITIES) {
          if (e.id === id || e.category === 'widget') continue
          const ePos = next[e.id] || { x: e.x, y: e.y }
          if (ePos.x >= x && ePos.x <= x + wW && ePos.y >= y && ePos.y <= y + wH) {
            const dl = ePos.x - x
            const dr = (x + wW) - ePos.x
            const dt = ePos.y - y
            const db = (y + wH) - ePos.y
            const min = Math.min(dl, dr, dt, db)
            const push = { ...ePos }
            if (min === dl) push.x = x - margin
            else if (min === dr) push.x = x + wW + margin
            else if (min === dt) push.y = y - margin
            else push.y = y + wH + margin
            next[e.id] = push
          }
        }
      }

      return next
    })
  }, [])

  const handlePagePositionChange = useCallback((id: string, x: number, y: number) => {
    setPagePositions(prev => ({ ...prev, [id]: { x, y } }))
  }, [])

  const handlePinToggle = useCallback((id: string) => {
    setPinnedState(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const handleWidgetActivate = useCallback((id: string) => {
    setActiveWidget(prev => prev === id ? null : id)
  }, [])

  const animRef = useRef<number | null>(null)

  // Smooth zoom spring — accumulates target from wheel events,
  // rAF loop interpolates current zoom toward it with a spring.
  const targetZoomRef = useRef<number>(1.0)
  const zoomAnchorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const zoomVelRef = useRef<number>(0)
  const zoomRafRef = useRef<number | null>(null)

  const handleEntityClick = useCallback((id: string) => {
    const pos = positions[id]
    if (!pos) return
    const { zoom: z, panX: curPanX, panY: curPanY } = getViewport()
    const canvasX = (pos.x / 100) * CANVAS
    const canvasY = (pos.y / 100) * CANVAS
    const targetX = clamp(-(canvasX - CANVAS / 2) * z, -PAN_LIMIT, PAN_LIMIT)
    const targetY = clamp(-(canvasY - CANVAS / 2) * z, -PAN_LIMIT, PAN_LIMIT)

    const startX = curPanX
    const startY = curPanY
    const startTime = performance.now()
    const duration = 600 // ms

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      setPan(
        startX + (targetX - startX) * ease,
        startY + (targetY - startY) * ease,
      )
      if (t < 1) animRef.current = requestAnimationFrame(animate)
      else animRef.current = null
    }
    animRef.current = requestAnimationFrame(animate)
  }, [positions])

  // Spring animation toward targetZoomRef — called via rAF.
  // Stiffness 0.08 + damping 0.75 gives ease-in-out feel with no overshoot.
  const animateSmoothZoom = useCallback(() => {
    const { zoom: current } = getViewport()
    const target = targetZoomRef.current
    const diff = target - current

    zoomVelRef.current = zoomVelRef.current * 0.75 + diff * 0.08
    setZoomAnchored(current + zoomVelRef.current, zoomAnchorRef.current.x, zoomAnchorRef.current.y)

    if (Math.abs(diff) > 0.0005 || Math.abs(zoomVelRef.current) > 0.0001) {
      zoomRafRef.current = requestAnimationFrame(animateSmoothZoom)
    } else {
      setZoomAnchored(target, zoomAnchorRef.current.x, zoomAnchorRef.current.y)
      zoomVelRef.current = 0
      zoomRafRef.current = null
    }
  }, [])

  // Wheel / trackpad gestures
  // ─────────────────────────────────────────────────────────
  // Convention (matches Figma / Miro / tldraw):
  //   • Two-finger trackpad swipe (any axis) → pan (uses native inertia)
  //   • Pinch-to-zoom on macOS trackpad       → cursor-anchored zoom
  //     (browsers synthesize ctrlKey=true for pinch events)
  //   • Cmd / Ctrl + wheel                    → cursor-anchored zoom
  //   • Shift + wheel (mouse users)           → horizontal pan
  //   • Plain mouse wheel                     → vertical pan
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = viewport.getBoundingClientRect()
      // Anchor relative to viewport center — zoom-canvas origin sits at (50%, 50%)
      const anchorX = e.clientX - rect.left - rect.width / 2
      const anchorY = e.clientY - rect.top - rect.height / 2

      // Pinch (ctrlKey auto-set by browser) or explicit modifier → smooth zoom at cursor
      if (e.ctrlKey || e.metaKey) {
        const { zoom: z } = getViewport()
        // Accumulate target in log-space. 0.003 = ~3× slower than raw wheel ticks.
        const baseZoom = zoomRafRef.current ? targetZoomRef.current : z
        const factor = Math.exp(-e.deltaY * 0.003)
        targetZoomRef.current = clamp(baseZoom * factor, 0.15, 3.0)
        zoomAnchorRef.current = { x: anchorX, y: anchorY }
        if (!zoomRafRef.current) {
          zoomRafRef.current = requestAnimationFrame(animateSmoothZoom)
        }
        return
      }

      // Shift + wheel → horizontal pan (mouse-wheel convenience)
      if (e.shiftKey) {
        const { panX: px, panY: py } = getViewport()
        setPan(px - e.deltaY, py)
        return
      }

      // Default: pan using both axes (trackpad swipe or mouse wheel)
      const { panX: px, panY: py } = getViewport()
      setPan(px - e.deltaX, py - e.deltaY)
    }
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', handleWheel)
      if (zoomRafRef.current) cancelAnimationFrame(zoomRafRef.current)
    }
  }, [])

  // Viewport drag → pan canvas
  const startViewportPan = useCallback((e: React.PointerEvent) => {
    const { panX: px, panY: py } = getViewport()
    canvasDragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: px, startPanY: py, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  // Capture-phase handler: Cmd/Ctrl + drag always pans, even when the pointer
  // lands on an entity or page. Runs before any child bubble handler; we
  // stopPropagation so entity/page drag logic never sees the event.
  const handleViewportPointerDownCapture = useCallback((e: React.PointerEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return
    startViewportPan(e)
    e.stopPropagation()
    e.preventDefault()
  }, [startViewportPan])

  // Always start a pan — draggable entities / pages call stopPropagation
  // on their own pointerdown, so we only see events from empty canvas space
  // or from pinned / fixed elements (which should pan through).
  const handleViewportPointerDown = useCallback((e: React.PointerEvent) => {
    startViewportPan(e)
  }, [startViewportPan])
  const handleViewportPointerMove = useCallback((e: React.PointerEvent) => {
    const d = canvasDragRef.current; if (!d?.active) return
    setPanRubber(
      d.startPanX + (e.clientX - d.startX),
      d.startPanY + (e.clientY - d.startY),
    )
  }, [])
  const handleViewportPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canvasDragRef.current?.active) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    canvasDragRef.current = null
    settlePan()
  }, [])

  // Render section content by component id
  const renderSection = useCallback((componentId: string) => {
    switch (componentId) {
      case 'photo-gallery':
        return <SectionPhotoGallery />
      case 'about-block':
        return <SectionAbout />
      default:
        return null
    }
  }, [])

  // Page content is provided by each PageDef's own `render` function —
  // see `src/pages/index.tsx`. No switch needed here.

  // Merge runtime pinned state into entities for rendering
  const entitiesWithPinState = useMemo(() =>
    ENTITIES.map(e => ({
      ...e,
      pinned: pinnedState[e.id] ?? e.pinned ?? false,
    })),
    [pinnedState],
  )

  return (
    <>
      <div className="page-bg" />
      <TopHeader />

      <div
        ref={viewportRef}
        className="zoom-viewport"
        onPointerDownCapture={handleViewportPointerDownCapture}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
      >
        <ZoomCanvas>
          {/* ── Doodle entities (z-index 5) ── */}
          {entitiesWithPinState.map((entity) => {
            const pos = positions[entity.id] || { x: entity.x, y: entity.y }
            if (entity.motionDraggable) {
              return (
                <MotionObstacle
                  key={entity.id}
                  entity={entity}
                  x={pos.x}
                  y={pos.y}
                  zoom={zoom}
                  onPositionChange={handleEntityPositionChange}
                />
              )
            }
            return (
              <HandwritingEntity
                key={entity.id}
                entity={entity}
                x={pos.x}
                y={pos.y}
                zoom={zoom}
                fixedRegions={pageRegions}
                obstacles={obstacleRects}
                onPositionChange={handleEntityPositionChange}
                onPinToggle={entity.category === 'section' ? handlePinToggle : undefined}
                onClick={() => handleEntityClick(entity.id)}
                renderSection={entity.category === 'section' ? renderSection : undefined}
                isWidgetActive={entity.category === 'widget' ? activeWidget === entity.id : undefined}
                onWidgetActivate={entity.category === 'widget' ? handleWidgetActivate : undefined}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            )
          })}

          {/* ── Pages (z-index 50, siblings of entities) ── */}
          {PAGES.map((page) => {
            const pos = pagePositions[page.id] || { x: page.x, y: page.y }
            return (
              <PageWrapper
                key={page.id}
                page={page}
                x={pos.x}
                y={pos.y}
                zoom={zoom}
                pageRegions={pageCollisionRegions}
                onPositionChange={handlePagePositionChange}
              >
                {page.render?.()}
              </PageWrapper>
            )
          })}
        </ZoomCanvas>
      </div>

      <ScrollInputs shapes={minimapShapes} />
    </>
  )
}
