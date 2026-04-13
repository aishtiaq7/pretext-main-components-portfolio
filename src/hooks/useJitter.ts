import { useRef, useEffect, useCallback, useState } from 'react'
import type { JitterType } from '../types'

// ═══════════════════════════════════════════════════════════
// JITTER CONFIG — tune animation feel per type
// ═══════════════════════════════════════════════════════════
const JITTER_CONFIG = {
  wobble: {
    rotateAmp: 3,       // degrees
    speed: 0.0008,      // radians per ms
  },
  drift: {
    xAmp: 4,            // px
    yAmp: 3,            // px
    speed: 0.0005,
  },
  pulse: {
    scaleMin: 0.97,
    scaleMax: 1.03,
    speed: 0.0004,
  },
  'wobble-drift': {
    rotateAmp: 2.5,
    xAmp: 3,
    yAmp: 2,
    speed: 0.0006,
  },
}

type JitterResult = {
  /** Attach this ref to the element you want to animate */
  jitterRef: React.RefObject<HTMLDivElement | null>
  frozen: boolean
  toggleFreeze: () => void
}

/**
 * Applies jitter animation directly to the DOM via ref (no React re-renders).
 * Each entity gets a unique phase offset from its id so they don't sync up.
 */
export function useJitter(
  jitterType: JitterType | undefined,
  entityId: string,
  baseRotate: number,
): JitterResult {
  const type = jitterType || 'none'
  const [frozen, setFrozen] = useState(false)
  const rafRef = useRef<number>(0)
  const elRef = useRef<HTMLDivElement | null>(null)

  // Stable phase offset per entity (hash the id)
  const phaseRef = useRef(0)
  if (phaseRef.current === 0) {
    let h = 0
    for (let i = 0; i < entityId.length; i++) {
      h = ((h << 5) - h + entityId.charCodeAt(i)) | 0
    }
    phaseRef.current = Math.abs(h % 10000)
  }

  const toggleFreeze = useCallback(() => setFrozen(f => !f), [])

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    if (type === 'none' || frozen) {
      // Set static transform once, no loop
      el.style.transform = `rotate(${baseRotate}deg)`
      return
    }

    let running = true
    const phase = phaseRef.current

    const tick = () => {
      if (!running || !elRef.current) return
      const t = performance.now() + phase * 100

      let rotate = baseRotate
      let tx = 0
      let ty = 0
      let scale = 1

      if (type === 'wobble') {
        const cfg = JITTER_CONFIG.wobble
        rotate = baseRotate + Math.sin(t * cfg.speed) * cfg.rotateAmp
      } else if (type === 'drift') {
        const cfg = JITTER_CONFIG.drift
        tx = Math.sin(t * cfg.speed) * cfg.xAmp
        ty = Math.cos(t * cfg.speed * 0.7) * cfg.yAmp
      } else if (type === 'pulse') {
        const cfg = JITTER_CONFIG.pulse
        const s = Math.sin(t * cfg.speed)
        scale = cfg.scaleMin + (cfg.scaleMax - cfg.scaleMin) * ((s + 1) / 2)
      } else if (type === 'wobble-drift') {
        const cfg = JITTER_CONFIG['wobble-drift']
        rotate = baseRotate + Math.sin(t * cfg.speed) * cfg.rotateAmp
        tx = Math.sin(t * cfg.speed * 0.8) * cfg.xAmp
        ty = Math.cos(t * cfg.speed * 0.6) * cfg.yAmp
      }

      elRef.current.style.transform =
        `translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale})`

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [type, frozen, baseRotate])

  return {
    jitterRef: elRef,
    frozen,
    toggleFreeze,
  }
}
