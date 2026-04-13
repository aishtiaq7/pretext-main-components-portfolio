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

// 3 sections stacked vertically, centered like notebook, below it (notebook ends ~y:30)
// About = 27.5% wide, Photos = 30% wide → center at ~50% of canvas
export const SECTIONS: EntityDef[] = [
  {
    id: 'section-about',
    x: 36, y: 34, rotate: -0.5,
    fontSize: '2rem', color: '#3a3530', opacity: 1,
    content: 'about-block', componentId: 'about-block',
    ...SECTION_DEFAULTS,
  },
  {
    id: 'section-photos',
    x: 35, y: 58, rotate: 0.5,
    fontSize: '2rem', color: '#3a3530', opacity: 1,
    content: 'photo-gallery', componentId: 'photo-gallery',
    ...SECTION_DEFAULTS,
  },
  {
    id: 'section-about-2',
    x: 36, y: 84, rotate: -0.5,
    fontSize: '2rem', color: '#3a3530', opacity: 1,
    content: 'about-block', componentId: 'about-block',
    ...SECTION_DEFAULTS,
  },
]
