import { useEffect, useRef, useCallback } from 'react'
import { prepareWithSegments, layoutWithLines, layoutNextLine, walkLineRanges } from '@chenglou/pretext'
import type { LayoutCursor, PreparedTextWithSegments } from '@chenglou/pretext'

const BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Apple SD Gothic Neo", "Noto Serif KR", "Book Antiqua", Palatino, serif'
const BODY_LINE_HEIGHT = 30
const HEADLINE_FONT_FAMILY = '"Iowan Old Style", "Palatino Linotype", "Apple SD Gothic Neo", "Noto Serif KR", "Book Antiqua", Palatino, serif'
const HEADLINE_TEXT = 'WAKE UP WITH ALARMY'
const GUTTER = 48
const COL_GAP = 40
const DROP_CAP_LINES = 3
const MIN_SLOT_WIDTH = 50
const CLOCK_RADIUS = 130
const NARROW_BREAKPOINT = 760
const NARROW_CLOCK_SCALE = 0.7
const PQ_FONT = `italic 19px ${HEADLINE_FONT_FAMILY}`
const PQ_LINE_HEIGHT = 27

const BODY_TEXT = `Alarmy는 전 세계 7,500만 사용자가 선택한 알람 앱입니다. 단순히 소리를 울리는 앱이 아닙니다. 사진 찍기, 수학 문제 풀기, QR 코드 스캔 등 미션을 완료해야만 알람이 꺼집니다. 확실히 잠에서 깨어나야 할 때, Alarmy가 있습니다.

매일 아침, 수백만 명의 사용자가 Alarmy와 함께 하루를 시작합니다. 기상 미션부터 수면 분석, 코골이 녹음까지 — 건강한 수면 습관을 만드는 종합적인 수면 솔루션입니다. 단순한 알람 앱을 넘어, 당신의 아침을 바꾸는 라이프스타일 도구입니다.

미션 알람은 Alarmy의 핵심입니다. 사진 미션은 지정한 장소에서 사진을 찍어야 알람이 해제됩니다. 침대에서 눈을 세면대까지 걸어가야 하죠. 흔들기 미션은 스마트폰을 일정 횟수 흔들어야 합니다. 수학 미션은 간단한 연산부터 복잡한 방정식까지, 두뇌를 깨우는 데 효과적입니다. 타이핑 미션은 주어진 문장을 정확히 입력해야 합니다. 이 모든 미션은 하나의 목표를 향합니다 — 당신이 확실히 잠에서 깨어나는 것.

수면 분석 기능은 수면 패턴을 추적하고, 코골이를 녹음하여 수면 품질을 시각화합니다. 매일 밤 얼마나 깊이 잤는지, 몇 번 뒤척였는지, 코골이가 얼마나 심했는지를 데이터로 보여줍니다. 이 데이터는 더 나은 수면 습관을 만드는 출발점이 됩니다.

알람 소리도 풍부합니다. 인기 음악부터 커스텀 사운드까지, 원하는 소리로 아침을 맞이하세요. Spotify와 연동하면 좋아하는 플레이리스트로 기상할 수 있습니다. 점점 커지는 볼륨, 진동 패턴, 스누즈 설정 등 세밀한 설정이 가능합니다.

Alarmy는 2012년 처음 세상에 나왔습니다. 그때부터 지금까지, "확실히 깨워주는 알람"이라는 하나의 약속을 지켜왔습니다. App Store와 Google Play에서 모두 최고 평점을 유지하고 있으며, 전 세계 150개국 이상에서 사랑받고 있습니다. 매일 아침, Alarmy는 수백만 명의 하루를 엽니다.

이 페이지의 텍스트는 CSS가 아닌 JavaScript로 레이아웃됩니다. pretext 라이브러리는 DOM에 건드리지 않고 텍스트를 측정하고 배치합니다. 화면 중앙의 시계를 드래그해보세요. 텍스트가 실시간으로 시계를 피해 흘러가는 것을 볼 수 있습니다. 이것이 DOM 없는 텍스트 레이아웃의 힘입니다.`

const PULLQUOTE_TEXTS = [
  '"확실히 잠에서 깨어나야 할 때, Alarmy가 답입니다. 전 세계 7,500만 사용자가 증명합니다."',
  '"15킬로바이트, 의존성 제로, DOM 읽기 제로. 그리고 텍스트는 흐릅니다."',
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
  ctx.fillText('ALARMY', 0, r * 0.28)

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
    const stage = stageRef.current
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
