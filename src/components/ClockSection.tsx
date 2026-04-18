import { useEffect, useRef, useCallback } from 'react'
import { prepareWithSegments, layoutWithLines, layoutNextLine, walkLineRanges } from '@chenglou/pretext'
import type { LayoutCursor, PreparedTextWithSegments } from '@chenglou/pretext'

const BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Apple SD Gothic Neo", "Noto Serif KR", "Book Antiqua", Palatino, serif'
const BODY_LINE_HEIGHT = 30
const HEADLINE_FONT_FAMILY = '"Iowan Old Style", "Palatino Linotype", "Apple SD Gothic Neo", "Noto Serif KR", "Book Antiqua", Palatino, serif'
const HEADLINE_TEXT = `Awshaf's Digital Notebook`
const GUTTER = 48
const COL_GAP = 40
const DROP_CAP_LINES = 3
const MIN_SLOT_WIDTH = 50
const CLOCK_RADIUS = 130
const NARROW_BREAKPOINT = 760
const NARROW_CLOCK_SCALE = 0.7
const PQ_FONT = `italic 19px ${HEADLINE_FONT_FAMILY}`
const PQ_LINE_HEIGHT = 27

const BODY_TEXT = `There is a conversation that happens in every project, at every company, in every Slack channel where deadlines live. Someone says "this should be quick" about something that is not quick. Someone else says "can you just" before describing three weeks of work. And the clock keeps ticking, indifferent to the gap between what was asked and what it actually takes.

I have sat in meetings where a feature was described in two sentences and expected in two days. I have received messages at 11 PM on a Friday that begin with "hey, quick question" and end with an architecture decision. I have watched timelines get cut in half by people who have never opened a code editor, and I have smiled and said "I will see what I can do" more times than I should have.

The problem is not that the work is hard. The work is always hard. The problem is the assumption that because someone can describe what they want simply, it must be simple to build. A button is never just a button. It is state management, accessibility, error handling, loading states, edge cases, browser quirks, and the inevitable moment where the design changes after you have already shipped.

Time is the only resource that does not scale. You cannot hire more of it. You cannot optimize it with a better algorithm. You cannot deploy it to a faster server. When someone wastes your time, they are spending something that neither of you can earn back. And yet it gets spent casually, as if there were an infinite supply.

I learned to protect my time the hard way. By burning out. By delivering on impossible deadlines and being rewarded with more impossible deadlines. By saying yes until yes stopped meaning anything. The turning point was not dramatic. It was a Tuesday. I looked at my calendar and realized I had eight hours of meetings and was still expected to write code. Something had to give, and for once it was not going to be me.

Now I set boundaries. Not because I am difficult, but because good work requires space. A developer who is constantly interrupted produces fragmented code. A designer who is always in meetings never enters flow state. A team that treats urgency as the default loses the ability to distinguish what actually matters.

The clock on this page is not decoration. Drag it around, watch the text reflow in real time. The text respects the clock. It flows around it, adjusts to it, makes room for it. That is not a technical trick. That is a metaphor. When you respect the constraints, the work finds its shape. When you pretend the constraints do not exist, everything breaks.

Every hour has a cost. Every "quick call" has a cost. Every context switch, every scope creep, every "let's just add one more thing" has a cost. The best teams I have worked with understood this. They did not treat developer time as free. They did not confuse presence with productivity. They knew that the most expensive line of code is the one written by someone who did not have time to think.`

const PULLQUOTE_TEXTS = [
  '"A button is never just a button. It is state management, accessibility, error handling, and the moment where the design changes after you have already shipped."',
  '"Every hour has a cost. The best teams do not treat developer time as free. They do not confuse presence with productivity."',
]

type Interval = { left: number; right: number }
type PositionedLine = { x: number; y: number; width: number; text: string }
type CircleObstacle = { cx: number; cy: number; r: number; hPad: number; vPad: number }
type RectObstacle = { x: number; y: number; w: number; h: number }
type PullquoteRect = RectObstacle & { lines: PositionedLine[]; colIdx: number }
type HeadlineFit = { fontSize: number; lines: PositionedLine[] }

function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base]
  for (const interval of blocked) {
    const next: Interval[] = []
    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) { next.push(slot); continue }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left })
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right })
    }
    slots = next
  }
  return slots.filter(s => s.right - s.left >= MIN_SLOT_WIDTH)
}

function circleIntervalForBand(
  cx: number, cy: number, r: number,
  bandTop: number, bandBottom: number,
  hPad: number, vPad: number,
): Interval | null {
  const top = bandTop - vPad
  const bottom = bandBottom + vPad
  if (top >= cy + r || bottom <= cy - r) return null
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom
  if (minDy >= r) return null
  const maxDx = Math.sqrt(r * r - minDy * minDy)
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad }
}

function fitHeadline(maxWidth: number, maxHeight: number, maxSize = 92): HeadlineFit {
  let lo = 20, hi = maxSize, best = lo
  let bestLines: PositionedLine[] = []
  while (lo <= hi) {
    const size = Math.floor((lo + hi) / 2)
    const font = `700 ${size}px ${HEADLINE_FONT_FAMILY}`
    const lineHeight = Math.round(size * 0.93)
    const prepared = prepareWithSegments(HEADLINE_TEXT, font)
    let breaksWord = false, lineCount = 0
    walkLineRanges(prepared, maxWidth, line => { lineCount++; if (line.end.graphemeIndex !== 0) breaksWord = true })
    if (!breaksWord && lineCount * lineHeight <= maxHeight) {
      best = size
      const result = layoutWithLines(prepared, maxWidth, lineHeight)
      bestLines = result.lines.map((line, i) => ({ x: 0, y: i * lineHeight, text: line.text, width: line.width }))
      lo = size + 1
    } else { hi = size - 1 }
  }
  return { fontSize: best, lines: bestLines }
}

function layoutColumn(
  prepared: PreparedTextWithSegments, startCursor: LayoutCursor,
  regionX: number, regionY: number, regionW: number, regionH: number,
  lineHeight: number, circleObstacles: CircleObstacle[], rectObstacles: RectObstacle[],
  singleSlotOnly = false,
): { lines: PositionedLine[]; cursor: LayoutCursor } {
  let cursor = startCursor, lineTop = regionY
  const lines: PositionedLine[] = []
  let textExhausted = false
  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop, bandBottom = lineTop + lineHeight
    const blocked: Interval[] = []
    for (const ob of circleObstacles) {
      const iv = circleIntervalForBand(ob.cx, ob.cy, ob.r, bandTop, bandBottom, ob.hPad, ob.vPad)
      if (iv) blocked.push(iv)
    }
    for (const rect of rectObstacles) {
      if (bandBottom <= rect.y || bandTop >= rect.y + rect.h) continue
      blocked.push({ left: rect.x, right: rect.x + rect.w })
    }
    const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked)
    if (slots.length === 0) { lineTop += lineHeight; continue }
    const ordered = singleSlotOnly
      ? [slots.reduce((best, s) => (s.right - s.left > best.right - best.left ? s : best))]
      : [...slots].sort((a, b) => a.left - b.left)
    for (const slot of ordered) {
      const line = layoutNextLine(prepared, cursor, slot.right - slot.left)
      if (!line) { textExhausted = true; break }
      lines.push({ x: Math.round(slot.left), y: Math.round(lineTop), text: line.text, width: line.width })
      cursor = line.end
    }
    lineTop += lineHeight
  }
  return { lines, cursor }
}

function drawClock(ctx: CanvasRenderingContext2D, r: number) {
  const now = new Date()
  const hours = now.getHours() % 12
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const millis = now.getMilliseconds()
  const smooth = seconds + millis / 1000

  ctx.clearRect(0, 0, r * 2, r * 2)
  ctx.save()
  ctx.translate(r, r)

  ctx.beginPath()
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 15, 20, 0.92)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(252, 49, 76, 0.3)'
  ctx.lineWidth = 2
  ctx.stroke()

  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6
    const isQ = i % 3 === 0
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * (r - (isQ ? 26 : 20)), Math.sin(angle) * (r - (isQ ? 26 : 20)))
    ctx.lineTo(Math.cos(angle) * (r - 10), Math.sin(angle) * (r - 10))
    ctx.strokeStyle = isQ ? '#FC314C' : '#FC6D80'
    ctx.lineWidth = isQ ? 3 : 1.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  ctx.fillStyle = '#FC6D80'
  ctx.font = `600 ${Math.round(r * 0.1)}px "Helvetica Neue", Helvetica, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('RESPECT', 0, r * 0.28)

  const hAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(hAngle) * r * 0.45, Math.sin(hAngle) * r * 0.45)
  ctx.strokeStyle = '#e8e4dc'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke()

  const mAngle = ((minutes + smooth / 60) * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(mAngle) * r * 0.65, Math.sin(mAngle) * r * 0.65)
  ctx.strokeStyle = '#e8e4dc'; ctx.lineWidth = 3; ctx.stroke()

  const sAngle = (smooth * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(Math.cos(sAngle + Math.PI) * r * 0.12, Math.sin(sAngle + Math.PI) * r * 0.12)
  ctx.lineTo(Math.cos(sAngle) * r * 0.75, Math.sin(sAngle) * r * 0.75)
  ctx.strokeStyle = '#FC314C'; ctx.lineWidth = 1.5; ctx.stroke()

  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#FC314C'; ctx.fill()
  ctx.restore()
}

export function ClockSection() {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropCapRef = useRef<HTMLDivElement>(null)
  const linePoolRef = useRef<HTMLDivElement[]>([])
  const headlinePoolRef = useRef<HTMLDivElement[]>([])
  const pqLinePoolRef = useRef<HTMLDivElement[]>([])
  const pqBoxPoolRef = useRef<HTMLDivElement[]>([])
  const rafRef = useRef(0)
  const clockRef = useRef({ x: 0, y: 0, r: CLOCK_RADIUS })
  const dragRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null)
  const preparedRef = useRef<PreparedTextWithSegments | null>(null)
  const preparedPqRef = useRef<PreparedTextWithSegments[]>([])
  const dropCapWidthRef = useRef(0)

  useEffect(() => {
    const stage = stageRef.current!
    if (!stage) return

    clockRef.current.x = window.innerWidth / 2
    clockRef.current.y = window.innerHeight / 2
    const isNarrow = window.innerWidth < NARROW_BREAKPOINT
    clockRef.current.r = CLOCK_RADIUS * (isNarrow ? NARROW_CLOCK_SCALE : 1)

    document.fonts.ready.then(() => {
      preparedRef.current = prepareWithSegments(BODY_TEXT, BODY_FONT)
      preparedPqRef.current = PULLQUOTE_TEXTS.map(t => prepareWithSegments(t, PQ_FONT))

      const dropCapSize = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4
      const dropCapFont = `700 ${dropCapSize}px ${HEADLINE_FONT_FAMILY}`
      const prepDC = prepareWithSegments(BODY_TEXT[0], dropCapFont)
      let w = 0
      walkLineRanges(prepDC, 9999, line => { w = line.width })
      dropCapWidthRef.current = Math.ceil(w) + 10

      startLoop()
    })

    function syncPool(pool: HTMLDivElement[], count: number, className: string) {
      while (pool.length < count) {
        const el = document.createElement('div')
        el.className = className
        stage.appendChild(el)
        pool.push(el)
      }
      for (let i = 0; i < pool.length; i++) pool[i].style.display = i < count ? '' : 'none'
    }

    function render() {
      const prepared = preparedRef.current
      if (!prepared) return

      const pw = stage.clientWidth || document.documentElement.clientWidth
      const ph = stage.clientHeight || document.documentElement.clientHeight
      const isNarrow = pw < NARROW_BREAKPOINT
      const gutter = isNarrow ? 20 : GUTTER
      const colGap = isNarrow ? 20 : COL_GAP
      const clock = clockRef.current
      clock.r = CLOCK_RADIUS * (isNarrow ? NARROW_CLOCK_SCALE : 1)

      const circleObs: CircleObstacle[] = [{ cx: clock.x, cy: clock.y, r: clock.r, hPad: 16, vPad: 4 }]

      const hlW = Math.min(pw - gutter * 2, 1000)
      const hlMaxH = Math.floor(ph * (isNarrow ? 0.2 : 0.24))
      const { fontSize: hlSize, lines: hlLines } = fitHeadline(hlW, hlMaxH, isNarrow ? 38 : 92)
      const hlLH = Math.round(hlSize * 0.93)
      const hlFont = `700 ${hlSize}px ${HEADLINE_FONT_FAMILY}`
      const hlHeight = hlLines.length * hlLH

      syncPool(headlinePoolRef.current, hlLines.length, 'clock-headline-line')
      for (let i = 0; i < hlLines.length; i++) {
        const el = headlinePoolRef.current[i]
        const l = hlLines[i]
        el.textContent = l.text
        el.style.left = `${gutter}px`
        el.style.top = `${gutter + l.y}px`
        el.style.font = hlFont
        el.style.lineHeight = `${hlLH}px`
      }

      const bodyTop = gutter + hlHeight + (isNarrow ? 14 : 20)
      const bodyH = ph - bodyTop - 20
      const colCount = pw > 1000 ? 3 : pw > 640 ? 2 : 1
      const totalGut = gutter * 2 + colGap * (colCount - 1)
      const colW = Math.floor((Math.min(pw, 1500) - totalGut) / colCount)
      const contentLeft = Math.round((pw - (colCount * colW + (colCount - 1) * colGap)) / 2)

      const dcSize = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4
      const dcFont = `700 ${dcSize}px ${HEADLINE_FONT_FAMILY}`
      const dcRect: RectObstacle = { x: contentLeft - 2, y: bodyTop - 2, w: dropCapWidthRef.current, h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2 }

      if (dropCapRef.current) {
        dropCapRef.current.textContent = BODY_TEXT[0]
        dropCapRef.current.style.font = dcFont
        dropCapRef.current.style.lineHeight = `${dcSize}px`
        dropCapRef.current.style.left = `${contentLeft}px`
        dropCapRef.current.style.top = `${bodyTop}px`
      }

      // Pullquotes
      const pqPlacements = [
        { colIdx: 0, yFrac: 0.48, wFrac: 0.52, side: 'right' as const },
        { colIdx: 1, yFrac: 0.32, wFrac: 0.5, side: 'left' as const },
      ]
      const pqRects: PullquoteRect[] = []
      if (!isNarrow) {
        for (let i = 0; i < preparedPqRef.current.length; i++) {
          const pl = pqPlacements[i]
          if (!pl || pl.colIdx >= colCount) continue
          const pqW = Math.round(colW * pl.wFrac)
          const pqLines = layoutWithLines(preparedPqRef.current[i], pqW - 20, PQ_LINE_HEIGHT).lines
          const pqH = pqLines.length * PQ_LINE_HEIGHT + 16
          const colX = contentLeft + pl.colIdx * (colW + colGap)
          const pqX = pl.side === 'right' ? colX + colW - pqW : colX
          const pqY = Math.round(bodyTop + bodyH * pl.yFrac)
          const positioned = pqLines.map((line, li) => ({ x: pqX + 20, y: pqY + 8 + li * PQ_LINE_HEIGHT, text: line.text, width: line.width }))
          pqRects.push({ x: pqX, y: pqY, w: pqW, h: pqH, lines: positioned, colIdx: pl.colIdx })
        }
      }

      // Body text
      const allLines: PositionedLine[] = []
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 1 }
      for (let col = 0; col < colCount; col++) {
        const colX = contentLeft + col * (colW + colGap)
        const rects: RectObstacle[] = []
        if (col === 0) rects.push(dcRect)
        for (const pq of pqRects) { if (pq.colIdx === col) rects.push({ x: pq.x, y: pq.y, w: pq.w, h: pq.h }) }
        const result = layoutColumn(prepared, cursor, colX, bodyTop, colW, bodyH, BODY_LINE_HEIGHT, circleObs, rects, isNarrow)
        allLines.push(...result.lines)
        cursor = result.cursor
      }

      let totalPqLines = 0
      for (const pq of pqRects) totalPqLines += pq.lines.length

      syncPool(linePoolRef.current, allLines.length, 'clock-body-line')
      for (let i = 0; i < allLines.length; i++) {
        const el = linePoolRef.current[i]
        const l = allLines[i]
        el.textContent = l.text
        el.style.left = `${l.x}px`
        el.style.top = `${l.y}px`
        el.style.font = BODY_FONT
        el.style.lineHeight = `${BODY_LINE_HEIGHT}px`
      }

      syncPool(pqBoxPoolRef.current, pqRects.length, 'clock-pq-box')
      syncPool(pqLinePoolRef.current, totalPqLines, 'clock-pq-line')
      let pqIdx = 0
      for (let i = 0; i < pqRects.length; i++) {
        const pq = pqRects[i]
        const box = pqBoxPoolRef.current[i]
        box.style.left = `${pq.x}px`; box.style.top = `${pq.y}px`
        box.style.width = `${pq.w}px`; box.style.height = `${pq.h}px`
        for (const line of pq.lines) {
          const el = pqLinePoolRef.current[pqIdx++]
          el.textContent = line.text
          el.style.left = `${line.x}px`; el.style.top = `${line.y}px`
          el.style.font = PQ_FONT; el.style.lineHeight = `${PQ_LINE_HEIGHT}px`
        }
      }

      // Clock canvas
      const canvas = canvasRef.current
      if (canvas) {
        const size = clock.r * 2
        if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size }
        canvas.style.left = `${clock.x - clock.r}px`
        canvas.style.top = `${clock.y - clock.r}px`
        canvas.style.width = `${size}px`
        canvas.style.height = `${size}px`
        const ctx = canvas.getContext('2d')
        if (ctx) drawClock(ctx, clock.r)
      }
    }

    function startLoop() {
      function frame() {
        render()
        rafRef.current = requestAnimationFrame(frame)
      }
      rafRef.current = requestAnimationFrame(frame)
    }

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const clock = clockRef.current
    const dx = e.clientX - clock.x, dy = e.clientY - clock.y
    if (dx * dx + dy * dy <= clock.r * clock.r) {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = { sx: e.clientX, sy: e.clientY, cx: clock.x, cy: clock.y }
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    clockRef.current.x = d.cx + (e.clientX - d.sx)
    clockRef.current.y = d.cy + (e.clientY - d.sy)
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  return (
    <section className="clock-section" aria-label="Alarmy clock demo">
      <div
        ref={stageRef}
        className="clock-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={dropCapRef} className="clock-drop-cap" />
        <canvas
          ref={canvasRef}
          className="clock-canvas"
        />
      </div>
    </section>
  )
}
