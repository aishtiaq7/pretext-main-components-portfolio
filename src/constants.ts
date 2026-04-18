// Canvas size in px — all positioning math derives from this
export const CANVAS = 8000
export const PAN_LIMIT = 5000

// ═══════════════════════════════════════════════════════════
// Initial viewport focus
//   focusX / focusY are canvas coords in percent (0–100).
//   On load, that canvas point lands under the viewport center.
//     (50, 50) → canvas center at screen center (old default)
//     ( 0,  0) → canvas top-left at screen center
//     (100, 100) → canvas bottom-right at screen center
//   zoom is the initial scale (0.15–3.0).
// ═══════════════════════════════════════════════════════════
export const INITIAL_VIEW = {
  focusX: 3,
  focusY: 72,
  zoom: 1.0,
}
