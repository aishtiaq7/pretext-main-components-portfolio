// ═══════════════════════════════════════════════════════════
// AudioController — single-bus SFX manager.
// HTMLAudio under the hood (simplest; one shared element per
// track, paused/seeked imperatively). Global mute short-
// circuits playback without touching individual tracks.
//
// Audio playback requires a user gesture first; the controller
// records when it's been "unlocked" so callers/UI can branch.
// ═══════════════════════════════════════════════════════════

type Listener = () => void

const tracks = new Map<string, HTMLAudioElement>()
const listeners = new Set<Listener>()
let muted = false
let unlocked = false

function emit() {
  for (const fn of listeners) fn()
}

function getOrLoad(src: string): HTMLAudioElement {
  let el = tracks.get(src)
  if (!el) {
    el = new Audio(src)
    el.preload = 'auto'
    tracks.set(src, el)
  }
  return el
}

export const audio = {
  /** Subscribe to mute/unlock state changes. */
  subscribe(fn: Listener) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },

  getMuted(): boolean { return muted },
  getUnlocked(): boolean { return unlocked },

  setMuted(next: boolean) {
    if (muted === next) return
    muted = next
    if (muted) {
      for (const el of tracks.values()) el.pause()
    }
    emit()
  },

  toggleMuted() {
    this.setMuted(!muted)
  },

  /** Play a track from the start. No-op when muted. */
  play(src: string) {
    if (muted) return
    const el = getOrLoad(src)
    el.currentTime = 0
    el.play().then(() => {
      if (!unlocked) {
        unlocked = true
        emit()
      }
    }).catch(() => { /* autoplay block — ignore */ })
  },

  /** Pause a specific track (keeps position). */
  pause(src: string) {
    tracks.get(src)?.pause()
  },

  /** Resume a paused track from current position. No-op when muted. */
  resume(src: string) {
    if (muted) return
    tracks.get(src)?.play().catch(() => {})
  },

  pauseAll() {
    for (const el of tracks.values()) el.pause()
  },
}
