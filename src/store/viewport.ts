import { useSyncExternalStore } from 'react'
import { CANVAS, INITIAL_VIEW } from '../constants'

// ═══════════════════════════════════════════════════════════
// Viewport store — single source of truth for zoom + pan
// Mutations are synchronous & atomic. setZoom auto-adjusts
// pan so the viewport center stays on the same canvas point.
// ═══════════════════════════════════════════════════════════

export type ViewportState = { zoom: number; panX: number; panY: number }

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0

// Rubber-band: how much of the overshoot is allowed past the edge during drag.
// Result asymptotes to RUBBER_MAX so users can feel the edge without hard-stopping.
const RUBBER_FACTOR = 0.55
const RUBBER_MAX = 240

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

/**
 * Zoom-aware pan limits. At zoom z the canvas occupies CANVAS*z px; pan can
 * shift it until its edge reaches the viewport edge. If the canvas is smaller
 * than the viewport (very zoomed out) we lock pan to 0 so it stays centered.
 */
export function getPanLimit(zoom: number) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
  return {
    x: Math.max(0, (CANVAS * zoom - vw) / 2),
    y: Math.max(0, (CANVAS * zoom - vh) / 2),
  }
}

/** Map a raw pan value to a rubber-banded one when it exceeds [-limit, limit]. */
function rubberBand(value: number, limit: number) {
  if (value > limit) {
    const over = value - limit
    return limit + (over * RUBBER_MAX) / (over + RUBBER_MAX / RUBBER_FACTOR)
  }
  if (value < -limit) {
    const over = -limit - value
    return -limit - (over * RUBBER_MAX) / (over + RUBBER_MAX / RUBBER_FACTOR)
  }
  return value
}

// ── Internal state + subscription ────────────────────────

/**
 * Pan offset that places a given canvas-% point under the viewport center,
 * at the given zoom. Math: canvas center (50%, 50%) lands at the viewport
 * center when pan = 0, so to focus on (fx%, fy%) we shift by the delta.
 * PCT_TO_PX = 80 (8000 / 100).
 */
function focusToPan(focusX: number, focusY: number, zoom: number) {
  const PCT_TO_PX = CANVAS / 100
  const lim = getPanLimit(zoom)
  return {
    panX: clamp((50 - focusX) * PCT_TO_PX * zoom, -lim.x, lim.x),
    panY: clamp((50 - focusY) * PCT_TO_PX * zoom, -lim.y, lim.y),
  }
}

let state: ViewportState = {
  zoom: INITIAL_VIEW.zoom,
  ...focusToPan(INITIAL_VIEW.focusX, INITIAL_VIEW.focusY, INITIAL_VIEW.zoom),
}
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    const lim = getPanLimit(state.zoom)
    const px = clamp(state.panX, -lim.x, lim.x)
    const py = clamp(state.panY, -lim.y, lim.y)
    if (px !== state.panX || py !== state.panY) {
      state = { ...state, panX: px, panY: py }
      emit()
    }
  })
}

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
  const lim = getPanLimit(z)
  state = {
    zoom: z,
    panX: clamp(state.panX * ratio, -lim.x, lim.x),
    panY: clamp(state.panY * ratio, -lim.y, lim.y),
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
  const lim = getPanLimit(zNext)
  state = {
    zoom: zNext,
    panX: clamp(panX, -lim.x, lim.x),
    panY: clamp(panY, -lim.y, lim.y),
  }
  emit()
}

/** Set both pan axes at once. Hard-clamped to current zoom's edge limits. */
export function setPan(x: number, y: number) {
  const lim = getPanLimit(state.zoom)
  const px = clamp(x, -lim.x, lim.x)
  const py = clamp(y, -lim.y, lim.y)
  if (px === state.panX && py === state.panY) return
  state = { ...state, panX: px, panY: py }
  emit()
}

/**
 * Pan with rubber-band falloff past the edge. Use during active drags so the
 * canvas can travel slightly beyond the limit; pair with settlePan() on release.
 */
export function setPanRubber(x: number, y: number) {
  const lim = getPanLimit(state.zoom)
  const px = rubberBand(x, lim.x)
  const py = rubberBand(y, lim.y)
  if (px === state.panX && py === state.panY) return
  state = { ...state, panX: px, panY: py }
  emit()
}

/** Animate pan back to the clamped target if currently past the edge. */
export function settlePan() {
  const lim = getPanLimit(state.zoom)
  const targetX = clamp(state.panX, -lim.x, lim.x)
  const targetY = clamp(state.panY, -lim.y, lim.y)
  if (targetX === state.panX && targetY === state.panY) return
  const startX = state.panX
  const startY = state.panY
  const dx = targetX - startX
  const dy = targetY - startY
  const start = performance.now()
  const dur = 260
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / dur)
    // ease-out cubic
    const e = 1 - Math.pow(1 - p, 3)
    state = { ...state, panX: startX + dx * e, panY: startY + dy * e }
    emit()
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** Set panX only. */
export function setPanX(x: number) {
  const lim = getPanLimit(state.zoom)
  const px = clamp(x, -lim.x, lim.x)
  if (px === state.panX) return
  state = { ...state, panX: px }
  emit()
}

/** Set panY only. */
export function setPanY(y: number) {
  const lim = getPanLimit(state.zoom)
  const py = clamp(y, -lim.y, lim.y)
  if (py === state.panY) return
  state = { ...state, panY: py }
  emit()
}

/**
 * Jump the viewport so the given canvas-% point lands under the viewport
 * center. Optional `zoom` changes the zoom too; otherwise current zoom is kept.
 * Use this from buttons / object clicks later on.
 */
export function focusOn(focusX: number, focusY: number, zoom?: number) {
  const z = clamp(zoom ?? state.zoom, MIN_ZOOM, MAX_ZOOM)
  const { panX, panY } = focusToPan(focusX, focusY, z)
  if (z === state.zoom && panX === state.panX && panY === state.panY) return
  state = { zoom: z, panX, panY }
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
