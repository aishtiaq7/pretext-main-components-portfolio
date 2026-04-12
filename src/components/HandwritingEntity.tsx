import { useRef, useMemo } from 'react'
import type { EntityDef, FixedRegion } from '../types'
import { ReflowText } from './ReflowText'
import type { ObstacleRect } from './ReflowText'

const COLLISION_MARGIN = 0.8

function resolveCollisions(x: number, y: number, entityId: string, regions: FixedRegion[]): { x: number; y: number } {
  for (const r of regions) {
    if (r.id === entityId) continue
    const rx = r.x - COLLISION_MARGIN
    const ry = r.y - COLLISION_MARGIN
    const rw = r.w + COLLISION_MARGIN * 2
    const rh = r.h + COLLISION_MARGIN * 2
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
      const dl = x - rx, dr = (rx + rw) - x, dt = y - ry, db = (ry + rh) - y
      const min = Math.min(dl, dr, dt, db)
      if (min === dl) x = rx - 0.3
      else if (min === dr) x = rx + rw + 0.3
      else if (min === dt) y = ry - 0.3
      else y = ry + rh + 0.3
    }
  }
  return { x, y }
}

// Obstacle data passed from App — positions in canvas %, sizes in px
export type CanvasObstacle = {
  id: string
  x: number   // canvas %
  y: number   // canvas %
  wPx: number // px
  hPx: number // px
}

type Props = {
  entity: EntityDef
  x: number
  y: number
  zoom: number
  fixedRegions: FixedRegion[]
  obstacles: CanvasObstacle[]
  onPositionChange: (id: string, x: number, y: number) => void
  onClick?: () => void
}

export function HandwritingEntity({
  entity, x, y, zoom, fixedRegions, obstacles, onPositionChange, onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, startElX: 0, startElY: 0, dragging: false })

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    ref.current?.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startElX: x, startElY: y, dragging: true }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = (e.clientX - dragRef.current.startX) / zoom
    const dy = (e.clientY - dragRef.current.startY) / zoom
    let newX = dragRef.current.startElX + (dx / 30)
    let newY = dragRef.current.startElY + (dy / 30)
    const resolved = resolveCollisions(newX, newY, entity.id, fixedRegions)
    onPositionChange(entity.id, resolved.x, resolved.y)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    ref.current?.releasePointerCapture(e.pointerId)
    const totalMove = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY)
    dragRef.current.dragging = false
    if (totalMove < 4 && onClick) onClick()
  }

  // Convert canvas-space obstacles to local px for ReflowText
  const localObstacles: ObstacleRect[] = useMemo(() => {
    if (!entity.maxWidth || entity.obstacle) return []
    return obstacles.map(o => ({
      x: (o.x - x) * 30,
      y: (o.y - y) * 30,
      w: o.wPx,
      h: o.hPx,
    }))
  }, [obstacles, x, y, entity.maxWidth, entity.obstacle])

  const hasReflow = !!entity.maxWidth && !entity.obstacle && !!entity.content

  return (
    <div
      ref={ref}
      className="entity"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `rotate(${entity.rotate}deg)`,
        fontFamily: entity.font,
        fontSize: entity.fontSize,
        fontWeight: entity.fontWeight,
        color: entity.color,
        opacity: entity.opacity,
        maxWidth: (!hasReflow && entity.maxWidth) ? `${entity.maxWidth}px` : undefined,
        lineHeight: 1.5,
        whiteSpace: (!hasReflow && entity.maxWidth) ? 'normal' : (hasReflow ? undefined : 'nowrap'),
        wordWrap: (!hasReflow && entity.maxWidth) ? 'break-word' : undefined,
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {hasReflow ? (
        <ReflowText
          text={entity.content!}
          maxWidth={entity.maxWidth!}
          fontFamily={entity.font}
          fontSize={entity.fontSize}
          color={entity.color}
          opacity={entity.opacity}
          obstacles={localObstacles}
        />
      ) : (
        entity.content
      )}
    </div>
  )
}
