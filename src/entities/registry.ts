import type { EntityDef, FixedRegion } from '../types'
import type { CanvasObstacle } from '../components/HandwritingEntity'
import type { MinimapShape } from '../components/ScrollInputs'
import { CANVAS } from '../constants'
import { resolveSectionSize, getWidgetSize, getReflowBoxPct, pxToPct } from './sizes'

// ═══════════════════════════════════════════════════════════
// Entity registry — the single dispatch table that turns an
// entity definition into its collision, minimap, and obstacle
// contributions. App.tsx iterates ENTITIES once and asks the
// registry what each one contributes; adding a new category
// only requires editing `getEntityMetrics`.
// ═══════════════════════════════════════════════════════════

export type EntityRole = 'section' | 'widget' | 'obstacle' | 'reflow' | 'plain'

export type EntityMetrics = {
  role: EntityRole
  /** size on canvas in percent — null if the entity has no deterministic body */
  size: { w: number; h: number } | null
  /** contributes to pageRegions (entities bump into these, pages bump into these) */
  isPageRegion: boolean
  /** contributes to pageCollisionRegions (pages bump into these; entities don't) */
  isExtendedCollider: boolean
  /** text reflows around this entity */
  isObstacle: boolean
  /** how this entity appears on the minimap */
  minimapType: 'section' | 'widget' | 'obstacle' | null
}

export function getEntityRole(entity: EntityDef): EntityRole {
  if (entity.category === 'section') return 'section'
  if (entity.category === 'widget') return 'widget'
  if (entity.obstacle) return 'obstacle'
  if (entity.maxWidth && entity.content) return 'reflow'
  return 'plain'
}

/**
 * Describe the entity's canvas role. `isActiveWidget` toggles whether a
 * widget contributes to page-collision regions (only the active widget does).
 */
export function getEntityMetrics(entity: EntityDef, isActiveWidget: boolean): EntityMetrics {
  const role = getEntityRole(entity)

  switch (role) {
    case 'section': {
      const size = resolveSectionSize(entity)
      return {
        role,
        size: size ? { w: pxToPct(size.w), h: pxToPct(size.h) } : null,
        isPageRegion: true,
        isExtendedCollider: true,
        isObstacle: false,
        minimapType: 'section',
      }
    }
    case 'widget': {
      const size = getWidgetSize(entity)
      return {
        role,
        size: { w: pxToPct(size.w), h: pxToPct(size.h) },
        isPageRegion: isActiveWidget,
        isExtendedCollider: isActiveWidget,
        isObstacle: false,
        minimapType: 'widget',
      }
    }
    case 'obstacle': {
      const w = entity.obstacleW ?? 0
      const h = entity.obstacleH ?? 0
      return {
        role,
        size: { w: pxToPct(w), h: pxToPct(h) },
        isPageRegion: false,
        isExtendedCollider: true,
        isObstacle: true,
        minimapType: 'obstacle',
      }
    }
    case 'reflow': {
      const size = getReflowBoxPct(entity)
      return {
        role,
        size,
        isPageRegion: false,
        isExtendedCollider: true,
        isObstacle: false,
        minimapType: null,
      }
    }
    default:
      return {
        role: 'plain',
        size: null,
        isPageRegion: false,
        isExtendedCollider: false,
        isObstacle: false,
        minimapType: null,
      }
  }
}

// ═══════════════════════════════════════════════════════════
// Derivations — one iteration each, driven purely by the
// metrics table above. App.tsx calls these; no category-
// specific logic lives outside this module.
// ═══════════════════════════════════════════════════════════

type Pos = { x: number; y: number }
type PositionMap = Record<string, Pos>

/** Entity-collision regions (pages, sections, active widget). */
export function collectPageRegions(
  entities: readonly EntityDef[],
  positions: PositionMap,
  activeWidget: string | null,
): FixedRegion[] {
  const regions: FixedRegion[] = []
  for (const e of entities) {
    const m = getEntityMetrics(e, activeWidget === e.id)
    if (!m.isPageRegion || !m.size) continue
    const pos = positions[e.id] ?? { x: e.x, y: e.y }
    regions.push({ id: e.id, x: pos.x, y: pos.y, w: m.size.w, h: m.size.h })
  }
  return regions
}

/** Extra regions that *pages* bump into (paragraphs, obstacles). */
export function collectExtendedColliders(
  entities: readonly EntityDef[],
  positions: PositionMap,
  activeWidget: string | null,
): FixedRegion[] {
  const regions: FixedRegion[] = []
  for (const e of entities) {
    const m = getEntityMetrics(e, activeWidget === e.id)
    // Page-regions are already included by the caller; here we only add the
    // extra paragraphs + obstacle bodies that pages need to avoid but that
    // entities themselves don't treat as collision walls.
    if (m.isPageRegion || !m.isExtendedCollider || !m.size) continue
    const pos = positions[e.id] ?? { x: e.x, y: e.y }
    regions.push({ id: e.id, x: pos.x, y: pos.y, w: m.size.w, h: m.size.h })
  }
  return regions
}

/** Minimap shape list for the canvas overview. */
export function collectMinimapShapes(
  entities: readonly EntityDef[],
  positions: PositionMap,
): MinimapShape[] {
  const shapes: MinimapShape[] = []
  for (const e of entities) {
    const m = getEntityMetrics(e, /* isActiveWidget */ false)
    if (!m.minimapType || !m.size) continue
    const pos = positions[e.id] ?? { x: e.x, y: e.y }
    // Minimap uses pixel sizes — re-expand from percent
    const wPx = (m.size.w / 100) * CANVAS
    const hPx = (m.size.h / 100) * CANVAS
    shapes.push({ id: e.id, type: m.minimapType, x: pos.x, y: pos.y, w: wPx, h: hPx })
  }
  return shapes
}

/** Obstacle rects (rotation-adjusted AABB) for ReflowText carving. */
export function collectObstacleRects(
  entities: readonly EntityDef[],
  positions: PositionMap,
): CanvasObstacle[] {
  const out: CanvasObstacle[] = []
  for (const e of entities) {
    if (!e.obstacle) continue
    const pos = positions[e.id] ?? { x: e.x, y: e.y }
    const rawW = e.obstacleW ?? 0
    const rawH = e.obstacleH ?? 0
    // Rotation-adjusted AABB: a rotated box's axis-aligned footprint is
    // larger than the unrotated one, so the carve must cover the full
    // rotated extent. See App.tsx's original comment for context.
    const rad = Math.abs((e.rotate || 0) * Math.PI / 180)
    const cosR = Math.cos(rad)
    const sinR = Math.sin(rad)
    const adjW = Math.ceil(rawW * cosR + rawH * sinR)
    const adjH = Math.ceil(rawW * sinR + rawH * cosR)
    const shiftX = pxToPct((adjW - rawW) / 2)
    const shiftY = pxToPct((adjH - rawH) / 2)
    out.push({
      id: e.id,
      x: pos.x - shiftX,
      y: pos.y - shiftY,
      wPx: adjW,
      hPx: adjH,
      shape: 'capsule',
    })
  }
  return out
}
