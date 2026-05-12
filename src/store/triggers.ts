// ═══════════════════════════════════════════════════════════
// TriggerRegistry — runtime map of imperative entity handles
// keyed by triggerId. Entities register on mount; the master
// timeline looks them up by id and calls play/pause/reset.
// Lives outside React state — purely imperative.
// ═══════════════════════════════════════════════════════════

export type EntityHandle = {
  reveal: () => void          // flip visibility on (no animation)
  play: () => void            // start / restart the entity's own animation
  pause: () => void           // freeze current state
  resume: () => void          // continue from paused position
  reset: () => void           // jump to final state, cancel any rAF
}

const handles = new Map<string, EntityHandle>()
const waiters = new Map<string, Array<(h: EntityHandle) => void>>()

export const triggers = {
  register(id: string, handle: EntityHandle) {
    handles.set(id, handle)
    const pending = waiters.get(id)
    if (pending) {
      for (const fn of pending) fn(handle)
      waiters.delete(id)
    }
  },

  unregister(id: string) {
    handles.delete(id)
  },

  get(id: string): EntityHandle | undefined {
    return handles.get(id)
  },

  /** Fire-and-forget play. No-ops if the handle isn't registered yet. */
  play(id: string) {
    handles.get(id)?.play()
  },

  reveal(id: string) {
    handles.get(id)?.reveal()
  },

  pauseAll() {
    for (const h of handles.values()) h.pause()
  },

  resumeAll() {
    for (const h of handles.values()) h.resume()
  },

  /**
   * Wait until a handle becomes available, then resolve. Useful when the master
   * timeline is built before all entities have mounted (e.g. lazy lists).
   */
  whenReady(id: string): Promise<EntityHandle> {
    const existing = handles.get(id)
    if (existing) return Promise.resolve(existing)
    return new Promise((resolve) => {
      const list = waiters.get(id) ?? []
      list.push(resolve)
      waiters.set(id, list)
    })
  },
}
