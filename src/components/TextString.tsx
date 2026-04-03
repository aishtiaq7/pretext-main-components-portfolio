import { useEffect, useRef, useState } from 'react'
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

const FULL_TEXT = "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, \u201cand what is the use of a book,\u201d thought Alice \u201cwithout pictures or conversations?\u201d So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her. There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, \u201cOh dear! Oh dear! I shall be late!\u201d"
const SHORT_TEXT = "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, \u201cand what is the use of a book,\u201d thought Alice \u201cwithout pictures or conversations?\u201d So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid)."

const FONT = '20px Georgia'
const LINE_HEIGHT = 28
const CONSTRAINT_DIST = 1.2
const UNLOCK_THRESHOLD = 1
const ITERATIONS = 12
const DAMPING = 0.97
const GRAVITY = 0.15
const FIXED_DT = 1 / 120
const MAX_STEPS = 4
const BOUNCE = 0.4
const COLLISION_RADIUS = 7
const MARGIN = 20

type Letter = {
  ch: string
  w: number
  x: number; y: number
  ox: number; oy: number
  px: number; py: number
  readingIdx: number
  locked: boolean
}

type Drag = { idx: number; offsetX: number; offsetY: number }

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function TextString() {
  const containerRef = useRef<HTMLDivElement>(null)
  const letterElsRef = useRef<(HTMLSpanElement | null)[]>([])
  const lettersRef = useRef<Letter[]>([])
  const restLengthsRef = useRef<number[]>([])
  const stringOrderRef = useRef<number[]>([])
  const allGraphemesRef = useRef<string[]>([])
  const graphemeWidthsRef = useRef<number[]>([])
  const dragsRef = useRef<Map<number, Drag>>(new Map())
  const rafRef = useRef(0)
  const gravityOnRef = useRef(true)
  const unravelingRef = useRef(false)
  const unravelIdxRef = useRef(-1)
  const hintElRef = useRef<HTMLDivElement>(null)
  const preparedRef = useRef<ReturnType<typeof prepareWithSegments> | null>(null)

  const [letterCount, setLetterCount] = useState(0)
  const [ready, setReady] = useState(false)

  // Choose text based on viewport width at mount
  const textRef = useRef(window.innerWidth < 600 ? SHORT_TEXT : FULL_TEXT)

  // Measure context for grapheme widths
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  function getMeasureCtx() {
    if (!measureCtxRef.current) {
      measureCtxRef.current = document.createElement('canvas').getContext('2d')!
      measureCtxRef.current.font = FONT
    }
    return measureCtxRef.current
  }

  function getMaxWidth() {
    if (!containerRef.current) return 560
    return containerRef.current.getBoundingClientRect().width - MARGIN * 2
  }

  function layoutPositions(maxWidth: number) {
    const allGraphemes = allGraphemesRef.current
    const graphemeWidths = graphemeWidthsRef.current
    const rawPositions: { x: number; y: number; w: number }[] = []
    let x = 0
    let lineY = 0

    for (let gi = 0; gi < allGraphemes.length; gi++) {
      const g = allGraphemes[gi]
      const w = graphemeWidths[gi]

      if (g === ' ' && x > 0) {
        let wordW = 0
        for (let j = gi + 1; j < allGraphemes.length && allGraphemes[j] !== ' '; j++) {
          wordW += graphemeWidths[j]
        }
        if (x + w + wordW > maxWidth) {
          rawPositions.push({ x: x + MARGIN, y: lineY, w })
          x = 0
          lineY += LINE_HEIGHT
          continue
        }
      }

      rawPositions.push({ x: x + MARGIN, y: lineY, w })
      x += w
    }

    // Add top padding to center text vertically within the section
    const totalHeight = lineY + LINE_HEIGHT
    const offsetY = Math.max(40, (window.innerHeight * 0.5 - totalHeight) * 0.5)

    return rawPositions.map(p => ({ x: p.x, y: p.y + offsetY, w: p.w }))
  }

  function buildZigzagMapping(maxWidth: number) {
    const prepared = preparedRef.current
    if (!prepared) return []
    const { lines } = layoutWithLines(prepared, maxWidth, LINE_HEIGHT)

    const lineIndices: number[][] = []
    let gi = 0
    for (let li = 0; li < lines.length; li++) {
      const lineGraphemes = [...segmenter.segment(lines[li].text)].map(s => s.segment)
      const indices: number[] = []
      for (let j = 0; j < lineGraphemes.length; j++) {
        indices.push(gi++)
      }
      lineIndices.push(indices)
    }

    // Zig-zag: snake so last line goes L->R
    const lastLineIdx = lineIndices.length - 1
    const needFlip = lastLineIdx % 2 === 1
    const stringOrder: number[] = []
    for (let li = 0; li < lineIndices.length; li++) {
      const reversed = needFlip ? (li % 2 === 0) : (li % 2 === 1)
      if (reversed) {
        stringOrder.push(...[...lineIndices[li]].reverse())
      } else {
        stringOrder.push(...lineIndices[li])
      }
    }

    return stringOrder
  }

  function computeRestLengths(letters: Letter[]) {
    const rests: number[] = []
    for (let i = 0; i < letters.length - 1; i++) {
      const a = letters[i], b = letters[i + 1]
      const dist = Math.hypot(
        (b.ox + b.w / 2) - (a.ox + a.w / 2),
        (b.oy + LINE_HEIGHT / 2) - (a.oy + LINE_HEIGHT / 2)
      )
      rests.push(dist * CONSTRAINT_DIST)
    }
    return rests
  }

  function isDragged(idx: number) {
    for (const d of dragsRef.current.values()) if (d.idx === idx) return true
    return false
  }

  // Initialize
  useEffect(() => {
    const TEXT = textRef.current
    const ctx = getMeasureCtx()

    // Measure all graphemes
    const allGraphemes = [...segmenter.segment(TEXT)].map(s => s.segment)
    const graphemeWidths = allGraphemes.map(g => ctx.measureText(g).width)
    allGraphemesRef.current = allGraphemes
    graphemeWidthsRef.current = graphemeWidths

    document.fonts.ready.then(() => {
      // Re-measure after fonts load
      ctx.font = FONT
      for (let i = 0; i < allGraphemes.length; i++) {
        graphemeWidths[i] = ctx.measureText(allGraphemes[i]).width
      }
      graphemeWidthsRef.current = graphemeWidths

      preparedRef.current = prepareWithSegments(TEXT, FONT)

      const maxWidth = getMaxWidth()
      const positions = layoutPositions(maxWidth)
      const stringOrder = buildZigzagMapping(maxWidth)
      stringOrderRef.current = stringOrder

      // Build letters in string order
      const letters: Letter[] = stringOrder.map(ri => {
        const p = positions[ri]
        return {
          ch: allGraphemes[ri],
          w: p.w,
          x: p.x, y: p.y,
          ox: p.x, oy: p.y,
          px: p.x, py: p.y,
          readingIdx: ri,
          locked: true,
        }
      })

      // Unlock last 6
      const lastIdx = letters.length - 1
      for (let i = lastIdx; i > lastIdx - 6 && i >= 0; i--) {
        letters[i].locked = false
      }

      lettersRef.current = letters
      restLengthsRef.current = computeRestLengths(letters)
      setLetterCount(letters.length)
      setReady(true)
    })
  }, [])

  // Set textContent on spans after render
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

    // Position hint
    if (hintElRef.current && letters.length > 0) {
      const last = letters[letters.length - 1]
      hintElRef.current.style.transform = `translate(${last.ox - 30}px, ${last.oy + LINE_HEIGHT + 2}px)`
      setTimeout(() => {
        if (hintElRef.current) hintElRef.current.style.opacity = '1'
      }, 500)
    }
  }, [ready])

  // Animation loop
  useEffect(() => {
    if (!ready) return

    let accumulator = 0
    let lastTime = -1

    function simulate() {
      const letters = lettersRef.current
      const restLengths = restLengthsRef.current
      const gravityOn = gravityOnRef.current

      // Unravel step
      if (unravelingRef.current) {
        if (!gravityOn || unravelIdxRef.current < 0) {
          unravelingRef.current = false
        } else if (letters[unravelIdxRef.current]?.locked) {
          const l = letters[unravelIdxRef.current]
          l.locked = false
          l.px = l.x
          l.py = l.y - 0.5
          unravelIdxRef.current--
        } else {
          unravelIdxRef.current--
        }
      }

      // Unlock propagation
      for (let i = letters.length - 2; i >= 0; i--) {
        if (letters[i].locked && !letters[i + 1].locked) {
          const a = letters[i], b = letters[i + 1]
          const dx = (b.x + b.w / 2) - (a.ox + a.w / 2)
          const dy = (b.y + LINE_HEIGHT / 2) - (a.oy + LINE_HEIGHT / 2)
          const dist = Math.hypot(dx, dy)
          if (dist > restLengths[i] + UNLOCK_THRESHOLD) {
            a.locked = false
            a.px = a.x
            a.py = a.y
            if (hintElRef.current) hintElRef.current.style.opacity = '0'
          }
        }
      }

      // Verlet integration
      for (let i = 0; i < letters.length; i++) {
        const l = letters[i]
        if (l.locked || isDragged(i)) continue
        const vx = (l.x - l.px) * DAMPING
        const vy = (l.y - l.py) * DAMPING
        l.px = l.x
        l.py = l.y
        l.x += vx
        l.y += vy + (gravityOn ? GRAVITY : 0)
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
          const diff = (dist - restLengths[i]) / dist
          const aFixed = a.locked || isDragged(i)
          const bFixed = b.locked || isDragged(i + 1)
          if (aFixed && !bFixed) {
            b.x -= dx * diff; b.y -= dy * diff
          } else if (!aFixed && bFixed) {
            a.x += dx * diff; a.y += dy * diff
          } else if (!aFixed && !bFixed) {
            a.x += dx * diff * 0.5; a.y += dy * diff * 0.5
            b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5
          }
        }
      }

      // Letter collision
      for (let i = 0; i < letters.length; i++) {
        if (letters[i].locked) continue
        const a = letters[i]
        const acx = a.x + a.w / 2, acy = a.y + LINE_HEIGHT / 2
        for (let j = i + 1; j < letters.length; j++) {
          if (letters[j].locked) continue
          if (Math.abs(i - j) === 1) continue
          const b = letters[j]
          const bcx = b.x + b.w / 2, bcy = b.y + LINE_HEIGHT / 2
          const dx = bcx - acx, dy = bcy - acy
          const dist = Math.hypot(dx, dy) || 0.001
          const minDist = COLLISION_RADIUS * 2
          if (dist < minDist) {
            const overlap = (minDist - dist) / dist * 0.5
            const aD = isDragged(i), bD = isDragged(j)
            if (aD) { b.x += dx * overlap; b.y += dy * overlap }
            else if (bD) { a.x -= dx * overlap; a.y -= dy * overlap }
            else {
              a.x -= dx * overlap; a.y -= dy * overlap
              b.x += dx * overlap; b.y += dy * overlap
            }
          }
        }
      }

      // Boundary — constrain letters within the container, not the viewport
      const container = containerRef.current
      if (!container) return
      const minX = 0
      const minY = 0
      const maxX = container.clientWidth
      const maxY = container.clientHeight
      for (let i = 0; i < letters.length; i++) {
        const l = letters[i]
        if (l.locked || isDragged(i)) continue
        if (l.x < minX) { l.x = minX; l.px = l.x + (l.x - l.px) * BOUNCE }
        if (l.x + l.w > maxX) { l.x = maxX - l.w; l.px = l.x + (l.x - l.px) * BOUNCE }
        if (l.y < minY) { l.y = minY; l.py = l.y + (l.y - l.py) * BOUNCE }
        if (l.y + LINE_HEIGHT > maxY) { l.y = maxY - LINE_HEIGHT; l.py = l.y + (l.y - l.py) * BOUNCE }
      }
    }

    function render(now: number) {
      if (lastTime < 0) { lastTime = now; rafRef.current = requestAnimationFrame(render); return }
      const dt = Math.min((now - lastTime) / 1000, MAX_STEPS * FIXED_DT)
      lastTime = now
      accumulator += dt

      while (accumulator >= FIXED_DT) {
        simulate()
        accumulator -= FIXED_DT
      }

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
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [ready])

  // Keyboard: F key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        gravityOnRef.current = !gravityOnRef.current
        if (gravityOnRef.current && !unravelingRef.current) {
          unravelingRef.current = true
          if (hintElRef.current) hintElRef.current.style.opacity = '0'
          let idx = lettersRef.current.length - 1
          while (idx >= 0 && !lettersRef.current[idx].locked) idx--
          unravelIdxRef.current = idx
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const newPositions = layoutPositions(getMaxWidth())
      const letters = lettersRef.current
      for (let i = 0; i < letters.length; i++) {
        const np = newPositions[letters[i].readingIdx]
        if (!np) continue
        if (letters[i].locked) {
          letters[i].x = np.x; letters[i].y = np.y
          letters[i].ox = np.x; letters[i].oy = np.y
          letters[i].px = np.x; letters[i].py = np.y
        } else {
          letters[i].ox = np.x; letters[i].oy = np.y
        }
      }
      if (hintElRef.current && letters.length > 0) {
        const last = letters[letters.length - 1]
        hintElRef.current.style.transform = `translate(${last.ox - 30}px, ${last.oy + LINE_HEIGHT + 2}px)`
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Pointer handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    const els = letterElsRef.current
    const idx = els.indexOf(target as HTMLSpanElement)
    if (idx === -1 || lettersRef.current[idx]?.locked) return
    // Don't allow two fingers on same letter
    if (isDragged(idx)) return

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const l = lettersRef.current[idx]

    dragsRef.current.set(e.pointerId, {
      idx,
      offsetX: e.clientX - rect.left - l.x,
      offsetY: e.clientY - rect.top - l.y,
    })
    target.classList.add('dragging')
    target.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragsRef.current.get(e.pointerId)
    if (!d) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const l = lettersRef.current[d.idx]
    l.x = e.clientX - rect.left - d.offsetX
    l.y = e.clientY - rect.top - d.offsetY
    l.px = l.x
    l.py = l.y
    l.locked = false
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const d = dragsRef.current.get(e.pointerId)
    if (!d) return
    const el = letterElsRef.current[d.idx]
    if (el) el.classList.remove('dragging')
    dragsRef.current.delete(e.pointerId)
  }

  return (
    <section className="textstring-section" aria-label="Interactive text physics demo">
      <div className="sr-only" role="region" aria-label="Demo text content">
        <p>{textRef.current}</p>
      </div>

      <div
        ref={containerRef}
        className="textstring-container"
        aria-hidden="true"
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
        <div ref={hintElRef} className="textstring-hint">drag me</div>
      </div>
    </section>
  )
}
