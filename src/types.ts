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
}

export type FixedRegion = {
  id: string
  x: number
  y: number
  w: number
  h: number
}
