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
    id: 'obs-ship', x: 38, y: 14, rotate: -8,
    content: 'SHIP IT', obstacleW: 155, obstacleH: 42,
  }),
  obstacle({
    id: 'obs-deploy', x: 38, y: 17, rotate: -12,
    font: '"Rock Salt", cursive', fontSize: '1.7rem',
    content: 'DEPLOY', obstacleW: 145, obstacleH: 40,
  }),
  obstacle({
    id: 'obs-refactor', x: 38, y: 20, rotate: -6,
    font: '"Caveat", cursive', fontSize: '1.9rem', fontWeight: '700',
    content: 'REFACTOR', obstacleW: 170, obstacleH: 38,
  }),
  obstacle({
    id: 'obs-hotfix', x: 38, y: 23, rotate: -14,
    fontSize: '1.8rem',
    content: 'HOTFIX', obstacleW: 140, obstacleH: 38,
  }),

  // Image-based motion obstacle (rocket SVG)
  imageObstacle({
    id: 'obs-rocket', x: 65, y: 16,
    imgSrc: '/doodles/rocket.svg',
    imgW: 160, imgH: 160,
    obstacleW: 160, obstacleH: 160,
    opacity: 1,
  }),

  // Lightbulbs with live x/y readout — clustered around the rocket (27, 19)
  // so you can drag them anywhere and watch the live canvas-% coords.
  {
    ...imageObstacle({
      id: 'obs-tracker-tl', x: 63, y: 14,
      imgSrc: '/doodles/lightbulb.svg',
      imgW: 140, imgH: 140,
      obstacleW: 140, obstacleH: 140,
      opacity: 1,
    }),
    showPosition: true,
  },
  {
    ...imageObstacle({
      id: 'obs-tracker-tr', x: 68, y: 14,
      imgSrc: '/doodles/lightbulb.svg',
      imgW: 140, imgH: 140,
      obstacleW: 140, obstacleH: 140,
      opacity: 1,
    }),
    showPosition: true,
  },
  {
    ...imageObstacle({
      id: 'obs-tracker-bl', x: 63, y: 19,
      imgSrc: '/doodles/lightbulb.svg',
      imgW: 140, imgH: 140,
      obstacleW: 140, obstacleH: 140,
      opacity: 1,
    }),
    showPosition: true,
  },
  {
    ...imageObstacle({
      id: 'obs-tracker-br', x: 68, y: 19,
      imgSrc: '/doodles/lightbulb.svg',
      imgW: 140, imgH: 140,
      obstacleW: 140, obstacleH: 140,
      opacity: 1,
    }),
    showPosition: true,
  },
]
