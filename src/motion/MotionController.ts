import gsap from 'gsap'
import { focusOn, getViewport } from '../store/viewport'
import { CANVAS } from '../constants'
import { triggers } from '../store/triggers'
import { audio } from '../audio/AudioController'
import { motionStore } from './motionStore'
import { SCENES } from './scenes'

// ═══════════════════════════════════════════════════════════
// MotionController — owns the master GSAP timeline.
//
// Lazy-builds on first play() call. Each scene becomes a chunk
// of the master:
//   [snapshot current view] → [pan tween → focus(scene)] →
//   [call: triggers.play + audio.play] → [hold tween]
//
// User input on the canvas during playback is NOT locked —
// when the user drags, focusOn() inside the pan tween still
// fires per frame so the camera "fights" briefly; that's the
// agreed-upon behavior for phase 1.
// ═══════════════════════════════════════════════════════════

const PCT_TO_PX = CANVAS / 100

/** Convert current viewport pan/zoom back to the focus-% representation. */
function viewportToFocus() {
  const v = getViewport()
  return {
    x: 50 - v.panX / (PCT_TO_PX * v.zoom),
    y: 50 - v.panY / (PCT_TO_PX * v.zoom),
    zoom: v.zoom,
  }
}

class MotionController {
  private master: gsap.core.Timeline | null = null
  // Mobile audio fix: each <audio> element must have its first .play()
  // invoked inside a user-gesture call stack to unlock for the session.
  // We prime every distinct SFX once, on the first Play click.
  private primed = false

  private build(): gsap.core.Timeline {
    // Shared proxy object the pan tween mutates; onUpdate writes the values
    // back through the existing viewport store via focusOn().
    const proxy = { x: 50, y: 50, zoom: 1 }

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => motionStore.set({ status: 'done' }),
    })

    SCENES.forEach((scene) => {
      // Pan camera to the scene's focus (every scene with a focus, including
      // the first — so hitting Play after panning away brings the camera back).
      if (scene.focus) {
        tl.call(() => {
          // snapshot the *current* viewport into the proxy so the to() below
          // tweens from here, not from a stale build-time value.
          const f = viewportToFocus()
          proxy.x = f.x
          proxy.y = f.y
          proxy.zoom = f.zoom
        })
        tl.to(proxy, {
          x: scene.focus.x,
          y: scene.focus.y,
          zoom: scene.focus.zoom,
          duration: scene.panDuration ?? 1.2,
          ease: 'power2.inOut',
          immediateRender: false,
          onUpdate: () => focusOn(proxy.x, proxy.y, proxy.zoom),
        })
      }

      // Trigger the entity + scribe SFX
      tl.call(() => {
        triggers.play(scene.triggerId)
        if (scene.sfx) audio.play(scene.sfx)
      })

      // Hold (timeline pause for N seconds while handwriting scribbles)
      if (scene.holdDuration) {
        tl.to({}, { duration: scene.holdDuration })
      }
    })

    return tl
  }

  private ensure(): gsap.core.Timeline {
    if (!this.master) this.master = this.build()
    return this.master
  }

  /** Start (or resume from pause). One-shot — no-op once the timeline is done. */
  play() {
    const tl = this.ensure()
    if (tl.progress() === 1) return

    // Prime every SFX track on the very first Play click. Must run BEFORE
    // any async work so we're still inside the click's gesture stack.
    if (!this.primed) {
      this.primed = true
      const seen = new Set<string>()
      for (const s of SCENES) {
        if (s.sfx && !seen.has(s.sfx)) {
          seen.add(s.sfx)
          audio.prime(s.sfx)
        }
      }
    }

    const wasPaused = tl.paused() && tl.time() > 0
    tl.play()
    if (wasPaused) {
      // resume entity rAFs + audio that were paused alongside the timeline
      triggers.resumeAll()
      for (const src of [...new Set(SCENES.map((s) => s.sfx).filter(Boolean) as string[])]) {
        audio.resume(src)
      }
    }
    motionStore.set({ status: 'playing' })
  }

  /** Freeze everything: master timeline + each entity's own rAF + audio. */
  pause() {
    if (!this.master) return
    this.master.pause()
    triggers.pauseAll()
    audio.pauseAll()
    motionStore.set({ status: 'paused' })
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
