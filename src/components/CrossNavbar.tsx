import { useRef, useState, useCallback } from 'react'

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

type Props = {
  zoom: number
  panX: number
  setZoom: (fn: (z: number) => number) => void
  setPanX: (fn: (p: number) => number) => void
}

export function CrossNavbar({ zoom, panX, setZoom, setPanX }: Props) {
  const [pos, setPos] = useState({ x: 48, y: 80 })
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  const handleGripDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
  }, [pos])

  const handleGripMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    })
  }, [])

  const handleGripUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  // Zoom as percentage for display
  const zoomPct = Math.round(zoom * 100)

  return (
    <div
      className="cross-navbar"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Grip handle at top of vertical arm */}
      <div
        className="cross-grip"
        onPointerDown={handleGripDown}
        onPointerMove={handleGripMove}
        onPointerUp={handleGripUp}
        onPointerCancel={handleGripUp}
      >
        <div className="grip-dots">
          <span /><span /><span />
          <span /><span /><span />
        </div>
      </div>

      {/* Vertical arm — zoom */}
      <div className="cross-vertical">
        <button
          className="cross-btn"
          onClick={() => setZoom(z => clamp(z + 0.15, 0.15, 3))}
          aria-label="Zoom in"
        >
          +
        </button>
        <input
          type="range"
          className="cross-slider cross-slider-v"
          min={0.15}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(() => +e.target.value)}
          aria-label="Zoom level"
        />
        <span className="cross-label">{zoomPct}%</span>
        <button
          className="cross-btn"
          onClick={() => setZoom(z => clamp(z - 0.15, 0.15, 3))}
          aria-label="Zoom out"
        >
          &minus;
        </button>
      </div>

      {/* Horizontal arm — panX */}
      <div className="cross-horizontal">
        <button
          className="cross-btn"
          onClick={() => setPanX(p => clamp(p + 150, -1800, 1800))}
          aria-label="Pan left"
        >
          &#9664;
        </button>
        <input
          type="range"
          className="cross-slider cross-slider-h"
          min={-1800}
          max={1800}
          value={panX}
          onChange={(e) => setPanX(() => +e.target.value)}
          aria-label="Horizontal pan"
        />
        <button
          className="cross-btn"
          onClick={() => setPanX(p => clamp(p - 150, -1800, 1800))}
          aria-label="Pan right"
        >
          &#9654;
        </button>
      </div>
    </div>
  )
}
