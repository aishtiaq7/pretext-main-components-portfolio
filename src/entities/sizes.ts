import type { EntityDef } from '../types'
import { CANVAS } from '../constants'

// ═══════════════════════════════════════════════════════════
// Size lookup — single source of truth for every entity's
// pixel footprint on the canvas. Collision, minimap, reflow,
// and AABB math all derive from these helpers.
//
// Adding a new section component or widget size? Register it
// here, not in App.tsx — the registry will pick it up.
// ═══════════════════════════════════════════════════════════

export const PCT_TO_PX = CANVAS / 100
export const pxToPct = (px: number) => (px / CANVAS) * 100

export type PxSize = { w: number; h: number }

// ── Section sizes (keyed by componentId, not entity id) ──
// This means section-photos-4 or section-about-5 works automatically;
// App.tsx no longer needs a per-id map.
export const SECTION_SIZES: Record<string, PxSize> = {
  'about-block':   { w: 1100, h: 850 },
  'photo-gallery': { w: 1300, h: 1440 },
}

export function getSectionSize(componentId: string | undefined): PxSize | null {
  if (!componentId) return null
  return SECTION_SIZES[componentId] ?? null
}

/**
 * Resolve a section's rendered size. Per-instance `width` / `height` on the
 * entity win; otherwise the shared default from `SECTION_SIZES` is used.
 */
export function resolveSectionSize(entity: EntityDef): PxSize | null {
  const base = getSectionSize(entity.componentId)
  if (!base) return null
  return {
    w: entity.width ?? base.w,
    h: entity.height ?? base.h,
  }
}

// ── Widget sizes ──
// Default widget dimensions; per-instance overrides land on the entity
// itself via obstacleW/H so a single widget can opt into a different size.
export const WIDGET_DEFAULT: PxSize = { w: 400, h: 300 }

export function getWidgetSize(entity: EntityDef): PxSize {
  return {
    w: entity.obstacleW ?? WIDGET_DEFAULT.w,
    h: entity.obstacleH ?? WIDGET_DEFAULT.h,
  }
}

// ── Reflow paragraph box ──
// Estimated bounding box of a wrapped paragraph. Used for AABB collision
// so the paragraph's body bounces off pages, not just its top-left corner.
function parseFontPx(fontSize: string): number {
  const rem = fontSize.match(/([\d.]+)rem/)
  if (rem) return parseFloat(rem[1]) * 16
  const px = fontSize.match(/([\d.]+)px/)
  if (px) return parseFloat(px[1])
  return 16
}

export function getReflowBoxPx(entity: EntityDef): PxSize | null {
  if (!entity.maxWidth || !entity.content) return null
  const fontPx = parseFontPx(entity.fontSize)
  const lineH = Math.round(fontPx * 1.5)
  const isBold = entity.fontWeight === '700' || entity.fontWeight === 'bold'
  const charsPerLine = Math.max(8, Math.floor(entity.maxWidth / (fontPx * (isBold ? 0.62 : 0.55))))
  const lines = Math.max(1, Math.ceil(entity.content.length / charsPerLine))
  return { w: entity.maxWidth, h: lines * lineH }
}

export function getReflowBoxPct(entity: EntityDef): PxSize | null {
  const box = getReflowBoxPx(entity)
  if (!box) return null
  return { w: pxToPct(box.w), h: pxToPct(box.h) }
}
