import { PARAGRAPHS } from '../content'
import type { Orb, OrbDef } from '../types'

const HEADLINE_TEXT = 'Web Dev Evolves, As do I'

const ORB_DEFS: OrbDef[] = [
  { fx: 0.52, fy: 0.22, r: 110, vx: 24, vy: 16, color: [196, 163, 90], label: 'Golden orb' },
  { fx: 0.18, fy: 0.48, r: 85, vx: -19, vy: 26, color: [100, 140, 255], label: 'Blue orb' },
  { fx: 0.74, fy: 0.58, r: 95, vx: 16, vy: -21, color: [232, 100, 130], label: 'Pink orb' },
  { fx: 0.38, fy: 0.72, r: 75, vx: -26, vy: -14, color: [80, 200, 140], label: 'Green orb' },
  { fx: 0.86, fy: 0.18, r: 65, vx: -13, vy: 19, color: [150, 100, 220], label: 'Violet orb' },
]

type Props = {
  stageRef: React.RefObject<HTMLDivElement | null>
  dropCapElRef: React.RefObject<HTMLDivElement | null>
  orbElsRef: React.RefObject<(HTMLButtonElement | null)[]>
  orbs: Orb[]
  orbsHidden: boolean
  liveMessage: string
  onOrbPointerDown: (e: React.PointerEvent, i: number) => void
  onOrbPointerMove: (e: React.PointerEvent) => void
  onOrbPointerUp: (e: React.PointerEvent) => void
  onOrbKeyDown: (e: React.KeyboardEvent, i: number) => void
  onOrbFocus: (label: string) => void
}

const orbLabel = (def: OrbDef, i: number, total: number, paused: boolean) =>
  `${def.label}, ${i + 1} of ${total}. ` +
  `use Option plus arrow keys to move. ` +
  (paused ? 'Press Space to resume.' : 'Press Space to pause.')

export { HEADLINE_TEXT, ORB_DEFS }

export const Main = ({
  stageRef, dropCapElRef, orbElsRef, orbs, orbsHidden,
  liveMessage, onOrbPointerDown, onOrbPointerMove, onOrbPointerUp, onOrbKeyDown, onOrbFocus,
}: Props) => (
  <main>
    <div aria-live="polite" aria-atomic="true" className="sr-only">{liveMessage}</div>

    <div className="readable-text" lang="es" role="region" aria-label="Article text">
      <h1>{HEADLINE_TEXT}</h1>
      {PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
    </div>

    <div ref={stageRef} className="stage" aria-hidden="true">
      <div ref={dropCapElRef} className="drop-cap" />
    </div>

    {!orbsHidden && (
      <section aria-label={`${ORB_DEFS.length} draggable orbs`} className="orb-container">
        {ORB_DEFS.map((def, i) => (
          <button
            key={i}
            ref={(el) => { orbElsRef.current[i] = el }}
            type="button"
            className="orb"
            aria-roledescription="draggable orb"
            aria-label={orbLabel(def, i, ORB_DEFS.length, orbs[i]?.paused ?? false)}
            onPointerDown={(e) => onOrbPointerDown(e, i)}
            onPointerMove={onOrbPointerMove}
            onPointerUp={onOrbPointerUp}
            onKeyDown={(e) => onOrbKeyDown(e, i)}
            onFocus={() => onOrbFocus(def.label)}
            style={{
              background: `radial-gradient(circle at 35% 35%, rgba(${def.color[0]},${def.color[1]},${def.color[2]},0.35), rgba(${def.color[0]},${def.color[1]},${def.color[2]},0.12) 55%, transparent 72%)`,
              boxShadow: `0 0 60px 15px rgba(${def.color[0]},${def.color[1]},${def.color[2]},0.18), 0 0 120px 40px rgba(${def.color[0]},${def.color[1]},${def.color[2]},0.07)`,
            }}
          />
        ))}
      </section>
    )}
  </main>
)
