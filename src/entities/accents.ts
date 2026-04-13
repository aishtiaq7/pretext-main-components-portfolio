import type { EntityDef } from '../types'

const DEFAULTS = {
  type: 'text' as const,
  category: 'accent' as const,
  jitter: 'none' as const,
  pinned: true,
}

// CLUSTER 4 — Emoji (x: 80, 3 items in a tight horizontal row)
export const ACCENTS: EntityDef[] = [
  { id: 'em-1', x: 80, y: 20, rotate: -3,
    font: 'system-ui', fontSize: '2.6rem', fontWeight: '400',
    color: '#c8b882', opacity: 0.9, content: '\u2b50',
    ...DEFAULTS },
  { id: 'em-2', x: 83, y: 20, rotate: 2,
    font: 'system-ui', fontSize: '2.6rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.9, content: '\ud83d\ude80',
    ...DEFAULTS },
  { id: 'em-3', x: 86, y: 20, rotate: -1,
    font: 'system-ui', fontSize: '2.6rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.9, content: '\ud83d\udca1',
    ...DEFAULTS },
]
