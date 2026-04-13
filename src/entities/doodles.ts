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
  { id: 'rf-1', x: 30, y: 17, rotate: -5,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '700',
    color: '#2a2520', opacity: 0.9,
    content: 'DRAG ME — I can be dragged around the canvas and the red obstacles still reflow me wherever I land. Grab my body anywhere within my bounds and drop me somewhere else on the notebook canvas. As you drag me across the page the red obstacles near my new position continue to warp my text lines in real time, bending every line that happens to intersect their elliptical carve. The layout engine does not care about my absolute coordinates on the canvas; it only cares about what is inside my bounding box at every frame. Move me quickly and the text rewraps as fast as the browser can repaint. Move me slowly and you can watch each line find its new home character by character. My font weight is seven hundred, which means every glyph is slightly bolder than the pinned paragraphs below me. The reflow measurement finally accounts for bold weight, so slots align with rendered characters and nothing splits letter by letter anymore. Pick me up, place me anywhere, and watch the whole neighborhood of text respond to my arrival or departure.',
    maxWidth: 340,
    ...DEFAULTS,
    pinned: false,   // ← draggable override
  },

  // ── Row 2 — DRAGGABLE ──
  { id: 'rf-2', x: 30, y: 32, rotate: -7,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '700',
    color: '#2a2520', opacity: 0.9,
    content: 'DRAG ME — Pick me up anywhere inside my bounds. The text inside me still obeys the red obstacles nearby while I move around the canvas. Drop me on top of a pinned paragraph and that paragraph\u2019s lines will bend around my rectangular body while I am being held. Release me and I become invisible to the other paragraphs again; they snap back to their original layout because paragraphs only count as obstacles for each other during an active drag. This keeps the canvas calm when nobody is interacting with it. The ASAP word to my left is an ellipse obstacle. It wraps my lines differently than another paragraph would, with curved edges instead of straight ones. Drag me across ASAP and watch the wrap shape change as my pointer moves through the zone where ASAP\u2019s ellipse intersects my text baseline. Everything responds in one frame, continuously, with no easing. The engine is honest about what it is computing: each band, each slot, each line.',
    maxWidth: 340,
    ...DEFAULTS,
    pinned: false,   // ← draggable override
  },

  // ── Row 3 — PINNED ──
  { id: 'rf-3', x: 30, y: 47, rotate: -4,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'PINNED — I stay here because I am pinned, and only the red obstacles placed over me can change my layout. I am rendered in regular weight, not bold, because I am not going anywhere and do not need to signal urgency to the reader. My body is the same width as my draggable siblings above, three hundred forty pixels, which lets a paragraph dropped on top of me wrap cleanly without leaving tiny slivers on either side of the carve. The red words near me can still slide onto my body and reshape my lines. So can the currently dragged reflow paragraph from rf-1 or rf-2 when the user chooses to test the paragraph-as-obstacle feature. My purpose is to be a static counterpoint to the draggable ones so the portfolio reader can see both states side by side. Pinning me is a runtime toggle; change my pinned flag to false and I become draggable like the others with no other code change required anywhere in the project.',
    maxWidth: 340,
    ...DEFAULTS,
    // pinned: true (inherited from DEFAULTS)
  },

  // ── Row 4 — PINNED ──
  { id: 'rf-4', x: 30, y: 62, rotate: -6,
    font: '"Patrick Hand", cursive', fontSize: '1.25rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85,
    content: 'PINNED — Locked in place. Drag a red word onto me to watch the lines reflow around it. I behave identically to the paragraph above me except I am the last in the series, giving the bottom of the column a natural terminus for the reader\u2019s eye. The engine computes new line-break positions every frame, so as you drag the red word my layout shifts continuously until the word is released. I am static, but my rendered shape is not. This page is a live medium, responding to every gesture the user makes. You can relocate me by editing my y coordinate in the doodles data file, since my x currently stays at twenty-five by convention. The assumption that paragraphs live in a column, one per row, is just convention, not a constraint of the system. Drop any red word on top of me and watch the ellipse carve my lines into a graceful arc around it, left side, right side, or directly through the middle of my paragraph body.',
    maxWidth: 340,
    ...DEFAULTS,
    // pinned: true (inherited from DEFAULTS)
  },
]
