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

// 3 movable words — positioned away from sections
export const OBSTACLES: EntityDef[] = [
  { id: 'obs-deadline', x: 75, y: 15, rotate: 0,
    font: '"Permanent Marker", cursive', fontSize: '3.2rem', fontWeight: '400',
    content: 'deadline', obstacleW: 275, obstacleH: 58,
    ...DEFAULTS },
  { id: 'obs-asap', x: 75, y: 45, rotate: 0,
    font: '"Rock Salt", cursive', fontSize: '2.8rem', fontWeight: '400',
    content: 'ASAP', obstacleW: 195, obstacleH: 55,
    ...DEFAULTS },
  { id: 'obs-scope-creep', x: 75, y: 75, rotate: 0,
    font: '"Caveat", cursive', fontSize: '3.0rem', fontWeight: '700',
    content: 'scope creep', obstacleW: 260, obstacleH: 52,
    ...DEFAULTS },
]
