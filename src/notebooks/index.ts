import type { EntityDef } from '../types'
import type { PageDef } from '../components/PageWrapper'
import { ENTITIES } from '../entities'
import { PAGES } from '../pages'
import type { RoutePath } from '../router'

// ═══════════════════════════════════════════════════════════
// Notebooks — one canvas per route (docs/architecture.md §5).
// A notebook is just `{ entities, pages }`; App mounts a fresh
// canvas for the current one, so canvas state (zoom, pan,
// positions, pins, phone book) resets per notebook while visitor
// preferences and progress persist.
//
// To add a notebook: create `src/notebooks/<name>.ts` exporting
// its entity and page arrays, and append an entry here. The
// TopHeader shows one link per entry.
// ═══════════════════════════════════════════════════════════

export type Notebook = {
  id: string
  path: RoutePath
  /** Link text in the header. */
  title: string
  entities: EntityDef[]
  pages: PageDef[]
}

// The invisible drag-blocker across the header row is useful on every page.
const HEADER_ZONE = PAGES.filter((p) => p.id === 'header-zone')

export const NOTEBOOKS: Notebook[] = [
  {
    id: 'home',
    path: '/',
    title: 'Notebook',
    entities: ENTITIES,
    pages: PAGES,
  },
  {
    id: 'freshpage1',
    path: '/freshpage1',
    title: 'Fresh page',
    entities: [],          // clean slate — add entries in src/notebooks/freshpage1.ts when ready
    pages: HEADER_ZONE,
  },
]

export function getNotebook(path: RoutePath): Notebook {
  return NOTEBOOKS.find((n) => n.path === path) ?? NOTEBOOKS[0]
}
