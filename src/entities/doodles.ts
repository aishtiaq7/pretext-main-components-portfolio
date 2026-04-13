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
// CLUSTER LAYOUT — each render type packed tight, left → right
// ═══════════════════════════════════════════════════════════
//
//   x:  3       14         30-49        50       72-78     80       90
//   ────┬───────┬──────────┬────────────┬────────┬────────┬───────┬─────
//       │       │          │            │        │        │       │
//    ┌──┤CLUSTER│CLUSTER 2 │ NOTEBOOK   │CLUSTER │ CUBE + │CLSTR 4│CLSTR 5
//    │  │   1   │          │ (page —    │   3    │ RABBIT │ Emoji │ Red
//    │  │ Plain │ Thought  │  clock-    │ Reflow │ HOLE   │       │ Obstacle
//    │  │ Text  │ (2)      │  page)     │ Para   │ (pages)│ (3)   │ (3)
// y=18──┤  (3)  │          │            │  (3)   │        │       │
//    │  ├───────┤          │            ├────────┤        │       │
// y=22├──┼───────┤          │            │        │        │       │
//    │  │       │          │            │        │        │       │
// y=26├──┼───────┼──────────┤            ├────────┤        │       │
//
// (Emojis live in accents.ts; obstacles in obstacles.ts; sections in sections.ts)
//
export const DOODLES: EntityDef[] = [
  // ── CLUSTER 1 — Plain Text (x: 3, 3 items stacked) ───────
  { id: 'pt-1', x: 3, y: 18, rotate: -2,
    font: '"Permanent Marker", cursive', fontSize: '2.2rem', fontWeight: '400',
    color: '#2a2520', opacity: 0.85, content: BRAND_NAME,
    ...DEFAULTS },
  { id: 'pt-2', x: 3, y: 22, rotate: 1,
    font: '"Permanent Marker", cursive', fontSize: '2rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.75, content: 'FULL STACK',
    ...DEFAULTS },
  { id: 'pt-3', x: 3, y: 26, rotate: -1,
    font: '"JetBrains Mono", monospace', fontSize: '1.4rem', fontWeight: '400',
    color: '#5a8a5a', opacity: 0.7, content: 'const life = () => code()',
    ...DEFAULTS },

  // ── CLUSTER 2 — Thought (x: 14, 2 items stacked) ─────────
  { id: 'th-1', x: 14, y: 18, rotate: -2,
    font: '"Satisfy", cursive', fontSize: '1.8rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.78, content: 'I think in components',
    ...DEFAULTS },
  { id: 'th-2', x: 14, y: 24, rotate: 2,
    font: '"Satisfy", cursive', fontSize: '1.8rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.78, content: 'dream in keyframes',
    ...DEFAULTS },

  // ── CLUSTER 3 — Reflow Paragraph (x: 50, 3 items side-by-side) ──
  // Red obstacles can be dragged onto any of these to trigger reflow.
  { id: 'rf-1', x: 50, y: 18, rotate: 0,
    font: '"Patrick Hand", cursive', fontSize: '1.2rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.82,
    content: 'Drop a red word here — lines bend around the obstacle like water around a stone.',
    maxWidth: 180,
    ...DEFAULTS },
  { id: 'rf-2', x: 55, y: 18, rotate: 0,
    font: '"Patrick Hand", cursive', fontSize: '1.2rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.82,
    content: 'Every obstacle reshapes the paragraph. Deadlines act like gravity wells in text.',
    maxWidth: 180,
    ...DEFAULTS },
  { id: 'rf-3', x: 60, y: 18, rotate: 0,
    font: '"Patrick Hand", cursive', fontSize: '1.2rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.82,
    content: 'Scope creep warps the layout. The text itself has to respect the red words.',
    maxWidth: 180,
    ...DEFAULTS },
]
