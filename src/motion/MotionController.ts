import { triggers } from '../store/triggers'
import { progress } from '../store/progress'
import { cameraMemory } from '../store/cameraMemory'
import { audio } from '../audio/AudioController'
import { motionStore } from './motionStore'
import { revealEngine } from './reveal'

// ═══════════════════════════════════════════════════════════
// MotionController — the transport controls for the chain.
//
// The old master GSAP timeline (scenes.ts) is gone: scene order,
// camera focus, sound and hold durations now live on the entities
// themselves as `revealedBy`, `camera` and `onReveal`, and the
// reveal engine runs them (docs/architecture.md §3.5).
//
// What is left here is what a visitor's ▶ / ❚❚ / 🔇 need:
//   play()  — start the chain (same as clicking the drawn Button),
//             or resume after a pause
//   pause() — freeze every drawing's own rAF, the engine's pending
//             timers and any playing sound
//   mute    — a visitor preference, persisted (store/prefs)
// ═══════════════════════════════════════════════════════════

/** The clickable entity the chain hangs off (`revealedBy: 'click:button-1'`). */
export const CHAIN_START = 'button-1'

class MotionController {
  private started = false

  /** A notebook mounted: the chain can be started again from ▶. */
  reset() {
    this.started = false
    motionStore.set({ status: 'idle' })
  }

  /** Start the chain, or resume from a pause. */
  play() {
    const { status } = motionStore.get()
    if (status === 'paused') {
      triggers.resumeAll()
      revealEngine.resumeAll()
      motionStore.set({ status: 'playing' })
      return
    }
    if (!this.started) {
      this.started = true
      // Inside the click's call stack; the engine primes every 'sfx:' track
      // on this first call so later reveals can play audio on mobile.
      revealEngine.onClicked(CHAIN_START)
    }
    motionStore.set({ status: 'playing' })
  }

  /** Freeze everything: each drawing's rAF, pending reveal timers, audio. */
  pause() {
    if (motionStore.get().status !== 'playing') return
    triggers.pauseAll()
    revealEngine.pauseAll()
    audio.pauseAll()
    motionStore.set({ status: 'paused' })
  }

  /**
   * Start the story over: forget every reveal, click and flag, forget the
   * remembered cameras, and reload so every entity mounts hidden again.
   * Mute is a preference, not progress, so it stays.
   */
  startOver() {
    progress.reset()
    cameraMemory.forgetAll()
    if (typeof window !== 'undefined') window.location.reload()
  }

  toggleMuted() {
    audio.toggleMuted()
    motionStore.set({ muted: audio.getMuted() })
  }

  setMuted(next: boolean) {
    audio.setMuted(next)
    motionStore.set({ muted: audio.getMuted() })
  }
}

export const motion = new MotionController()
