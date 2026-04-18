import type { EntityDef, JitterType } from '../types'

// ═══════════════════════════════════════════════════════════
// Entity factories — one per category/variant. Each factory
// returns a fully-formed EntityDef with sensible defaults.
// Per-instance fields (position, content, overrides) are the
// explicit arguments; behavior flags (pinned, draggable,
// motion) are expressed as options so different instances of
// the same type can diverge cleanly.
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

type Positional = { id: string; x: number; y: number }

// ── Doodle (plain static label) ─────────────────────────────
type DoodleInput = Positional & StyleOverrides & {
  content: string
  /** Optional width constraint — presence turns this into a reflow paragraph. */
  maxWidth?: number
  pinned?: boolean
}

export function doodle(input: DoodleInput): EntityDef {
  return {
    type: 'text',
    category: 'doodle',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '1rem',
    fontWeight: '400',
    color: '#2a2520',
    opacity: 0.9,
    jitter: 'none',
    pinned: input.pinned ?? true,
    ...input,
  }
}

// ── Reflow paragraph (doodle variant) ───────────────────────
type ReflowInput = Positional & StyleOverrides & {
  content: string
  maxWidth: number
  /** Draggable paragraph renders bold and is not pinned. */
  draggable?: boolean
}

export function reflowParagraph(input: ReflowInput): EntityDef {
  const draggable = input.draggable ?? false
  return {
    type: 'text',
    category: 'doodle',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '1.25rem',
    fontWeight: draggable ? '700' : '400',
    color: draggable ? '#2a2520' : '#3a3530',
    opacity: draggable ? 0.9 : 0.85,
    jitter: 'none',
    pinned: !draggable,
    ...input,
  }
}

// ── Accent (animated bold word OR header emoji) ─────────────
type AccentInput = Positional & StyleOverrides & {
  content: string
}

export function accent(input: AccentInput): EntityDef {
  return {
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
    ...input,
  }
}

export function emojiAccent(input: AccentInput): EntityDef {
  return {
    type: 'text',
    category: 'accent',
    rotate: 0,
    font: 'system-ui',
    fontSize: '2.2rem',
    fontWeight: '400',
    color: '#3a3530',
    opacity: 0.9,
    jitter: 'none',
    pinned: true,
    ...input,
  }
}

// ── Watermark (huge faded background label) ─────────────────
type WatermarkInput = Positional & StyleOverrides & {
  content: string
}

export function watermark(input: WatermarkInput): EntityDef {
  return {
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
    ...input,
  }
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
  return {
    type: 'text',
    category: 'image',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    jitter: 'none',
    pinned: input.pinned ?? true,
    blendMultiply: false,
    ...input,
  }
}

// ── Handwriting (animated stroke-capture JSON — ink-studio export) ──
//   Renders with `<HandwrittenEntry>`, which replays pen strokes from a
//   JSON file (produced by the ink-studio tool). Behaves like an image:
//   pinned by default, no collision, no reflow. Sized via width/height.
type HandwritingInput = Positional & StyleOverrides & {
  src: string        // path to the JSON (usually under /handwriting/)
  width: number      // on-canvas pixel width
  height: number
  pinned?: boolean
  /** Replay the writing animation on mount (default: false → static). */
  autoplay?: boolean
  /** Playback speed multiplier (default: 1). */
  playbackSpeed?: number
}

export function handwriting(input: HandwritingInput): EntityDef {
  const { src, width, height, pinned, ...rest } = input
  return {
    type: 'text',
    category: 'image',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    jitter: 'none',
    pinned: pinned ?? true,
    handwritingSrc: src,
    imgW: width,
    imgH: height,
    ...rest,
  }
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
  const motion = input.motion ?? true
  return {
    type: 'text',
    category: 'obstacle',
    rotate: 0,
    font: '"Permanent Marker", cursive',
    fontSize: '2rem',
    fontWeight: '400',
    color: '#c83030',
    opacity: 0.9,
    jitter: 'none',
    pinned: false,
    obstacle: true,
    motionDraggable: motion,
    ...input,
  }
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
  const motion = input.motion ?? true
  return {
    type: 'text',
    category: 'obstacle',
    rotate: 0,
    font: '',
    fontSize: '',
    fontWeight: '400',
    color: '',
    opacity: 1,
    jitter: 'none',
    content: '',
    pinned: false,
    obstacle: true,
    motionDraggable: motion,
    ...input,
  }
}

// ── Section (bordered block hosting a React component) ──────
type SectionInput = Positional & StyleOverrides & {
  componentId: string
}

export function section(input: SectionInput): EntityDef {
  return {
    type: 'component',
    category: 'section',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '2rem',
    fontWeight: '400',
    color: '#3a3530',
    opacity: 1,
    jitter: 'none',
    pinned: true,
    content: input.componentId,
    ...input,
  }
}

// ── Widget (large click-to-activate block) ──────────────────
type WidgetInput = Positional & StyleOverrides & {
  content: string
  /** Optional custom size (defaults to WIDGET_DEFAULT from sizes.ts). */
  obstacleW?: number
  obstacleH?: number
}

export function widget(input: WidgetInput): EntityDef {
  return {
    type: 'text',
    category: 'widget',
    rotate: 0,
    font: '"Patrick Hand", cursive',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#c83030',
    opacity: 1,
    jitter: 'none',
    pinned: false,
    ...input,
  }
}
