import type { EntityDef } from '../types'
import { button } from './factories'

// Buttons are always clickable. This one is a pure reveal source: the first
// drawing of the welcome chain declares `revealedBy: 'click:button-1'`, so
// its own to-do list stays empty. (The legacy master timeline is still
// reachable from the ▶ in the minimap panel until build step 5 removes it.)
export const BUTTONS: EntityDef[] = [
  button({
    id: 'button-1', x: 50, y: 58,
    imgSrc: '/button-1.svg',
    imgW: 1200, imgH: 389,
  }),
]
