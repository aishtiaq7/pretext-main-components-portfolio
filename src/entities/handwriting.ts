import type { EntityDef } from '../types'
import { handwriting } from './factories'

// ═══════════════════════════════════════════════════════════
// Handwriting — stroke-capture JSON exports from `ink-studio`.
// Pinned by default (not draggable), no collision, no minimap.
// Set `width` (on-canvas pixels); the slot height is auto-derived
// from each JSON's intrinsic aspect ratio so any future recording
// drops in without per-file tuning. Tilt via `rotate`. Drop more
// JSON files into `public/handwriting/` and add another entry here.
//
// `revealedBy` says how each one appears (docs/architecture.md §3.2):
//   'load'                       → draws itself on page load
//   'click:<id>'                 → hidden until that entity is clicked
//   'done:<id> +6s'              → …or 6 s after that entity finishes
// The welcome chain below: Play button → welcome-1 → welcome-2 → welcome-3.
// Each step can be clicked through, or advances on its own after 6 s.
// Recording lengths: welcome 16.96 s · second 7.58 s · 3rd 7.85 s.
// ═══════════════════════════════════════════════════════════

const SCRIBE_SFX = '/sounds/pencil-scribe-10s.mp3'
const CHALK_SFX = '/sounds/chalk-7s.mp3'

export const HANDWRITINGS: EntityDef[] = [
  handwriting({
    id: 'hw-1',
    x: 52, y: 31,
    width: 720,
    rotate: -1,
    src: '/handwriting/ink-2026-04-17-2017.json',
    revealedBy: 'load',
  }),
  handwriting({
    id: 'hw-2',
    x: 58, y: 39,
    width: 720,
    rotate: 1,
    src: '/handwriting/ink-2026-04-17-2037.json',
    revealedBy: 'load',
  }),
  handwriting({
    id: 'hw-welcome',
    x: 69, y: 69,
    width: 600,
    src: '/handwriting/welcome-and-notebook.json',
    triggerId: 'welcome-1',
    revealedBy: 'click:button-1',
    camera: { zoom: 0.55 },                 // pulled back — wide intro
    onReveal: `sfx:${SCRIBE_SFX}`,
    clickable: true,
  }),
  handwriting({
    id: 'hw-welcome-2',
    x: 74, y: 72,
    width: 600,
    src: '/handwriting/second-new.json',
    triggerId: 'welcome-2',
    revealedBy: ['click:welcome-1', 'done:welcome-1 +6s'],
    camera: { zoom: 0.9 },                  // closer — mid punch-in
    onReveal: `sfx:${CHALK_SFX}`,
    clickable: true,
  }),
  handwriting({
    id: 'hw-welcome-3',
    x: 81, y: 66,
    width: 600,
    src: '/handwriting/3rd-scene.json',
    triggerId: 'welcome-3',
    revealedBy: ['click:welcome-2', 'done:welcome-2 +6s'],
    camera: { zoom: 1.2 },                  // tight — final hero crop
    onReveal: `sfx:${SCRIBE_SFX}`,
  }),
]
