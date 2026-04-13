import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { EntityDef } from '../types'
import { CANVAS } from '../constants'

const PCT_TO_PX = CANVAS / 100

type Props = {
  entity: EntityDef
  x: number     // canvas %
  y: number     // canvas %
  zoom: number
  onPositionChange: (id: string, x: number, y: number) => void
}

// MotionObstacle — a framer-motion–polished draggable entity that acts as
// a text-reflow obstacle. Visually polished (spring entrance, hover, tap),
// but the drag itself uses native pointer capture with proper zoom
// compensation — matching how HandwritingEntity drags obstacles.
// Position flows into App's `positions` state, so ReflowText wraps around
// it in realtime (via obstacleRects → ReflowText).
export function MotionObstacle({ entity, x, y, zoom, onPositionChange }: Props) {
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }
  }, [x, y])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dxPct = (e.clientX - dragRef.current.sx) / (PCT_TO_PX * zoom)
    const dyPct = (e.clientY - dragRef.current.sy) / (PCT_TO_PX * zoom)
    onPositionChange(entity.id, dragRef.current.ox + dxPct, dragRef.current.oy + dyPct)
  }, [entity.id, zoom, onPositionChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  return (
    <motion.div
      className="entity entity-motion"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: entity.imgW,
        height: entity.imgH,
        cursor: 'grab',
        touchAction: 'none',
        willChange: 'transform',
      }}
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      whileHover={{ scale: 1.08, rotate: 4 }}
      whileTap={{ scale: 0.94 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {entity.imgSrc ? (
        <img
          src={entity.imgSrc}
          width={entity.imgW}
          height={entity.imgH}
          draggable={false}
          alt=""
          style={{ display: 'block', pointerEvents: 'none', userSelect: 'none' }}
        />
      ) : null}
    </motion.div>
  )
}
