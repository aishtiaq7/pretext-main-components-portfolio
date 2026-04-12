import { useState, useEffect, useRef, useCallback } from 'react'
import { ENTITIES } from './entities'
import { TopHeader } from './components/TopHeader'
import { ZoomCanvas } from './components/ZoomCanvas'
import { HandwritingEntity } from './components/HandwritingEntity'
import { CrossNavbar } from './components/CrossNavbar'
import { ScrollInputs } from './components/ScrollInputs'
import { MiniClock } from './components/MiniClock'
import { ThreeIntro } from './components/ThreeIntro'

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

export default function App() {
  // ── Zoom / Pan state ──────────────────────────────────
  const [zoom, setZoom] = useState(1.0)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Per-entity positions (initialized from entity definitions)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    for (const e of ENTITIES) {
      pos[e.id] = { x: e.x, y: e.y }
    }
    return pos
  })

  // Refs for imperative access in event handlers
  const zoomRef = useRef(zoom)
  const panXRef = useRef(panX)
  const panYRef = useRef(panY)
  zoomRef.current = zoom
  panXRef.current = panX
  panYRef.current = panY

  const viewportRef = useRef<HTMLDivElement>(null)

  // Canvas drag (panning by dragging the viewport background)
  const canvasDragRef = useRef<{
    startX: number
    startY: number
    startPanX: number
    startPanY: number
    active: boolean
  } | null>(null)

  // ── Entity position change handler ────────────────────
  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    setPositions(prev => ({ ...prev, [id]: { x, y } }))
  }, [])

  // ── Entity click → zoom to center on it ───────────────
  const handleEntityClick = useCallback((id: string) => {
    const pos = positions[id]
    if (!pos) return
    // Convert entity % position to canvas px, then to pan offset
    // Entity center in canvas px: pos.x/100 * 3000
    // We want that point at viewport center, so pan = -(canvasPx - 1500) * zoom
    // Simplified: pan so entity is centered
    const canvasX = (pos.x / 100) * 3000
    const canvasY = (pos.y / 100) * 3000
    const targetPanX = -(canvasX - 1500) * zoomRef.current
    const targetPanY = -(canvasY - 1500) * zoomRef.current
    setPanX(clamp(targetPanX, -1800, 1800))
    setPanY(clamp(targetPanY, -1800, 1800))
  }, [positions])

  // ── Wheel listener (zoom + modified-pan) ──────────────
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on trackpad / Ctrl+wheel
        setZoom(z => clamp(z * (1 - e.deltaY * 0.01), 0.15, 3.0))
      } else if (e.shiftKey) {
        // Shift+scroll → horizontal pan
        setPanX(p => clamp(p - e.deltaY, -1800, 1800))
      } else {
        // Regular scroll → zoom
        setZoom(z => clamp(z + (-e.deltaY * 0.002), 0.15, 3.0))
      }
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [])

  // ── Viewport pointer handlers (canvas panning) ────────
  const handleViewportPointerDown = useCallback((e: React.PointerEvent) => {
    // Only pan if clicking directly on the viewport or canvas bg
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('zoom-canvas')) return
    canvasDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panXRef.current,
      startPanY: panYRef.current,
      active: true,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handleViewportPointerMove = useCallback((e: React.PointerEvent) => {
    const d = canvasDragRef.current
    if (!d?.active) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    setPanX(clamp(d.startPanX + dx, -1800, 1800))
    setPanY(clamp(d.startPanY + dy, -1800, 1800))
  }, [])

  const handleViewportPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canvasDragRef.current?.active) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    canvasDragRef.current = null
  }, [])

  // ── Render component entities ─────────────────────────
  const renderComponentEntity = (componentId: string) => {
    switch (componentId) {
      case 'clock':
        return <MiniClock size={220} />
      case 'three':
        return (
          <div style={{ width: 340, height: 340, borderRadius: 12, overflow: 'hidden', pointerEvents: 'none' }}>
            <ThreeIntro />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Fixed notebook paper background */}
      <div className="page-bg" />

      {/* Top header bar */}
      <TopHeader />

      {/* Zoomable/pannable viewport */}
      <div
        ref={viewportRef}
        className="zoom-viewport"
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
      >
        <ZoomCanvas zoom={zoom} panX={panX} panY={panY}>
          {ENTITIES.map((entity) => {
            const pos = positions[entity.id] || { x: entity.x, y: entity.y }
            return (
              <HandwritingEntity
                key={entity.id}
                entity={entity}
                x={pos.x}
                y={pos.y}
                zoom={zoom}
                onPositionChange={handlePositionChange}
                onClick={() => handleEntityClick(entity.id)}
              >
                {entity.type === 'component' && entity.componentId
                  ? renderComponentEntity(entity.componentId)
                  : null}
              </HandwritingEntity>
            )
          })}
        </ZoomCanvas>
      </div>

      {/* Navigation widgets */}
      <CrossNavbar
        zoom={zoom}
        panX={panX}
        setZoom={(fn) => setZoom(z => clamp(fn(z), 0.15, 3.0))}
        setPanX={(fn) => setPanX(p => clamp(fn(p), -1800, 1800))}
      />
      <ScrollInputs
        zoom={zoom}
        panX={panX}
        panY={panY}
        setZoom={(fn) => setZoom(z => clamp(fn(z), 0.15, 3.0))}
        setPanX={(fn) => setPanX(p => clamp(fn(p), -1800, 1800))}
        setPanY={(fn) => setPanY(p => clamp(fn(p), -1800, 1800))}
      />
    </>
  )
}
