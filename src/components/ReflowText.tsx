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
type Iv = { left: number; right: number }

const MIN_SLOT = 20
const OBS_PAD = 4 // px padding around ellipse

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

// Elliptical interval — same algorithm as the clock in NotebookPage.
// Treats each obstacle as an ellipse inscribed in its bounding box.
// For each text line band, computes the horizontal extent of the ellipse
// at that vertical position — giving tight, organic wrapping.
function ellipseInterval(
  obs: ObstacleRect,
  bandTop: number, bandBottom: number,
): Iv | null {
  const cx = obs.x + obs.w / 2
  const cy = obs.y + obs.h / 2
  const a = obs.w / 2 + OBS_PAD  // horizontal semi-axis + padding
  const b = obs.h / 2 + OBS_PAD  // vertical semi-axis + padding
  if (bandTop >= cy + b || bandBottom <= cy - b) return null
  const minDy = cy >= bandTop && cy <= bandBottom ? 0 : cy < bandTop ? bandTop - cy : cy - bandBottom
  if (minDy >= b) return null
  const maxDx = a * Math.sqrt(1 - (minDy * minDy) / (b * b))
  return { left: cx - maxDx, right: cx + maxDx }
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
      const blocked: Iv[] = []
      for (const obs of obstacles) {
        const iv = ellipseInterval(obs, bT, bB)
        if (iv) blocked.push(iv)
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
