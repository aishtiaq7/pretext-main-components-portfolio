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
// 3 Reflow Paragraphs at x: 38 — doubled size (wider maxWidth + bigger font).
// y: 30.5 / 42 / 58 — aligned with sections on the left.
// ═══════════════════════════════════════════════════════════
export const DOODLES: EntityDef[] = [
  // ── CLUSTER 1 (Plain Text) — HIDDEN ──
  // { id: 'pt-1', x: 28, y: 18, rotate: -18, font: '"Permanent Marker", cursive', fontSize: '2.2rem', fontWeight: '400', color: '#2a2520', opacity: 0.85, content: BRAND_NAME, ...DEFAULTS },
  // { id: 'pt-2', x: 28, y: 22, rotate: -22, font: '"Permanent Marker", cursive', fontSize: '2rem', fontWeight: '400', color: '#4a4540', opacity: 0.75, content: 'FULL STACK', ...DEFAULTS },
  // { id: 'pt-3', x: 28, y: 26, rotate: -14, font: '"JetBrains Mono", monospace', fontSize: '1.4rem', fontWeight: '400', color: '#5a8a5a', opacity: 0.7, content: 'const life = () => code()', ...DEFAULTS },

  // ── CLUSTER 2 (Thought) — HIDDEN ──
  // { id: 'th-1', x: 40, y: 18, rotate: -20, font: '"Satisfy", cursive', fontSize: '1.8rem', fontWeight: '400', color: '#4a4540', opacity: 0.78, content: 'I think in components', ...DEFAULTS },
  // { id: 'th-2', x: 40, y: 22, rotate: -16, font: '"Satisfy", cursive', fontSize: '1.8rem', fontWeight: '400', color: '#4a4540', opacity: 0.78, content: 'dream in keyframes', ...DEFAULTS },

  // ── CLUSTER 3 — Reflow Paragraphs (3, doubled-size, aligned with sections) ──
  { id: 'rf-1', x: 38, y: 30.5, rotate: -6,
    font: '"Patrick Hand", cursive', fontSize: '1.6rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'When deadlines loom, the paragraph bends around the word. Drop the red obstacle on this text and watch the lines rewrap in real time as you drag. Every character finds a new home, respecting the boundaries imposed by the intruder. The layout here is alive and breathing; it treats every red word as a physical force on the page.',
    maxWidth: 550,
    ...DEFAULTS },
  { id: 'rf-2', x: 38, y: 42, rotate: -8,
    font: '"Patrick Hand", cursive', fontSize: '1.6rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'Every obstacle you add becomes a force. The text respects gravity, wrapping around whatever red word gets in its way at the moment you look. The page is not paper — it is a living medium that adapts to the objects placed upon it. Nothing here is static, and every movement triggers the engine to recompute line breaks.',
    maxWidth: 550,
    ...DEFAULTS },
  { id: 'rf-3', x: 38, y: 61, rotate: -5,
    font: '"Patrick Hand", cursive', fontSize: '1.6rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'Scope creep warps the plan like a heavy stone warps paper. Paragraphs adapt to the dropped obstacle and reshape themselves line by line, rebalancing word weights as the obstacle moves. The layout is never finished — it is always responding to what you drag onto it, continuously, frame by frame.',
    maxWidth: 550,
    ...DEFAULTS },
]
