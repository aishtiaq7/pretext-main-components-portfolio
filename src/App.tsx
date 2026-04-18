import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ENTITIES, BRAND_NAME, ALICE_QUOTE } from './entities'
import type { FixedRegion } from './types'
import { CANVAS, PAN_LIMIT } from './constants'
import { useViewportZoom, getViewport, setZoomAnchored, setPan } from './store/viewport'
import { TopHeader } from './components/TopHeader'
import { ZoomCanvas } from './components/ZoomCanvas'
import { HandwritingEntity } from './components/HandwritingEntity'
import { MotionObstacle } from './components/MotionObstacle'
import { ScrollInputs } from './components/ScrollInputs'
import { ThreeIntro } from './components/ThreeIntro'
import { NotebookPage } from './components/NotebookPage'
import { PageWrapper } from './components/PageWrapper'
import type { PageDef } from './components/PageWrapper'
import { SectionPhotoGallery } from './components/SectionPhotoGallery'
import { SectionAbout } from './components/SectionAbout'
import type { MinimapShape } from './components/ScrollInputs'
import { getWidgetSize, pxToPct } from './entities/sizes'
import {
  collectPageRegions,
  collectExtendedColliders,
  collectMinimapShapes,
  collectObstacleRects,
} from './entities/registry'

// ═══════════════════════════════════════════════════════════
// PAGE DEFINITIONS — siblings of doodle entities on the canvas
// ═══════════════════════════════════════════════════════════
const PAGES: PageDef[] = [
  // Invisible drag-blocker covering the header row (y: 0-14).
  // Obstacles dragged up will bounce off its bottom edge, so they can't cover brand/tagline/emojis.
  // Thin visible bar now (was 1120px). Still full-width so it blocks obstacles dragged upward.
  { id: 'header-zone', x: 0, y: 0, width: 8000, height: 400, fixed: true, component: 'header-zone', borderless: true },
  { id: 'brand-page', x: 3, y: 10, width: 1100, height: 220, fixed: true, component: 'brand', borderless: false },
  { id: 'clock-page', x: 3, y: 16, width: 1500, height: 1100, fixed: true, component: 'clock' },
  // Tightened: cube directly below notebook, rabbit hole below cube (left column, x:5)
  { id: 'three-page', x: 5, y: 30.5, width: 420, height: 420, fixed: false, component: 'three', borderless: true, rotate: 8 },
  // Rabbit Hole — draggable card. borderless:false → gets the 2px black frame,
  // transparent bg lets paragraph text show through. Collides with paragraphs
  // (via pageCollisionRegions) so it never overlaps them.
  { id: 'text-page', x: 45, y: 25, width: 480, height: 340, fixed: false, component: 'text', borderless: false, rotate: -4 },
]

// Entity sizing (section, widget, reflow) lives in `src/entities/sizes.ts`.
// App.tsx no longer hard-codes per-id dimension tables — the registry
// derives everything from the entity definition.

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
  const handleViewportPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('zoom-canvas')) return
    const { panX: px, panY: py } = getViewport()
    canvasDragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: px, startPanY: py, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])
  const handleViewportPointerMove = useCallback((e: React.PointerEvent) => {
    const d = canvasDragRef.current; if (!d?.active) return
    setPan(
      d.startPanX + (e.clientX - d.startX),
      d.startPanY + (e.clientY - d.startY),
    )
  }, [])
  const handleViewportPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canvasDragRef.current?.active) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    canvasDragRef.current = null
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

  // Render page content by component id
  const renderPage = (component: string) => {
    switch (component) {
      case 'header-zone':
        return null
      case 'brand':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: '"Permanent Marker", cursive',
              fontSize: '7.5rem',
              fontWeight: 400,
              color: '#3a3530',
              opacity: 0.92,
              transform: 'rotate(-5deg)',
              whiteSpace: 'nowrap',
            }}>
              {BRAND_NAME}
            </span>
          </div>
        )
      case 'clock':
        return <NotebookPage width={1500} height={1100} />
      case 'three':
        return (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 380, height: 380, pointerEvents: 'none' }}>
              <ThreeIntro />
            </div>
          </div>
        )
      case 'text':
        return (
          <div style={{ width: '100%', height: '100%', padding: 24 }}>
            <h2 style={{
              font: '700 1.8rem "Indie Flower", cursive',
              color: '#1a1714',
              marginBottom: 12,
              textShadow: '0 1px 0 rgba(232, 228, 217, 0.8)',
            }}>Down the Rabbit Hole</h2>
            <p style={{
              font: '1.15rem "Kalam", cursive',
              lineHeight: 1.55,
              color: '#2a2520',
              textShadow: '0 1px 0 rgba(232, 228, 217, 0.8)',
            }}>{ALICE_QUOTE}</p>
          </div>
        )
      default:
        return null
    }
  }

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
                {renderPage(page.component)}
              </PageWrapper>
            )
          })}
        </ZoomCanvas>
      </div>

      <ScrollInputs shapes={minimapShapes} />
    </>
  )
}
