type Props = {
  isPaused: boolean
  respectMotionPref: boolean
  onTogglePause: () => void
  onToggleMotionPref: () => void
}

export const Header = ({ isPaused, respectMotionPref, onTogglePause, onToggleMotionPref }: Props) => (
  <header className="site-header">
    <div className="header-controls" aria-label="Animation controls">
      <button className="control-btn-dark" aria-pressed={isPaused} onClick={onTogglePause}>
        {isPaused
          ? <><span aria-hidden="true">▶ </span>Play</>
          : <><span aria-hidden="true">⏸ </span>Pause</>}
      </button>
      <button className="control-btn-dark" aria-pressed={respectMotionPref} onClick={onToggleMotionPref}>
        Respect reduced-motion
      </button>
    </div>
    <nav aria-label="Keyboard shortcuts" className="header-nav">
      <ul role="none" className="header-hints">
        <li>Drag to move orbs with mouse</li>
        <li>Click an orb to pause it</li>
        <li><kbd aria-hidden="true">Esc</kbd><span className="sr-only">Escape</span> to pause or resume all</li>
        <li><kbd aria-hidden="true">Tab</kbd><span className="sr-only">Tab</span> then <kbd aria-hidden="true">Arrows</kbd><span className="sr-only">arrow keys</span> to focus and move orbs</li>
        <li><kbd aria-hidden="true">Enter</kbd><span className="sr-only">Enter</span> or <kbd aria-hidden="true">Space</kbd><span className="sr-only">Space</span> to pause focused orb</li>
      </ul>
    </nav>
  </header>
)
