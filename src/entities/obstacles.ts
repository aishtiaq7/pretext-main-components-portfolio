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

// CLUSTER 5 — 4 Red Obstacles, right of the notebook (notebook ends at x:21.75)
// x: 22 (right at notebook edge), paired with reflow paras at x: 25
export const OBSTACLES: EntityDef[] = [
  { id: 'obs-deadline', x: 22, y: 17, rotate: -10,
    font: '"Permanent Marker", cursive', fontSize: '1.8rem', fontWeight: '400',
    content: 'deadline', obstacleW: 160, obstacleH: 38,
    ...DEFAULTS },
  { id: 'obs-asap', x: 22, y: 20, rotate: -14,
    font: '"Rock Salt", cursive', fontSize: '1.6rem', fontWeight: '400',
    content: 'ASAP', obstacleW: 120, obstacleH: 36,
    ...DEFAULTS },
  { id: 'obs-scope-creep', x: 22, y: 23, rotate: -12,
    font: '"Caveat", cursive', fontSize: '1.8rem', fontWeight: '700',
    content: 'scope creep', obstacleW: 155, obstacleH: 34,
    ...DEFAULTS },
  { id: 'obs-bug', x: 22, y: 26, rotate: -8,
    font: '"Permanent Marker", cursive', fontSize: '1.7rem', fontWeight: '400',
    content: 'BUG!', obstacleW: 120, obstacleH: 38,
    ...DEFAULTS },
]
