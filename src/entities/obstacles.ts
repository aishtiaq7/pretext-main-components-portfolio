import type { EntityDef } from '../types'
import { obstacle, imageObstacle } from './factories'

// ═══════════════════════════════════════════════════════════
// OBSTACLES — draggable red words + image-based motion obstacles
//   • Text obstacles use handwritten fonts, capsule-shaped carve
//   • Image obstacles use an SVG with a matching bounding box
//   • All default to motion:true → rendered via <MotionObstacle>
//     (spring entrance, hover scale, inertia on release)
// ═══════════════════════════════════════════════════════════
export const OBSTACLES: EntityDef[] = [
  obstacle({
    id: 'obs-ship', x: 23, y: 17, rotate: -8,
    content: 'SHIP IT', obstacleW: 155, obstacleH: 42,
  }),
  obstacle({
    id: 'obs-deploy', x: 23, y: 20, rotate: -12,
    font: '"Rock Salt", cursive', fontSize: '1.7rem',
    content: 'DEPLOY', obstacleW: 145, obstacleH: 40,
  }),
  obstacle({
    id: 'obs-refactor', x: 23, y: 23, rotate: -6,
    font: '"Caveat", cursive', fontSize: '1.9rem', fontWeight: '700',
    content: 'REFACTOR', obstacleW: 170, obstacleH: 38,
  }),
  obstacle({
    id: 'obs-hotfix', x: 23, y: 26, rotate: -14,
    fontSize: '1.8rem',
    content: 'HOTFIX', obstacleW: 140, obstacleH: 38,
  }),

  // Image-based motion obstacle (rocket SVG)
  imageObstacle({
    id: 'obs-rocket', x: 27, y: 19,
    imgSrc: '/doodles/rocket.svg',
    imgW: 160, imgH: 160,
    obstacleW: 160, obstacleH: 160,
    opacity: 1,
  }),
]
