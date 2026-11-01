import type { EntityDef } from '../types'
import { button } from './factories'

// Buttons are always clickable; their click runs the shared `onClickAction`
// to-do list. 'fn:master-play' starts the legacy master timeline — in build
// step 4 the first drawing is instead revealed by 'click:button-1'.
export const BUTTONS: EntityDef[] = [
  button({
    id: 'button-1', x: 50, y: 58,
    imgSrc: '/button-1.svg',
    imgW: 1200, imgH: 389,
    onClickAction: 'fn:master-play',
  }),
]
