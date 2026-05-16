import { ENTITIES } from '../entities'
import { CANVAS } from '../constants'

// ═══════════════════════════════════════════════════════════
// Scene definitions for the master timeline.
//
// Each scene has:
//   • triggerId     — entity to .play() once the camera has arrived
//   • focus?        — viewport target (canvas %, zoom). Omit for "stay where
//                     the user is" (used for scene 1: start wherever the user's
//                     viewport is when Play is hit).
//   • sfx?          — sound file to fire alongside .play()
//   • panDuration   — seconds (default 1.2)
//   • holdDuration  — seconds the timeline waits before the next scene starts
//                     (NOT synced to handwriting length for phase 1)
// ═══════════════════════════════════════════════════════════

export type Focus = { x: number; y: number; zoom: number }

export type Scene = {
  id: string
  triggerId: string
  focus?: Focus
  sfx?: string
  panDuration?: number
  holdDuration?: number
}

const SCRIBE_SFX = '/sounds/pencil-scribe-10s.mp3'
const CHALK_SFX = '/sounds/chalk-7s.mp3'

/**
 * Derive a focus point from the entity's top-left + size so the entity
 * sits centered in the viewport when the camera arrives. Falls back to
 * the raw position if size info is missing.
 */
function focusForEntity(triggerId: string, zoom: number): Focus | undefined {
  const e = ENTITIES.find((x) => x.triggerId === triggerId)
  if (!e) return undefined
  const w = e.imgW ?? 0
  // Auto-fit handwriting entities omit imgH (the slot height is derived from
  // the JSON's aspect ratio at render time). For focus centering we fall back
  // to width as a square estimate — close enough for most slots. If a scene
  // needs exact framing, pass `focus: { x, y, zoom }` explicitly below.
  const h = e.imgH ?? w
  return {
    x: e.x + (w / CANVAS) * 50,
    y: e.y + (h / CANVAS) * 50,
    zoom,
  }
}

// Hold durations match each handwriting recording's length (plus a small
// buffer). Adjust whenever a JSON is swapped in or out.
//   welcome-and-notebook.json — 16.96s  →  hold 17.1s
//   second-new.json           —  7.58s  →  hold  7.7s
//   3rd-scene.json            —  7.85s  →  hold  8.0s

// Per-scene zoom values — the camera tweens between these during pan, so
// scenes can pull in tight, push out wide, or sit at a neutral mid-zoom.
// Tweak freely; valid range is 0.15 – 3.0 (see store/viewport.ts).
export const SCENES: Scene[] = [
  {
    id: 'scene-1',
    triggerId: 'welcome-1',
    focus: focusForEntity('welcome-1', 0.55), // pulled back — wide intro
    sfx: SCRIBE_SFX,
    panDuration: 1.2,
    holdDuration: 17.1,
  },
  {
    id: 'scene-2',
    triggerId: 'welcome-2',
    focus: focusForEntity('welcome-2', 0.90), // closer — mid punch-in
    sfx: CHALK_SFX,
    panDuration: 1.2,
    holdDuration: 7.7,
  },
  {
    id: 'scene-3',
    triggerId: 'welcome-3',
    focus: focusForEntity('welcome-3', 1.20), // tight — final hero crop
    sfx: SCRIBE_SFX,
    panDuration: 1.2,
    holdDuration: 8.0,
  },
]
