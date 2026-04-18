import { useEffect, useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'

// ═══════════════════════════════════════════════════════════
// HandwrittenEntry — plays back stroke-capture JSON exported
// from `ink-studio`. Paths render with perfect-freehand so
// pressure/tilt produce the ink body; absolute timestamps
// reproduce the original writing rhythm (pauses included).
// Click the entry to replay the animation.
// ═══════════════════════════════════════════════════════════

type EasingName =
  | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'

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

type Point = { x: number; y: number; p: number; t: number }
type StrokeOptions = {
  size: number; thinning: number; smoothing: number; streamline: number;
  easing: EasingName
  taperStart: number; taperEnd: number
  capStart: boolean; capEnd: boolean
}
type StoredStroke = {
  points: Point[]
  options: StrokeOptions
  color: string
  outlineColor: string
  outlineWidth: number
  startedAt: number
}
type Drawing = {
  version: 1
  createdAt: string
  width: number
  height: number
  strokes: StoredStroke[]
}

type Props = {
  src: string
  /** If true (default), animate the drawing once it loads. */
  autoplay?: boolean
  /** Playback speed multiplier — 2 = twice as fast. */
  speed?: number
}

export function HandwrittenEntry({ src, autoplay = true, speed = 1 }: Props) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(1) // 0–1 (1 = fully drawn)
  const rafRef = useRef<number | null>(null)

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
        setDrawing(json)
        if (autoplay) setProgress(0)
      })
      .catch((e) => !cancelled && setError(String(e)))
    return () => { cancelled = true }
  }, [src, autoplay])

  // Animation loop
  useEffect(() => {
    if (!drawing || progress >= 1) return
    const firstStart = drawing.strokes[0]?.startedAt ?? 0
    const lastStroke = drawing.strokes[drawing.strokes.length - 1]
    const lastT = lastStroke?.points[lastStroke.points.length - 1]?.t ?? 0
    const total = Math.max(
      1,
      ((lastStroke?.startedAt ?? firstStart) - firstStart + lastT) / speed,
    )
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / total)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // Re-trigger animation when progress is reset to 0 via replay click
  }, [drawing, progress === 0, speed]) // eslint-disable-line react-hooks/exhaustive-deps

  const replay = () => setProgress(0)

  if (error) {
    return <div style={{ padding: 16, color: '#b91c1c', fontFamily: 'monospace', fontSize: 12 }}>
      Failed to load {src}: {error}
    </div>
  }
  if (!drawing) {
    return <div style={{ padding: 16, color: '#6b6b66', fontFamily: 'monospace', fontSize: 12 }}>
      loading…
    </div>
  }

  const firstStart = drawing.strokes[0]?.startedAt ?? 0
  const lastStroke = drawing.strokes[drawing.strokes.length - 1]
  const lastT = lastStroke?.points[lastStroke.points.length - 1]?.t ?? 0
  const total = Math.max(1, (lastStroke?.startedAt ?? firstStart) - firstStart + lastT)
  const elapsed = progress * total

  return (
    <div
      style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      onClick={replay}
      title="click to replay"
    >
      <svg
        viewBox={`0 0 ${drawing.width} ${drawing.height}`}
        width="100%"
        height="100%"
        style={{ display: 'block', pointerEvents: 'none' }}
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
}

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
