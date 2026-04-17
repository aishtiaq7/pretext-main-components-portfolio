import { useRef, useMemo, useCallback } from 'react'
import type { EntityDef, FixedRegion } from '../types'
import { CANVAS } from '../constants'
import { ReflowText } from './ReflowText'
import type { ObstacleRect } from './ReflowText'
import { useJitter } from '../hooks/useJitter'

const PCT_TO_PX = CANVAS / 100  // 1% of canvas in px

const COLLISION_MARGIN = 0.8

// AABB collision resolver. When ew/eh > 0 the entity is treated as a box
// (top-left at x,y, size ew×eh in canvas %). When 0 it degrades to the
// original point-in-rect check. This matters for reflow paragraphs whose
// body extends well beyond their top-left corner.
function resolveCollisions(
  x: number, y: number,
  entityId: string, regions: FixedRegion[],
  ew = 0, eh = 0,
): { x: number; y: number } {
  for (const r of regions) {
    if (r.id === entityId) continue
    const rx = r.x - COLLISION_MARGIN
    const ry = r.y - COLLISION_MARGIN
    const rw = r.w + COLLISION_MARGIN * 2
    const rh = r.h + COLLISION_MARGIN * 2
    // AABB overlap: entity box [x, y, x+ew, y+eh] vs region box [rx, ry, rx+rw, ry+rh]
    const overlaps = x < rx + rw && x + ew > rx && y < ry + rh && y + eh > ry
    if (!overlaps) continue
    // How far we'd need to push in each direction to clear the overlap
    const dl = (x + ew) - rx          // push entity left
    const dr = (rx + rw) - x          // push entity right
    const dt = (y + eh) - ry          // push entity up
    const db = (ry + rh) - y          // push entity down
    const isTopEdge = r.y <= 0
    const min = isTopEdge ? Math.min(dl, dr, db) : Math.min(dl, dr, dt, db)
    if (min === dl) x = rx - ew - 0.3
    else if (min === dr) x = rx + rw + 0.3
    else if (!isTopEdge && min === dt) y = ry - eh - 0.3
    else y = ry + rh + 0.3
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
  shape?: 'ellipse' | 'rect' | 'capsule'  // how ReflowText carves around it
}

type Props = {
  entity: EntityDef
  x: number
  y: number
  zoom: number
  fixedRegions: FixedRegion[]
  obstacles: CanvasObstacle[]
  onPositionChange: (id: string, x: number, y: number) => void
  onPinToggle?: (id: string) => void
  onClick?: () => void
  renderSection?: (componentId: string) => React.ReactNode
  isWidgetActive?: boolean
  onWidgetActivate?: (id: string) => void
  onDragStart?: (id: string) => void
  onDragEnd?: (id: string) => void
}

export function HandwritingEntity({
  entity, x, y, zoom, fixedRegions, obstacles, onPositionChange, onPinToggle, onClick, renderSection,
  isWidgetActive, onWidgetActivate, onDragStart, onDragEnd,
}: Props) {
  const dragRef = useRef({ startX: 0, startY: 0, startElX: 0, startElY: 0, dragging: false })

  const isPinned = !!entity.pinned
  const isSection = entity.category === 'section'
  const isWidget = entity.category === 'widget'
  const isDraggable = isWidget ? !!isWidgetActive : !isPinned

  // Jitter animation — writes directly to the DOM via ref
  const { jitterRef, frozen: jitterFrozen, toggleFreeze } = useJitter(
    entity.jitter,
    entity.id,
    entity.rotate,
  )

  // Merge refs: jitterRef owns the element, we also need it for pointer capture
  const setRef = useCallback((node: HTMLDivElement | null) => {
    (jitterRef as { current: HTMLDivElement | null }).current = node
  }, [jitterRef])

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-pin-btn]')) return
    e.stopPropagation()
    if (!isDraggable) return
    jitterRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startElX: x, startElY: y, dragging: true }
    onDragStart?.(entity.id)
  }

  // Estimated bounding box for reflow paragraphs (canvas %).
  // Used for AABB collision so the paragraph's full body bounces off pages,
  // not just its top-left corner.
  const entityBox = useMemo(() => {
    if (!entity.maxWidth || !entity.content || entity.obstacle) return { w: 0, h: 0 }
    const rem = entity.fontSize.match(/([\d.]+)rem/)
    const px = entity.fontSize.match(/([\d.]+)px/)
    const fontPx = rem ? parseFloat(rem[1]) * 16 : px ? parseFloat(px[1]) : 16
    const lineH = Math.round(fontPx * 1.5)
    const isBold = entity.fontWeight === '700' || entity.fontWeight === 'bold'
    const charsPerLine = Math.max(8, Math.floor(entity.maxWidth / (fontPx * (isBold ? 0.62 : 0.55))))
    const lines = Math.max(1, Math.ceil(entity.content.length / charsPerLine))
    return {
      w: (entity.maxWidth / CANVAS) * 100,
      h: (lines * lineH / CANVAS) * 100,
    }
  }, [entity.maxWidth, entity.content, entity.fontSize, entity.fontWeight, entity.obstacle])

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = (e.clientX - dragRef.current.startX) / zoom
    const dy = (e.clientY - dragRef.current.startY) / zoom
    let newX = dragRef.current.startElX + (dx / PCT_TO_PX)
    let newY = dragRef.current.startElY + (dy / PCT_TO_PX)
    const resolved = resolveCollisions(newX, newY, entity.id, fixedRegions, entityBox.w, entityBox.h)
    onPositionChange(entity.id, resolved.x, resolved.y)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    jitterRef.current?.releasePointerCapture(e.pointerId)
    const totalMove = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY)
    dragRef.current.dragging = false
    onDragEnd?.(entity.id)
    if (totalMove < 4) {
      if (isWidget && onWidgetActivate) {
        onWidgetActivate(entity.id)
      } else if (entity.category === 'accent' && entity.jitter !== 'none') {
        toggleFreeze()
      } else if (onClick) {
        onClick()
      }
    }
  }

  // Convert canvas-space obstacles to local px for ReflowText.
  // Exclude self so a paragraph doesn't try to wrap around its own body
  // (paragraphs are registered as obstacles for each other in App.tsx).
  const localObstacles: ObstacleRect[] = useMemo(() => {
    if (!entity.maxWidth || entity.obstacle) return []
    return obstacles
      .filter(o => o.id !== entity.id)
      .map(o => ({
        x: (o.x - x) * PCT_TO_PX,
        y: (o.y - y) * PCT_TO_PX,
        w: o.wPx,
        h: o.hPx,
        shape: o.shape,
      }))
  }, [obstacles, x, y, entity.maxWidth, entity.obstacle, entity.id])

  const hasReflow = !!entity.maxWidth && !entity.obstacle && !!entity.content

  // Section entities render their component
  if (isSection && entity.componentId && renderSection) {
    return (
      <div
        ref={setRef}
        className={`entity entity-section ${isPinned ? 'entity-pinned' : 'entity-draggable'}`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `rotate(${entity.rotate}deg)`,
          cursor: isDraggable ? 'grab' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {onPinToggle && (
          <button
            data-pin-btn
            className={`pin-btn ${isPinned ? 'pin-btn-active' : 'pin-btn-inactive'}`}
            onClick={(e) => { e.stopPropagation(); onPinToggle(entity.id) }}
            title={isPinned ? 'Unpin (make draggable)' : 'Pin in place'}
          >
            <img src="/doodles/pin.svg" alt="pin" className="pin-icon" draggable={false} />
          </button>
        )}
        {renderSection(entity.componentId)}
      </div>
    )
  }

  // Widget entities — large draggable blocks, click to activate
  if (isWidget) {
    return (
      <div
        ref={setRef}
        className={`entity entity-widget ${isWidgetActive ? 'entity-widget-active' : ''}`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `rotate(${entity.rotate}deg)`,
          cursor: isWidgetActive ? 'grab' : 'pointer',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="widget-block"
          style={{ width: entity.obstacleW, height: entity.obstacleH }}
        >
          <div className="widget-label" style={{ fontFamily: entity.font, fontSize: entity.fontSize }}>
            {entity.content}
          </div>
          {!isWidgetActive && (
            <div className="widget-hint">click to grab</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setRef}
      className={`entity ${isPinned ? 'entity-pinned' : ''} ${entity.category === 'accent' ? 'entity-accent' : ''} ${jitterFrozen ? 'entity-frozen' : ''}`}
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
        cursor: isDraggable ? 'grab' : 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isPinned && entity.category !== 'watermark' && (
        <img
          src="/doodles/pin.svg"
          alt=""
          className="pin-indicator"
          draggable={false}
        />
      )}

      {entity.imgSrc ? (
        <img
          src={entity.imgSrc}
          alt={entity.content || ''}
          width={entity.imgW}
          height={entity.imgH}
          style={{ pointerEvents: 'none', display: 'block' }}
          draggable={false}
        />
      ) : hasReflow ? (
        <ReflowText
          text={entity.content!}
          maxWidth={entity.maxWidth!}
          fontFamily={entity.font}
          fontSize={entity.fontSize}
          fontWeight={entity.fontWeight}
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
