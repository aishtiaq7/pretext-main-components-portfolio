import type { PageDef } from '../components/PageWrapper'
import { NotebookPage } from '../components/NotebookPage'
import { BrandHero } from './BrandHero'
import { SubTagline } from './SubTagline'
import { RabbitHoleCard } from './RabbitHoleCard'
import { ThreeScene } from './ThreeScene'

// ═══════════════════════════════════════════════════════════
// PAGES — siblings of doodle entities on the canvas.
// Each entry is fully self-describing: position, size, render.
// Adding a new page = append one object here + (optionally) a
// matching component file in this folder.
// ═══════════════════════════════════════════════════════════
export const PAGES: PageDef[] = [
  // Invisible drag-blocker covering the header row. Obstacles dragged upward
  // bounce off its bottom edge so they can't cover the logo / name / emojis.
  {
    id: 'header-zone',
    x: 0, y: 0, width: 8000, height: 400,
    fixed: true, borderless: true,
    // no `render` → empty body
  },

  // Handwritten brand name — oversized hero above the notebook.
  {
    id: 'brand-page',
    x: 49, y: 27, width: 1100, height: 220,
    fixed: true, borderless: false,
    render: () => <BrandHero />,
  },

  // Sub-tagline — quieter sibling of the brand hero. Fixed, borderless,
  // smaller font, stacked across 3-4 lines.
  {
    id: 'subtagline-page',
    x: 58, y: 30, width: 700, height: 240,
    fixed: true, borderless: true,
    render: () => <SubTagline />,
  },

  // Notebook page with clock + reflow text demo. Fixed at the top-left.
  {
    id: 'clock-page',
    x: 15.28, y: 13.71, width: 1500, height: 1100,
    fixed: true,
    render: () => <NotebookPage width={1500} height={1100} />,
  },

  // 3D golden cube — draggable, borderless so the scene bleeds into the canvas.
  {
    id: 'three-page',
    x: 75, y: 7, width: 420, height: 420,
    fixed: false, borderless: true, rotate: 8,
    render: () => <ThreeScene />,
  },

  // Rabbit-hole card with Alice quote. Draggable, framed, collides with
  // paragraphs (via pageCollisionRegions) so it never overlaps them.
  {
    id: 'text-page',
    x: 73, y: 30, width: 480, height: 340,
    fixed: false, borderless: false, rotate: -4,
    render: () => <RabbitHoleCard />,
  },

]
