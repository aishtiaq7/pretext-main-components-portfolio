import { useSyncExternalStore } from 'react'
import { CANVAS, PAN_LIMIT } from '../constants'

// ═══════════════════════════════════════════════════════════
// Viewport store — single source of truth for zoom + pan
// Mutations are synchronous & atomic. setZoom auto-adjusts
// pan so the viewport center stays on the same canvas point.
// ═══════════════════════════════════════════════════════════

export type ViewportState = { zoom: number; panX: number; panY: number }

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

// ── Internal state + subscription ────────────────────────

let state: ViewportState = { zoom: 1.0, panX: 0, panY: 0 }
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// ── Snapshots for useSyncExternalStore ───────────────────

function getSnapshot(): ViewportState { return state }
function getZoomSnapshot(): number { return state.zoom }

// ── Direct read (for event handlers / rAF) ───────────────

export function getViewport(): ViewportState { return state }

// ── Mutations ────────────────────────────────────────────

/** Set zoom, scaling pan so the viewport center stays fixed. */
export function setZoom(raw: number) {
  const z = clamp(raw, MIN_ZOOM, MAX_ZOOM)
  if (z === state.zoom) return
  const ratio = z / state.zoom
  state = {
    zoom: z,
    panX: clamp(state.panX * ratio, -PAN_LIMIT, PAN_LIMIT),
    panY: clamp(state.panY * ratio, -PAN_LIMIT, PAN_LIMIT),
  }
  emit()
}

/**
 * Zoom anchored at a viewport-relative point (e.g. cursor position).
 * The canvas point currently under (anchorX, anchorY) stays under the cursor
 * after the zoom change — matches pinch-to-zoom UX in Figma / Miro / tldraw.
 */
export function setZoomAnchored(rawZoom: number, anchorX: number, anchorY: number) {
  const zNext = clamp(rawZoom, MIN_ZOOM, MAX_ZOOM)
  if (zNext === state.zoom) return
  const half = CANVAS / 2
  const zPrev = state.zoom
  // Canvas-local coord under the anchor before zoom:
  //   cx = (anchorX - tx) / z   where tx = -half*z + panX
  //   => cx = (anchorX - panX)/z + half
  const cx = (anchorX - state.panX) / zPrev + half
  const cy = (anchorY - state.panY) / zPrev + half
  // Solve for new pan so the same cx,cy lands at anchorX,anchorY under zNext.
  const panX = anchorX + (half - cx) * zNext
  const panY = anchorY + (half - cy) * zNext
  state = {
    zoom: zNext,
    panX: clamp(panX, -PAN_LIMIT, PAN_LIMIT),
    panY: clamp(panY, -PAN_LIMIT, PAN_LIMIT),
  }
  emit()
}

/** Set both pan axes at once. */
export function setPan(x: number, y: number) {
  const px = clamp(x, -PAN_LIMIT, PAN_LIMIT)
  const py = clamp(y, -PAN_LIMIT, PAN_LIMIT)
  if (px === state.panX && py === state.panY) return
  state = { ...state, panX: px, panY: py }
  emit()
}

/** Set panX only. */
export function setPanX(x: number) {
  const px = clamp(x, -PAN_LIMIT, PAN_LIMIT)
  if (px === state.panX) return
  state = { ...state, panX: px }
  emit()
}

/** Set panY only. */
export function setPanY(y: number) {
  const py = clamp(y, -PAN_LIMIT, PAN_LIMIT)
  if (py === state.panY) return
  state = { ...state, panY: py }
  emit()
}

// ── Hooks ────────────────────────────────────────────────

/** Subscribe to full viewport state (zoom + panX + panY). */
export function useViewport(): ViewportState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** Subscribe to zoom only — won't re-render on pan changes. */
export function useViewportZoom(): number {
  return useSyncExternalStore(subscribe, getZoomSnapshot)
}
