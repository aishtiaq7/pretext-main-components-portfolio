import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════
// Visitor progress — how far the story has got.
//   revealed : triggerIds that have appeared (reveal engine)
//   played   : triggerIds whose reveal animation has finished
//   clicked  : triggerIds the visitor has clicked at least once
//   flags    : named booleans set by 'set:<flag>' actions
// Persists in localStorage so it survives route changes and
// reloads (decision: block 8). On a reload the reveal engine
// restores everything in `revealed` in its finished state, so
// the visitor never has to reveal the same thing twice.
// Read by guards ('after:', 'flag:', 'once') and by anything
// custom in src/actions.ts. triggerIds are global across
// notebooks — keep them unique.
// localStorage may be missing or throw (sandboxes, private mode);
// everything falls back to memory-only without complaint.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'notebook.progress.v1'

type Snapshot = {
  revealed: ReadonlySet<string>
  played: ReadonlySet<string>
  clicked: ReadonlySet<string>
  flags: ReadonlySet<string>
}

type Stored = { revealed: string[]; played: string[]; clicked: string[]; flags: string[] }

const EMPTY = (): Snapshot => ({ revealed: new Set(), played: new Set(), clicked: new Set(), flags: new Set() })

function load(): Snapshot {
  try {
    if (typeof localStorage === 'undefined') throw new Error('no storage')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const s = JSON.parse(raw) as Partial<Stored>
    const list = (v: unknown) => new Set(Array.isArray(v) ? (v as string[]) : [])
    return { revealed: list(s.revealed), played: list(s.played), clicked: list(s.clicked), flags: list(s.flags) }
  } catch {
    return EMPTY()
  }
}

let state: Snapshot = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    if (typeof localStorage === 'undefined') return
    const out: Stored = {
      revealed: [...state.revealed],
      played: [...state.played],
      clicked: [...state.clicked],
      flags: [...state.flags],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out))
  } catch {
    /* memory-only */
  }
}

function commit(next: Snapshot) {
  state = next
  persist()
  for (const fn of listeners) fn()
}

function withAdded(set: ReadonlySet<string>, value: string): ReadonlySet<string> | null {
  if (set.has(value)) return null
  const next = new Set(set)
  next.add(value)
  return next
}

export const progress = {
  get(): Snapshot { return state },

  hasRevealed(triggerId: string): boolean { return state.revealed.has(triggerId) },
  hasPlayed(triggerId: string): boolean { return state.played.has(triggerId) },
  hasClicked(triggerId: string): boolean { return state.clicked.has(triggerId) },
  hasFlag(name: string): boolean { return state.flags.has(name) },

  markRevealed(triggerId: string) {
    const next = withAdded(state.revealed, triggerId)
    if (next) commit({ ...state, revealed: next })
  },

  markPlayed(triggerId: string) {
    const next = withAdded(state.played, triggerId)
    if (next) commit({ ...state, played: next })
  },

  markClicked(triggerId: string) {
    const next = withAdded(state.clicked, triggerId)
    if (next) commit({ ...state, clicked: next })
  },

  setFlag(name: string) {
    const next = withAdded(state.flags, name)
    if (next) commit({ ...state, flags: next })
  },

  clearFlag(name: string) {
    if (!state.flags.has(name)) return
    const next = new Set(state.flags)
    next.delete(name)
    commit({ ...state, flags: next })
  },

  /** Forget everything ("start over"). */
  reset() {
    commit(EMPTY())
  },

  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
}

export function useProgress(): Snapshot {
  return useSyncExternalStore(progress.subscribe, progress.get)
}
