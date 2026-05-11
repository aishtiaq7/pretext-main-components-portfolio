// Shared gesture flag — set by the viewport's touch handler when 2+ fingers
// are down, checked by every draggable component before starting/continuing
// a pointer-drag. When true, draggables yield the gesture to the canvas
// pinch/pan so the page doesn't fight the zoom.

let multiTouchActive = false

export function isMultiTouchActive(): boolean {
  return multiTouchActive
}

export function setMultiTouchActive(value: boolean): void {
  multiTouchActive = value
}
