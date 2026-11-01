import type { EntityDef } from '../types'
import {
  parseActionKey,
  parseGuardKey,
  parseKey,
  parseRevealSource,
  parseRevealedBy,
} from './reveal'

// ═══════════════════════════════════════════════════════════
// Entity validator — fails loudly on typos, dangling references
// and unreachable entities. Runs in DEV at startup (main.tsx)
// and in tests against the real entity list.
//   error → the chain cannot work as written
//   warn  → works, but probably not what you meant
// ═══════════════════════════════════════════════════════════

export type EntityProblem = {
  level: 'error' | 'warn'
  entityId: string
  message: string
}

// Keep in step with store/viewport.ts MIN_ZOOM / MAX_ZOOM.
const ZOOM_MIN = 0.3
const ZOOM_MAX = 3.0

export function validateEntities(entities: readonly EntityDef[]): EntityProblem[] {
  const problems: EntityProblem[] = []
  const error = (entityId: string, message: string) => problems.push({ level: 'error', entityId, message })
  const warn = (entityId: string, message: string) => problems.push({ level: 'warn', entityId, message })

  // ── Unique names ──
  const byTrigger = new Map<string, EntityDef>()
  const seenIds = new Set<string>()
  for (const e of entities) {
    if (seenIds.has(e.id)) error(e.id, `duplicate id "${e.id}"`)
    seenIds.add(e.id)
    const prev = byTrigger.get(e.triggerId)
    if (prev) error(e.id, `triggerId "${e.triggerId}" is also used by "${prev.id}"`)
    else byTrigger.set(e.triggerId, e)
  }
  const exists = (triggerId: string) => byTrigger.has(triggerId)
  const isClickTarget = (t: EntityDef) => t.clickable || t.category === 'button'

  // ── Per-entity grammar + references ──
  for (const e of entities) {
    if (e.revealedBy.length === 0) error(e.id, `revealedBy is empty; use ['static'] for always-visible`)

    for (const src of e.revealedBy) {
      const p = parseRevealSource(src)
      if (!p) { error(e.id, `revealedBy "${src}" is not valid grammar`); continue }
      if (p.kind === 'click' || p.kind === 'done') {
        if (!exists(p.target)) error(e.id, `revealedBy "${src}" points at unknown triggerId "${p.target}"`)
        else if (p.target === e.triggerId) error(e.id, `revealedBy "${src}" points at itself`)
        else if (p.kind === 'click' && !isClickTarget(byTrigger.get(p.target)!)) {
          warn(e.id, `revealedBy "${src}" but "${p.target}" is not clickable`)
        }
      }
    }

    for (const list of [e.onClickAction, e.onReveal] as const) {
      for (const key of list) {
        const p = parseActionKey(key)
        if (!p) { error(e.id, `action "${key}" has unknown kind "${parseKey(key).kind}"`); continue }
        if ((p.kind === 'trigger' || p.kind === 'pan') && !exists(p.arg)) {
          error(e.id, `action "${key}" points at unknown triggerId "${p.arg}"`)
        }
        if (p.kind !== 'trigger' && p.kind !== 'pan' && p.arg === '') {
          error(e.id, `action "${key}" needs an argument`)
        }
      }
    }

    if (e.enabledWhen !== null) {
      const g = parseGuardKey(e.enabledWhen)
      if (!g) error(e.id, `enabledWhen "${e.enabledWhen}" has unknown kind "${parseKey(e.enabledWhen).kind}"`)
      else if (g.kind === 'after' && !exists(g.arg)) error(e.id, `enabledWhen "${e.enabledWhen}" points at unknown triggerId "${g.arg}"`)
      else if (g.kind === 'zoomMin' && !Number.isFinite(parseFloat(g.arg))) error(e.id, `enabledWhen "${e.enabledWhen}" needs a number`)
      else if (g.kind === 'once' && g.arg !== '') warn(e.id, `enabledWhen "once" takes no argument`)
    }

    if (e.camera && (e.camera.zoom < ZOOM_MIN || e.camera.zoom > ZOOM_MAX)) {
      error(e.id, `camera.zoom ${e.camera.zoom} is outside ${ZOOM_MIN}–${ZOOM_MAX}`)
    }

    if (e.enabledWhen !== null && !e.clickable && e.category !== 'button') {
      warn(e.id, `enabledWhen is set but the entity is not clickable`)
    }
  }

  // ── Reachability: everything hidden at start must be reachable from a root ──
  // Roots: visible at start ('static' / 'load') or driven imperatively ('manual').
  const children = new Map<string, string[]>() // triggerId → entities revealed by its click/done
  const reached = new Set<string>()
  const queue: string[] = []
  for (const e of entities) {
    let root = false
    for (const p of parseRevealedBy(e)) {
      if (p.kind === 'static' || p.kind === 'load' || p.kind === 'manual') root = true
      if (p.kind === 'click' || p.kind === 'done') {
        const list = children.get(p.target) ?? []
        list.push(e.triggerId)
        children.set(p.target, list)
      }
    }
    if (root) { reached.add(e.triggerId); queue.push(e.triggerId) }
  }
  while (queue.length) {
    const t = queue.shift()!
    for (const c of children.get(t) ?? []) {
      if (!reached.has(c)) { reached.add(c); queue.push(c) }
    }
  }
  for (const e of entities) {
    if (!reached.has(e.triggerId)) warn(e.id, `never revealed: no path from a visible or manual entity reaches it`)
  }

  return problems
}

/** DEV helper: print problems to the console. Returns true when there are no errors. */
export function reportEntityProblems(entities: readonly EntityDef[]): boolean {
  const problems = validateEntities(entities)
  for (const p of problems) {
    const line = `[entities] ${p.entityId}: ${p.message}`
    if (p.level === 'error') console.error(line)
    else console.warn(line)
  }
  return !problems.some((p) => p.level === 'error')
}
