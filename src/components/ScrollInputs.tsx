import { useRef, useState, useCallback } from 'react'

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

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

      {/* Vertical track — panY */}
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
