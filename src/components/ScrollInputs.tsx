import { useRef, useState, useCallback, useEffect } from 'react'

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

const CANVAS = 3000
const MINIMAP = 120
const MINIMAP_SCALE = MINIMAP / CANVAS
const NAVBAR_H = 44

// Page outlines for the minimap (x,y in canvas %; w,h in canvas px)
const MINIMAP_PAGES = [
  { x: 35, y: 22, w: 1100, h: 220 },
  { x: 25, y: 30, w: 1500, h: 1100 },
  { x: 79, y: 34, w: 420, h: 420 },
  { x: 8, y: 50, w: 480, h: 340 },
]

type Props = {
  zoom: number
  panX: number
  panY: number
  setZoom: (fn: (z: number) => number) => void
  setPanX: (fn: (p: number) => number) => void
  setPanY: (fn: (p: number) => number) => void
}

export function ScrollInputs({ zoom, panX, panY, setZoom, setPanX, setPanY }: Props) {
  const [pos, setPos] = useState({ x: -80, y: 140 })
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const minimapDragRef = useRef<{ sx: number; sy: number; oPanX: number; oPanY: number } | null>(null)
  const minimapRef = useRef<HTMLDivElement>(null)
  const [viewSize, setViewSize] = useState({ w: window.innerWidth, h: window.innerHeight - NAVBAR_H })

  useEffect(() => {
    const onResize = () => setViewSize({ w: window.innerWidth, h: window.innerHeight - NAVBAR_H })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Grip handle drag (constrained to stay below navbar) ──────────

  const handleGripDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
  }, [pos])

  const handleGripMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: Math.max(NAVBAR_H, dragRef.current.oy + (e.clientY - dragRef.current.sy)),
    })
  }, [])

  const handleGripUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  // ── Minimap viewport rect (derived from pan/zoom state) ──────────

  const canvasLeft = 1500 - (viewSize.w / 2 + panX) / zoom
  const canvasTop = 1500 - (viewSize.h / 2 + panY) / zoom
  const canvasW = viewSize.w / zoom
  const canvasH = viewSize.h / zoom

  const rawX = canvasLeft * MINIMAP_SCALE
  const rawY = canvasTop * MINIMAP_SCALE
  const rawW = canvasW * MINIMAP_SCALE
  const rawH = canvasH * MINIMAP_SCALE

  const vLeft = Math.max(0, rawX)
  const vTop = Math.max(0, rawY)
  const vW = Math.max(0, Math.min(MINIMAP, rawX + rawW) - vLeft)
  const vH = Math.max(0, Math.min(MINIMAP, rawY + rawH) - vTop)

  // ── Minimap drag helpers (shared by background + viewport rect) ──

  const handleMinimapMove = useCallback((e: React.PointerEvent) => {
    if (!minimapDragRef.current) return
    const dx = e.clientX - minimapDragRef.current.sx
    const dy = e.clientY - minimapDragRef.current.sy
    setPanX(() => clamp(minimapDragRef.current!.oPanX - (dx / MINIMAP_SCALE) * zoom, -1800, 1800))
    setPanY(() => clamp(minimapDragRef.current!.oPanY - (dy / MINIMAP_SCALE) * zoom, -1800, 1800))
  }, [zoom, setPanX, setPanY])

  const handleMinimapUp = useCallback((e: React.PointerEvent) => {
    if (!minimapDragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    minimapDragRef.current = null
  }, [])

  // Click minimap background → jump viewport center + start drag
  const handleMinimapBgDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    if (!minimapRef.current) return
    const bounds = minimapRef.current.getBoundingClientRect()
    const mx = e.clientX - bounds.left
    const my = e.clientY - bounds.top
    const newPanX = clamp((1500 - mx / MINIMAP_SCALE) * zoom, -1800, 1800)
    const newPanY = clamp((1500 - my / MINIMAP_SCALE) * zoom, -1800, 1800)
    setPanX(() => newPanX)
    setPanY(() => newPanY)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    minimapDragRef.current = { sx: e.clientX, sy: e.clientY, oPanX: newPanX, oPanY: newPanY }
  }, [zoom, setPanX, setPanY])

  // Drag viewport rect from current position (no jump)
  const handleRectDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    minimapDragRef.current = { sx: e.clientX, sy: e.clientY, oPanX: panX, oPanY: panY }
  }, [panX, panY])

  return (
    <div
      className="scroll-inputs"
      style={{ right: -pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Grip handle */}
      <div
        className="scroll-grip"
        onPointerDown={handleGripDown}
        onPointerMove={handleGripMove}
        onPointerUp={handleGripUp}
        onPointerCancel={handleGripUp}
      >
        <span className="grip-bar" />
        <span className="grip-bar" />
      </div>

      {/* Middle row: Y slider + Minimap */}
      <div className="scroll-mid-row">
        <div className="scroll-track scroll-track-v">
          <label className="scroll-track-label">Y</label>
          <input
            type="range"
            className="scroll-slider scroll-slider-v"
            min={-1800}
            max={1800}
            value={panY}
            onChange={(e) => setPanY(() => +e.target.value)}
            aria-label="Vertical pan"
          />
        </div>

        {/* Minimap */}
        <div
          ref={minimapRef}
          className="scroll-minimap"
          onPointerDown={handleMinimapBgDown}
          onPointerMove={handleMinimapMove}
          onPointerUp={handleMinimapUp}
          onPointerCancel={handleMinimapUp}
        >
          {MINIMAP_PAGES.map((p, i) => (
            <div
              key={i}
              className="minimap-page"
              style={{
                left: (p.x / 100) * MINIMAP,
                top: (p.y / 100) * MINIMAP,
                width: p.w * MINIMAP_SCALE,
                height: p.h * MINIMAP_SCALE,
              }}
            />
          ))}
          <div
            className="minimap-viewport"
            style={{ left: vLeft, top: vTop, width: vW, height: vH }}
            onPointerDown={handleRectDown}
            onPointerMove={handleMinimapMove}
            onPointerUp={handleMinimapUp}
            onPointerCancel={handleMinimapUp}
          />
        </div>
      </div>

      {/* Horizontal track — panX */}
      <div className="scroll-track scroll-track-h">
        <label className="scroll-track-label">X</label>
        <input
          type="range"
          className="scroll-slider scroll-slider-h"
          min={-1800}
          max={1800}
          value={panX}
          onChange={(e) => setPanX(() => +e.target.value)}
          aria-label="Horizontal pan"
        />
      </div>

      {/* Mini zoom bar */}
      <div className="scroll-track scroll-track-z">
        <label className="scroll-track-label">Z</label>
        <input
          type="range"
          className="scroll-slider scroll-slider-z"
          min={0.15}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(() => clamp(+e.target.value, 0.15, 3))}
          aria-label="Zoom"
        />
      </div>
    </div>
  )
}
