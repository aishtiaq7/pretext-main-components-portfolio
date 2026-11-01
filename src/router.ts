import { useSyncExternalStore } from 'react'

// ═══════════════════════════════════════════════════════════
// Router — hash based, the only place that reads the URL.
//   /#/freshpage1  →  '/freshpage1'
//   /              →  '/'
// Everything after '#' stays in the browser, so Vercel only ever
// serves index.html and a refresh never 404s (zero config).
// Switching to clean paths later: change `parse` / `href` to use
// location.pathname + history.pushState, and add one vercel.json
// rewrite. Nothing else in the app knows which style is in use.
// ═══════════════════════════════════════════════════════════

export type RoutePath = string

/** '#/freshpage1' | '#freshpage1' | '' → '/freshpage1' | '/' */
export function parseHash(hash: string): RoutePath {
  const raw = hash.replace(/^#/, '')
  if (raw === '' || raw === '/') return '/'
  const path = raw.startsWith('/') ? raw : `/${raw}`
  // strip a trailing slash and any query-ish tail
  return path.replace(/[?&].*$/, '').replace(/\/+$/, '') || '/'
}

/** The href to put on a link for a route. */
export function href(path: RoutePath): string {
  return path === '/' ? '#/' : `#${path}`
}

export function currentRoute(): RoutePath {
  if (typeof window === 'undefined') return '/'
  return parseHash(window.location.hash)
}

export function navigate(path: RoutePath) {
  if (typeof window === 'undefined') return
  window.location.hash = href(path)
}

function subscribe(fn: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

/** Re-renders on hash changes. */
export function useRoute(): RoutePath {
  return useSyncExternalStore(subscribe, currentRoute, () => '/')
}
