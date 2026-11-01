// ═══════════════════════════════════════════════════════════
// Visitor preferences — settings the visitor chose, kept across
// notebooks and reloads (decision: block 8). Distinct from
// visitor *progress* (store/progress.ts) and from canvas state,
// which resets per notebook.
// localStorage may be missing or throw; fall back to memory.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'notebook.prefs.v1'

export type Prefs = {
  muted: boolean
}

const DEFAULTS: Prefs = { muted: false }

let prefs: Prefs = load()

function load(): Prefs {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULTS }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return { ...DEFAULTS, ...(typeof parsed.muted === 'boolean' ? { muted: parsed.muted } : {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

function persist() {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* memory-only */
  }
}

export function getPref<K extends keyof Prefs>(key: K): Prefs[K] {
  return prefs[key]
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  if (prefs[key] === value) return
  prefs = { ...prefs, [key]: value }
  persist()
}
