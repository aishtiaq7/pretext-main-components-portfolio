import type { EntityDef } from '../types'
import { button } from './factories'

export const BUTTONS: EntityDef[] = [
  button({
    id: 'button-1', x: 50, y: 58,
    imgSrc: '/button-1.svg',
    imgW: 1800, imgH: 989,
    onClickAction: 'master-play',
  }),
]
