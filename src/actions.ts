import type { ActionKey, EntityDef, GuardKey } from './types'
import { parseKey } from './entities/reveal'
import { triggers } from './store/triggers'
import { progress } from './store/progress'
import { getViewport, type ViewportState } from './store/viewport'
import { audio } from './audio/AudioController'
import { motion } from './motion/MotionController'

// ═══════════════════════════════════════════════════════════
// Actions & guards — the only place behaviour lives.
// Entities reference these by string key (docs/architecture.md
// §3.3–3.4); nothing in the entity files is a function.
//
//   runActions(entity.onClickAction, ctx)   → each 'kind:arg' → actions[kind](ctx, arg)
//   checkGuard(entity.enabledWhen, ctx)     → 'kind:arg' → guards[kind](ctx, arg)
//   fns['name']                              → custom logic behind 'fn:<name>'
//
// Add a new capability: register a function here, reference it
// from an entity. The validator (entities/validate.ts) already
// knows the kinds; extend ACTION_KINDS / GUARD_KINDS in
// entities/reveal.ts if you add a new *kind*, not a new fn.
// ═══════════════════════════════════════════════════════════

export type Ctx = {
  /** Entity whose action list is running. */
  entityId: string
  triggerId: string
  /** Live viewport snapshot (zoom, pan). */
  viewport: () => ViewportState
  /** Ease the camera to the entity with this triggerId. Provided by App. */
  panTo: (triggerId: string) => void
}

type ActionFn = (ctx: Ctx, arg: string) => void
type GuardFn = (ctx: Ctx, arg: string) => boolean

/** Custom logic behind 'fn:<name>'. Add yours here. */
export const fns: Record<string, (ctx: Ctx) => void> = {
  'master-play': () => motion.play(),
  'master-pause': () => motion.pause(),
  'start-over': () => motion.startOver(),
  'sound-on': () => motion.setMuted(false),
  'sound-off': () => motion.setMuted(true),
}

export const actions: Record<string, ActionFn> = {
  trigger: (_ctx, id) => triggers.play(id),

  link: (_ctx, url) => {
    if (typeof window === 'undefined') return
    window.open(url, '_blank', 'noopener,noreferrer')
  },

  pan: (ctx, id) => ctx.panTo(id),

  sfx: (_ctx, src) => {
    if (typeof Audio === 'undefined') return
    // prime + play inside the gesture stack unlocks mobile audio for later
    audio.prime(src)
    audio.play(src)
  },

  fn: (ctx, name) => {
    const f = fns[name]
    if (f) f(ctx)
    else if (import.meta.env?.DEV) console.warn(`[actions] no fn registered for "${name}"`)
  },

  set: (_ctx, flag) => progress.setFlag(flag),
}

export const guards: Record<string, GuardFn> = {
  after: (_ctx, id) => progress.hasPlayed(id),
  flag: (_ctx, name) => progress.hasFlag(name),
  noflag: (_ctx, name) => !progress.hasFlag(name),   // either/or choices: set a flag on click, guard the rest with noflag
  zoomMin: (ctx, n) => ctx.viewport().zoom >= Number(n),
  once: (ctx) => !progress.hasClicked(ctx.triggerId),
}

/** Run a to-do list in order. Unknown kinds are skipped with a DEV warning. */
export function runActions(keys: readonly ActionKey[], ctx: Ctx): void {
  for (const key of keys) {
    const { kind, arg } = parseKey(key)
    const fn = actions[kind]
    if (fn) fn(ctx, arg)
    else if (import.meta.env?.DEV) console.warn(`[actions] unknown action kind in "${key}"`)
  }
}

/** True when there is no guard, or the guard passes. Unknown guard kinds fail closed. */
export function checkGuard(key: GuardKey | null, ctx: Ctx): boolean {
  if (key === null) return true
  const { kind, arg } = parseKey(key)
  const g = guards[kind]
  if (!g) {
    if (import.meta.env?.DEV) console.warn(`[actions] unknown guard kind in "${key}"`)
    return false
  }
  return g(ctx, arg)
}

/**
 * The click, end to end: guard → to-do list → remember the click.
 * Called by the button today and by clickable ink from build step 3.
 * The "finished drawing?" gate is the caller's job (it owns the progress).
 */
export function activate(entity: EntityDef, ctx: Ctx): boolean {
  if (!checkGuard(entity.enabledWhen, ctx)) return false
  runActions(entity.onClickAction, ctx)
  progress.markClicked(entity.triggerId)
  return true
}

/** Build a Ctx for an entity. `panTo` comes from App (it owns positions). */
export function makeCtx(entity: Pick<EntityDef, 'id' | 'triggerId'>, panTo: Ctx['panTo']): Ctx {
  return { entityId: entity.id, triggerId: entity.triggerId, viewport: getViewport, panTo }
}
