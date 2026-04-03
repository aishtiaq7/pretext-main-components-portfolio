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
