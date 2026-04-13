import type { EntityDef } from '../types'

const DEFAULTS = {
  type: 'text' as const,
  category: 'accent' as const,
  jitter: 'none' as const,
  pinned: true,
}

// 4 emojis in a row — top right area, away from sections
export const ACCENTS: EntityDef[] = [
  { id: 'emoji-star', x: 72, y: 12, rotate: -3,
    font: 'system-ui', fontSize: '3rem', fontWeight: '400',
    color: '#c8b882', opacity: 0.85, content: '\u2b50',
    ...DEFAULTS },
  { id: 'emoji-rocket', x: 77, y: 12, rotate: 2,
    font: 'system-ui', fontSize: '3rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85, content: '\ud83d\ude80',
    ...DEFAULTS },
  { id: 'emoji-bulb', x: 82, y: 12, rotate: -1,
    font: 'system-ui', fontSize: '3rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85, content: '\ud83d\udca1',
    ...DEFAULTS },
  { id: 'emoji-coffee', x: 87, y: 12, rotate: 3,
    font: 'system-ui', fontSize: '3rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.85, content: '\u2615',
    ...DEFAULTS },
]
