import type { EntityDef } from '../types'

// kept for App.tsx imports
export const BRAND_NAME = 'Awshaf Ishtiaque'
export const ALICE_QUOTE =
  'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, \u201cand what is the use of a book,\u201d thought Alice \u201cwithout pictures or conversations?\u201d'

const DEFAULTS = {
  type: 'text' as const,
  category: 'doodle' as const,
  jitter: 'none' as const,
  pinned: true,
}

// ═══════════════════════════════════════════════════════════
// 4 Reflow Paragraphs, RIGHT of notebook (x: 25)
//   - rf-1, rf-2 → DRAGGABLE  (pinned: false, fontWeight: 700 → whole para bold)
//   - rf-3, rf-4 → PINNED     (pinned: true,  fontWeight: 400)
// Each para's leading words tell its status: "DRAG ME —" vs "PINNED —"
// ═══════════════════════════════════════════════════════════
export const DOODLES: EntityDef[] = [
  // ── CLUSTER 1 (Plain Text) — HIDDEN ──
  // ── CLUSTER 2 (Thought) — HIDDEN ──

  // ── Row 1 — DRAGGABLE ──
  { id: 'rf-1', x: 25, y: 17, rotate: -5,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '700',
    color: '#2a2520', opacity: 0.9,
    content: 'DRAG ME — I can be dragged around the canvas. The deadline still reflows me wherever I land.',
    maxWidth: 340,
    ...DEFAULTS,
    pinned: false,   // ← draggable override
  },

  // ── Row 2 — DRAGGABLE ──
  { id: 'rf-2', x: 25, y: 20, rotate: -7,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '700',
    color: '#2a2520', opacity: 0.9,
    content: 'DRAG ME — Pick me up anywhere. The text inside still obeys the red obstacles nearby.',
    maxWidth: 340,
    ...DEFAULTS,
    pinned: false,   // ← draggable override
  },

  // ── Row 3 — PINNED ──
  { id: 'rf-3', x: 25, y: 23, rotate: -4,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'PINNED — I stay here. Only obstacles placed over me can change my layout.',
    maxWidth: 340,
    ...DEFAULTS,
    // pinned: true (inherited from DEFAULTS)
  },

  // ── Row 4 — PINNED ──
  { id: 'rf-4', x: 25, y: 26, rotate: -6,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'PINNED — Locked in place. Drag a red word onto me to watch the lines reflow.',
    maxWidth: 340,
    ...DEFAULTS,
    // pinned: true (inherited from DEFAULTS)
  },
]
