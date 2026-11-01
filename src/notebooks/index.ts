import type { EntityDef } from '../types'
import type { PageDef } from '../components/PageWrapper'
import { ENTITIES } from '../entities'
import { PAGES } from '../pages'
import type { RoutePath } from '../router'
import type { ViewSpec } from '../store/viewport'
import { FRESHPAGE1_ENTITIES, FRESHPAGE1_VIEW } from './freshpage1'

// ═══════════════════════════════════════════════════════════
// Notebooks — one canvas per route (docs/architecture.md §5).
// A notebook is `{ entities, pages }` plus where its camera opens;
// App mounts a fresh canvas for the current one, so canvas state
// (positions, pins, phone book) resets per notebook while visitor
// preferences, progress and the remembered camera persist.
//
// To add a notebook: create `src/notebooks/<name>.ts` exporting
// its entity (and page) arrays, and append an entry here. The
// TopHeader shows one link per entry.
// ═══════════════════════════════════════════════════════════

export type Notebook = {
  id: string
  path: RoutePath
  /** Link text in the header. */
  title: string
  entities: EntityDef[]
  pages: PageDef[]
  /** Camera on a first visit (before anything is remembered). Default: constants.INITIAL_VIEW. */
  initialView?: ViewSpec
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
    entities: FRESHPAGE1_ENTITIES,
    pages: HEADER_ZONE,
    initialView: FRESHPAGE1_VIEW,
  },
]

export function getNotebook(path: RoutePath): Notebook {
  return NOTEBOOKS.find((n) => n.path === path) ?? NOTEBOOKS[0]
}
