import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════
// motionStore — reactive mirror of the MotionController.
// Components subscribe to this for UI state (play button icon,
// disabled state when scene done). Per-frame timeline progress
// is NOT mirrored here — it's expensive and only the master
// controls need it (which read it imperatively).
// ═══════════════════════════════════════════════════════════

export type MotionStatus = 'idle' | 'playing' | 'paused' | 'done'

export type MotionState = {
  status: MotionStatus
  muted: boolean
}

let state: MotionState = { status: 'idle', muted: false }
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export const motionStore = {
  get(): MotionState { return state },

  set(patch: Partial<MotionState>) {
    const next = { ...state, ...patch }
    if (next.status === state.status && next.muted === state.muted) return
    state = next
    emit()
  },

  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
}

export function useMotionState(): MotionState {
  return useSyncExternalStore(motionStore.subscribe, motionStore.get)
}
