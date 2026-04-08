import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import Snap from 'lenis/snap'
import { prepareWithSegments } from '@chenglou/pretext'
import type { PreparedTextWithSegments } from '@chenglou/pretext'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import { PARAGRAPHS } from './content'
import { fitHeadline, layoutPages, measureDropCap } from './layout'
import { createOrb, moveOrbs, orbToObstacle, pauseAllOrbs } from './orbs'
import { syncPool, renderHeadlineLines, renderBodyLines, renderOrbs, renderDropCap } from './renderer'
import { Main, HEADLINE_TEXT, ORB_DEFS } from './components/Main'
import { TextString } from './components/TextString'
import { ClockSection } from './components/ClockSection'
import { PretextTutorial } from './components/PretextTutorial'
import { ThreeIntro } from './components/ThreeIntro'
import { SectionSix } from './components/SectionSix'
import { ScrollSection } from './components/ScrollSection'
import type { Orb } from './types'

const BODY_FONT = '18px "Atkinson Hyperlegible", system-ui, sans-serif'
const BODY_LINE_HEIGHT = 30
const HEADLINE_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif'
const GUTTER = 48
const COL_GAP = 40
const DROP_CAP_LINES = 3
const PARAGRAPH_GAP = Math.round(BODY_LINE_HEIGHT * 0.7)
const MOVE_STEP = 20

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

  const [, setIsPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const [respectMotionPref] = useState(true)
  const skipAnimation = respectMotionPref && reducedMotion
  const [textReady, setTextReady] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const [orbsHidden, setOrbsHidden] = useState(false)
  const orbsHiddenRef = useRef(false)

  // Lenis smooth scroll + snap
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.04, smoothWheel: true })

    const snap = new Snap(lenis, {
      type: 'proximity',
      lerp: 0.025,
      easing: (t: number) => 1 - Math.pow(1 - t, 5),
      duration: 2,
      debounce: 150,
    })
    const sections = document.querySelectorAll('.scroll-section')
    snap.addElements(Array.from(sections) as HTMLElement[])

    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
    return () => { snap.destroy(); lenis.destroy() }
  }, [])

  useEffect(() => {
    const checkZoom = () => {
      const zoom = window.outerWidth / window.innerWidth
      const hidden = zoom >= 1.5
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

    const hideOrbs = orbsHiddenRef.current
    if (!isStatic && !hideOrbs) moveOrbs(orbsRef.current, dt, pw, ph)

    const circleObs = hideOrbs ? [] : orbsRef.current.map((o) => orbToObstacle(o))

    const headlineMaxW = Math.min(pw - GUTTER * 2, 900)
    const { fontSize: hlSize, lines: hlLines } = fitHeadline(HEADLINE_TEXT, HEADLINE_FONT_FAMILY, headlineMaxW, Math.floor(ph * 0.35))
    const hlLineHeight = Math.round(hlSize * 0.93)
    const hlFont = `700 ${hlSize}px ${HEADLINE_FONT_FAMILY}`
    const hlHeight = hlLines.length * hlLineHeight
    const hlLeft = Math.round((pw - headlineMaxW) / 2)

    syncPool(stageRef.current, headlinePoolRef.current, hlLines.length, 'headline-line')
    renderHeadlineLines(headlinePoolRef.current, hlLines, hlLeft, GUTTER, hlFont, hlLineHeight)

    const bodyTop = GUTTER + hlHeight + 20
    const pageHeight = ph - bodyTop - GUTTER
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

    stageRef.current.style.height = `${ph}px`

    syncPool(stageRef.current, linePoolRef.current, allBodyLines.length, 'line')
    renderBodyLines(linePoolRef.current, allBodyLines, BODY_FONT, BODY_LINE_HEIGHT)

    if (!hideOrbs) {
      renderOrbs(orbsRef.current, orbElsRef.current)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setIsPaused((p) => {
        const next = !p
        pauseAllOrbs(orbsRef.current, next)
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
      ArrowDown:  () => { orb.y = Math.min(window.innerHeight - orb.r, orb.y + MOVE_STEP) },
      ArrowLeft:  () => { orb.x = Math.max(orb.r, orb.x - MOVE_STEP) },
      ArrowRight: () => { orb.x = Math.min(window.innerWidth - orb.r, orb.x + MOVE_STEP) },
      ' ':        () => toggleOrbPause(orb),
      Enter:      () => toggleOrbPause(orb),
    }
    const action = actions[e.key]
    if (action) { e.preventDefault(); action() }
  }

  return (
    <>
      <ScrollSection fadeIn={false} fadeOut>
        <Main
          stageRef={stageRef}
          dropCapElRef={dropCapElRef}
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
      </ScrollSection>

      <ScrollSection fadeIn fadeOut>
        <TextString />
      </ScrollSection>

      <ScrollSection fadeIn fadeOut>
        <ClockSection />
      </ScrollSection>

      <ScrollSection fadeIn fadeOut>
        <PretextTutorial />
      </ScrollSection>

      <ScrollSection fadeIn fadeOut>
        <ThreeIntro />
      </ScrollSection>

      <ScrollSection fadeIn fadeOut={false}>
        <SectionSix />
      </ScrollSection>
    </>
  )
}
