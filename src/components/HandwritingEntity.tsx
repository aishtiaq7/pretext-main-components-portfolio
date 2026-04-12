import { useRef } from 'react'
import type { EntityDef } from '../types'

type Props = {
  entity: EntityDef
  x: number
  y: number
  zoom: number
  onPositionChange: (id: string, x: number, y: number) => void
  onClick?: () => void
  children?: React.ReactNode
}

export function HandwritingEntity({
  entity,
  x,
  y,
  zoom,
  onPositionChange,
  onClick,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startElX: 0,
    startElY: 0,
    dragging: false,
    pointerId: -1,
  })

  const handlePointerDown = (e: React.PointerEvent) => {
    // Don't capture if it's on an interactive child (canvas, button, etc.)
    if ((e.target as HTMLElement).tagName === 'CANVAS') return

    e.stopPropagation()
    ref.current?.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startElX: x,
      startElY: y,
      dragging: true,
      pointerId: e.pointerId,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    // Convert screen delta to canvas percentage (3000px = 100%)
    const dx = (e.clientX - dragRef.current.startX) / zoom
    const dy = (e.clientY - dragRef.current.startY) / zoom
    const newX = dragRef.current.startElX + (dx / 30)
    const newY = dragRef.current.startElY + (dy / 30)
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
    // Click if barely moved
    if (totalMove < 4 && onClick) {
      onClick()
    }
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
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {entity.type === 'text' && entity.content}
      {children}
    </div>
  )
}
