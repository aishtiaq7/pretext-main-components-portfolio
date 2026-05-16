import { useEffect, useState } from 'react'
import { CaptureView } from './CaptureView'
import { PlayerView } from './PlayerView'

// ═══════════════════════════════════════════════════════════
// Top-level shell — hash-routes between Capture (the existing
// stroke-recording tool) and Player (drop a .json / .svg and
// watch it render). Hash routing keeps this dep-free and means
// links like `index.html#/player` work without server config.
// ═══════════════════════════════════════════════════════════

export type Route = 'capture' | 'player'

function readRoute(): Route {
  return window.location.hash.startsWith('#/player') ? 'player' : 'capture'
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)
  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function App() {
  const route = useHashRoute()
  return route === 'player' ? <PlayerView /> : <CaptureView />
}

// Shared nav, rendered inline by each view in its own slot:
//   CaptureView puts it at the bottom of the sidebar
//   PlayerView floats it in the top-right corner (no sidebar to host it)
export function RouteNav({
  active,
  className = '',
}: {
  active: Route
  className?: string
}) {
  return (
    <nav className={`route-nav ${className}`.trim()} aria-label="View">
      <a
        href="#/"
        className={active === 'capture' ? 'is-active' : ''}
        aria-current={active === 'capture' ? 'page' : undefined}
      >
        Capture
      </a>
      <a
        href="#/player"
        className={active === 'player' ? 'is-active' : ''}
        aria-current={active === 'player' ? 'page' : undefined}
      >
        Player
      </a>
    </nav>
  )
}
