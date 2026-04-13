import { useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { EntityDef } from '../types'
import { CANVAS } from '../constants'

const PCT_TO_PX = CANVAS / 100

// Inertia / momentum tuning — higher friction decays faster
const FRICTION_PER_FRAME = 0.93       // velocity multiplier per 16.67ms frame
const VELOCITY_STOP_THRESHOLD = 0.0008 // canvas-pct per ms; below this, stop
const VELOCITY_SMOOTHING = 0.7         // 0 = no smoothing, 1 = fully lagged

type Props = {
  entity: EntityDef
  x: number     // canvas %
  y: number     // canvas %
  zoom: number
  onPositionChange: (id: string, x: number, y: number) => void
}

// MotionObstacle — draggable framer-motion entity that also acts as a
// text-reflow obstacle. Smooth inertia (momentum) decay on release, so it
// coasts to a stop instead of snapping. Position flows through App state
// so ReflowText wraps around it in realtime.
export function MotionObstacle({ entity, x, y, zoom, onPositionChange }: Props) {
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  // Velocity tracker — canvas-pct per ms, low-pass-filtered
  const velocityRef = useRef({
    vx: 0, vy: 0,
    lastClientX: 0, lastClientY: 0,
    lastT: 0,
  })

  // Inertia animation handle
  const rafRef = useRef<number | null>(null)
  // Latest (x, y) available to the animation loop without stale closures
  const posRef = useRef({ x, y })
  posRef.current = { x, y }

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const stopInertia = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    stopInertia()
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }
    velocityRef.current = {
      vx: 0, vy: 0,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      lastT: performance.now(),
    }
  }, [x, y])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return

    const now = performance.now()
    const dt = Math.max(1, now - velocityRef.current.lastT)

    // Instantaneous velocity in canvas-pct per ms (zoom-compensated)
    const instVx = (e.clientX - velocityRef.current.lastClientX) / (PCT_TO_PX * zoom) / dt
    const instVy = (e.clientY - velocityRef.current.lastClientY) / (PCT_TO_PX * zoom) / dt

    // Low-pass filter so a single spiky frame doesn't dominate
    velocityRef.current.vx = velocityRef.current.vx * (1 - VELOCITY_SMOOTHING) + instVx * VELOCITY_SMOOTHING
    velocityRef.current.vy = velocityRef.current.vy * (1 - VELOCITY_SMOOTHING) + instVy * VELOCITY_SMOOTHING
    velocityRef.current.lastClientX = e.clientX
    velocityRef.current.lastClientY = e.clientY
    velocityRef.current.lastT = now

    const dxPct = (e.clientX - dragRef.current.sx) / (PCT_TO_PX * zoom)
    const dyPct = (e.clientY - dragRef.current.sy) / (PCT_TO_PX * zoom)
    onPositionChange(entity.id, dragRef.current.ox + dxPct, dragRef.current.oy + dyPct)
  }, [entity.id, zoom, onPositionChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null

    // Kick off inertia decay using the last smoothed velocity
    let vx = velocityRef.current.vx
    let vy = velocityRef.current.vy
    let lastT = performance.now()

    const step = (now: number) => {
      const dt = now - lastT
      lastT = now

      // Friction per-frame, normalized by dt so behavior is framerate-independent
      const frames = dt / 16.67
      const decay = Math.pow(FRICTION_PER_FRAME, frames)
      vx *= decay
      vy *= decay

      if (Math.abs(vx) < VELOCITY_STOP_THRESHOLD && Math.abs(vy) < VELOCITY_STOP_THRESHOLD) {
        rafRef.current = null
        return
      }

      const nextX = posRef.current.x + vx * dt
      const nextY = posRef.current.y + vy * dt
      onPositionChange(entity.id, nextX, nextY)
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
  }, [entity.id, onPositionChange])

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
