type Props = {
  zoom: number
  panX: number
  panY: number
  children: React.ReactNode
}

export function ZoomCanvas({ zoom, panX, panY, children }: Props) {
  // Canvas is 3000×3000. Position it so center aligns with viewport center.
  // left: 50% puts top-left at viewport center.
  // translate(-1500*zoom, -1500*zoom) with transformOrigin: 0 0 and scale(zoom)
  // ensures the canvas center stays at the viewport center across all zoom levels.
  const tx = -1500 * zoom + panX
  const ty = -1500 * zoom + panY

  return (
    <div
      className="zoom-canvas"
      style={{
        transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
      }}
    >
      {/* Notebook decorations — move with the canvas */}
      <div className="notebook-margin-line" />
      <div className="notebook-hole" style={{ left: '12%', top: 20 }} />
      <div className="notebook-hole" style={{ left: '50%', top: 20 }} />
      <div className="notebook-hole" style={{ left: '88%', top: 20 }} />

      {children}
    </div>
  )
}
