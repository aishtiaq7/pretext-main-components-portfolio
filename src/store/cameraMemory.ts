import type { ViewportState } from './viewport'

// ═══════════════════════════════════════════════════════════
// Camera memory — where the visitor left the camera, per
// notebook, so a reload lands them on the same spot. Canvas
// state otherwise resets per notebook (positions, pins); the
// camera is the one piece the visitor expects to stay put.
// Writes are debounced: the viewport emits every frame during
// a pan, localStorage should not.
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'notebook.camera.v1'
const SAVE_DELAY_MS = 250

type Stored = Record<string, ViewportState>

let cache: Stored = load()
let timer: ReturnType<typeof setTimeout> | null = null

function load(): Stored {
  try {
    if (typeof localStorage === 'undefined') return {}
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Stored) : {}
  } catch {
    return {}
  }
}

function persist() {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* memory-only */
  }
}

function isViewport(v: unknown): v is ViewportState {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return [o.zoom, o.panX, o.panY].every((n) => typeof n === 'number' && Number.isFinite(n))
}

export const cameraMemory = {
  /** The saved camera for a notebook, or null if none. */
  load(notebookId: string): ViewportState | null {
    const v = cache[notebookId]
    return isViewport(v) ? { zoom: v.zoom, panX: v.panX, panY: v.panY } : null
  },

  /** Remember the camera for a notebook (debounced write). */
  save(notebookId: string, v: ViewportState) {
    cache = { ...cache, [notebookId]: { zoom: v.zoom, panX: v.panX, panY: v.panY } }
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; persist() }, SAVE_DELAY_MS)
  },

  /** Write immediately (page hide / unmount). */
  flush() {
    if (timer !== null) { clearTimeout(timer); timer = null }
    persist()
  },

  forget(notebookId: string) {
    const next = { ...cache }
    delete next[notebookId]
    cache = next
    persist()
  },

  forgetAll() {
    cache = {}
    persist()
  },
}
