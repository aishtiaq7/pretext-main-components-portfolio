import type { EntityDef } from '../types'
import { handwriting } from '../entities/factories'

// ═══════════════════════════════════════════════════════════
// Fresh page — the journal's opening choice.
//
//   welcome (draws on load)
//        └─ done ─▶  "continue with sound"   "continue without sound"
//                        │ click                     │ click
//                        ▼                           ▼
//                   with_sound text             no_sound text
//
// Only one choice can be taken (the `fp-chosen` flag), and the choice
// also sets the mute preference. Everything here persists: a visitor
// who picked sound and reloads lands on the same page with the same
// drawings showing (docs/architecture.md §5.1).
//
// Geometry: every recording was captured on a 1377×1176 stage and is
// rendered at 700 px wide, so one stage unit = 0.508 px on the canvas.
// The ink sits in the middle band of each stage; positions below were
// chosen from the measured ink bounds so the visible words line up:
// welcome centred on the page, the two choices one row below, the
// result text one row below that. Centre of the group ≈ (50 %, 49 %).
// ═══════════════════════════════════════════════════════════

const DIR = '/handwriting/fresh-page'
const W = 700

export const FRESHPAGE1_ENTITIES: EntityDef[] = [
  handwriting({
    id: 'fp-welcome',
    x: 46.5, y: 43.2, width: W,
    src: `${DIR}/welcome_to_journal.json`,
    revealedBy: 'load',
  }),

  // ── the choice, appears when the welcome finishes ──
  handwriting({
    id: 'fp-choose-sound',
    x: 43.4, y: 45.9, width: W,
    src: `${DIR}/continue_with_sound.json`,
    revealedBy: 'done:fp-welcome',
    clickable: true,
    enabledWhen: 'noflag:fp-chosen',
    onClickAction: ['fn:sound-on', 'set:fp-chosen'],
  }),
  handwriting({
    id: 'fp-choose-silent',
    x: 50.0, y: 45.8, width: W,
    src: `${DIR}/continue_without_sound.json`,
    revealedBy: 'done:fp-welcome',
    clickable: true,
    enabledWhen: 'noflag:fp-chosen',
    onClickAction: ['fn:sound-off', 'set:fp-chosen'],
  }),

  // ── the answer, one per choice (same spot; only one ever shows) ──
  handwriting({
    id: 'fp-with-sound',
    x: 46.5, y: 49.5, width: W,
    src: `${DIR}/with_sound.json`,
    revealedBy: 'click:fp-choose-sound',
  }),
  handwriting({
    id: 'fp-no-sound',
    x: 46.2, y: 49.2, width: W,
    src: `${DIR}/no_sound_text.json`,
    revealedBy: 'click:fp-choose-silent',
  }),
]

/** Where the camera opens on a first visit: the group, slightly zoomed in. */
export const FRESHPAGE1_VIEW = { focusX: 50, focusY: 49.5, zoom: 0.9 }
