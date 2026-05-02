import type { EntityDef } from '../types'
import { section } from './factories'

// Photo data reused by the SectionPhotoGallery component.
export const SECTION_PHOTOS = [
  { src: '/photos/diff.png', caption: 'Portrait I',  rotate: -3 },
  { src: '/photos/diff.png', caption: 'Portrait II', rotate: 2 },
  { src: '/photos/diff.png', caption: 'Portrait III', rotate: -1.5 },
]

// ═══════════════════════════════════════════════════════════
// Sections — bordered blocks hosting dedicated React components.
// Dimensions live in `sizes.ts` keyed by componentId, so adding
// another instance of an existing component (e.g. a 4th photo
// gallery) only requires another section({ componentId: … }).
// ═══════════════════════════════════════════════════════════
export const SECTIONS: EntityDef[] = [
  section({ id: 'section-about',  x: 19, y: 30, rotate: -0.5, componentId: 'about-block' }),
  section({ id: 'section-photos', x: 30,    y: 45, rotate:  -4, componentId: 'photo-gallery' }),
]
