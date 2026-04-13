import type { EntityDef } from '../types'

export const SECTION_DEFAULTS = {
  type: 'component' as const,
  category: 'section' as const,
  jitter: 'none' as const,
  font: '"Patrick Hand", cursive',
  fontWeight: '400',
  pinned: true,
}

export const SECTION_PHOTOS = [
  { src: '/photos/diff.png', caption: 'Portrait I',  rotate: -3 },
  { src: '/photos/diff.png', caption: 'Portrait II', rotate: 2 },
  { src: '/photos/diff.png', caption: 'Portrait III', rotate: -1.5 },
]

// Reduced section sizes (About 1400x900 = 17.5%x11.25%, Photos 1500x1100 = 18.75%x13.75%)
// Stacked directly below the notebook, offset ~10% to the right (notebook x:3, sections x:13)
// Smaller sections (About 1100×850 = 13.75%×10.625%, Photos 1300×1200 = 16.25%×15%)
// Photos is ~4% taller than the About sections. Stacked with tight (~1%) gaps,
// no overlap with each other or with the notebook above.
export const SECTIONS: EntityDef[] = [
  {
    id: 'section-about',    // y: 30.5 → ends 41.125
    x: 13, y: 30.5, rotate: -0.5,
    fontSize: '2rem', color: '#3a3530', opacity: 1,
    content: 'about-block', componentId: 'about-block',
    ...SECTION_DEFAULTS,
  },
  {
    id: 'section-photos',   // y: 42 → ends 57 (taller, height 15%)
    x: 13, y: 42, rotate: 0.5,
    fontSize: '2rem', color: '#3a3530', opacity: 1,
    content: 'photo-gallery', componentId: 'photo-gallery',
    ...SECTION_DEFAULTS,
  },
  {
    id: 'section-about-2',  // y: 61 → ends 71.625 (pushed down: photos now 18% tall)
    x: 13, y: 61, rotate: -0.5,
    fontSize: '2rem', color: '#3a3530', opacity: 1,
    content: 'about-block', componentId: 'about-block',
    ...SECTION_DEFAULTS,
  },
]
