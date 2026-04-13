import type { EntityDef } from '../types'

const DEFAULTS = {
  type: 'text' as const,
  category: 'obstacle' as const,
  jitter: 'none' as const,
  obstacle: true,
  opacity: 0.9,
  color: '#c83030',
  pinned: false,
}

// CLUSTER 5 — 3 Red Obstacles, aligned on same y as sections & reflow paras.
// x: 35 (reflow paras start x: 38 → ~1% gap, very close).
export const OBSTACLES: EntityDef[] = [
  { id: 'obs-deadline', x: 35, y: 30.5, rotate: -12,
    font: '"Permanent Marker", cursive', fontSize: '2.2rem', fontWeight: '400',
    content: 'deadline', obstacleW: 200, obstacleH: 46,
    ...DEFAULTS },
  { id: 'obs-asap', x: 35, y: 42, rotate: -18,
    font: '"Rock Salt", cursive', fontSize: '2rem', fontWeight: '400',
    content: 'ASAP', obstacleW: 145, obstacleH: 44,
    ...DEFAULTS },
  { id: 'obs-scope-creep', x: 35, y: 61, rotate: -14,
    font: '"Caveat", cursive', fontSize: '2.2rem', fontWeight: '700',
    content: 'scope creep', obstacleW: 190, obstacleH: 42,
    ...DEFAULTS },
]
