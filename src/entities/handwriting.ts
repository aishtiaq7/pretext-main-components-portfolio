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
    x: 52, y: 31,
    width: 720, height: 412,
    rotate: -1,
    src: '/handwriting/ink-2026-04-17-2017.json',
    autoplay: true,
  }),
  handwriting({
    id: 'hw-2',
    x: 58, y: 39,
    width: 720, height: 412,
    rotate: 1,
    src: '/handwriting/ink-2026-04-17-2037.json',
    autoplay: true,
  }),
  handwriting({
    id: 'hw-welcome',
    x: 69, y: 69,
    width: 600, height: 530,
    src: '/handwriting/second.json',
    autoplay: false,
    triggerId: 'welcome-1',
    revealMode: 'manual',
  }),
  handwriting({
    id: 'hw-welcome-2',
    x: 74, y: 72,
    width: 600, height: 530,
    src: '/handwriting/second-new.json',
    autoplay: false,
    triggerId: 'welcome-2',
    revealMode: 'manual',
  }),
  handwriting({
    id: 'hw-welcome-3',
    x: 81, y: 66,
    width: 600, height: 530,
    src: '/handwriting/3rd-scene.json',
    autoplay: false,
    triggerId: 'welcome-3',
    revealMode: 'manual',
  }),
]
