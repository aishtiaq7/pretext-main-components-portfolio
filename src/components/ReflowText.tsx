import { useEffect, useRef, useState, useMemo } from 'react'
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext'

// ═══════════════════════════════════════════════════════════
// ReflowText — text that wraps around obstacles in real-time
//
// Uses pretext to layout text line-by-line. For each line band,
// obstacles that overlap are carved out, and text flows into
// the remaining slots — same algorithm as NotebookPage's clock.
// ═══════════════════════════════════════════════════════════

export type ObstacleRect = {
  x: number  // px, relative to this text block's origin
  y: number
  w: number
  h: number
}

type Line = { x: number; y: number; text: string }

const MIN_SLOT = 30

function carveSlots(
  base: { left: number; right: number },
  blocked: { left: number; right: number }[],
): { left: number; right: number }[] {
  let slots = [base]
  for (const b of blocked) {
    const next: typeof slots = []
    for (const s of slots) {
      if (b.right <= s.left || b.left >= s.right) { next.push(s); continue }
      if (b.left > s.left) next.push({ left: s.left, right: b.left })
      if (b.right < s.right) next.push({ left: b.right, right: s.right })
    }
    slots = next
  }
  return slots.filter(s => s.right - s.left >= MIN_SLOT)
}

function remToPx(fontSize: string): number {
  const rem = fontSize.match(/([\d.]+)rem/)
  if (rem) return Math.round(parseFloat(rem[1]) * 16)
  const px = fontSize.match(/([\d.]+)px/)
  if (px) return Math.round(parseFloat(px[1]))
  return 16
}

type Props = {
  text: string
  maxWidth: number
  fontFamily: string   // e.g. '"Patrick Hand", cursive'
  fontSize: string     // e.g. '1.4rem'
  color: string
  opacity: number
  obstacles: ObstacleRect[]
}

export function ReflowText({ text, maxWidth, fontFamily, fontSize, color, opacity, obstacles }: Props) {
  const sizePx = remToPx(fontSize)
  const lineHeight = Math.round(sizePx * 1.5)
  const fontStr = `${sizePx}px ${fontFamily}`

  const [prepared, setPrepared] = useState<PreparedTextWithSegments | null>(null)
  const prevFontStr = useRef(fontStr)

  useEffect(() => {
    prevFontStr.current = fontStr
    document.fonts.ready.then(() => {
      setPrepared(prepareWithSegments(text, fontStr))
    })
  }, [text, fontStr])

  const lines = useMemo(() => {
    if (!prepared) return []
    const result: Line[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
    let lineTop = 0
    let safety = 0

    while (safety++ < 300) {
      const bT = lineTop, bB = lineTop + lineHeight
      const blocked: { left: number; right: number }[] = []
      for (const obs of obstacles) {
        if (bB <= obs.y || bT >= obs.y + obs.h) continue
        blocked.push({ left: obs.x, right: obs.x + obs.w })
      }

      const slots = carveSlots({ left: 0, right: maxWidth }, blocked)
      if (!slots.length) { lineTop += lineHeight; if (lineTop > 3000) break; continue }

      let exhausted = false
      for (const slot of slots.sort((a, b) => a.left - b.left)) {
        const line = layoutNextLine(prepared, cursor, slot.right - slot.left)
        if (!line) { exhausted = true; break }
        result.push({ x: slot.left, y: lineTop, text: line.text })
        cursor = line.end
      }

      if (exhausted) break
      lineTop += lineHeight
    }

    return result
  }, [prepared, maxWidth, lineHeight, obstacles])

  return (
    <div style={{ position: 'relative', width: maxWidth, minHeight: lineHeight }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: line.x,
            top: line.y,
            whiteSpace: 'pre',
            font: fontStr,
            lineHeight: `${lineHeight}px`,
            color,
            opacity,
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  )
}
