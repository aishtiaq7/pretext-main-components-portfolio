import { useCallback, useEffect, useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import { RouteNav } from './App'
import type { Drawing } from './types'
import {
  EASINGS,
  formatClockMs,
  getSvgPathFromStroke,
  shouldIgnoreShortcut,
} from './utils'
import { formatErrors, validateDrawing } from './validate'

// ═══════════════════════════════════════════════════════════
// Player view — drop a `.json` (capture export) or `.svg` and
// watch it render. JSON files replay with their original
// timing; SVGs are static (they have no timing data).
//
// Shortcuts:
//   Space — play / pause the JSON playback clock
//   C     — clear the loaded file
//   R     — reset playback to the start (JSON only)
// ═══════════════════════════════════════════════════════════

type LoadedJSON = { kind: 'json'; drawing: Drawing; totalMs: number }
type LoadedSVG = { kind: 'svg'; markup: string }
type Loaded = LoadedJSON | LoadedSVG

function totalMsFromDrawing(d: Drawing): number {
  const firstStart = d.strokes[0]?.startedAt ?? 0
  const lastStroke = d.strokes[d.strokes.length - 1]
  const lastT = lastStroke?.points[lastStroke.points.length - 1]?.t ?? 0
  return Math.max(1, (lastStroke?.startedAt ?? firstStart) - firstStart + lastT)
}

export function PlayerView() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0) // 0..1
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState(false)

  // Playback loop refs — kept off React state to avoid per-frame re-renders.
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const totalMsRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const runFrom = useCallback((fromProgress: number) => {
    stopRaf()
    const totalMs = totalMsRef.current
    if (totalMs <= 0) return
    setPlaying(true)
    startRef.current = performance.now() - fromProgress * totalMs
    const step = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / totalMs)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        setPlaying(false)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [stopRaf])

  const pause = useCallback(() => {
    if (rafRef.current === null) return
    const elapsed = performance.now() - startRef.current
    const p = Math.min(1, Math.max(0, elapsed / totalMsRef.current))
    setProgress(p)
    stopRaf()
    setPlaying(false)
  }, [stopRaf])

  const toggle = useCallback(() => {
    if (!loaded || loaded.kind !== 'json') return
    if (playing) {
      pause()
    } else {
      // If finished, Space restarts from 0; otherwise resume from current.
      runFrom(progress >= 1 ? 0 : progress)
    }
  }, [loaded, playing, pause, progress, runFrom])

  const reset = useCallback(() => {
    if (!loaded || loaded.kind !== 'json') return
    stopRaf()
    setPlaying(false)
    setProgress(0)
  }, [loaded, stopRaf])

  const clear = useCallback(() => {
    stopRaf()
    setLoaded(null)
    setError(null)
    setProgress(0)
    setPlaying(false)
    totalMsRef.current = 0
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [stopRaf])

  // ── File handling ───────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const isJSON = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json'
    const isSVG = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml'
    if (!isJSON && !isSVG) {
      setError(`Unsupported file: ${file.name}. Drop a .json or .svg.`)
      return
    }
    const text = await file.text()
    if (isJSON) {
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (e) {
        setError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
      const result = validateDrawing(parsed)
      if (!result.ok) {
        setError(`Schema errors:\n${formatErrors(result.errors)}`)
        return
      }
      const drawing = result.value
      const totalMs = totalMsFromDrawing(drawing)
      totalMsRef.current = totalMs
      setError(null)
      setProgress(0)
      setLoaded({ kind: 'json', drawing, totalMs })
    } else {
      totalMsRef.current = 0
      setError(null)
      setLoaded({ kind: 'svg', markup: text })
    }
  }, [])

  // Auto-play once a JSON is loaded.
  useEffect(() => {
    if (loaded?.kind !== 'json') return
    runFrom(0)
  }, [loaded, runFrom])

  // Cleanup on unmount
  useEffect(() => () => stopRaf(), [stopRaf])

  // ── Keyboard shortcuts ──────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcut(e.target)) return
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        clear()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, clear, reset])

  // ── Drop zone handlers ──────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only treat as leave if cursor exits the drop element itself
    if (e.currentTarget === e.target) setDragging(false)
  }, [])

  const pickFile = () => fileInputRef.current?.click()

  // ── Render ──────────────────────────────────────────
  if (!loaded) {
    return (
      <>
        <RouteNav active="player" className="route-nav-corner" />
      <div
        className={`player-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={pickFile}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.svg,application/json,image/svg+xml"
          onChange={(e) => void handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <div className="player-dropzone-inner">
          <div className="player-dropzone-title">Drop a .json or .svg</div>
          <div className="player-dropzone-sub">
            JSON files replay with original timing · SVGs render statically
          </div>
          <button className="player-dropzone-button">Choose file</button>
          {error && <pre className="player-error">{error}</pre>}
        </div>
      </div>
      </>
    )
  }

  if (loaded.kind === 'svg') {
    return (
      <>
        <RouteNav active="player" className="route-nav-corner" />
      <div className="player">
        <div
          className="player-stage player-stage-svg"
          dangerouslySetInnerHTML={{ __html: loaded.markup }}
        />
        <div className="player-controls">
          <span className="player-static-label">Static SVG (no timing)</span>
          <button onClick={clear} className="danger">Clear</button>
        </div>
        <div className="player-shortcuts">
          <kbd>C</kbd> clear
        </div>
      </div>
      </>
    )
  }

  // JSON playback
  const { drawing, totalMs } = loaded
  const firstStart = drawing.strokes[0]?.startedAt ?? 0
  const elapsed = progress * totalMs

  return (
    <>
      <RouteNav active="player" className="route-nav-corner" />
    <div className="player">
      <div className="player-stage">
        <svg
          viewBox={`0 0 ${drawing.width} ${drawing.height}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
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
                opacity={stroke.opacity ?? 1}
              />
            )
          })}
        </svg>
      </div>
      <div className="player-controls">
        <button onClick={toggle} className="primary" title="Play / pause (Space)">
          {playing ? '❚❚ Pause' : progress >= 1 ? '↻ Replay' : '▶ Play'}
        </button>
        <button onClick={reset} title="Reset to start (R)">↺ Reset</button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => {
            stopRaf()
            setPlaying(false)
            setProgress(parseFloat(e.target.value))
          }}
          className="player-scrub"
          aria-label="Scrub"
        />
        <span className="player-time">
          {formatClockMs(progress * totalMs)} / {formatClockMs(totalMs)}
        </span>
        <button onClick={clear} className="danger" title="Clear loaded file (C)">Clear</button>
      </div>
      <div className="player-shortcuts">
        <kbd>Space</kbd> play/pause · <kbd>R</kbd> reset · <kbd>C</kbd> clear
      </div>
    </div>
    </>
  )
}
