import type { Orb, OrbDef, CircleObs } from './types'

const GUTTER = 48
const STATS_BAR_HEIGHT = 42
const HINT_BAR_HEIGHT = 40
const BOTTOM_RESERVE = STATS_BAR_HEIGHT + HINT_BAR_HEIGHT + 12

export const createOrb = (d: OrbDef, w: number, h: number): Orb => ({
  x: d.fx * w, y: d.fy * h,
  r: d.r, vx: d.vx, vy: d.vy,
  color: d.color, label: d.label,
  paused: false, dragging: false,
  dragStartX: 0, dragStartY: 0,
  dragStartOrbX: 0, dragStartOrbY: 0,
  frozenScrollY: 0,
})

export const moveOrbs = (orbs: Orb[], dt: number, pw: number, ph: number) => {
  for (const o of orbs) {
    if (o.paused || o.dragging) continue
    o.x += o.vx * dt
    o.y += o.vy * dt
    clampOrb(o, pw, ph)
  }
  applyRepulsion(orbs, dt)
}

const clampOrb = (o: Orb, pw: number, ph: number) => {
  if (o.x - o.r < 0) { o.x = o.r; o.vx = Math.abs(o.vx) }
  if (o.x + o.r > pw) { o.x = pw - o.r; o.vx = -Math.abs(o.vx) }
  if (o.y - o.r < GUTTER * 0.5) { o.y = o.r + GUTTER * 0.5; o.vy = Math.abs(o.vy) }
  if (o.y + o.r > ph - BOTTOM_RESERVE) { o.y = ph - BOTTOM_RESERVE - o.r; o.vy = -Math.abs(o.vy) }
}

const applyRepulsion = (orbs: Orb[], dt: number) => {
  for (let i = 0; i < orbs.length; i++) {
    for (let j = i + 1; j < orbs.length; j++) {
      const a = orbs[i], b = orbs[j]
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      const minDist = a.r + b.r + 20
      if (dist >= minDist || dist <= 0.1) continue
      const force = (minDist - dist) * 0.8
      const nx = dx / dist, ny = dy / dist
      if (!a.paused && !a.dragging) { a.vx -= nx * force * dt; a.vy -= ny * force * dt }
      if (!b.paused && !b.dragging) { b.vx += nx * force * dt; b.vy += ny * force * dt }
    }
  }
}

export const orbToObstacle = (o: Orb, scrollY: number): CircleObs => ({
  cx: o.x,
  cy: o.paused ? o.y + o.frozenScrollY : o.y + scrollY,
  r: o.r, hPad: 14, vPad: 4,
})

export const pauseAllOrbs = (orbs: Orb[], paused: boolean, scrollY: number) => {
  for (const o of orbs) {
    o.paused = paused
    if (paused) o.frozenScrollY = scrollY
  }
}
