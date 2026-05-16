import { useCallback, useEffect, useRef, useState } from 'react'
import { getStroke } from 'perfect-freehand'
import type { EasingName, Point, StoredStroke, StrokeOptions } from './types'
import { EASINGS, downloadBlob, getSvgPathFromStroke, tsFilename } from './utils'

// ═══════════════════════════════════════════════════════════
// Ink Studio — record pen strokes with pressure/tilt/timing and
// export as JSON (for replay) or SVG (for static use).
//
// Draw on the left stage; tweak options in the right sidebar.
// Export → drop the file into the portfolio's public/handwriting/.
// ═══════════════════════════════════════════════════════════

const DEFAULT_OPTIONS: StrokeOptions = {
  size: 12,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: 'linear',
  taperStart: 0,
  taperEnd: 0,
  capStart: true,
  capEnd: true,
}

const PALETTE = [
  '#000000', '#f59e0b', '#ef4444', '#ec4899',
  '#8b5cf6', '#06b6d4', '#22c55e', '#e5e7eb',
]

type LiveMetrics = {
  pointerType: string
  pressure: number
  tiltX: number
  tiltY: number
}

type WorkingStroke = Omit<StoredStroke, 'points'> & {
  points: Point[]
}

type RecStatus = 'idle' | 'recording' | 'paused' | 'stopped'

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function App() {
  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const strokeStartRef = useRef<number>(0)

  const [options, setOptions] = useState<StrokeOptions>(DEFAULT_OPTIONS)
  const [fillColor, setFillColor] = useState<string>('#000000')
  const [outlineColor, setOutlineColor] = useState<string>('#000000')
  const [outlineWidth, setOutlineWidth] = useState<number>(0)
  const [strokes, setStrokes] = useState<StoredStroke[]>([])
  const [current, setCurrent] = useState<WorkingStroke | null>(null)
  const [metrics, setMetrics] = useState<LiveMetrics>({
    pointerType: '—', pressure: 0, tiltX: 0, tiltY: 0,
  })

  // ── Recording clock ─────────────────────────────────
  // recNow() = ms since recording started, with paused time excluded.
  // While paused, recNow() returns a frozen value, so any strokes drawn
  // during pause collapse to the same instant at playback.
  const [recStatus, setRecStatus] = useState<RecStatus>('idle')
  const [clockMs, setClockMs] = useState(0)
  const recStartRef = useRef(0)         // performance.now() at first record-start
  const pausedAccumRef = useRef(0)      // total paused ms (excluded from recNow)
  const pauseEnteredAtRef = useRef(0)   // performance.now() when current pause began
  const stoppedAtRef = useRef(0)        // performance.now() when stop was pressed
  const statusRef = useRef<RecStatus>('idle')

  useEffect(() => { statusRef.current = recStatus }, [recStatus])

  const recNow = useCallback((): number => {
    const start = recStartRef.current
    if (start === 0) return 0
    const acc = pausedAccumRef.current
    const s = statusRef.current
    if (s === 'paused') return pauseEnteredAtRef.current - start - acc
    if (s === 'stopped') return stoppedAtRef.current - start - acc
    return performance.now() - start - acc
  }, [])

  // While recording, tick the displayed clock every 100ms.
  // On transitions, the value is snapped exactly in the transport handlers below
  // (pause/stop/clear/start), so there's no cascading-effect needed here.
  useEffect(() => {
    if (recStatus !== 'recording') return
    const id = window.setInterval(() => setClockMs(recNow()), 100)
    return () => window.clearInterval(id)
  }, [recStatus, recNow])

  const startRecording = useCallback(() => {
    if (statusRef.current !== 'idle') return
    recStartRef.current = performance.now()
    pausedAccumRef.current = 0
    statusRef.current = 'recording'
    setRecStatus('recording')
    setClockMs(0)
  }, [])

  const pauseRecording = useCallback(() => {
    if (statusRef.current !== 'recording') return
    pauseEnteredAtRef.current = performance.now()
    // Finalize any in-flight stroke so pause is a clean boundary.
    if (current) {
      setStrokes((list) => [...list, current])
      setCurrent(null)
    }
    statusRef.current = 'paused'
    setRecStatus('paused')
    setClockMs(pauseEnteredAtRef.current - recStartRef.current - pausedAccumRef.current)
  }, [current])

  const resumeRecording = useCallback(() => {
    if (statusRef.current !== 'paused') return
    pausedAccumRef.current += performance.now() - pauseEnteredAtRef.current
    statusRef.current = 'recording'
    setRecStatus('recording')
  }, [])

  const stopRecording = useCallback(() => {
    const s = statusRef.current
    if (s === 'idle' || s === 'stopped') return
    // If paused, clock was already frozen; keep that frozen value as final.
    stoppedAtRef.current = s === 'paused' ? pauseEnteredAtRef.current : performance.now()
    if (current) {
      setStrokes((list) => [...list, current])
      setCurrent(null)
    }
    statusRef.current = 'stopped'
    setRecStatus('stopped')
    setClockMs(stoppedAtRef.current - recStartRef.current - pausedAccumRef.current)
  }, [current])

  // Pointer → SVG-local coords (SVG fills the stage; 1:1 with DOM px).
  const localPoint = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return
    // Stopped sessions are read-only — Clear to draw again.
    // In idle, drawing is allowed and captured with t=0 timestamps (they render
    // instantly at the start of playback). Pressing Record later arms the clock
    // for everything from that moment on.
    if (statusRef.current === 'stopped') return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const { x, y } = localPoint(e)
    const t0 = recNow()
    strokeStartRef.current = t0
    setMetrics({
      pointerType: e.pointerType || '—',
      pressure: e.pressure,
      tiltX: (e as unknown as { tiltX?: number }).tiltX ?? 0,
      tiltY: (e as unknown as { tiltY?: number }).tiltY ?? 0,
    })
    setCurrent({
      color: fillColor,
      outlineColor,
      outlineWidth,
      options: { ...options },
      startedAt: t0,
      points: [{
        x, y,
        p: e.pressure || 0.5,
        t: 0,
        tiltX: (e as unknown as { tiltX?: number }).tiltX ?? 0,
        tiltY: (e as unknown as { tiltY?: number }).tiltY ?? 0,
      }],
    })
  }, [fillColor, outlineColor, outlineWidth, options, localPoint, recNow])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // always track metrics, even when not drawing
    setMetrics({
      pointerType: e.pointerType || '—',
      pressure: e.pressure,
      tiltX: (e as unknown as { tiltX?: number }).tiltX ?? 0,
      tiltY: (e as unknown as { tiltY?: number }).tiltY ?? 0,
    })
    if (!current) return
    if (e.buttons === 0) return // pen lifted
    const { x, y } = localPoint(e)
    const t = recNow() - strokeStartRef.current
    // Coalesced events give far smoother strokes when the pen moves fast.
    const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? []
    const rect = svgRef.current!.getBoundingClientRect()
    const newPts: Point[] =
      events.length > 0
        ? events.map((ev) => ({
            x: ev.clientX - rect.left,
            y: ev.clientY - rect.top,
            p: ev.pressure || 0.5,
            t: recNow() - strokeStartRef.current,
            tiltX: ev.tiltX ?? 0,
            tiltY: ev.tiltY ?? 0,
          }))
        : [{
            x, y,
            p: e.pressure || 0.5,
            t,
            tiltX: (e as unknown as { tiltX?: number }).tiltX ?? 0,
            tiltY: (e as unknown as { tiltY?: number }).tiltY ?? 0,
          }]
    setCurrent((s) => (s ? { ...s, points: [...s.points, ...newPts] } : s))
  }, [current, localPoint, recNow])

  const handlePointerUp = useCallback(() => {
    if (!current) return
    setStrokes((list) => [...list, { ...current }])
    setCurrent(null)
  }, [current])

  const pathFor = useCallback((s: WorkingStroke | StoredStroke): string => {
    const pts = s.points.map((p) => [p.x, p.y, p.p])
    const outline = getStroke(pts, {
      size: s.options.size,
      thinning: s.options.thinning,
      smoothing: s.options.smoothing,
      streamline: s.options.streamline,
      easing: EASINGS[s.options.easing],
      start: { taper: s.options.taperStart, cap: s.options.capStart },
      end: { taper: s.options.taperEnd, cap: s.options.capEnd },
      last: !('points' in s) ? true : true,
    })
    return getSvgPathFromStroke(outline)
  }, [])

  // ── Actions ─────────────────────────────────────────

  const clearAll = () => {
    setStrokes([])
    setCurrent(null)
    recStartRef.current = 0
    pausedAccumRef.current = 0
    pauseEnteredAtRef.current = 0
    stoppedAtRef.current = 0
    statusRef.current = 'idle'
    setRecStatus('idle')
    setClockMs(0)
  }
  const undo = () => setStrokes((s) => s.slice(0, -1))
  const resetOptions = () => setOptions(DEFAULT_OPTIONS)

  const copyOptions = async () => {
    await navigator.clipboard.writeText(JSON.stringify(options, null, 2))
  }

  const copyToSVG = async () => {
    const svg = buildSvgString()
    await navigator.clipboard.writeText(svg)
  }

  const downloadJSON = () => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const data = {
      version: 1 as const,
      createdAt: new Date().toISOString(),
      width: rect.width,
      height: rect.height,
      strokes,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, tsFilename('ink', 'json'))
  }

  const downloadSVG = () => {
    const blob = new Blob([buildSvgString()], { type: 'image/svg+xml' })
    downloadBlob(blob, tsFilename('ink', 'svg'))
  }

  const buildSvgString = (): string => {
    if (!stageRef.current) return ''
    const rect = stageRef.current.getBoundingClientRect()
    const paths = strokes.map((s) => {
      const d = pathFor(s)
      const stroke = s.outlineWidth > 0
        ? ` stroke="${s.outlineColor}" stroke-width="${s.outlineWidth}"`
        : ''
      return `  <path d="${d}" fill="${s.color}"${stroke} />`
    }).join('\n')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rect.width} ${rect.height}" width="${rect.width}" height="${rect.height}">\n${paths}\n</svg>`
  }

  // Keyboard: cmd/ctrl+z undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      {/* ── Left: drawing stage ─────────────────────── */}
      <div ref={stageRef} className={`stage stage-${recStatus}`}>
        <svg
          ref={svgRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {strokes.map((s, i) => (
            <path
              key={i}
              d={pathFor(s)}
              fill={s.color}
              stroke={s.outlineWidth > 0 ? s.outlineColor : 'none'}
              strokeWidth={s.outlineWidth}
            />
          ))}
          {current && (
            <path
              d={pathFor(current)}
              fill={current.color}
              stroke={current.outlineWidth > 0 ? current.outlineColor : 'none'}
              strokeWidth={current.outlineWidth}
            />
          )}
        </svg>

        <div className="stage-actions">
          <button onClick={undo} disabled={strokes.length === 0}>Undo</button>
          <button onClick={clearAll} className="danger" disabled={strokes.length === 0 && !current && recStatus === 'idle'}>Clear</button>
          <button onClick={downloadJSON} className="primary" disabled={strokes.length === 0}>Export JSON</button>
          <button onClick={downloadSVG} disabled={strokes.length === 0}>Export SVG</button>
        </div>

        <div className="stage-transport" role="toolbar" aria-label="Recording transport">
          <div className={`clock clock-${recStatus}`} aria-live="polite">
            <span className="clock-dot" />
            <span className="clock-time">{formatMs(clockMs)}</span>
            <span className="clock-status">{recStatus}</span>
          </div>
          <div className="transport-buttons">
            <button
              onClick={startRecording}
              disabled={recStatus !== 'idle'}
              className="transport rec"
              title="Start recording"
            >
              ● Record
            </button>
            <button
              onClick={recStatus === 'paused' ? resumeRecording : pauseRecording}
              disabled={recStatus !== 'recording' && recStatus !== 'paused'}
              className="transport"
              title={recStatus === 'paused' ? 'Resume' : 'Pause'}
            >
              {recStatus === 'paused' ? '▶ Resume' : '❚❚ Pause'}
            </button>
            <button
              onClick={stopRecording}
              disabled={recStatus !== 'recording' && recStatus !== 'paused'}
              className="transport stop"
              title="Stop"
            >
              ■ Stop
            </button>
          </div>
        </div>

        <div className="metrics">
          pointer: {metrics.pointerType} • pressure: {metrics.pressure.toFixed(2)} • tilt: {metrics.tiltX.toFixed(0)},{metrics.tiltY.toFixed(0)} • strokes: {strokes.length}
        </div>
      </div>

      {/* ── Right: sidebar options ──────────────────── */}
      <aside className="sidebar">
        <Slider label="Size" value={options.size} min={1} max={64} step={1}
                onChange={(v) => setOptions({ ...options, size: v })} />
        <Slider label="Thinning" value={options.thinning} min={-1} max={1} step={0.05}
                onChange={(v) => setOptions({ ...options, thinning: v })} />
        <Slider label="Streamline" value={options.streamline} min={0} max={1} step={0.05}
                onChange={(v) => setOptions({ ...options, streamline: v })} />
        <Slider label="Smoothing" value={options.smoothing} min={0} max={1} step={0.05}
                onChange={(v) => setOptions({ ...options, smoothing: v })} />

        <div className="row">
          <label>Easing</label>
          <select value={options.easing} onChange={(e) => setOptions({ ...options, easing: e.target.value as EasingName })}>
            {(Object.keys(EASINGS) as EasingName[]).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: '10px 0' }} />

        <Slider label="Taper Start" value={options.taperStart} min={0} max={100} step={1}
                onChange={(v) => setOptions({ ...options, taperStart: v })} />
        <div className="checkbox-row">
          <input type="checkbox" id="capStart" checked={options.capStart}
                 onChange={(e) => setOptions({ ...options, capStart: e.target.checked })} />
          <label htmlFor="capStart">Cap Start</label>
        </div>

        <Slider label="Taper End" value={options.taperEnd} min={0} max={100} step={1}
                onChange={(v) => setOptions({ ...options, taperEnd: v })} />
        <div className="checkbox-row">
          <input type="checkbox" id="capEnd" checked={options.capEnd}
                 onChange={(e) => setOptions({ ...options, capEnd: e.target.checked })} />
          <label htmlFor="capEnd">Cap End</label>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: '10px 0' }} />

        <div className="swatch-row">
          <div className="swatch-row-header">
            <span className="swatch-preview" style={{ background: fillColor }} />
            <span>Fill</span>
          </div>
          <div className="swatch-grid">
            {PALETTE.map((c) => (
              <button
                key={c}
                className={`swatch ${c === fillColor ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setFillColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <Slider label="Stroke" value={outlineWidth} min={0} max={12} step={0.5}
                onChange={setOutlineWidth} />
        {outlineWidth > 0 && (
          <div className="swatch-row">
            <div className="swatch-row-header">
              <span className="swatch-preview" style={{ background: outlineColor }} />
              <span>Stroke color</span>
            </div>
            <div className="swatch-grid">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`swatch ${c === outlineColor ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setOutlineColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--divider)', margin: '10px 0' }} />

        <div className="sidebar-actions">
          <button onClick={resetOptions}>Reset Options</button>
          <button onClick={copyOptions}>Copy Options</button>
          <button onClick={copyToSVG} className="full">Copy to SVG</button>
        </div>
        <div className="hint">JSON export preserves timing; SVG is static.</div>
      </aside>
    </div>
  )
}

// ── Small presentational sub-component ────────────────

type SliderProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="row">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(Number(e.target.value))} />
      <span className="value">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
    </div>
  )
}
