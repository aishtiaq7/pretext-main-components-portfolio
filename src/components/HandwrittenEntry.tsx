import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Drawing, EasingName, Point, StoredStroke } from '../../ink-studio/src/types'
import { isMultiTouchActive } from '../store/gestures'

// ═══════════════════════════════════════════════════════════
// HandwrittenEntry — plays back stroke-capture JSON exported
// from `ink-studio`. Paths render with perfect-freehand so
// pressure/tilt produce the ink body; absolute timestamps
// reproduce the original writing rhythm (pauses included).
//
// Performance model (docs/architecture.md §4):
//   • every stroke's finished outline is computed ONCE when the
//     JSON loads and cached as a path string
//   • the rAF loop writes `d` attributes through refs — React
//     renders once on load and once when the drawing completes
//   • per frame only the stroke currently being drawn calls
//     perfect-freehand; finished strokes reuse their cache
//   • no loop runs while nothing is animating
//
// Click on ink: the wrapper ignores pointer events, the <svg> uses
// `visiblePainted`, so only painted pixels are targets. A press that
// moves less than CLICK_SLOP px before release is a click; anything
// else is left to the viewport's pan (we never stop propagation or
// capture the pointer, so the canvas pan starts as usual).
//
// Imperative handle (via ref): play / pause / resume / reset.
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

const CLICK_SLOP = 4 // px

export type HandwritingHandle = {
  play: () => void
  pause: () => void
  resume: () => void
  /** Jump to the final frame and report done. */
  reset: () => void
  /** Jump to the final frame WITHOUT reporting done (restoring a reload). */
  showFinished: () => void
}

type Props = {
  src: string
  /** On-canvas pixel size. Optional — defaults to fill parent. */
  width?: number
  height?: number
  /** Animate the drawing on mount. Default false → renders the finished ink. */
  autoplay?: boolean
  /** Playback speed multiplier — 2 = twice as fast. */
  speed?: number
  /** Ink pixels catch clicks once the drawing has finished. */
  clickable?: boolean
  /** Keyboard order; null = no Tab stop (default). */
  tabOrder?: number | null
  ariaLabel?: string
  /** A click (or Enter/Space) on finished, clickable ink. */
  onActivate?: () => void
  /** The writing animation reached the end (or reset() jumped there). */
  onDone?: () => void
}

// One stroke, prepared once: timing relative to the first stroke + cached
// finished outline. `src` keeps the raw points for partial frames.
type Prepared = {
  src: StoredStroke
  offset: number   // ms from the drawing's first stroke to this one
  endT: number     // offset + last point's t
  fullD: string    // finished outline (last: true)
}

type PaintState = 'empty' | 'partial' | 'full'

function prepare(drawing: Drawing): { strokes: Prepared[]; total: number } {
  const firstStart = drawing.strokes[0]?.startedAt ?? 0
  const strokes = drawing.strokes.map((s) => {
    const offset = s.startedAt - firstStart
    const lastT = s.points[s.points.length - 1]?.t ?? 0
    return { src: s, offset, endT: offset + lastT, fullD: outlineOf(s, s.points, true) }
  })
  const total = Math.max(1, ...strokes.map((s) => s.endT))
  return { strokes, total }
}

function outlineOf(stroke: StoredStroke, pts: readonly Point[], last: boolean): string {
  if (pts.length < 2) return ''
  const outline = getStroke(pts.map((p) => [p.x, p.y, p.p]), {
    size: stroke.options.size,
    thinning: stroke.options.thinning,
    smoothing: stroke.options.smoothing,
    streamline: stroke.options.streamline,
    easing: EASINGS[stroke.options.easing],
    start: { taper: stroke.options.taperStart, cap: stroke.options.capStart },
    end: { taper: stroke.options.taperEnd, cap: stroke.options.capEnd },
    last,
  })
  return getSvgPathFromStroke(outline)
}

export const HandwrittenEntry = forwardRef<HandwritingHandle, Props>(function HandwrittenEntry(
  {
    src, width, height, autoplay = false, speed = 1,
    clickable = false, tabOrder = null, ariaLabel, onActivate, onDone,
  },
  ref,
) {
  // Set once when the JSON loads. `initialFull` is frozen here so the JSX `d`
  // never changes between renders and React never overwrites the loop's writes.
  const [loaded, setLoaded] = useState<{ drawing: Drawing; strokes: Prepared[]; initialFull: boolean } | null>(null)
  // The only per-run React state: flips when a run finishes (enables click).
  const [done, setDone] = useState<boolean>(!autoplay)

  // ── Imperative state (no re-renders) ──
  const preparedRef = useRef<Prepared[]>([])
  const totalRef = useRef(1)                       // recording length, ms
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const paintRef = useRef<PaintState[]>([])        // what each path currently shows
  const doneUpToRef = useRef(0)                    // strokes [0, doneUpTo) are finalized
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)                       // performance.now() at progress 0 of this run
  const pausedProgressRef = useRef<number | null>(null)
  const speedRef = useRef(speed)
  const onDoneRef = useRef(onDone)
  const onActivateRef = useRef(onActivate)

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { onDoneRef.current = onDone }, [onDone])
  useEffect(() => { onActivateRef.current = onActivate }, [onActivate])

  // ── Load + prepare ──
  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json()
      })
      .then((json: Drawing) => {
        if (cancelled) return
        const { strokes, total } = prepare(json)
        const initialFull = !autoplay
        preparedRef.current = strokes
        totalRef.current = total
        paintRef.current = strokes.map(() => (initialFull ? 'full' : 'empty'))
        doneUpToRef.current = initialFull ? strokes.length : 0
        setLoaded({ drawing: json, strokes, initialFull })
      })
      .catch(() => { /* swallow — entry just won't render */ })
    return () => { cancelled = true }
    // `autoplay` is read once at load on purpose: it decides the first frame only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // ── Painting ──
  const clearAll = useCallback(() => {
    const paths = pathRefs.current
    for (let i = 0; i < paths.length; i++) {
      paths[i]?.setAttribute('d', '')
      paintRef.current[i] = 'empty'
    }
    doneUpToRef.current = 0
  }, [])

  /** Write the DOM for progress p ∈ [0, 1]. Only in-progress strokes recompute. */
  const paint = useCallback((p: number) => {
    const strokes = preparedRef.current
    const elapsed = p * totalRef.current
    for (let i = doneUpToRef.current; i < strokes.length; i++) {
      const s = strokes[i]
      const el = pathRefs.current[i]
      if (!el) continue
      if (s.endT <= elapsed) {
        if (paintRef.current[i] !== 'full') {
          el.setAttribute('d', s.fullD)
          paintRef.current[i] = 'full'
        }
        // Finalized strokes are skipped on later frames once everything
        // before them is also final (keeps doneUpTo a simple cursor).
        if (doneUpToRef.current === i) doneUpToRef.current = i + 1
        continue
      }
      if (s.offset > elapsed) {
        if (paintRef.current[i] !== 'empty') {
          el.setAttribute('d', '')
          paintRef.current[i] = 'empty'
        }
        continue
      }
      // In progress: the one place perfect-freehand runs per frame.
      const pts = s.src.points
      let n = 0
      while (n < pts.length && s.offset + pts[n].t <= elapsed) n++
      el.setAttribute('d', outlineOf(s.src, pts.slice(0, n), false))
      paintRef.current[i] = 'partial'
    }
  }, [])

  // ── Loop ──
  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const finish = useCallback((notify = true) => {
    rafRef.current = null
    paint(1)
    setDone(true)
    if (notify) onDoneRef.current?.()
  }, [paint])

  const runLoop = useCallback((fromProgress: number) => {
    stopRaf()
    if (preparedRef.current.length === 0) return
    const durationMs = totalRef.current / speedRef.current
    startRef.current = performance.now() - fromProgress * durationMs
    const step = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / durationMs)
      if (p >= 1) { finish(); return }
      paint(p)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [stopRaf, paint, finish])

  const play = useCallback(() => {
    pausedProgressRef.current = null
    setDone(false)
    clearAll()
    runLoop(0)
  }, [clearAll, runLoop])

  const pause = useCallback(() => {
    if (rafRef.current === null) return
    const durationMs = totalRef.current / speedRef.current
    const p = Math.min(1, Math.max(0, (performance.now() - startRef.current) / durationMs))
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
    finish(true)
  }, [stopRaf, finish])

  const showFinished = useCallback(() => {
    stopRaf()
    pausedProgressRef.current = null
    finish(false)
  }, [stopRaf, finish])

  useImperativeHandle(
    ref,
    () => ({ play, pause, resume, reset, showFinished }),
    [play, pause, resume, reset, showFinished],
  )

  // Autoplay: kick the loop once the JSON has loaded and the paths exist.
  const autoplayedRef = useRef(false)
  useEffect(() => {
    if (!loaded || !autoplay || autoplayedRef.current) return
    autoplayedRef.current = true
    runLoop(0)
  }, [loaded, autoplay, runLoop])

  useEffect(() => () => stopRaf(), [stopRaf])

  // ── Click on ink (no capture, no stopPropagation — the pan still works) ──
  const pressRef = useRef<{ id: number; x: number; y: number } | null>(null)
  const interactive = clickable && done

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive || isMultiTouchActive()) return
    const press = { id: e.pointerId, x: e.clientX, y: e.clientY }
    pressRef.current = press
    const onUp = (up: PointerEvent) => {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (pressRef.current !== press) return
      pressRef.current = null
      if (up.type === 'pointercancel' || up.pointerId !== press.id) return
      if (isMultiTouchActive()) return
      if (Math.hypot(up.clientX - press.x, up.clientY - press.y) > CLICK_SLOP) return
      onActivateRef.current?.()
    }
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [interactive])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!interactive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivateRef.current?.()
    }
  }, [interactive])

  if (!loaded) return null
  const { drawing, strokes: prepared, initialFull } = loaded

  // When the caller supplies only `width`, derive height from the JSON's
  // intrinsic aspect ratio so the slot matches the drawing exactly.
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
        className={interactive ? 'ink ink-clickable' : 'ink'}
        style={{
          display: 'block',
          // Only painted ink receives events, and only when clickable + finished.
          pointerEvents: interactive ? 'visiblePainted' : 'none',
        }}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? (ariaLabel ?? 'Drawing') : undefined}
        tabIndex={interactive && tabOrder !== null ? tabOrder : undefined}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        {prepared.map((s, i) => (
          <path
            key={i}
            ref={(el) => { pathRefs.current[i] = el }}
            d={initialFull ? s.fullD : ''}
            fill={s.src.color}
            stroke={s.src.outlineWidth > 0 ? s.src.outlineColor : 'none'}
            strokeWidth={s.src.outlineWidth}
            opacity={s.src.opacity ?? 1}
          />
        ))}
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
