import { CANVAS } from '../constants'
import { useViewport } from '../store/viewport'

type Props = {
  children: React.ReactNode
}

const HOLE_LEFT_PX = 510
const HOLE_SPACING = 720
const HOLE_START = 410
const holeTops: number[] = []
for (let y = HOLE_START; y < CANVAS; y += HOLE_SPACING) holeTops.push(y)

export function ZoomCanvas({ children }: Props) {
  const { zoom, panX, panY } = useViewport()
  const half = CANVAS / 2
  const tx = -half * zoom + panX
  const ty = -half * zoom + panY

  return (
    <div
      className="zoom-canvas"
      style={{
        width: CANVAS,
        height: CANVAS,
        transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
      }}
    >
      {holeTops.map((top) => (
        <div key={top} className="notebook-hole" style={{ left: HOLE_LEFT_PX, top }} />
      ))}
      {children}
    </div>
  )
}
