import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Drawing, EasingName } from '../../ink-studio/src/types'

// ═══════════════════════════════════════════════════════════
// HandwrittenEntry — plays back stroke-capture JSON exported
// from `ink-studio`. Paths render with perfect-freehand so
// pressure/tilt produce the ink body; absolute timestamps
// reproduce the original writing rhythm (pauses included).
//
// Imperative handle (via ref):
//   play()   — restart the writing animation from progress 0
//   pause()  — freeze at current progress
//   resume() — continue from paused progress
//   reset()  — jump to final frame (progress 1)
//
// When `autoplay` is true the animation starts as soon as the
// JSON loads. When false the entry renders the *fully drawn*
// final state by default — pair with `revealMode: 'manual'`
// on the parent entity to keep it hidden until play() fires.
//
// JSON-format types are imported from `ink-studio/src/types`
// — single source of truth shared with the writer.
// ═══════════════════════════════════════════════════════════

const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
}

export type HandwritingHandle = {
  play: () => void
  pause: () => void
  resume: () => void
  reset: () => void
}

type Props = {
  src: string
  /** On-canvas pixel size. Optional — defaults to fill parent. */
  width?: number
  height?: number
  /** Animate the drawing on mount. Default false → renders statically. */
  autoplay?: boolean
  /** Playback speed multiplier — 2 = twice as fast. */
  speed?: number
}

export const HandwrittenEntry = forwardRef<HandwritingHandle, Props>(function HandwrittenEntry(
  { src, width, height, autoplay = false, speed = 1 },
  ref,
) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  // progress starts at 1 (static end state) unless autoplay. The play()
  // imperative handle resets to 0 and runs the rAF loop manually below —
  // no React effect dependency hopping required.
  const [progress, setProgress] = useState(autoplay ? 0 : 1)

  // Live animation state — kept in refs so callers can drive the loop
  // imperatively without triggering re-renders per frame.
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)            // performance.now() when current run began
  const pausedProgressRef = useRef<number | null>(null)
  const totalRef = useRef<number>(1)            // computed once drawing loads
  const drawingRef = useRef<Drawing | null>(null)
  const speedRef = useRef<number>(speed)
  useEffect(() => { speedRef.current = speed }, [speed])

  // Load JSON
  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((json: Drawing) => {
        if (cancelled) return
        drawingRef.current = json
        const firstStart = json.strokes[0]?.startedAt ?? 0
        const lastStroke = json.strokes[json.strokes.length - 1]
        const lastT = lastStroke?.points[lastStroke.points.length - 1]?.t ?? 0
        totalRef.current = Math.max(
          1,
          ((lastStroke?.startedAt ?? firstStart) - firstStart + lastT) / speedRef.current,
        )
        setDrawing(json)
      })
      .catch(() => { /* swallow — entry just won't render */ })
    return () => { cancelled = true }
  }, [src])

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const runLoop = useCallback((fromProgress: number) => {
    stopRaf()
    if (!drawingRef.current) return
    startRef.current = performance.now() - fromProgress * totalRef.current
    const step = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / totalRef.current)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [stopRaf])

  const play = useCallback(() => {
    pausedProgressRef.current = null
    setProgress(0)
    runLoop(0)
  }, [runLoop])

  const pause = useCallback(() => {
    if (rafRef.current === null) return
    const elapsed = performance.now() - startRef.current
    const p = Math.min(1, Math.max(0, elapsed / totalRef.current))
    pausedProgressRef.current = p
    stopRaf()
  }, [stopRaf])

  const resume = useCallback(() => {
    const p = pausedProgressRef.current
    if (p === null || p >= 1) return
    pausedProgressRef.current = null
    runLoop(p)
  }, [runLoop])

  const reset = useCallback(() => {
    stopRaf()
    pausedProgressRef.current = null
    setProgress(1)
  }, [stopRaf])

  useImperativeHandle(ref, () => ({ play, pause, resume, reset }), [play, pause, resume, reset])

  // Autoplay: kick the loop once the JSON has loaded.
  const autoplayedRef = useRef(false)
  useEffect(() => {
    if (!drawing || !autoplay || autoplayedRef.current) return
    autoplayedRef.current = true
    runLoop(0)
  }, [drawing, autoplay, runLoop])

  // Cleanup
  useEffect(() => () => stopRaf(), [stopRaf])

  if (!drawing) return null

  const firstStart = drawing.strokes[0]?.startedAt ?? 0
  const lastStroke = drawing.strokes[drawing.strokes.length - 1]
  const lastT = lastStroke?.points[lastStroke.points.length - 1]?.t ?? 0
  const total = Math.max(1, (lastStroke?.startedAt ?? firstStart) - firstStart + lastT)
  const elapsed = progress * total

  // When the caller supplies only `width`, derive height from the JSON's
  // intrinsic aspect ratio so the slot matches the drawing exactly — no
  // letterboxing, no per-file tuning when a new recording gets dropped in.
  const autoFit = width !== undefined && height === undefined
  const containerStyle: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (autoFit ? undefined : '100%'),
    aspectRatio: autoFit ? `${drawing.width} / ${drawing.height}` : undefined,
    pointerEvents: 'none',
  }

  return (
    <div style={containerStyle}>
      <svg
        viewBox={`0 0 ${drawing.width} ${drawing.height}`}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        {drawing.strokes.map((stroke, i) => {
          const offset = stroke.startedAt - firstStart
          const revealed = stroke.points.filter((pt) => offset + pt.t <= elapsed)
          if (revealed.length < 2) return null
          const pts = revealed.map((p) => [p.x, p.y, p.p])
          const outline = getStroke(pts, {
            size: stroke.options.size,
            thinning: stroke.options.thinning,
            smoothing: stroke.options.smoothing,
            streamline: stroke.options.streamline,
            easing: EASINGS[stroke.options.easing],
            start: { taper: stroke.options.taperStart, cap: stroke.options.capStart },
            end: { taper: stroke.options.taperEnd, cap: stroke.options.capEnd },
            last: revealed.length === stroke.points.length,
          })
          return (
            <path
              key={i}
              d={getSvgPathFromStroke(outline)}
              fill={stroke.color}
              stroke={stroke.outlineWidth > 0 ? stroke.outlineColor : 'none'}
              strokeWidth={stroke.outlineWidth}
            />
          )
        })}
      </svg>
    </div>
  )
})

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q'] as (string | number)[],
  )
  d.push('Z')
  return d.join(' ')
}
