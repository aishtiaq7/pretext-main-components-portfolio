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
  section({ id: 'section-about',   x: 13, y: 30.5, rotate: -0.5, componentId: 'about-block' }),
  section({ id: 'section-photos',  x: 13, y: 42,   rotate:  0.5, componentId: 'photo-gallery' }),
  section({ id: 'section-about-2', x: 13, y: 61,   rotate: -0.5, componentId: 'about-block' }),
]
