import { useEffect, useRef, useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════
// DraggableText — zoom-aware physics text for the canvas
//
// Unlike TextString, this component accounts for CSS zoom
// transforms by computing the actual scale ratio from
// getBoundingClientRect vs CSS width. This means pointer
// coordinates always map correctly to internal physics coords
// regardless of what zoom level the canvas is at.
// ═══════════════════════════════════════════════════════════

const FONT = '20px Georgia, serif'
const LINE_HEIGHT = 28
const MARGIN = 16
const GRAVITY = 0.15
const DAMPING = 0.97
const CONSTRAINT_DIST = 1.2
const UNLOCK_THRESHOLD = 1.5
const ITERATIONS = 8
const FIXED_DT = 1 / 120
const MAX_STEPS = 4
const BOUNCE = 0.4

type Letter = {
  ch: string
  w: number
  x: number; y: number
  ox: number; oy: number
  px: number; py: number
  locked: boolean
}

type Drag = { idx: number; offsetX: number; offsetY: number }

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

type Props = {
  text: string
  width?: number
  height?: number
  unlockCount?: number
}

export function DraggableText({ text, width = 500, height = 300, unlockCount = 6 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const letterElsRef = useRef<(HTMLSpanElement | null)[]>([])
  const lettersRef = useRef<Letter[]>([])
  const restLengthsRef = useRef<number[]>([])
  const dragsRef = useRef<Map<number, Drag>>(new Map())
  const rafRef = useRef(0)
  const [letterCount, setLetterCount] = useState(0)
  const [ready, setReady] = useState(false)

  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  function getMeasureCtx() {
    if (!measureCtxRef.current) {
      measureCtxRef.current = document.createElement('canvas').getContext('2d')!
      measureCtxRef.current.font = FONT
    }
    return measureCtxRef.current
  }

  function isDragged(idx: number) {
    for (const d of dragsRef.current.values()) if (d.idx === idx) return true
    return false
  }

  // Compute actual scale (accounts for canvas zoom transform)
  function getScale() {
    const container = containerRef.current
    if (!container) return 1
    const rect = container.getBoundingClientRect()
    return rect.width / width
  }

  // ── Initialize: measure, layout, build letter array ───
  useEffect(() => {
    const ctx = getMeasureCtx()
    const graphemes = [...segmenter.segment(text)].map(s => s.segment)

    document.fonts.ready.then(() => {
      ctx.font = FONT
      const widths = graphemes.map(g => ctx.measureText(g).width)
      const maxW = width - MARGIN * 2

      // Layout lines
      const positions: { x: number; y: number; w: number }[] = []
      let x = 0, lineY = 0
      for (let i = 0; i < graphemes.length; i++) {
        const w = widths[i]
        if (graphemes[i] === ' ' && x > 0) {
          let wordW = 0
          for (let j = i + 1; j < graphemes.length && graphemes[j] !== ' '; j++) wordW += widths[j]
          if (x + w + wordW > maxW) {
            positions.push({ x: x + MARGIN, y: lineY, w })
            x = 0; lineY += LINE_HEIGHT; continue
          }
        }
        positions.push({ x: x + MARGIN, y: lineY, w })
        x += w
      }

      // Center vertically within container
      const totalH = lineY + LINE_HEIGHT
      const offsetY = Math.max(16, (height - totalH) / 2)

      const letters: Letter[] = graphemes.map((ch, i) => {
        const p = positions[i]
        return {
          ch, w: p.w,
          x: p.x, y: p.y + offsetY,
          ox: p.x, oy: p.y + offsetY,
          px: p.x, py: p.y + offsetY,
          locked: true,
        }
      })

      // Unlock last N letters
      for (let i = Math.max(0, letters.length - unlockCount); i < letters.length; i++) {
        letters[i].locked = false
      }

      // Rest lengths between adjacent letters
      const rests: number[] = []
      for (let i = 0; i < letters.length - 1; i++) {
        const a = letters[i], b = letters[i + 1]
        rests.push(Math.hypot(
          (b.ox + b.w / 2) - (a.ox + a.w / 2),
          (b.oy + LINE_HEIGHT / 2) - (a.oy + LINE_HEIGHT / 2),
        ) * CONSTRAINT_DIST)
      }

      lettersRef.current = letters
      restLengthsRef.current = rests
      setLetterCount(letters.length)
      setReady(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Set text on spans after mount ─────────────────────
  useEffect(() => {
    if (!ready) return
    const letters = lettersRef.current
    const els = letterElsRef.current
    for (let i = 0; i < letters.length; i++) {
      const el = els[i]
      if (el) {
        el.textContent = letters[i].ch
        if (!letters[i].locked) el.classList.add('draggable')
      }
    }
  }, [ready])

  // ── Physics loop ──────────────────────────────────────
  useEffect(() => {
    if (!ready) return
    let lastTime = -1, accumulator = 0

    function simulate() {
      const letters = lettersRef.current
      const rests = restLengthsRef.current

      // Unlock propagation: pull unlocks adjacent locked letters
      for (let i = letters.length - 2; i >= 0; i--) {
        if (letters[i].locked && !letters[i + 1].locked) {
          const a = letters[i], b = letters[i + 1]
          const dist = Math.hypot(
            (b.x + b.w / 2) - (a.ox + a.w / 2),
            (b.y + LINE_HEIGHT / 2) - (a.oy + LINE_HEIGHT / 2),
          )
          if (dist > rests[i] + UNLOCK_THRESHOLD) {
            a.locked = false; a.px = a.x; a.py = a.y
          }
        }
      }

      // Verlet integration
      for (let i = 0; i < letters.length; i++) {
        const l = letters[i]
        if (l.locked || isDragged(i)) continue
        const vx = (l.x - l.px) * DAMPING
        const vy = (l.y - l.py) * DAMPING
        l.px = l.x; l.py = l.y
        l.x += vx
        l.y += vy + GRAVITY
      }

      // Distance constraints
      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let i = 0; i < letters.length - 1; i++) {
          const a = letters[i], b = letters[i + 1]
          if (a.locked && b.locked) continue
          const ax = a.x + a.w / 2, ay = a.y + LINE_HEIGHT / 2
          const bx = b.x + b.w / 2, by = b.y + LINE_HEIGHT / 2
          const dx = bx - ax, dy = by - ay
          const dist = Math.hypot(dx, dy) || 0.001
          const diff = (dist - rests[i]) / dist
          const aFixed = a.locked || isDragged(i)
          const bFixed = b.locked || isDragged(i + 1)
          if (aFixed && !bFixed) { b.x -= dx * diff; b.y -= dy * diff }
          else if (!aFixed && bFixed) { a.x += dx * diff; a.y += dy * diff }
          else if (!aFixed && !bFixed) {
            a.x += dx * diff * 0.5; a.y += dy * diff * 0.5
            b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5
          }
        }
      }

      // Boundary
      for (let i = 0; i < letters.length; i++) {
        const l = letters[i]
        if (l.locked || isDragged(i)) continue
        if (l.x < 0) { l.x = 0; l.px = l.x + (l.x - l.px) * BOUNCE }
        if (l.x + l.w > width) { l.x = width - l.w; l.px = l.x + (l.x - l.px) * BOUNCE }
        if (l.y < 0) { l.y = 0; l.py = l.y + (l.y - l.py) * BOUNCE }
        if (l.y + LINE_HEIGHT > height) { l.y = height - LINE_HEIGHT; l.py = l.y + (l.y - l.py) * BOUNCE }
      }
    }

    function render(now: number) {
      if (lastTime < 0) { lastTime = now; rafRef.current = requestAnimationFrame(render); return }
      const dt = Math.min((now - lastTime) / 1000, MAX_STEPS * FIXED_DT)
      lastTime = now; accumulator += dt
      while (accumulator >= FIXED_DT) { simulate(); accumulator -= FIXED_DT }

      const letters = lettersRef.current
      const els = letterElsRef.current
      for (let i = 0; i < letters.length; i++) {
        const el = els[i]
        if (!el) continue
        if (!letters[i].locked) el.classList.add('draggable')
        el.style.transform = `translate(${letters[i].x}px, ${letters[i].y}px)`
      }
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ready, width, height])

  // ── Pointer handlers (ZOOM-AWARE via scale ratio) ─────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    const els = letterElsRef.current
    const idx = els.indexOf(target as HTMLSpanElement)
    if (idx === -1 || lettersRef.current[idx]?.locked) return
    if (isDragged(idx)) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const scale = getScale()
    const l = lettersRef.current[idx]

    dragsRef.current.set(e.pointerId, {
      idx,
      offsetX: (e.clientX - rect.left) / scale - l.x,
      offsetY: (e.clientY - rect.top) / scale - l.y,
    })
    target.classList.add('dragging')
    target.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragsRef.current.get(e.pointerId)
    if (!d) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const scale = getScale()
    const l = lettersRef.current[d.idx]
    l.x = (e.clientX - rect.left) / scale - d.offsetX
    l.y = (e.clientY - rect.top) / scale - d.offsetY
    l.px = l.x; l.py = l.y
    l.locked = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragsRef.current.get(e.pointerId)
    if (!d) return
    const el = letterElsRef.current[d.idx]
    if (el) el.classList.remove('dragging')
    dragsRef.current.delete(e.pointerId)
  }, [])

  return (
    <div
      data-interactive
      ref={containerRef}
      className="draggable-text-container"
      style={{ width, height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {ready && Array.from({ length: letterCount }, (_, i) => (
        <span
          key={i}
          ref={el => { letterElsRef.current[i] = el }}
          className="textstring-letter"
        />
      ))}
      <div className="textstring-hint" style={{ position: 'absolute', bottom: 8, right: 16 }}>
        drag the last letters
      </div>
    </div>
  )
}
