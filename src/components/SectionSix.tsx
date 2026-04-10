import { useEffect, useRef, useCallback } from 'react'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext'

// ============================================================
// SECTION SIX — Mouse-repulsion text
//
// How this works, step by step:
//
//   STEP 1: PREPARE (once)
//     Call prepareWithSegments() to measure every character in
//     the text. This is the expensive call — it uses a hidden
//     <canvas> to get pixel widths. We do it once and cache it.
//
//   STEP 2: LAYOUT (once + on resize)
//     Call layoutNextLine() in a loop to break text into lines
//     that fit the container width. Each line becomes a <div>
//     positioned at a "rest position" (where it naturally sits).
//
//   STEP 3: TRACK MOUSE (on pointermove)
//     Store the mouse position relative to the stage div.
//     We convert from viewport coordinates to stage-local
//     coordinates so the math lines up with line positions.
//
//   STEP 4: ANIMATE (every frame, ~60fps)
//     For each line, check distance from mouse. If close enough,
//     push the line away. Every frame, the push offset decays
//     back toward zero (spring-back). Apply via CSS transform.
//
//   Pretext is only involved in steps 1-2. Steps 3-4 are pure
//   animation math — pretext gives us the line positions, we
//   do the rest.
// ============================================================

// --- Config ---
const TEXT = 'In the beginning the Universe was created. This has made a lot of people very angry and been widely regarded as a bad move. Many were increasingly of the opinion that they had all made a big mistake in coming down from the trees in the first place. And some said that even the trees had been a bad move, and that no one should ever have left the oceans.'
const FONT = '22px Georgia, serif'
const LINE_HEIGHT = 34
const PADDING = 32

// --- Mouse repulsion tuning ---
const MOUSE_RADIUS = 120   // how far (px) the mouse effect reaches
const PUSH_STRENGTH = 60   // max displacement (px) at point blank
const SPRING_BACK = 0.12   // 0–1, how fast lines return to rest (0.12 = smooth, 0.5 = snappy)

type PositionedLine = { text: string; x: number; y: number; width: number }

export function SectionSix() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const linePoolRef = useRef<HTMLDivElement[]>([])
  const preparedRef = useRef<PreparedTextWithSegments | null>(null)

  // Animation frame ID — stored so we can cancel the loop on unmount.
  // requestAnimationFrame returns an ID each time you call it.
  // cancelAnimationFrame(id) stops that specific scheduled frame.
  const rafRef = useRef(0)

  // Mouse position in stage-local coordinates.
  // Starts at -9999 so no lines are pushed before the mouse enters.
  const mouseRef = useRef({ x: -9999, y: -9999 })

  // Per-line displacement from rest position. { dx: 0, dy: 0 } = at rest.
  const offsetsRef = useRef<{ dx: number; dy: number }[]>([])

  // Where pretext placed each line. Set during layout, read during animation.
  const restPositionsRef = useRef<{ x: number; y: number }[]>([])

  // ------------------------------------------------------------------
  // DOM POOL — reuse <div> elements instead of React re-renders.
  // Same pattern as every other section in this project.
  // ------------------------------------------------------------------
  function syncPool(count: number) {
    const stage = stageRef.current
    const pool = linePoolRef.current
    if (!stage) return
    while (pool.length < count) {
      const el = document.createElement('div')
      el.style.position = 'absolute'
      el.style.whiteSpace = 'pre'
      el.style.font = FONT
      el.style.lineHeight = `${LINE_HEIGHT}px`
      el.style.color = 'var(--color-text)'
      el.style.willChange = 'transform'
      stage.appendChild(el)
      pool.push(el)
    }
    for (let i = 0; i < pool.length; i++) {
      pool[i].style.display = i < count ? '' : 'none'
    }
  }

  // ------------------------------------------------------------------
  // STEP 2: LAYOUT — break prepared text into positioned lines.
  //
  // layoutNextLine(prepared, cursor, maxWidth) returns one line:
  //   { text: "In the beginning...", width: 547, start: {...}, end: {...} }
  //
  // We call it in a loop. Each call picks up where the last left off
  // via the cursor. When it returns null, text is exhausted.
  // ------------------------------------------------------------------
  const doLayout = useCallback(() => {
    const prepared = preparedRef.current
    const container = containerRef.current
    if (!prepared || !container) return

    const maxWidth = container.clientWidth - PADDING * 2
    const lines: PositionedLine[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = 0

    while (true) {
      const line = layoutNextLine(prepared, cursor, maxWidth)
      if (!line) break
      lines.push({ text: line.text, x: PADDING, y, width: line.width })
      cursor = line.end
      y += LINE_HEIGHT
    }

    // Write line content and position into the DOM pool
    syncPool(lines.length)
    const pool = linePoolRef.current
    for (let i = 0; i < lines.length; i++) {
      pool[i].textContent = lines[i].text
      pool[i].style.left = `${lines[i].x}px`
      pool[i].style.top = `${lines[i].y}px`
    }

    // Store rest positions for the animation loop to read
    restPositionsRef.current = lines.map(l => ({ x: l.x, y: l.y }))
    offsetsRef.current = lines.map(() => ({ dx: 0, dy: 0 }))

    // Center the text block vertically
    const totalHeight = y
    const containerH = container.clientHeight
    const topOffset = Math.max(0, (containerH - totalHeight) / 2)
    if (stageRef.current) stageRef.current.style.top = `${topOffset}px`
  }, [])

  // ------------------------------------------------------------------
  // STEP 1: PREPARE — measure every character, cache the result.
  // This runs once. After this, all layout is just arithmetic.
  // ------------------------------------------------------------------
  useEffect(() => {
    document.fonts.ready.then(() => {
      preparedRef.current = prepareWithSegments(TEXT, FONT)
      doLayout()
    })
  }, [doLayout])

  // Re-layout on resize (step 2 again, with new width)
  useEffect(() => {
    const onResize = () => doLayout()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [doLayout])

  // ------------------------------------------------------------------
  // STEP 4: ANIMATE — runs every frame via requestAnimationFrame.
  //
  // Pretext is NOT called here. We're just reading mouseRef and
  // computing push/spring math against the stored rest positions.
  //
  // For each line:
  //   1. Measure distance from mouse to line center
  //   2. If within MOUSE_RADIUS → push line away from mouse
  //   3. Decay offset toward zero (spring-back)
  //   4. Apply offset as CSS transform: translate(dx, dy)
  // ------------------------------------------------------------------
  useEffect(() => {
    function animate() {
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const pool = linePoolRef.current
      const offsets = offsetsRef.current
      const rests = restPositionsRef.current

      for (let i = 0; i < rests.length; i++) {
        const rest = rests[i]
        if (!rest) continue

        // Line center in stage coordinates
        const lineCx = rest.x
        const lineCy = rest.y + LINE_HEIGHT / 2

        // Vector from mouse → line (direction we'll push)
        const dx = lineCx - mx
        const dy = lineCy - my
        const dist = Math.hypot(dx, dy)

        // Push: if mouse is close, add force away from it.
        // Force falls off linearly: full strength at dist=0, zero at dist=MOUSE_RADIUS.
        if (dist < MOUSE_RADIUS && dist > 0.1) {
          const force = (1 - dist / MOUSE_RADIUS) * PUSH_STRENGTH
          offsets[i].dx += (dx / dist) * force * 0.3
          offsets[i].dy += (dy / dist) * force * 0.3
        }

        // Spring: pull offset back toward zero.
        // Multiplying by (1 - 0.12) = 0.88 each frame means
        // the offset halves roughly every 6 frames (~100ms at 60fps).
        offsets[i].dx *= (1 - SPRING_BACK)
        offsets[i].dy *= (1 - SPRING_BACK)

        // Apply via GPU-accelerated CSS transform (no layout recalculation)
        if (pool[i]) {
          pool[i].style.transform = `translate(${offsets[i].dx}px, ${offsets[i].dy}px)`
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    // Cleanup: stop the loop when this component unmounts
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // ------------------------------------------------------------------
  // STEP 3: TRACK MOUSE — convert viewport coords to stage-local.
  //
  // e.clientX = mouse distance from viewport left edge
  // rect.left = stage distance from viewport left edge
  // Subtracting gives: mouse distance from stage left edge
  // Now mouseRef is in the same coordinate space as line positions.
  // ------------------------------------------------------------------
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    mouseRef.current.x = e.clientX - rect.left
    mouseRef.current.y = e.clientY - rect.top
  }, [])

  // When mouse leaves, set position to -9999 (impossibly far away).
  // Every line is now >9000px from "mouse", well beyond MOUSE_RADIUS (120px),
  // so no push force is applied and spring-back smoothly returns everything to rest.
  const handlePointerLeave = useCallback(() => {
    mouseRef.current.x = -9999
    mouseRef.current.y = -9999
  }, [])

  return (
    <section className="section-six">
      <div
        ref={containerRef}
        className="section-six-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div ref={stageRef} style={{ position: 'relative' }} />
      </div>
    </section>
  )
}
