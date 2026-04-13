import type { EntityDef } from '../types'

const DEFAULTS = {
  type: 'text' as const,
  category: 'obstacle' as const,
  jitter: 'none' as const,
  obstacle: true,
  rotate: 0,
  opacity: 0.9,
  color: '#c83030',
  pinned: false,
}

// CLUSTER 5 — Red Obstacles (x: 90, 3 items stacked tight)
// Drag them onto the Reflow Paragraph cluster (x: 50-65) to see lines bend.
export const OBSTACLES: EntityDef[] = [
  { id: 'obs-deadline', x: 90, y: 18,
    font: '"Permanent Marker", cursive', fontSize: '2.6rem', fontWeight: '400',
    content: 'deadline', obstacleW: 230, obstacleH: 50,
    ...DEFAULTS },
  { id: 'obs-asap', x: 90, y: 22,
    font: '"Rock Salt", cursive', fontSize: '2.4rem', fontWeight: '400',
    content: 'ASAP', obstacleW: 170, obstacleH: 48,
    ...DEFAULTS },
  { id: 'obs-scope-creep', x: 90, y: 26,
    font: '"Caveat", cursive', fontSize: '2.6rem', fontWeight: '700',
    content: 'scope creep', obstacleW: 225, obstacleH: 45,
    ...DEFAULTS },
]
