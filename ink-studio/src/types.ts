// ═══════════════════════════════════════════════════════════
// Shared data types — also the on-disk JSON format for exported
// strokes. Consumed by the portfolio's future player component.
// Keep the field names stable once you start saving files.
// ═══════════════════════════════════════════════════════════

export type Point = {
  x: number          // local SVG coord
  y: number
  p: number          // pressure 0–1 (0.5 for non-pressure devices)
  t: number          // ms since stroke start
  tiltX?: number     // –90 … 90, pen tilt left/right
  tiltY?: number     // –90 … 90, pen tilt up/down
}

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'

export type StrokeOptions = {
  size: number
  thinning: number     // -1 … 1
  smoothing: number    //  0 … 1
  streamline: number   //  0 … 1
  easing: EasingName
  taperStart: number   //  0 … size (px)
  taperEnd: number
  capStart: boolean
  capEnd: boolean
}

export type StoredStroke = {
  points: Point[]
  options: StrokeOptions
  color: string         // fill (the ink body)
  outlineColor: string  // stroke around the body (only visible when outlineWidth > 0)
  outlineWidth: number
  opacity?: number      // 0–1, applies to both fill and outline. Optional for
                        // backwards compat — readers default to 1 when absent.
  startedAt: number     // absolute epoch ms, for restoring cross-stroke timing
}

export type Drawing = {
  version: 1
  createdAt: string     // ISO
  width: number         // stage width when drawn
  height: number
  strokes: StoredStroke[]
}
