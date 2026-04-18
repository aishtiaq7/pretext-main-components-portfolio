import type { EntityDef } from '../types'
import { emojiAccent } from './factories'

// CLUSTER 4 — Emoji (moved: row directly below "Awshaf Ishtiaque" hero)
// Brand-page hero spans y: 10-12.75, so emojis sit at y: 13.
export const ACCENTS: EntityDef[] = [
  emojiAccent({ id: 'em-1', x: 3, y: 13, rotate: -15, content: '\u2b50', color: '#c8b882' }),
  emojiAccent({ id: 'em-2', x: 6, y: 13, rotate: -25, content: '\ud83d\ude80' }),
  emojiAccent({ id: 'em-3', x: 9, y: 13, rotate: -18, content: '\ud83d\udca1' }),
]
