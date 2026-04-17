import type { EntityDef } from '../types'

const DEFAULTS = {
  type: 'text' as const,
  category: 'obstacle' as const,
  jitter: 'none' as const,
  obstacle: true,
  opacity: 0.9,
  color: '#c83030',
  pinned: false,
  motionDraggable: true,
}

// ═══════════════════════════════════════════════════════════
// OLD RED OBSTACLES — hidden (comment back in to restore)
// ═══════════════════════════════════════════════════════════
// { id: 'obs-deadline', x: 23, y: 17, rotate: -10, font: '"Permanent Marker", cursive', fontSize: '1.8rem', fontWeight: '400', content: 'deadline', obstacleW: 160, obstacleH: 38, ...DEFAULTS },
// { id: 'obs-asap', x: 23, y: 20, rotate: -14, font: '"Rock Salt", cursive', fontSize: '1.6rem', fontWeight: '400', content: 'ASAP', obstacleW: 120, obstacleH: 36, ...DEFAULTS },
// { id: 'obs-scope-creep', x: 23, y: 23, rotate: -12, font: '"Caveat", cursive', fontSize: '1.8rem', fontWeight: '700', content: 'scope creep', obstacleW: 155, obstacleH: 34, ...DEFAULTS },
// { id: 'obs-bug', x: 23, y: 26, rotate: -8, font: '"Permanent Marker", cursive', fontSize: '1.7rem', fontWeight: '400', content: 'BUG!', obstacleW: 120, obstacleH: 38, ...DEFAULTS },

// ═══════════════════════════════════════════════════════════
// NEW MOTION OBSTACLES — spring entrance, hover, tap, inertia
// ═══════════════════════════════════════════════════════════
export const OBSTACLES: EntityDef[] = [
  { id: 'obs-ship', x: 23, y: 17, rotate: -8,
    font: '"Permanent Marker", cursive', fontSize: '2rem', fontWeight: '400',
    content: 'SHIP IT', obstacleW: 155, obstacleH: 42,
    ...DEFAULTS },
  { id: 'obs-deploy', x: 23, y: 20, rotate: -12,
    font: '"Rock Salt", cursive', fontSize: '1.7rem', fontWeight: '400',
    content: 'DEPLOY', obstacleW: 145, obstacleH: 40,
    ...DEFAULTS },
  { id: 'obs-refactor', x: 23, y: 23, rotate: -6,
    font: '"Caveat", cursive', fontSize: '1.9rem', fontWeight: '700',
    content: 'REFACTOR', obstacleW: 170, obstacleH: 38,
    ...DEFAULTS },
  { id: 'obs-hotfix', x: 23, y: 26, rotate: -14,
    font: '"Permanent Marker", cursive', fontSize: '1.8rem', fontWeight: '400',
    content: 'HOTFIX', obstacleW: 140, obstacleH: 38,
    ...DEFAULTS },

  // Image-based motion obstacle (rocket SVG)
  { id: 'obs-rocket', x: 27, y: 19, rotate: 0,
    font: '', fontSize: '', fontWeight: '400',
    content: '',
    obstacleW: 160, obstacleH: 160,
    imgSrc: '/doodles/rocket.svg',
    imgW: 160, imgH: 160,
    ...DEFAULTS, opacity: 1, color: '' },
]
