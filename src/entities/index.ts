import type { EntityDef } from '../types'
import { DOODLES } from './doodles'
import { OBSTACLES } from './obstacles'
import { ACCENTS } from './accents'
import { WATERMARKS } from './watermarks'
import { IMAGES } from './images'
import { HANDWRITINGS } from './handwriting'
import { SECTIONS } from './sections'
import { WIDGETS } from './widgets'

// Re-export content strings used by App.tsx
export { BRAND_NAME, ALICE_QUOTE } from './doodles'
export { SECTION_PHOTOS } from './sections'

// Re-export individual arrays for direct access
export { DOODLES, OBSTACLES, ACCENTS, WATERMARKS, IMAGES, HANDWRITINGS, SECTIONS, WIDGETS }

// ═══════════════════════════════════════════════════════════
// COMBINED ENTITY LIST — all categories merged
// Render order: watermarks (back) → doodles → images → handwriting → obstacles → accents → sections → widgets (front)
// ═══════════════════════════════════════════════════════════
export const ENTITIES: EntityDef[] = [
  ...WATERMARKS,
  ...DOODLES,
  ...IMAGES,
  ...HANDWRITINGS,
  ...OBSTACLES,
  ...ACCENTS,
  ...SECTIONS,
  ...WIDGETS,
]
