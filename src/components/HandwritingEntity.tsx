import { useRef } from 'react'
import type { EntityDef, FixedRegion } from '../types'

const COLLISION_MARGIN = 0.8 // % of canvas padding around regions

function resolveCollisions(x: number, y: number, entityId: string, regions: FixedRegion[]): { x: number; y: number } {
  for (const r of regions) {
    if (r.id === entityId) continue // don't collide with self
    const rx = r.x - COLLISION_MARGIN
    const ry = r.y - COLLISION_MARGIN
    const rw = r.w + COLLISION_MARGIN * 2
    const rh = r.h + COLLISION_MARGIN * 2
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) {
      const dl = x - rx
      const dr = (rx + rw) - x
      const dt = y - ry
      const db = (ry + rh) - y
      const min = Math.min(dl, dr, dt, db)
      if (min === dl) x = rx - 0.3
      else if (min === dr) x = rx + rw + 0.3
      else if (min === dt) y = ry - 0.3
      else y = ry + rh + 0.3
    }
  }
  return { x, y }
}

type Props = {
  entity: EntityDef
  x: number
  y: number
  zoom: number
  fixedRegions: FixedRegion[]
  onPositionChange: (id: string, x: number, y: number) => void
  onClick?: () => void
}

export function HandwritingEntity({
  entity,
  x,
  y,
  zoom,
  fixedRegions,
  onPositionChange,
  onClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    startX: 0, startY: 0,
    startElX: 0, startElY: 0,
    dragging: false, pointerId: -1,
  })

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    ref.current?.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startElX: x, startElY: y,
      dragging: true, pointerId: e.pointerId,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = (e.clientX - dragRef.current.startX) / zoom
    const dy = (e.clientY - dragRef.current.startY) / zoom
    let newX = dragRef.current.startElX + (dx / 30)
    let newY = dragRef.current.startElY + (dy / 30)
    // Resolve collisions with fixed regions
    const resolved = resolveCollisions(newX, newY, entity.id, fixedRegions)
    newX = resolved.x
    newY = resolved.y
    onPositionChange(entity.id, newX, newY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    ref.current?.releasePointerCapture(e.pointerId)
    const totalMove = Math.hypot(
      e.clientX - dragRef.current.startX,
      e.clientY - dragRef.current.startY,
    )
    dragRef.current.dragging = false
    if (totalMove < 4 && onClick) onClick()
  }

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
        maxWidth: entity.maxWidth ? `${entity.maxWidth}px` : undefined,
        lineHeight: 1.5,
        whiteSpace: entity.maxWidth ? 'normal' : 'nowrap',
        wordWrap: entity.maxWidth ? 'break-word' : undefined,
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {entity.content}
    </div>
  )
}
