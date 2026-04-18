import { ThreeIntro } from '../components/ThreeIntro'

// Wrapper around the 3D cube demo for use inside a Page. Fixes size + disables
// pointer events so the page wrapper itself handles dragging.
export function ThreeScene() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380, height: 380, pointerEvents: 'none' }}>
        <ThreeIntro />
      </div>
    </div>
  )
}
