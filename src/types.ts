export type Interval = {
  left: number
  right: number
}

export type CircleObs = {
  cx: number
  cy: number
  r: number
  hPad: number
  vPad: number
}

export type TextLine = {
  x: number
  y: number
  text: string
  width: number
}

export type Orb = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  color: readonly [number, number, number]
  label: string
  paused: boolean
  dragging: boolean
  dragStartX: number
  dragStartY: number
  dragStartOrbX: number
  dragStartOrbY: number
  frozenScrollY: number
}

export type OrbDef = {
  fx: number
  fy: number
  r: number
  vx: number
  vy: number
  color: readonly [number, number, number]
  label: string
}

export type Stats = {
  lines: number
  reflow: string
  fps: number
  cols: number
}

// ═══════════════════════════════════════════════════════════
// ENTITY CATEGORIES
// ═══════════════════════════════════════════════════════════
export type EntityCategory =
  | 'doodle'      // scattered text — tags, snippets, quotes, decorative
  | 'obstacle'    // red draggable text — causes text reflow
  | 'accent'      // bold punchy words — animated jitter, click-to-freeze
  | 'watermark'   // large faint background text — pinned, slow pulse
  | 'image'       // SVG doodle images — subtle drift
  | 'section'     // block sections — pinnable, overflow hidden, photo galleries
  | 'widget'      // large draggable blocks — click to activate, pushes entities
  | 'button'      // interactive SVG/raster button — hover/press/post-click states, click action

export type JitterType =
  | 'none'        // no animation
  | 'wobble'      // rotation oscillation
  | 'drift'       // slow positional float
  | 'pulse'       // font-size breathing
  | 'wobble-drift' // combined

// ═══════════════════════════════════════════════════════════
// REVEAL & CLICK VOCABULARY — see docs/architecture.md §3
// Short strings with a fixed grammar, parsed once at startup by
// src/entities/reveal.ts and checked by src/entities/validate.ts.
// ═══════════════════════════════════════════════════════════

/**
 * How an entity appears.
 *   'static'              visible from the start, already finished
 *   'load'                visible from the start, animates on mount
 *   'load +2s'            hidden, then revealed 2 s after startup
 *   'manual'              hidden until something calls play() imperatively
 *   'click:<triggerId>'   hidden until that entity is clicked
 *   'done:<triggerId> +3s' hidden until that entity finishes (+ optional delay)
 */
export type RevealSource = string

/**
 * One item of a to-do list.
 *   'trigger:<triggerId>' | 'link:<url>' | 'pan:<triggerId>' | 'sfx:<path>'
 *   'fn:<name>' | 'set:<flag>'
 */
export type ActionKey = string

/**
 * A rule checked before a click's to-do list runs.
 *   'after:<triggerId>' | 'flag:<name>' | 'noflag:<name>' | 'zoomMin:<n>' | 'once'
 */
export type GuardKey = string

/** Pan/zoom the viewport to the entity when it is revealed. */
export type CameraSpec = {
  zoom: number
  /** seconds; default 1.2 */
  panDuration?: number
}

/**
 * Behaviour fields present on EVERY entity (normalized by the factories, so a
 * row always has every column — unused ones hold their explicit default).
 */
export type EntityBehavior = {
  /** Name in the phone book (store/triggers). Defaults to `id`. */
  triggerId: string
  /** Every way this entity can appear; the first to fire wins. Default ['static']. */
  revealedBy: RevealSource[]
  /** Painted pixels catch clicks once the entity has finished appearing. Default false. */
  clickable: boolean
  /** To-do list run on click. Default []. */
  onClickAction: ActionKey[]
  /** Optional rule checked before onClickAction runs. Default null. */
  enabledWhen: GuardKey | null
  /** To-do list run when the entity is revealed. Default []. */
  onReveal: ActionKey[]
  /** Camera move on reveal. Default null. */
  camera: CameraSpec | null
  /** When set, keyboard-focusable in this order. Default null (no Tab stop). */
  tabOrder: number | null
}

// ═══════════════════════════════════════════════════════════
// ENTITY ROW — every field is present on every entity. Fields
// that do not apply to a category hold their explicit default
// (null / false / '' / 1), the way every row in a table has every
// column. Factories (entities/factories.ts) fill the defaults;
// authoring inputs stay optional at the call site.
// ═══════════════════════════════════════════════════════════
export type EntityDef = EntityBehavior & {
  id: string
  category: EntityCategory
  type: 'text' | 'component'
  x: number
  y: number
  rotate: number
  font: string
  fontSize: string
  fontWeight: string
  color: string
  opacity: number

  /** Text content. '' when the entity is not text-based. */
  content: string
  /** Width constraint in px; presence turns a doodle into a reflow paragraph. */
  maxWidth: number | null
  /** Section component id ('about-block', 'photo-gallery'). */
  componentId: string | null
  fixed: boolean
  obstacle: boolean       // red draggable obstacle — text reflows around it
  obstacleW: number | null // bounding box width in px (including padding)
  obstacleH: number | null // bounding box height in px (including padding)
  imgSrc: string | null   // image path (SVG/PNG/GIF) — renders <img> instead of text
  imgW: number | null     // display width in px
  imgH: number | null     // display height in px (null = derive from aspect ratio)
  blendMultiply: boolean  // mix-blend-mode: multiply — blends white out for sketch JPGs
  handwritingSrc: string | null // stroke-capture JSON (ink-studio export)
                                //   → renders <HandwrittenEntry> instead of <img>
                                //   sized via imgW / imgH (same as image variant)
  playbackSpeed: number   // handwriting: replay speed multiplier (1 = recorded pace)
  // (Whether a handwriting entity animates on load or waits to be revealed is
  //  expressed by `revealedBy` — 'load' vs 'manual' / 'click:…' / 'done:…'.)

  jitter: JitterType      // animation type ('none' = static)
  pinned: boolean         // true → pin icon, not draggable
  motionDraggable: boolean // true → rendered via MotionObstacle (framer-motion polish)
  showPosition: boolean   // MotionObstacle only — overlay live x/y readout

  // ── Per-instance visual overrides ──
  // Let individual entities diverge from their factory defaults without
  // introducing new category-level flags. Append to the root element's
  // className / merge into its inline style.
  className: string
  style: React.CSSProperties | null

  // Per-instance pixel-size override (sections & widgets).
  // null → the default from `src/entities/sizes.ts`.
  width: number | null
  height: number | null

  // ── Button visuals (category === 'button') ──
  // imgSrc / imgW / imgH carry the idle visual. The *Src fields are optional
  // asset swaps — when null the button uses transform-only feedback.
  hoverSrc: string | null
  pressSrc: string | null
  postClickSrc: string | null
  hoverScale: number           // 1.05
  pressScale: number           // 0.95
  hoverFilter: string | null   // CSS filter on hover (e.g. 'brightness(1.1)')
  hoverSound: string | null    // file path
  clickSound: string | null
  // (The click's to-do list is the shared `onClickAction` above.)
}

export type FixedRegion = {
  id: string
  x: number
  y: number
  w: number
  h: number
}
