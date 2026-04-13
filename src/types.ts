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

export type JitterType =
  | 'none'        // no animation
  | 'wobble'      // rotation oscillation
  | 'drift'       // slow positional float
  | 'pulse'       // font-size breathing
  | 'wobble-drift' // combined

export type EntityDef = {
  id: string
  x: number
  y: number
  rotate: number
  font: string
  fontSize: string
  fontWeight: string
  color: string
  opacity: number
  content?: string
  maxWidth?: number
  type: 'text' | 'component'
  componentId?: string
  fixed?: boolean
  obstacle?: boolean     // red draggable obstacle — text reflows around it
  obstacleW?: number     // bounding box width in px (including padding)
  obstacleH?: number     // bounding box height in px (including padding)
  imgSrc?: string        // image path (SVG/PNG/GIF) — renders <img> instead of text
  imgW?: number          // display width in px
  imgH?: number          // display height in px

  // ── New fields ──
  category: EntityCategory
  jitter?: JitterType     // animation type (default: 'none')
  pinned?: boolean        // if true, shows pin icon, not draggable
}

export type FixedRegion = {
  id: string
  x: number
  y: number
  w: number
  h: number
}
