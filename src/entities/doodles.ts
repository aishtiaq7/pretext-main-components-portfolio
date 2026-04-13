import type { EntityDef } from '../types'

// kept for App.tsx imports
export const BRAND_NAME = 'Awshaf Ishtiaque'
export const ALICE_QUOTE =
  'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, \u201cand what is the use of a book,\u201d thought Alice \u201cwithout pictures or conversations?\u201d'

const DEFAULTS = {
  type: 'text' as const,
  category: 'doodle' as const,
  jitter: 'none' as const,
  pinned: true,
}

// 10 fixed text entities
export const DOODLES: EntityDef[] = [
  { id: 'brand', x: 5, y: 3, rotate: -2,
    font: '"Permanent Marker", cursive', fontSize: '3.5rem', fontWeight: '400',
    color: '#2a2520', opacity: 0.85, content: BRAND_NAME,
    ...DEFAULTS },
  { id: 'tagline', x: 40, y: 4, rotate: 2,
    font: '"Caveat", cursive', fontSize: '3rem', fontWeight: '700',
    color: '#3a3230', opacity: 0.78, content: 'Web Dev Evolves, As Do I',
    ...DEFAULTS },
  { id: 'hello-world', x: 75, y: 2, rotate: 3,
    font: '"Permanent Marker", cursive', fontSize: '3.2rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.75, content: 'hello, world',
    ...DEFAULTS },
  { id: 'bio', x: 5, y: 25, rotate: -1,
    font: '"Patrick Hand", cursive', fontSize: '1.8rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.8, content: 'SFU grad. Startup founder. Instructor. I think in components and dream in keyframes.',
    maxWidth: 500, ...DEFAULTS },
  { id: 'fullstack', x: 5, y: 55, rotate: 3,
    font: '"Permanent Marker", cursive', fontSize: '2.6rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.65, content: 'FULL STACK',
    ...DEFAULTS },
  { id: 'tag-react', x: 70, y: 55, rotate: 5,
    font: '"Permanent Marker", cursive', fontSize: '2.8rem', fontWeight: '400',
    color: '#61dafb', opacity: 0.75, content: 'React',
    ...DEFAULTS },
  { id: 'tag-ts', x: 75, y: 60, rotate: -4,
    font: '"Shadows Into Light", cursive', fontSize: '2.4rem', fontWeight: '400',
    color: '#3178c6', opacity: 0.70, content: 'TypeScript',
    ...DEFAULTS },
  { id: 'tag-sfu', x: 70, y: 85, rotate: 4,
    font: '"Caveat", cursive', fontSize: '2.1rem', fontWeight: '400',
    color: '#cc0633', opacity: 0.70, content: "SFU '22",
    ...DEFAULTS },
  { id: 'code-1', x: 5, y: 85, rotate: 1,
    font: '"JetBrains Mono", monospace', fontSize: '1.6rem', fontWeight: '400',
    color: '#5a8a5a', opacity: 0.55, content: 'const life = () => code()',
    ...DEFAULTS },
  { id: 'components', x: 55, y: 28, rotate: -2,
    font: '"Satisfy", cursive', fontSize: '2.2rem', fontWeight: '400',
    color: '#4a4540', opacity: 0.72, content: 'I think in components\nand dream in keyframes',
    ...DEFAULTS },
  // Paragraph placed in the right band (near red obstacles) so dragging
  // "deadline", "ASAP", or "scope creep" onto it triggers text reflow.
  { id: 'reflow-para', x: 66, y: 30, rotate: 0,
    font: '"Patrick Hand", cursive', fontSize: '1.5rem', fontWeight: '400',
    color: '#3a3530', opacity: 0.8,
    content: 'Drop a red word on this paragraph and watch the lines bend around it. When deadlines loom, the clock becomes the enemy — the words themselves have to get out of the way.',
    maxWidth: 380,
    ...DEFAULTS },
]
