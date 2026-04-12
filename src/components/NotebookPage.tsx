import { useEffect, useRef, useCallback } from 'react'
import { prepareWithSegments, layoutWithLines, layoutNextLine, walkLineRanges } from '@chenglou/pretext'
import type { LayoutCursor, PreparedTextWithSegments } from '@chenglou/pretext'

// ═══════════════════════════════════════════════════════════
// Content
// ═══════════════════════════════════════════════════════════
const HEADLINE_TEXT = 'RESPECT THE CLOCK'

const BODY_TEXT = `There is a conversation that happens in every project, at every company, in every Slack channel where deadlines live. Someone says "this should be quick" about something that is not quick. Someone else says "can you just" before describing three weeks of work. And the clock keeps ticking, indifferent to the gap between what was asked and what it actually takes.

I have sat in meetings where a feature was described in two sentences and expected in two days. I have received messages at 11 PM on a Friday that begin with "hey, quick question" and end with an architecture decision. I have watched timelines get cut in half by people who have never opened a code editor, and I have smiled and said "I will see what I can do" more times than I should have.

The problem is not that the work is hard. The work is always hard. The problem is the assumption that because someone can describe what they want simply, it must be simple to build. A button is never just a button. It is state management, accessibility, error handling, loading states, edge cases, browser quirks, and the inevitable moment where the design changes after you have already shipped.

Time is the only resource that does not scale. You cannot hire more of it. You cannot optimize it with a better algorithm. You cannot deploy it to a faster server. When someone wastes your time, they are spending something that neither of you can earn back. And yet it gets spent casually, as if there were an infinite supply.

I learned to protect my time the hard way. By burning out. By delivering on impossible deadlines and being rewarded with more impossible deadlines. By saying yes until yes stopped meaning anything. The turning point was not dramatic. It was a Tuesday. I looked at my calendar and realized I had eight hours of meetings and was still expected to write code. Something had to give, and for once it was not going to be me.

Now I set boundaries. Not because I am difficult, but because good work requires space. A developer who is constantly interrupted produces fragmented code. A designer who is always in meetings never enters flow state. A team that treats urgency as the default loses the ability to distinguish what actually matters.

The clock on this page is not decoration. Drag it around, watch the text reflow in real time. The text respects the clock. It flows around it, adjusts to it, makes room for it. That is not a technical trick. That is a metaphor. When you respect the constraints, the work finds its shape. When you pretend the constraints do not exist, everything breaks.

Every hour has a cost. Every "quick call" has a cost. Every context switch, every scope creep, every "let's just add one more thing" has a cost. The best teams I have worked with understood this. They did not treat developer time as free. They did not confuse presence with productivity. They knew that the most expensive line of code is the one written by someone who did not have time to think.`

const PULLQUOTE_TEXTS = [
  '\u201cA button is never just a button. It is state management, accessibility, error handling, and the moment where the design changes after you have already shipped.\u201d',
  '\u201cEvery hour has a cost. The best teams do not treat developer time as free. They do not confuse presence with productivity.\u201d',
]

// ═══════════════════════════════════════════════════════════
// Layout constants
// ═══════════════════════════════════════════════════════════
const BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const BODY_LH = 30
const HL_FONT = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const GUTTER = 48
const COL_GAP = 40
const DROP_CAP_LINES = 3
const MIN_SLOT = 50
const CLOCK_R = 130
const PQ_FONT = `italic 19px ${HL_FONT}`
const PQ_LH = 27

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════
type Iv = { left: number; right: number }
type PLine = { x: number; y: number; text: string; width: number }
type CObs = { cx: number; cy: number; r: number; hPad: number; vPad: number }
type RObs = { x: number; y: number; w: number; h: number }
type PQRect = RObs & { lines: PLine[]; colIdx: number }

// ═══════════════════════════════════════════════════════════
// Layout helpers (same algorithm as ClockSection)
// ═══════════════════════════════════════════════════════════
function carveSlots(base: Iv, blocked: Iv[]): Iv[] {
  let slots = [base]
  for (const b of blocked) {
    const next: Iv[] = []
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) { next.push(s); continue }
      if (b.left > s.left) next.push({ left: s.left, right: b.left })
      if (b.right < s.right) next.push({ left: b.right, right: s.right })
    }
    slots = next
  }
  return slots.filter(s => s.right - s.left >= MIN_SLOT)
}

function circleIv(cx: number, cy: number, r: number, bT: number, bB: number, hP: number, vP: number): Iv | null {
  const top = bT - vP, bottom = bB + vP
  if (top >= cy + r || bottom <= cy - r) return null
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom
  if (minDy >= r) return null
  const maxDx = Math.sqrt(r * r - minDy * minDy)
  return { left: cx - maxDx - hP, right: cx + maxDx + hP }
}

function fitHL(maxW: number, maxH: number, maxS = 92): { fontSize: number; lines: PLine[] } {
  let lo = 20, hi = maxS, best = lo, bestLines: PLine[] = []
  while (lo <= hi) {
    const sz = Math.floor((lo + hi) / 2)
    const font = `700 ${sz}px ${HL_FONT}`
    const lh = Math.round(sz * 0.93)
    const p = prepareWithSegments(HEADLINE_TEXT, font)
    let breaks = false, n = 0
    walkLineRanges(p, maxW, l => { n++; if (l.end.graphemeIndex !== 0) breaks = true })
    if (!breaks && n * lh <= maxH) {
      best = sz
      const r = layoutWithLines(p, maxW, lh)
      bestLines = r.lines.map((l, i) => ({ x: 0, y: i * lh, text: l.text, width: l.width }))
      lo = sz + 1
    } else hi = sz - 1
  }
  return { fontSize: best, lines: bestLines }
}

function layCol(
  prep: PreparedTextWithSegments, cur: LayoutCursor,
  rX: number, rY: number, rW: number, rH: number,
  lh: number, cObs: CObs[], rObs: RObs[], single = false,
): { lines: PLine[]; cursor: LayoutCursor } {
  let cursor = cur, lineTop = rY
  const lines: PLine[] = []
  let done = false
  while (lineTop + lh <= rY + rH && !done) {
    const bT = lineTop, bB = lineTop + lh
    const blocked: Iv[] = []
    for (const o of cObs) { const iv = circleIv(o.cx, o.cy, o.r, bT, bB, o.hPad, o.vPad); if (iv) blocked.push(iv) }
    for (const r of rObs) { if (bB <= r.y || bT >= r.y + r.h) continue; blocked.push({ left: r.x, right: r.x + r.w }) }
    const slots = carveSlots({ left: rX, right: rX + rW }, blocked)
    if (!slots.length) { lineTop += lh; continue }
    const ordered = single ? [slots.reduce((b, s) => s.right - s.left > b.right - b.left ? s : b)] : [...slots].sort((a, b) => a.left - b.left)
    for (const slot of ordered) {
      const line = layoutNextLine(prep, cursor, slot.right - slot.left)
      if (!line) { done = true; break }
      lines.push({ x: Math.round(slot.left), y: Math.round(lineTop), text: line.text, width: line.width })
      cursor = line.end
    }
    lineTop += lh
  }
  return { lines, cursor }
}

// ═══════════════════════════════════════════════════════════
// Clock drawing (notebook color scheme)
// ═══════════════════════════════════════════════════════════
function drawClock(ctx: CanvasRenderingContext2D, r: number) {
  const now = new Date()
  const h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds(), ms = now.getMilliseconds()
  const smooth = s + ms / 1000

  ctx.clearRect(0, 0, r * 2, r * 2)
  ctx.save()
  ctx.translate(r, r)

  // Face
  ctx.beginPath(); ctx.arc(0, 0, r - 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 15, 20, 0.92)'; ctx.fill()
  ctx.strokeStyle = 'rgba(252, 49, 76, 0.3)'; ctx.lineWidth = 2; ctx.stroke()

  // Marks
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, isQ = i % 3 === 0
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * (r - (isQ ? 26 : 20)), Math.sin(a) * (r - (isQ ? 26 : 20)))
    ctx.lineTo(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10))
    ctx.strokeStyle = isQ ? '#FC314C' : '#FC6D80'; ctx.lineWidth = isQ ? 3 : 1.5; ctx.lineCap = 'round'; ctx.stroke()
  }

  ctx.fillStyle = '#FC6D80'
  ctx.font = `600 ${Math.round(r * 0.1)}px "Helvetica Neue", Helvetica, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('RESPECT', 0, r * 0.28)

  // Hour
  const hA = ((h + m / 60) * Math.PI) / 6 - Math.PI / 2
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(hA) * r * 0.45, Math.sin(hA) * r * 0.45)
  ctx.strokeStyle = '#e8e4dc'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke()

  // Minute
  const mA = ((m + smooth / 60) * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(mA) * r * 0.65, Math.sin(mA) * r * 0.65)
  ctx.strokeStyle = '#e8e4dc'; ctx.lineWidth = 3; ctx.stroke()

  // Second
  const sA = (smooth * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(Math.cos(sA + Math.PI) * r * 0.12, Math.sin(sA + Math.PI) * r * 0.12)
  ctx.lineTo(Math.cos(sA) * r * 0.75, Math.sin(sA) * r * 0.75)
  ctx.strokeStyle = '#FC314C'; ctx.lineWidth = 1.5; ctx.stroke()

  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#FC314C'; ctx.fill()
  ctx.restore()
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
type Props = { width?: number; height?: number }

export function NotebookPage({ width = 1400, height = 1000 }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropCapRef = useRef<HTMLDivElement>(null)
  const linePoolRef = useRef<HTMLDivElement[]>([])
  const hlPoolRef = useRef<HTMLDivElement[]>([])
  const pqLinePoolRef = useRef<HTMLDivElement[]>([])
  const pqBoxPoolRef = useRef<HTMLDivElement[]>([])
  const rafRef = useRef(0)
  const clockRef = useRef({ x: width * 0.6, y: height * 0.45, r: CLOCK_R })
  const dragRef = useRef<{ sx: number; sy: number; cx: number; cy: number; scale: number } | null>(null)
  const preparedRef = useRef<PreparedTextWithSegments | null>(null)
  const preparedPqRef = useRef<PreparedTextWithSegments[]>([])
  const dcWidthRef = useRef(0)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    document.fonts.ready.then(() => {
      preparedRef.current = prepareWithSegments(BODY_TEXT, BODY_FONT)
      preparedPqRef.current = PULLQUOTE_TEXTS.map(t => prepareWithSegments(t, PQ_FONT))

      const dcSize = BODY_LH * DROP_CAP_LINES - 4
      const dcFont = `700 ${dcSize}px ${HL_FONT}`
      const prepDC = prepareWithSegments(BODY_TEXT[0], dcFont)
      let w = 0
      walkLineRanges(prepDC, 9999, line => { w = line.width })
      dcWidthRef.current = Math.ceil(w) + 10

      startLoop()
    })

    function syncPool(pool: HTMLDivElement[], count: number, cls: string) {
      while (pool.length < count) {
        const el = document.createElement('div')
        el.className = cls
        stage.appendChild(el)
        pool.push(el)
      }
      for (let i = 0; i < pool.length; i++) pool[i].style.display = i < count ? '' : 'none'
    }

    function render() {
      const prepared = preparedRef.current
      if (!prepared) return

      const pw = stage.clientWidth
      const ph = stage.clientHeight
      const isNarrow = pw < 760
      const gutter = isNarrow ? 20 : GUTTER
      const colGap = isNarrow ? 20 : COL_GAP
      const clock = clockRef.current

      const cObs: CObs[] = [{ cx: clock.x, cy: clock.y, r: clock.r, hPad: 16, vPad: 4 }]

      // Headline
      const hlW = Math.min(pw - gutter * 2, 1000)
      const hlMaxH = Math.floor(ph * 0.24)
      const { fontSize: hlSz, lines: hlLines } = fitHL(hlW, hlMaxH)
      const hlLH = Math.round(hlSz * 0.93)
      const hlFont = `700 ${hlSz}px ${HL_FONT}`
      const hlH = hlLines.length * hlLH

      syncPool(hlPoolRef.current, hlLines.length, 'np-headline')
      for (let i = 0; i < hlLines.length; i++) {
        const el = hlPoolRef.current[i]
        el.textContent = hlLines[i].text
        el.style.left = `${gutter}px`; el.style.top = `${gutter + hlLines[i].y}px`
        el.style.font = hlFont; el.style.lineHeight = `${hlLH}px`
      }

      // Body area
      const bodyTop = gutter + hlH + 20
      const bodyH = ph - bodyTop - 20
      const colCount = pw > 1000 ? 3 : pw > 640 ? 2 : 1
      const totalGut = gutter * 2 + colGap * (colCount - 1)
      const colW = Math.floor((Math.min(pw, 1500) - totalGut) / colCount)
      const contentLeft = Math.round((pw - (colCount * colW + (colCount - 1) * colGap)) / 2)

      // Drop cap
      const dcSize = BODY_LH * DROP_CAP_LINES - 4
      const dcFont = `700 ${dcSize}px ${HL_FONT}`
      const dcRect: RObs = { x: contentLeft - 2, y: bodyTop - 2, w: dcWidthRef.current, h: DROP_CAP_LINES * BODY_LH + 2 }
      if (dropCapRef.current) {
        dropCapRef.current.textContent = BODY_TEXT[0]
        dropCapRef.current.style.font = dcFont
        dropCapRef.current.style.lineHeight = `${dcSize}px`
        dropCapRef.current.style.left = `${contentLeft}px`
        dropCapRef.current.style.top = `${bodyTop}px`
      }

      // Pullquotes
      const pqPl = [
        { colIdx: 0, yFrac: 0.48, wFrac: 0.52, side: 'right' as const },
        { colIdx: 1, yFrac: 0.32, wFrac: 0.5, side: 'left' as const },
      ]
      const pqRects: PQRect[] = []
      if (!isNarrow) {
        for (let i = 0; i < preparedPqRef.current.length; i++) {
          const pl = pqPl[i]
          if (!pl || pl.colIdx >= colCount) continue
          const pqW = Math.round(colW * pl.wFrac)
          const pqLines = layoutWithLines(preparedPqRef.current[i], pqW - 20, PQ_LH).lines
          const pqH = pqLines.length * PQ_LH + 16
          const colX = contentLeft + pl.colIdx * (colW + colGap)
          const pqX = pl.side === 'right' ? colX + colW - pqW : colX
          const pqY = Math.round(bodyTop + bodyH * pl.yFrac)
          const pos = pqLines.map((l, li) => ({ x: pqX + 20, y: pqY + 8 + li * PQ_LH, text: l.text, width: l.width }))
          pqRects.push({ x: pqX, y: pqY, w: pqW, h: pqH, lines: pos, colIdx: pl.colIdx })
        }
      }

      // Body text columns
      const allLines: PLine[] = []
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 1 }
      for (let col = 0; col < colCount; col++) {
        const colX = contentLeft + col * (colW + colGap)
        const rects: RObs[] = []
        if (col === 0) rects.push(dcRect)
        for (const pq of pqRects) if (pq.colIdx === col) rects.push({ x: pq.x, y: pq.y, w: pq.w, h: pq.h })
        const res = layCol(prepared, cursor, colX, bodyTop, colW, bodyH, BODY_LH, cObs, rects, isNarrow)
        allLines.push(...res.lines)
        cursor = res.cursor
      }

      // Render body lines
      syncPool(linePoolRef.current, allLines.length, 'np-body-line')
      for (let i = 0; i < allLines.length; i++) {
        const el = linePoolRef.current[i]
        el.textContent = allLines[i].text
        el.style.left = `${allLines[i].x}px`; el.style.top = `${allLines[i].y}px`
        el.style.font = BODY_FONT; el.style.lineHeight = `${BODY_LH}px`
      }

      // Render pullquotes
      let totalPqL = 0
      for (const pq of pqRects) totalPqL += pq.lines.length
      syncPool(pqBoxPoolRef.current, pqRects.length, 'np-pq-box')
      syncPool(pqLinePoolRef.current, totalPqL, 'np-pq-line')
      let pi = 0
      for (let i = 0; i < pqRects.length; i++) {
        const pq = pqRects[i], box = pqBoxPoolRef.current[i]
        box.style.left = `${pq.x}px`; box.style.top = `${pq.y}px`
        box.style.width = `${pq.w}px`; box.style.height = `${pq.h}px`
        for (const l of pq.lines) {
          const el = pqLinePoolRef.current[pi++]
          el.textContent = l.text
          el.style.left = `${l.x}px`; el.style.top = `${l.y}px`
          el.style.font = PQ_FONT; el.style.lineHeight = `${PQ_LH}px`
        }
      }

      // Clock canvas
      const canvas = canvasRef.current
      if (canvas) {
        const sz = clock.r * 2
        if (canvas.width !== sz || canvas.height !== sz) { canvas.width = sz; canvas.height = sz }
        canvas.style.left = `${clock.x - clock.r}px`; canvas.style.top = `${clock.y - clock.r}px`
        canvas.style.width = `${sz}px`; canvas.style.height = `${sz}px`
        const c = canvas.getContext('2d')
        if (c) drawClock(c, clock.r)
      }
    }

    function startLoop() {
      function frame() { render(); rafRef.current = requestAnimationFrame(frame) }
      rafRef.current = requestAnimationFrame(frame)
    }

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [width, height])

  // ── Zoom-aware pointer handlers ───────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const scale = rect.width / stage.clientWidth
    const localX = (e.clientX - rect.left) / scale
    const localY = (e.clientY - rect.top) / scale

    const clock = clockRef.current
    const dx = localX - clock.x, dy = localY - clock.y
    if (dx * dx + dy * dy <= clock.r * clock.r) {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = { sx: e.clientX, sy: e.clientY, cx: clock.x, cy: clock.y, scale }
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    clockRef.current.x = d.cx + (e.clientX - d.sx) / d.scale
    clockRef.current.y = d.cy + (e.clientY - d.sy) / d.scale
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  return (
    <div
      data-interactive
      className="notebook-page"
      style={{ width, height }}
    >
      <div
        ref={stageRef}
        className="np-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={dropCapRef} className="np-drop-cap" />
        <canvas ref={canvasRef} className="np-clock" />
      </div>
    </div>
  )
}
