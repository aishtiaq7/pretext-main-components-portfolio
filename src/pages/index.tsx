import type { PageDef } from '../components/PageWrapper'
import { NotebookPage } from '../components/NotebookPage'
import { BrandHero } from './BrandHero'
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
    x: 3, y: 10, width: 1100, height: 220,
    fixed: true, borderless: false,
    render: () => <BrandHero />,
  },

  // Notebook page with clock + reflow text demo. Fixed at the top-left.
  {
    id: 'clock-page',
    x: 3, y: 16, width: 1500, height: 1100,
    fixed: true,
    render: () => <NotebookPage width={1500} height={1100} />,
  },

  // 3D golden cube — draggable, borderless so the scene bleeds into the canvas.
  {
    id: 'three-page',
    x: 5, y: 30.5, width: 420, height: 420,
    fixed: false, borderless: true, rotate: 8,
    render: () => <ThreeScene />,
  },

  // Rabbit-hole card with Alice quote. Draggable, framed, collides with
  // paragraphs (via pageCollisionRegions) so it never overlaps them.
  {
    id: 'text-page',
    x: 45, y: 25, width: 480, height: 340,
    fixed: false, borderless: false, rotate: -4,
    render: () => <RabbitHoleCard />,
  },

]
