import type { EntityDef } from '../types'

const DEFAULTS = {
  type: 'text' as const,
  category: 'accent' as const,
  jitter: 'none' as const,
  pinned: true,
}

// CLUSTER 4 — Emoji (moved: row directly below "Awshaf Ishtiaque" hero)
// Brand-page hero spans y: 10-12.75, so emojis sit at y: 13.
export const ACCENTS: EntityDef[] = [
  { id: 'em-1', x: 3, y: 13, rotate: -15,
    font: 'system-ui', fontSize: '2.2rem', fontWeight: '400',
    color: '#c8b882', opacity: 0.9, content: '\u2b50',
    ...DEFAULTS },
  { id: 'em-2', x: 6, y: 13, rotate: -25,
    font: 'system-ui', fontSize: '2.2rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.9, content: '\ud83d\ude80',
    ...DEFAULTS },
  { id: 'em-3', x: 9, y: 13, rotate: -18,
    font: 'system-ui', fontSize: '2.2rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.9, content: '\ud83d\udca1',
    ...DEFAULTS },
]
