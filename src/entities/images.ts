import type { EntityDef } from '../types'
import { image } from './factories'

export const IMAGES: EntityDef[] = [
  image({
    id: 'sketch-1', x: 75, y: 55, rotate: -2,
    imgSrc: '/handScribbles/sketch-1-transparent.png',
    imgW: 500, imgH: 400,
  }),
  image({
    id: 'sketch-5', x: 80, y: 70, rotate: 1,
    imgSrc: '/handScribbles/sketch-5-transparent.png',
    imgW: 500, imgH: 400,
  }),
]
