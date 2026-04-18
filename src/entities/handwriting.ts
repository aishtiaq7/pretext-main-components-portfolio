import type { EntityDef } from '../types'
import { handwriting } from './factories'

// ═══════════════════════════════════════════════════════════
// Handwriting — stroke-capture JSON exports from `ink-studio`.
// Pinned by default (not draggable), no collision, no minimap.
// Control size via `width` / `height` (on-canvas pixels) and
// tilt via `rotate`. Drop more JSON files into
// `public/handwriting/` and add another entry here.
// ═══════════════════════════════════════════════════════════
export const HANDWRITINGS: EntityDef[] = [
  handwriting({
    id: 'hw-1',
    x: 3, y: 72,
    width: 720, height: 412,
    rotate: -1,
    src: '/handwriting/ink-2026-04-17-2017.json',
    autoplay: true,
  }),
]
