import type { EntityDef } from '../types'
import { WIDGET_DEFAULT } from './sizes'

// Back-compat exports — prefer importing from './sizes' in new code.
export const WIDGET_W = WIDGET_DEFAULT.w
export const WIDGET_H = WIDGET_DEFAULT.h

export const WIDGETS: EntityDef[] = []
