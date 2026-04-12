import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ENTITIES, ALICE_QUOTE, BRAND_NAME } from './entities'
import type { FixedRegion } from './types'
import { TopHeader } from './components/TopHeader'
import { ZoomCanvas } from './components/ZoomCanvas'
import { HandwritingEntity } from './components/HandwritingEntity'
import type { CanvasObstacle } from './components/HandwritingEntity'
import { CrossNavbar } from './components/CrossNavbar'
import { ScrollInputs } from './components/ScrollInputs'
import { ThreeIntro } from './components/ThreeIntro'
import { NotebookPage } from './components/NotebookPage'
import { PageWrapper } from './components/PageWrapper'
import type { PageDef } from './components/PageWrapper'

// ═══════════════════════════════════════════════════════════
// PAGE DEFINITIONS — siblings of doodle entities on the canvas
// ═══════════════════════════════════════════════════════════
const PAGES: PageDef[] = [
  { id: 'brand-page', x: 35, y: 22, width: 1100, height: 220, fixed: true, component: 'brand', borderless: true },
  { id: 'clock-page', x: 25, y: 30, width: 1500, height: 1100, fixed: true, component: 'clock' },
  { id: 'three-page', x: 79, y: 34, width: 420, height: 420, fixed: false, component: 'three', borderless: true },
  { id: 'text-page', x: 8, y: 50, width: 480, height: 340, fixed: false, component: 'text', borderless: true },
]

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

export default function App() {
  const [zoom, setZoom] = useState(1.0)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Entity positions (doodles)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const e of ENTITIES) pos[e.id] = { x: e.x, y: e.y }
    return pos
  })

  // Page positions (for draggable pages)
  const [pagePositions, setPagePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const p of PAGES) pos[p.id] = { x: p.x, y: p.y }
    return pos
  })

  // Compute page regions — used by both entity collision and page-to-page collision
  const pageRegions: FixedRegion[] = useMemo(() =>
    PAGES.map(p => ({
      id: p.id,
      x: pagePositions[p.id]?.x ?? p.x,
      y: pagePositions[p.id]?.y ?? p.y,
      w: (p.width / 3000) * 100,
      h: (p.height / 3000) * 100,
    })),
    [pagePositions],
  )

  // Compute obstacle rects from obstacle entities (for text reflow)
  const obstacleRects: CanvasObstacle[] = useMemo(() =>
    ENTITIES
      .filter(e => e.obstacle)
      .map(e => {
        const pos = positions[e.id] || { x: e.x, y: e.y }
        return { id: e.id, x: pos.x, y: pos.y, wPx: e.obstacleW || 0, hPx: e.obstacleH || 0 }
      }),
    [positions],
  )

  const zoomRef = useRef(zoom)
  const panXRef = useRef(panX)
  const panYRef = useRef(panY)
  zoomRef.current = zoom
  panXRef.current = panX
  panYRef.current = panY
  const viewportRef = useRef<HTMLDivElement>(null)

  const canvasDragRef = useRef<{
    startX: number; startY: number
    startPanX: number; startPanY: number
    active: boolean
  } | null>(null)

  const handleEntityPositionChange = useCallback((id: string, x: number, y: number) => {
    setPositions(prev => ({ ...prev, [id]: { x, y } }))
  }, [])

  const handlePagePositionChange = useCallback((id: string, x: number, y: number) => {
    setPagePositions(prev => ({ ...prev, [id]: { x, y } }))
  }, [])

  const handleEntityClick = useCallback((id: string) => {
    const pos = positions[id]
    if (!pos) return
    const canvasX = (pos.x / 100) * 3000
    const canvasY = (pos.y / 100) * 3000
    setPanX(clamp(-(canvasX - 1500) * zoomRef.current, -1800, 1800))
    setPanY(clamp(-(canvasY - 1500) * zoomRef.current, -1800, 1800))
  }, [positions])

  // Wheel → zoom / pan
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) setZoom(z => clamp(z * (1 - e.deltaY * 0.01), 0.15, 3.0))
      else if (e.shiftKey) setPanX(p => clamp(p - e.deltaY, -1800, 1800))
      else setZoom(z => clamp(z + (-e.deltaY * 0.002), 0.15, 3.0))
    }
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [])

  // Viewport drag → pan canvas
  const handleViewportPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('zoom-canvas')) return
    canvasDragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: panXRef.current, startPanY: panYRef.current, active: true }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])
  const handleViewportPointerMove = useCallback((e: React.PointerEvent) => {
    const d = canvasDragRef.current; if (!d?.active) return
    setPanX(clamp(d.startPanX + (e.clientX - d.startX), -1800, 1800))
    setPanY(clamp(d.startPanY + (e.clientY - d.startY), -1800, 1800))
  }, [])
  const handleViewportPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canvasDragRef.current?.active) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    canvasDragRef.current = null
  }, [])

  // Render page content by component id
  const renderPage = (component: string) => {
    switch (component) {
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
            <h2 style={{ font: '700 1.8rem "Indie Flower", cursive', color: '#2a2520', marginBottom: 12 }}>Down the Rabbit Hole</h2>
            <p style={{ font: '1.2rem "Kalam", cursive', lineHeight: 1.6, color: '#3a3530' }}>{ALICE_QUOTE}</p>
          </div>
        )
      default:
        return null
    }
  }

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
        <ZoomCanvas zoom={zoom} panX={panX} panY={panY}>
          {/* ── Doodle entities (z-index 5) ── */}
          {ENTITIES.map((entity) => {
            const pos = positions[entity.id] || { x: entity.x, y: entity.y }
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
                onClick={() => handleEntityClick(entity.id)}
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
                pageRegions={pageRegions}
                onPositionChange={handlePagePositionChange}
              >
                {renderPage(page.component)}
              </PageWrapper>
            )
          })}
        </ZoomCanvas>
      </div>

      <CrossNavbar
        zoom={zoom} panX={panX}
        setZoom={(fn) => setZoom(z => clamp(fn(z), 0.15, 3.0))}
        setPanX={(fn) => setPanX(p => clamp(fn(p), -1800, 1800))}
      />
      <ScrollInputs
        zoom={zoom} panX={panX} panY={panY}
        setZoom={(fn) => setZoom(z => clamp(fn(z), 0.15, 3.0))}
        setPanX={(fn) => setPanX(p => clamp(fn(p), -1800, 1800))}
        setPanY={(fn) => setPanY(p => clamp(fn(p), -1800, 1800))}
      />
    </>
  )
}
