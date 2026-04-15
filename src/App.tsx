import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ENTITIES, BRAND_NAME, ALICE_QUOTE } from './entities'
import type { FixedRegion } from './types'
import { CANVAS, PAN_LIMIT } from './constants'
import { useViewportZoom, getViewport, setZoomAnchored, setPan } from './store/viewport'
import { TopHeader } from './components/TopHeader'
import { ZoomCanvas } from './components/ZoomCanvas'
import { HandwritingEntity } from './components/HandwritingEntity'
import type { CanvasObstacle } from './components/HandwritingEntity'
import { MotionObstacle } from './components/MotionObstacle'
import { ScrollInputs } from './components/ScrollInputs'
import type { MinimapShape } from './components/ScrollInputs'
import { ThreeIntro } from './components/ThreeIntro'
import { NotebookPage } from './components/NotebookPage'
import { PageWrapper } from './components/PageWrapper'
import type { PageDef } from './components/PageWrapper'
import { SectionPhotoGallery, GALLERY_W, GALLERY_H } from './components/SectionPhotoGallery'
import { SectionAbout, ABOUT_W, ABOUT_H } from './components/SectionAbout'
import { WIDGET_W, WIDGET_H } from './entities/widgets'

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

// Section entity dimensions (used for collision regions)
// All photo-gallery sections share GALLERY_W/H, all about-block share ABOUT_W/H
const SECTION_SIZES: Record<string, { w: number; h: number }> = {
  'section-photos':   { w: GALLERY_W, h: GALLERY_H },
  'section-photos-2': { w: GALLERY_W, h: GALLERY_H },
  'section-photos-3': { w: GALLERY_W, h: GALLERY_H },
  'section-about':    { w: ABOUT_W, h: ABOUT_H },
  'section-about-2':  { w: ABOUT_W, h: ABOUT_H },
  'section-about-3':  { w: ABOUT_W, h: ABOUT_H },
}

// Widget entity dimensions (used for collision regions + pushing)
const WIDGET_SIZES: Record<string, { w: number; h: number }> = {
  'widget-placeholder': { w: WIDGET_W, h: WIDGET_H },
}

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

  // Compute page regions — used by both entity collision and page-to-page collision
  const pageRegions: FixedRegion[] = useMemo(() => {
    const regions: FixedRegion[] = PAGES.map(p => ({
      id: p.id,
      x: pagePositions[p.id]?.x ?? p.x,
      y: pagePositions[p.id]?.y ?? p.y,
      w: (p.width / CANVAS) * 100,
      h: (p.height / CANVAS) * 100,
    }))

    // Add section entities as collision regions too
    for (const e of ENTITIES) {
      if (e.category === 'section') {
        const size = SECTION_SIZES[e.id]
        if (size) {
          const pos = positions[e.id] || { x: e.x, y: e.y }
          regions.push({
            id: e.id,
            x: pos.x,
            y: pos.y,
            w: (size.w / CANVAS) * 100,
            h: (size.h / CANVAS) * 100,
          })
        }
      }
    }

    // Add active widget as collision region so entities avoid it
    if (activeWidget) {
      const size = WIDGET_SIZES[activeWidget]
      if (size) {
        const pos = positions[activeWidget]
        if (pos) {
          regions.push({
            id: activeWidget,
            x: pos.x,
            y: pos.y,
            w: (size.w / CANVAS) * 100,
            h: (size.h / CANVAS) * 100,
          })
        }
      }
    }

    return regions
  }, [pagePositions, positions, activeWidget])

  // Extended collision list — pages-only. Pages bump into:
  //   • everything in `pageRegions` (other pages, sections, widgets)
  //   • reflow paragraphs (so a dragged page can't cover a paragraph)
  //   • red obstacles / motion obstacles (so a page can't swallow them either)
  // Entities (red obstacles, paragraphs) continue to use the smaller
  // `pageRegions`, so red obstacles can still land on paragraphs and
  // paragraphs can still overlap each other freely.
  const pageCollisionRegions: FixedRegion[] = useMemo(() => {
    const regions: FixedRegion[] = [...pageRegions]
    for (const e of ENTITIES) {
      const pos = positions[e.id] || { x: e.x, y: e.y }
      // Reflow paragraphs
      if (e.maxWidth && e.content && !e.obstacle && e.category !== 'section') {
        const rem = e.fontSize.match(/([\d.]+)rem/)
        const px = e.fontSize.match(/([\d.]+)px/)
        const fontPx = rem ? parseFloat(rem[1]) * 16 : px ? parseFloat(px[1]) : 16
        const lineH = Math.round(fontPx * 1.5)
        const isBold = (e.fontWeight === '700' || e.fontWeight === 'bold')
        const charFactor = isBold ? 0.62 : 0.55
        const charsPerLine = Math.max(8, Math.floor(e.maxWidth / (fontPx * charFactor)))
        const lines = Math.max(1, Math.ceil((e.content?.length || 0) / charsPerLine))
        regions.push({
          id: e.id,
          x: pos.x,
          y: pos.y,
          w: (e.maxWidth / CANVAS) * 100,
          h: (lines * lineH / CANVAS) * 100,
        })
      }
      // Obstacles (red words, motion obstacles like the rocket)
      else if (e.obstacle) {
        regions.push({
          id: e.id,
          x: pos.x,
          y: pos.y,
          w: ((e.obstacleW ?? 0) / CANVAS) * 100,
          h: ((e.obstacleH ?? 0) / CANVAS) * 100,
        })
      }
    }
    return regions
  }, [pageRegions, positions])

  // Compute minimap shapes — realtime abstraction of the canvas.
  // Only includes meaningful entities (pages, sections, widgets, obstacles);
  // skips doodles/accents/watermarks which are too small (<2px) to render.
  const minimapShapes: MinimapShape[] = useMemo(() => {
    const shapes: MinimapShape[] = []

    // Pages (skip the invisible header-zone drag-blocker)
    for (const p of PAGES) {
      if (p.id === 'header-zone') continue
      const pos = pagePositions[p.id] ?? { x: p.x, y: p.y }
      shapes.push({ id: p.id, type: 'page', x: pos.x, y: pos.y, w: p.width, h: p.height })
    }

    // Sections, widgets, obstacles from the entity list
    for (const e of ENTITIES) {
      const pos = positions[e.id] ?? { x: e.x, y: e.y }
      if (e.category === 'section') {
        const size = SECTION_SIZES[e.id]
        if (size) shapes.push({ id: e.id, type: 'section', x: pos.x, y: pos.y, w: size.w, h: size.h })
      } else if (e.category === 'widget') {
        const size = WIDGET_SIZES[e.id]
        if (size) shapes.push({ id: e.id, type: 'widget', x: pos.x, y: pos.y, w: size.w, h: size.h })
      } else if (e.obstacle) {
        shapes.push({ id: e.id, type: 'obstacle', x: pos.x, y: pos.y, w: e.obstacleW ?? 80, h: e.obstacleH ?? 40 })
      }
    }

    return shapes
  }, [pagePositions, positions])

  // Compute obstacle rects for text reflow — ONLY red obstacle entities
  // (deadline, ASAP, …). Reflow paragraphs don't interact with each other.
  const obstacleRects: CanvasObstacle[] = useMemo(() =>
    ENTITIES
      .filter(e => e.obstacle)
      .map(e => {
        const pos = positions[e.id] || { x: e.x, y: e.y }
        // Capsule carve (pill-shape) hugs rounded text obstacles far tighter
        // than the inscribed ellipse does.
        return { id: e.id, x: pos.x, y: pos.y, wPx: e.obstacleW || 0, hPx: e.obstacleH || 0, shape: 'capsule' as const }
      }),
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

      // If this is the active widget, push overlapping entities out of the way
      const widgetSize = WIDGET_SIZES[id]
      if (widgetSize && activeWidgetRef.current === id) {
        const wW = (widgetSize.w / CANVAS) * 100
        const wH = (widgetSize.h / CANVAS) * 100
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
      const anchorX = e.clientX - rect.left
      const anchorY = e.clientY - rect.top

      // Pinch (ctrlKey auto-set by browser) or explicit modifier → zoom at cursor
      if (e.ctrlKey || e.metaKey) {
        const { zoom: z } = getViewport()
        // Multiplicative zoom feels linear perceptually
        const factor = Math.exp(-e.deltaY * 0.01)
        setZoomAnchored(z * factor, anchorX, anchorY)
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
    return () => viewport.removeEventListener('wheel', handleWheel)
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
