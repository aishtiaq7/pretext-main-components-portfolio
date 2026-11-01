import { motion } from '../motion/MotionController'
import { useMotionState } from '../motion/motionStore'

// ═══════════════════════════════════════════════════════════
// TimelineControls — transport for the reveal chain, inside the
// fixed minimap panel. ▶ starts the chain (same as clicking the
// drawn Button) or resumes; ❚❚ freezes drawings, pending reveal
// timers and audio; 🔇 is a persisted visitor preference; ↺ starts
// the story over (forgets reveals, clicks, flags, camera; reloads).
// ═══════════════════════════════════════════════════════════

export function TimelineControls() {
  const { status, muted } = useMotionState()
  const playing = status === 'playing'

  const onPlayPause = () => {
    if (playing) motion.pause()
    else motion.play()
  }
  const onMute = () => motion.toggleMuted()
  const onStartOver = () => motion.startOver()

  return (
    <div className="timeline-controls" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="tl-btn"
        onClick={onPlayPause}
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
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
      <button
        type="button"
        className="tl-btn"
        onClick={onStartOver}
        aria-label="Start over: forget what has been revealed and reload"
        title="Start over"
      >
        ↺
      </button>
    </div>
  )
}
