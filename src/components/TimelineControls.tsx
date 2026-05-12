import { motion } from '../motion/MotionController'
import { useMotionState } from '../motion/motionStore'

// ═══════════════════════════════════════════════════════════
// TimelineControls — phase-1 master-timeline buttons.
// Live inside ScrollInputs (the fixed minimap panel).
// Plain text labels for now; will be swapped for handwriting-
// entity buttons in phase 2.
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
