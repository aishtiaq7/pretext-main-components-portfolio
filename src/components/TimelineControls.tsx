import { motion } from '../motion/MotionController'
import { useMotionState } from '../motion/motionStore'

// ═══════════════════════════════════════════════════════════
// TimelineControls — transport for the reveal chain, inside the
// fixed minimap panel. ▶ starts the chain (same as clicking the
// drawn Button) or resumes; ❚❚ freezes drawings, pending reveal
// timers and audio; 🔇 is a persisted visitor preference.
// ═══════════════════════════════════════════════════════════

export function TimelineControls() {
  const { status, muted } = useMotionState()

  const done = status === 'done'
  const playing = status === 'playing'

  // Play / pause: same button, toggles based on status. Disabled once done.
  const onPlayPause = () => {
    if (done) return
    if (playing) motion.pause()
    else motion.play()
  }

  const onMute = () => motion.toggleMuted()

  const playLabel = done ? '✓' : playing ? '❚❚' : '▶'

  return (
    <div className="timeline-controls" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="tl-btn"
        onClick={onPlayPause}
        disabled={done}
        aria-label={done ? 'Timeline complete' : playing ? 'Pause' : 'Play'}
        title={done ? 'Complete' : playing ? 'Pause' : 'Play'}
      >
        {playLabel}
      </button>
      <button
        type="button"
        className="tl-btn"
        onClick={onMute}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute' : 'Mute'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}
