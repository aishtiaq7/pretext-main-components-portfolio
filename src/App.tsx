import { useEffect, useRef, useState } from 'react'
import { prepareWithSegments } from '@chenglou/pretext'
import type { PreparedTextWithSegments } from '@chenglou/pretext'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import { PARAGRAPHS } from './content'
import { fitHeadline, layoutPages, measureDropCap } from './layout'
import { createOrb, moveOrbs, orbToObstacle, pauseAllOrbs } from './orbs'
import { syncPool, renderHeadlineLines, renderBodyLines, renderOrbs, renderDropCap } from './renderer'
import { Header } from './components/Header'
import { Main } from './components/Main'
import { Footer } from './components/Footer'
import type { Orb, OrbDef, Stats } from './types'

const BODY_FONT = '18px "Atkinson Hyperlegible", system-ui, sans-serif'
const BODY_LINE_HEIGHT = 30
const HEADLINE_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif'
const HEADLINE_TEXT = 'Text animations and accessibility'
const GUTTER = 48
const COL_GAP = 40
const STATS_BAR_HEIGHT = 42
const HINT_BAR_HEIGHT = 40
const BOTTOM_RESERVE = STATS_BAR_HEIGHT + HINT_BAR_HEIGHT + 12
const DROP_CAP_LINES = 3
const PARAGRAPH_GAP = Math.round(BODY_LINE_HEIGHT * 0.7)
const MOVE_STEP = 20

const ORB_DEFS: OrbDef[] = [
  { fx: 0.52, fy: 0.22, r: 110, vx: 24, vy: 16, color: [196, 163, 90], label: 'Golden orb' },
  { fx: 0.18, fy: 0.48, r: 85, vx: -19, vy: 26, color: [100, 140, 255], label: 'Blue orb' },
  { fx: 0.74, fy: 0.58, r: 95, vx: 16, vy: -21, color: [232, 100, 130], label: 'Pink orb' },
  { fx: 0.38, fy: 0.72, r: 75, vx: -26, vy: -14, color: [80, 200, 140], label: 'Green orb' },
  { fx: 0.86, fy: 0.18, r: 65, vx: -13, vy: 19, color: [150, 100, 220], label: 'Violet orb' },
]

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null)
  const linePoolRef = useRef<HTMLDivElement[]>([])
  const headlinePoolRef = useRef<HTMLDivElement[]>([])
  const dropCapElRef = useRef<HTMLDivElement>(null)
  const orbElsRef = useRef<(HTMLButtonElement | null)[]>([])
  const orbsRef = useRef<Orb[]>([])
  const preparedRef = useRef<PreparedTextWithSegments[]>([])
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const activeOrbRef = useRef<Orb | null>(null)
  const fpsTimestamps = useRef<number[]>([])

  const [isPaused, setIsPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const [respectMotionPref, setRespectMotionPref] = useState(true)
  const skipAnimation = respectMotionPref && reducedMotion
  const [textReady, setTextReady] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [stats, setStats] = useState<Stats>({ lines: 0, reflow: '0.0', fps: 60, cols: 0 })
  const [orbsHidden, setOrbsHidden] = useState(false)
  const orbsHiddenRef = useRef(false)

  useEffect(() => {
    const checkZoom = () => {
      const zoom = window.outerWidth / window.innerWidth
      const hidden = zoom >= 1.5 || window.innerWidth < 500
      orbsHiddenRef.current = hidden
      setOrbsHidden(hidden)
    }
    checkZoom()
    window.addEventListener('resize', checkZoom)
    return () => window.removeEventListener('resize', checkZoom)
  }, [])

  useEffect(() => {
    const { innerWidth, innerHeight } = window
    orbsRef.current = ORB_DEFS.map((d) => createOrb(d, innerWidth, innerHeight))
    document.fonts.ready.then(() => {
      preparedRef.current = PARAGRAPHS.map((p) => prepareWithSegments(p, BODY_FONT))
      setTextReady(true)
    })
  }, [])

  const renderFrame = (now: number, isStatic: boolean) => {
    const preparedParagraphs = preparedRef.current
    if (preparedParagraphs.length === 0 || !stageRef.current) return

    const dt = isStatic ? 0 : Math.min((now - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = now

    const { clientWidth: pw, clientHeight: ph } = document.documentElement
    const { scrollY } = window

    const hideOrbs = orbsHiddenRef.current
    if (!isStatic && !hideOrbs) moveOrbs(orbsRef.current, dt, pw, ph)

    const circleObs = hideOrbs ? [] : orbsRef.current.map((o) => orbToObstacle(o, scrollY))
    const t0 = performance.now()

    const headlineMaxW = Math.min(pw - GUTTER * 2, 900)
    const { fontSize: hlSize, lines: hlLines } = fitHeadline(HEADLINE_TEXT, HEADLINE_FONT_FAMILY, headlineMaxW, Math.floor(ph * 0.35))
    const hlLineHeight = Math.round(hlSize * 0.93)
    const hlFont = `700 ${hlSize}px ${HEADLINE_FONT_FAMILY}`
    const hlHeight = hlLines.length * hlLineHeight
    const hlLeft = Math.round((pw - headlineMaxW) / 2)

    syncPool(stageRef.current, headlinePoolRef.current, hlLines.length, 'headline-line')
    renderHeadlineLines(headlinePoolRef.current, hlLines, hlLeft, GUTTER, hlFont, hlLineHeight)

    const bodyTop = GUTTER + hlHeight + 20
    const pageHeight = ph - BOTTOM_RESERVE - GUTTER
    const colCount = pw > 1000 ? 3 : pw > 640 ? 2 : 1
    const totalGutter = GUTTER * 2 + COL_GAP * (colCount - 1)
    const colWidth = Math.floor((Math.min(pw, 1100) - totalGutter) / colCount)
    const contentLeft = Math.round((pw - (colCount * colWidth + (colCount - 1) * COL_GAP)) / 2)

    const dropCapSize = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4
    const dropCapFont = `700 ${dropCapSize}px ${HEADLINE_FONT_FAMILY}`
    const dropCapTotalW = measureDropCap(PARAGRAPHS[0][0], dropCapFont)
    const dropCapRect = { x: contentLeft - 2, y: bodyTop - 2, w: dropCapTotalW, h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2 }

    if (dropCapElRef.current) {
      renderDropCap(dropCapElRef.current, PARAGRAPHS[0][0], dropCapFont, dropCapSize, contentLeft, bodyTop)
    }

    const allBodyLines = layoutPages({
      preparedParagraphs, bodyTop, pageHeight, colCount, colWidth,
      contentLeft, colGap: COL_GAP, lineHeight: BODY_LINE_HEIGHT,
      paragraphGap: PARAGRAPH_GAP, circleObs, dropCapRect, gutter: GUTTER,
    })

    const reflowTime = performance.now() - t0
    const maxLineY = allBodyLines.reduce((max, l) => Math.max(max, l.y), 0)
    stageRef.current.style.height = `${Math.max(ph, maxLineY + BODY_LINE_HEIGHT + BOTTOM_RESERVE + GUTTER)}px`

    syncPool(stageRef.current, linePoolRef.current, allBodyLines.length, 'line')
    renderBodyLines(linePoolRef.current, allBodyLines, BODY_FONT, BODY_LINE_HEIGHT)
    if (!hideOrbs) renderOrbs(orbsRef.current, orbElsRef.current, scrollY)

    if (!isStatic) {
      fpsTimestamps.current.push(now)
      fpsTimestamps.current = fpsTimestamps.current.filter((t) => t >= now - 1000)
    }

    setStats({ lines: allBodyLines.length, reflow: reflowTime.toFixed(1), fps: isStatic ? 0 : fpsTimestamps.current.length, cols: colCount })
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setIsPaused((p) => {
        const next = !p
        pauseAllOrbs(orbsRef.current, next, window.scrollY)
        setLiveMessage(next ? 'All orbs paused' : 'All orbs resumed')
        return next
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!textReady) return
    if (skipAnimation) { renderFrame(performance.now(), true); return }
    const animate = (now: number) => { renderFrame(now, false); rafRef.current = requestAnimationFrame(animate) }
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textReady, skipAnimation])

  const toggleOrbPause = (orb: Orb) => {
    orb.paused = !orb.paused
    if (orb.paused) orb.frozenScrollY = window.scrollY
    setLiveMessage(`${orb.label}: ${orb.paused ? 'paused' : 'moving'}`)
    if (orbsRef.current.every((o) => o.paused)) setIsPaused(true)
    else if (orbsRef.current.every((o) => !o.paused)) setIsPaused(false)
  }

  const handleOrbPointerDown = (e: React.PointerEvent, i: number) => {
    const orb = orbsRef.current[i]
    if (!orb) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    activeOrbRef.current = orb
    Object.assign(orb, { dragging: true, dragStartX: e.clientX, dragStartY: e.clientY, dragStartOrbX: orb.x, dragStartOrbY: orb.y })
  }

  const handleOrbPointerMove = (e: React.PointerEvent) => {
    const orb = activeOrbRef.current
    if (!orb) return
    orb.x = orb.dragStartOrbX + (e.clientX - orb.dragStartX)
    orb.y = orb.dragStartOrbY + (e.clientY - orb.dragStartY)
  }

  const handleOrbPointerUp = (e: React.PointerEvent) => {
    const orb = activeOrbRef.current
    if (!orb) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    if (Math.hypot(e.clientX - orb.dragStartX, e.clientY - orb.dragStartY) < 4) toggleOrbPause(orb)
    orb.dragging = false
    activeOrbRef.current = null
  }

  const handleOrbKeyDown = (e: React.KeyboardEvent, i: number) => {
    const orb = orbsRef.current[i]
    if (!orb) return
    const actions: Record<string, () => void> = {
      ArrowUp:    () => { orb.y = Math.max(orb.r, orb.y - MOVE_STEP) },
      ArrowDown:  () => { orb.y = Math.min(window.innerHeight - BOTTOM_RESERVE - orb.r, orb.y + MOVE_STEP) },
      ArrowLeft:  () => { orb.x = Math.max(orb.r, orb.x - MOVE_STEP) },
      ArrowRight: () => { orb.x = Math.min(window.innerWidth - orb.r, orb.x + MOVE_STEP) },
      ' ':        () => toggleOrbPause(orb),
      Enter:      () => toggleOrbPause(orb),
    }
    const action = actions[e.key]
    if (action) { e.preventDefault(); action() }
  }

  const toggleGlobalPause = () => {
    const next = !isPaused
    setIsPaused(next)
    pauseAllOrbs(orbsRef.current, next, window.scrollY)
    setLiveMessage(next ? 'All orbs paused' : 'All orbs resumed')
  }

  return (
    <>
      <Header
        isPaused={isPaused}
        respectMotionPref={respectMotionPref}
        onTogglePause={toggleGlobalPause}
        onToggleMotionPref={() => setRespectMotionPref((r) => !r)}
      />

      <Main
        headlineText={HEADLINE_TEXT}
        stageRef={stageRef}
        dropCapElRef={dropCapElRef}
        orbDefs={ORB_DEFS}
        orbElsRef={orbElsRef}
        orbs={orbsRef.current}
        orbsHidden={orbsHidden}
        liveMessage={liveMessage}
        onOrbPointerDown={handleOrbPointerDown}
        onOrbPointerMove={handleOrbPointerMove}
        onOrbPointerUp={handleOrbPointerUp}
        onOrbKeyDown={handleOrbKeyDown}
        onOrbFocus={(label) => setLiveMessage(`${label} selected. Use Option plus arrow keys to move, Space to pause.`)}
      />

      <Footer stats={stats} />
    </>
  )
}
