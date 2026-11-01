import { useSyncExternalStore } from 'react'
import { getPref } from '../store/prefs'

// ═══════════════════════════════════════════════════════════
// motionStore — reactive mirror of the MotionController.
// Components subscribe to this for UI state (play / pause icon,
// mute icon). `muted` starts from the persisted visitor
// preference so the icon is right on first paint.
// ═══════════════════════════════════════════════════════════

export type MotionStatus = 'idle' | 'playing' | 'paused' | 'done'

export type MotionState = {
  status: MotionStatus
  muted: boolean
}

let state: MotionState = { status: 'idle', muted: getPref('muted') }
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
