import { useEffect, useRef } from 'react'
import { CANVAS } from '../constants'
import { getViewport, subscribeViewport } from '../store/viewport'

type Props = {
  children: React.ReactNode
}

const HOLE_LEFT_PX = 510
const HOLE_SPACING = 720
const HOLE_START = 410
const holeTops: number[] = []
for (let y = HOLE_START; y < CANVAS; y += HOLE_SPACING) holeTops.push(y)

/**
 * Renders the canvas and applies the viewport transform imperatively.
 * Skipping React on the transform path means a zoom or pan tick doesn't
 * trigger reconciliation across the entire entity tree — the browser
 * just composites the new transform.
 */
export function ZoomCanvas({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const half = CANVAS / 2
    const apply = () => {
      const { zoom, panX, panY } = getViewport()
      const tx = -half * zoom + panX
      const ty = -half * zoom + panY
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`
    }
    apply()
    return subscribeViewport(apply)
  }, [])

  return (
    <div
      ref={ref}
      className="zoom-canvas"
      style={{ width: CANVAS, height: CANVAS }}
    >
      {holeTops.map((top) => (
        <div key={top} className="notebook-hole" style={{ left: HOLE_LEFT_PX, top }} />
      ))}
      {children}
    </div>
  )
}
