import type {
  ActionKey, CameraSpec, EntityBehavior, EntityDef, GuardKey, JitterType, RevealSource,
} from '../types'

// ═══════════════════════════════════════════════════════════
// Entity factories — one per category/variant. Each factory
// returns a fully-formed EntityDef: every column present, with
// an explicit default where it does not apply (docs/architecture
// .md §2, principle 2). Per-instance fields (position, content,
// overrides) are the explicit arguments; behaviour flags are
// options so instances of one type can diverge cleanly.
//
// To add a new instance: call the matching factory with the
// fields that differ. To add a new variant: extend the options
// here rather than duplicating field blocks in the data files.
// ═══════════════════════════════════════════════════════════

// Shared shape for per-instance style / behavior overrides.
// Any factory accepts these; they let individual entities
// diverge without introducing a new type-level flag.
type StyleOverrides = {
  font?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  opacity?: number
  rotate?: number
  jitter?: JitterType
  /** Extra className appended to the entity's root element. */
  className?: string
  /** Inline style merged onto the entity's root element. */
  style?: React.CSSProperties
}

// Reveal & click inputs — accepted by EVERY factory, all optional at the
// call site. `normalizeBehavior` turns them into the required, fully-populated
// `EntityBehavior` block. Single strings are accepted where lists are stored.
type BehaviorInput = {
  triggerId?: string
  revealedBy?: RevealSource | RevealSource[]
  clickable?: boolean
  onClickAction?: ActionKey | ActionKey[]
  enabledWhen?: GuardKey | null
  onReveal?: ActionKey | ActionKey[]
  camera?: CameraSpec | null
  tabOrder?: number | null
}

function toList<T>(v: T | T[] | undefined, fallback: T[]): T[] {
  if (v === undefined) return fallback
  return Array.isArray(v) ? [...v] : [v]
}

export function normalizeBehavior(id: string, b: BehaviorInput): EntityBehavior {
  return {
    triggerId: b.triggerId ?? id,
    revealedBy: toList(b.revealedBy, ['static']),
    clickable: b.clickable ?? false,
    onClickAction: toList(b.onClickAction, []),
    enabledWhen: b.enabledWhen ?? null,
    onReveal: toList(b.onReveal, []),
    camera: b.camera ?? null,
    tabOrder: b.tabOrder ?? null,
  }
}

type Positional = { id: string; x: number; y: number } & BehaviorInput

// Every non-behaviour column with its "does not apply" value. Factories lay
// their category defaults over this, then the call-site input, then the
// normalized behaviour block — so a row always has every column.
const CORE_DEFAULTS = {
  content: '',
  maxWidth: null,
  componentId: null,
  fixed: false,
  obstacle: false,
  obstacleW: null,
  obstacleH: null,
  imgSrc: null,
  imgW: null,
  imgH: null,
  blendMultiply: false,
  handwritingSrc: null,
  playbackSpeed: 1,
  jitter: 'none' as JitterType,
  pinned: true,
  motionDraggable: false,
  showPosition: false,
  className: '',
  style: null,
  width: null,
  height: null,
  hoverSrc: null,
  pressSrc: null,
  postClickSrc: null,
  hoverScale: 1.05,
  pressScale: 0.95,
  hoverFilter: null,
  hoverSound: null,
  clickSound: null,
} satisfies Partial<EntityDef>

/** Drop keys whose value is `undefined` so they cannot override a default. */
function compact<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

type CategoryDefaults = Pick<EntityDef, 'type' | 'category' | 'rotate' | 'font' | 'fontSize' | 'fontWeight' | 'color' | 'opacity'>
  & Partial<EntityDef>

/**
 * Assemble a full row: core defaults ← category defaults ← call-site input
 * ← normalized behaviour. Behaviour keys in `input` are consumed by
 * normalizeBehavior (they may be single strings there), never spread raw.
 */
function finish(
  categoryDefaults: CategoryDefaults,
  input: { id: string } & BehaviorInput & Record<string, unknown>,
): EntityDef {
  const {
    triggerId: _t, revealedBy: _r, clickable: _c, onClickAction: _a,
    enabledWhen: _e, onReveal: _o, camera: _m, tabOrder: _b,
    ...rest
  } = input
  void _t; void _r; void _c; void _a; void _e; void _o; void _m; void _b
  return {
    ...CORE_DEFAULTS,
    ...categoryDefaults,
    ...compact(rest),
    ...normalizeBehavior(input.id, input),
  } as EntityDef
}

// ── Doodle (plain static label) ─────────────────────────────
type DoodleInput = Positional & StyleOverrides & {
  content: string
  /** Optional width constraint — presence turns this into a reflow paragraph. */
  maxWidth?: number
  pinned?: boolean
}

export function doodle(input: DoodleInput): EntityDef {
  return finish({
    type: 'text',
    category: 'doodle',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '1rem',
    fontWeight: '400',
    color: '#2a2520',
    opacity: 0.9,
    pinned: input.pinned ?? true,
  }, input)
}

// ── Reflow paragraph (doodle variant) ───────────────────────
type ReflowInput = Positional & StyleOverrides & {
  content: string
  maxWidth: number
  /** Draggable paragraph renders bold and is not pinned. */
  draggable?: boolean
}

export function reflowParagraph(input: ReflowInput): EntityDef {
  const { draggable = false, ...rest } = input
  return finish({
    type: 'text',
    category: 'doodle',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '1.25rem',
    fontWeight: draggable ? '700' : '400',
    color: draggable ? '#2a2520' : '#3a3530',
    opacity: draggable ? 0.9 : 0.85,
    pinned: !draggable,
  }, rest)
}

// ── Accent (animated bold word OR header emoji) ─────────────
type AccentInput = Positional & StyleOverrides & {
  content: string
}

export function accent(input: AccentInput): EntityDef {
  return finish({
    type: 'text',
    category: 'accent',
    rotate: 0,
    font: '"Permanent Marker", cursive',
    fontSize: '2rem',
    fontWeight: '700',
    color: '#c83030',
    opacity: 0.9,
    jitter: 'wobble',
    pinned: true,
  }, input)
}

export function emojiAccent(input: AccentInput): EntityDef {
  return finish({
    type: 'text',
    category: 'accent',
    rotate: 0,
    font: 'system-ui',
    fontSize: '2.2rem',
    fontWeight: '400',
    color: '#3a3530',
    opacity: 0.9,
    pinned: true,
  }, input)
}

// ── Watermark (huge faded background label) ─────────────────
type WatermarkInput = Positional & StyleOverrides & {
  content: string
}

export function watermark(input: WatermarkInput): EntityDef {
  return finish({
    type: 'text',
    category: 'watermark',
    rotate: 0,
    font: '"Permanent Marker", cursive',
    fontSize: '10rem',
    fontWeight: '700',
    color: '#3a3530',
    opacity: 0.1,
    jitter: 'pulse',
    pinned: true,
  }, input)
}

// ── Image (SVG / PNG doodle) ────────────────────────────────
type ImageInput = Positional & StyleOverrides & {
  imgSrc: string
  imgW: number
  imgH: number
  blendMultiply?: boolean
  /** Can double as an obstacle — set all three to enable. */
  obstacle?: boolean
  obstacleW?: number
  obstacleH?: number
  pinned?: boolean
}

export function image(input: ImageInput): EntityDef {
  return finish({
    type: 'text',
    category: 'image',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    pinned: input.pinned ?? true,
  }, input)
}

// ── Handwriting (animated stroke-capture JSON — ink-studio export) ──
//   Renders with `<HandwrittenEntry>`, which replays pen strokes from a
//   JSON file (produced by the ink-studio tool). Behaves like an image:
//   pinned by default, no collision, no reflow. Sized via width/height.
//   Whether it animates on load or waits for the chain is `revealedBy`:
//     'load'            → draws itself on page load
//     'manual'          → hidden until something calls play() imperatively
//     'click:<id>' etc. → hidden until revealed by the chain
type HandwritingInput = Positional & StyleOverrides & {
  src: string        // path to the JSON (usually under /handwriting/)
  width: number      // on-canvas pixel width
  // Optional. Omit to let the slot's height auto-derive from the JSON's
  // intrinsic aspect ratio at render time — preferred so the slot always
  // matches the drawing without per-file tuning. Set explicitly only when
  // you need precise camera framing (focus math reads imgH).
  height?: number
  pinned?: boolean
  /** Playback speed multiplier (default: 1). */
  playbackSpeed?: number
}

export function handwriting(input: HandwritingInput): EntityDef {
  const { src, width, height, ...rest } = input
  return finish({
    type: 'text',
    category: 'image',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    pinned: input.pinned ?? true,
    handwritingSrc: src,
    imgW: width,
    imgH: height ?? null,
  }, rest)
}

// ── Obstacle (red handwritten word with text reflow) ────────
type ObstacleInput = Positional & StyleOverrides & {
  content: string
  obstacleW: number
  obstacleH: number
  /** Use the framer-motion renderer (spring entrance, inertia decay). */
  motion?: boolean
}

export function obstacle(input: ObstacleInput): EntityDef {
  const { motion = true, ...rest } = input
  return finish({
    type: 'text',
    category: 'obstacle',
    rotate: 0,
    font: '"Permanent Marker", cursive',
    fontSize: '2rem',
    fontWeight: '400',
    color: '#c83030',
    opacity: 0.9,
    pinned: false,
    obstacle: true,
    motionDraggable: motion,
  }, rest)
}

// ── Image-based obstacle (rocket SVG etc.) ──────────────────
type ImageObstacleInput = Positional & StyleOverrides & {
  imgSrc: string
  imgW: number
  imgH: number
  obstacleW: number
  obstacleH: number
  motion?: boolean
}

export function imageObstacle(input: ImageObstacleInput): EntityDef {
  const { motion = true, ...rest } = input
  return finish({
    type: 'text',
    category: 'obstacle',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    pinned: false,
    obstacle: true,
    motionDraggable: motion,
  }, rest)
}

// ── Section (bordered block hosting a React component) ──────
type SectionInput = Positional & StyleOverrides & {
  componentId: string
}

export function section(input: SectionInput): EntityDef {
  return finish({
    type: 'component',
    category: 'section',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '2rem',
    fontWeight: '400',
    color: '#3a3530',
    opacity: 1,
    pinned: true,
    content: input.componentId,
  }, input)
}

// ── Button (interactive SVG/raster button with state machine) ──
//   Hover → optional pressSrc + scale. Click → runs the shared
//   `onClickAction` to-do list (e.g. ['fn:master-play']) and locks into a
//   one-shot post-click state. All visual states are optional asset swaps;
//   when absent the button uses transform-only feedback (scale / filter).
//   Buttons are always clickable.
type ButtonInput = Positional & StyleOverrides & {
  imgSrc: string
  imgW: number
  imgH: number
  hoverSrc?: string
  pressSrc?: string
  postClickSrc?: string
  hoverScale?: number
  pressScale?: number
  hoverFilter?: string
  hoverSound?: string
  clickSound?: string
}

export function button(input: ButtonInput): EntityDef {
  return finish({
    type: 'text',
    category: 'button',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    pinned: true,
  }, { ...input, clickable: true })
}

// ── Widget (large click-to-activate block) ──────────────────
type WidgetInput = Positional & StyleOverrides & {
  content: string
  /** Optional custom size (defaults to WIDGET_DEFAULT from sizes.ts). */
  obstacleW?: number
  obstacleH?: number
}

export function widget(input: WidgetInput): EntityDef {
  return finish({
    type: 'text',
    category: 'widget',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#c83030',
    opacity: 1,
    pinned: false,
  }, input)
}
