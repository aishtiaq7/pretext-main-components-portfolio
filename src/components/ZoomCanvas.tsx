import { CANVAS } from '../constants'
import { useViewport } from '../store/viewport'

type Props = {
  children: React.ReactNode
}

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
      <div className="notebook-margin-line" />
      <div className="notebook-hole" style={{ left: '12%', top: 20 }} />
      <div className="notebook-hole" style={{ left: '50%', top: 20 }} />
      <div className="notebook-hole" style={{ left: '88%', top: 20 }} />
      {children}
    </div>
  )
}
