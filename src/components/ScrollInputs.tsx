import { useRef, useState, useCallback, useEffect } from 'react'
import { CANVAS, PAN_LIMIT } from '../constants'
import { useViewport, setZoom, setPan, setPanX, setPanY, getViewport } from '../store/viewport'

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}
const MINIMAP = 120
const MINIMAP_SCALE = MINIMAP / CANVAS
const NAVBAR_H = 44

// Realtime shape descriptor — computed in App.tsx from live canvas state.
// x,y are canvas % (0-100); w,h are canvas px.
export type MinimapShape = {
  id: string
  type: 'page' | 'section' | 'widget' | 'obstacle'
  x: number
  y: number
  w: number
  h: number
}

type Props = {
  shapes: MinimapShape[]
}

export function ScrollInputs({ shapes }: Props) {
  const { zoom, panX, panY } = useViewport()
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

  const half = CANVAS / 2
  const canvasLeft = half - (viewSize.w / 2 + panX) / zoom
  const canvasTop = half - (viewSize.h / 2 + panY) / zoom
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
    const { zoom: z } = getViewport()
    const dx = e.clientX - minimapDragRef.current.sx
    const dy = e.clientY - minimapDragRef.current.sy
    setPan(
      clamp(minimapDragRef.current.oPanX - (dx / MINIMAP_SCALE) * z, -PAN_LIMIT, PAN_LIMIT),
      clamp(minimapDragRef.current.oPanY - (dy / MINIMAP_SCALE) * z, -PAN_LIMIT, PAN_LIMIT),
    )
  }, [])

  const handleMinimapUp = useCallback((e: React.PointerEvent) => {
    if (!minimapDragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    minimapDragRef.current = null
  }, [])

  // Click minimap background → jump viewport center + start drag
  const handleMinimapBgDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    if (!minimapRef.current) return
    const { zoom: z } = getViewport()
    const bounds = minimapRef.current.getBoundingClientRect()
    const mx = e.clientX - bounds.left
    const my = e.clientY - bounds.top
    const newPanX = clamp((CANVAS / 2 - mx / MINIMAP_SCALE) * z, -PAN_LIMIT, PAN_LIMIT)
    const newPanY = clamp((CANVAS / 2 - my / MINIMAP_SCALE) * z, -PAN_LIMIT, PAN_LIMIT)
    setPan(newPanX, newPanY)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    minimapDragRef.current = { sx: e.clientX, sy: e.clientY, oPanX: newPanX, oPanY: newPanY }
  }, [])

  // Drag viewport rect from current position (no jump)
  const handleRectDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    const { panX: px, panY: py } = getViewport()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    minimapDragRef.current = { sx: e.clientX, sy: e.clientY, oPanX: px, oPanY: py }
  }, [])

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
            min={-PAN_LIMIT}
            max={PAN_LIMIT}
            value={panY}
            onChange={(e) => setPanY(+e.target.value)}
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
          <svg
            className="minimap-svg"
            width={MINIMAP}
            height={MINIMAP}
            viewBox={`0 0 ${MINIMAP} ${MINIMAP}`}
          >
            {shapes.map(s => {
              const mx = (s.x / 100) * MINIMAP
              const my = (s.y / 100) * MINIMAP
              const mw = s.w * MINIMAP_SCALE
              const mh = s.h * MINIMAP_SCALE
              if (s.type === 'obstacle') {
                // tiny dot at center — represents a reflow obstacle
                return <circle key={s.id} cx={mx + mw / 2} cy={my + mh / 2} r={1.3} className="mm-obstacle" />
              }
              // skip shapes that would render sub-pixel
              if (mw < 1 || mh < 1) return null
              return <rect key={s.id} x={mx} y={my} width={mw} height={mh} className={`mm-${s.type}`} />
            })}
          </svg>
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
          onChange={(e) => setPanX(+e.target.value)}
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
          onChange={(e) => setZoom(+e.target.value)}
          aria-label="Zoom"
        />
      </div>
      <div className="scroll-zoom-readout">{zoom.toFixed(2)}×</div>
    </div>
  )
}
