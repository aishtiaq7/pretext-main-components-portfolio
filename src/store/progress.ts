import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════
// Visitor progress — what the visitor has reached so far.
//   played  : triggerIds whose reveal animation has finished
//   clicked : triggerIds the visitor has clicked at least once
//   flags   : named booleans set by 'set:<flag>' actions
// Persists in localStorage so it survives route changes and
// reloads (decision: block 8). Read by guards ('after:', 'flag:',
// 'once') and by anything custom in src/actions.ts.
// localStorage may be missing or throw (sandboxes, private mode);
// everything falls back to memory-only without complaint.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'notebook.progress.v1'

type Snapshot = {
  played: ReadonlySet<string>
  clicked: ReadonlySet<string>
  flags: ReadonlySet<string>
}

type Stored = { played: string[]; clicked: string[]; flags: string[] }

function load(): Snapshot {
  try {
    if (typeof localStorage === 'undefined') throw new Error('no storage')
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('empty')
    const s = JSON.parse(raw) as Partial<Stored>
    return {
      played: new Set(Array.isArray(s.played) ? s.played : []),
      clicked: new Set(Array.isArray(s.clicked) ? s.clicked : []),
      flags: new Set(Array.isArray(s.flags) ? s.flags : []),
    }
  } catch {
    return { played: new Set(), clicked: new Set(), flags: new Set() }
  }
}

let state: Snapshot = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    if (typeof localStorage === 'undefined') return
    const out: Stored = {
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

  hasPlayed(triggerId: string): boolean { return state.played.has(triggerId) },
  hasClicked(triggerId: string): boolean { return state.clicked.has(triggerId) },
  hasFlag(name: string): boolean { return state.flags.has(name) },

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

  /** Forget everything (dev tool / "start over"). */
  reset() {
    commit({ played: new Set(), clicked: new Set(), flags: new Set() })
  },

  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
}

export function useProgress(): Snapshot {
  return useSyncExternalStore(progress.subscribe, progress.get)
}
