import { PARAGRAPHS } from '../content'
import type { OrbDef, Orb } from '../types'

type Props = {
  headlineText: string
  stageRef: React.RefObject<HTMLDivElement | null>
  dropCapElRef: React.RefObject<HTMLDivElement | null>
  orbDefs: OrbDef[]
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

export const Main = ({
  headlineText, stageRef, dropCapElRef, orbDefs, orbElsRef, orbs, orbsHidden,
  liveMessage, onOrbPointerDown, onOrbPointerMove, onOrbPointerUp, onOrbKeyDown, onOrbFocus,
}: Props) => (
  <main>
    <div aria-live="polite" aria-atomic="true" className="sr-only">{liveMessage}</div>

    <div className="readable-text" lang="es" role="region" aria-label="Article text">
      <h1>{headlineText}</h1>
      {PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
    </div>

    <div ref={stageRef} className="stage" aria-hidden="true">
      <div ref={dropCapElRef} className="drop-cap" />
    </div>

    {!orbsHidden && (
      <section aria-label={`${orbDefs.length} draggable orbs`} className="orb-container">
        {orbDefs.map((def, i) => (
          <button
            key={i}
            ref={(el) => { orbElsRef.current[i] = el }}
            type="button"
            className="orb"
            aria-roledescription="draggable orb"
            aria-label={orbLabel(def, i, orbDefs.length, orbs[i]?.paused ?? false)}
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
