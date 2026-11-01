import gsap from 'gsap'
import type { CameraSpec, EntityDef } from '../types'
import { CANVAS } from '../constants'
import { parseRevealedBy } from '../entities/reveal'
import { triggers } from '../store/triggers'
import { progress } from '../store/progress'
import { focusOn, getViewport } from '../store/viewport'
import { audio } from '../audio/AudioController'
import { makeCtx, runActions, type Ctx } from '../actions'

// ═══════════════════════════════════════════════════════════
// Reveal engine — turns `revealedBy` into behaviour.
//
//   init(entities)       index every entity's sources; schedule 'load +Ns'
//   onClicked(triggerId) a clickable entity was activated
//   onDone(triggerId)    an entity finished appearing (drawing complete,
//                        or a non-animated entity became visible)
//
// Each entity is revealed at most once; the first source to fire wins
// and the entity's other pending timers are cancelled. Revealing =
// optional camera move → phone-book play() → onReveal to-do list,
// and the triggerId is written to the visitor's progress.
//
// Reload: anything in progress.revealed is restored silently at init
// (finished, no camera, no sound, no done event). The story then waits
// for the visitor's next click — except children that can ONLY arrive
// by timer ('done:' with no 'click:' source), which are re-armed so a
// pure auto-advance chain still completes.
//
// 'static', 'load' (no delay) and 'manual' are not the engine's
// business: the first two are visible at startup, the last is driven
// imperatively (legacy timeline). docs/architecture.md §3.
// ═══════════════════════════════════════════════════════════

type Entry = {
  entity: EntityDef
  revealed: boolean
  timers: Timer[]
}

type Timer = {
  entry: Entry
  remainingMs: number
  startedAt: number
  handle: ReturnType<typeof setTimeout> | null
}

type Deps = {
  /** 'pan:<id>' inside onReveal lists. Provided by App (it owns positions). */
  panTo: Ctx['panTo']
}

const PCT_TO_PX = CANVAS / 100

let entries = new Map<string, Entry>()        // triggerId → entry
let byClick = new Map<string, Entry[]>()      // target triggerId → entries revealed by its click
let byDone = new Map<string, Entry[]>()       // target triggerId → entries revealed by its completion
let deps: Deps = { panTo: () => {} }
let ready = false
let paused = false
let primed = false
const queuedDone: string[] = []               // done events that arrived before init
const doneSeen = new Set<string>()            // triggerIds that have finished at least once

function viewportToFocus() {
  const v = getViewport()
  return {
    x: 50 - v.panX / (PCT_TO_PX * v.zoom),
    y: 50 - v.panY / (PCT_TO_PX * v.zoom),
    zoom: v.zoom,
  }
}

/** Centre of the entity in canvas %, from its top-left + pixel size. */
function focusForEntity(e: EntityDef) {
  const w = e.imgW ?? e.width ?? 0
  const h = e.imgH ?? e.height ?? w
  return { x: e.x + (w / CANVAS) * 50, y: e.y + (h / CANVAS) * 50 }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Pan/zoom to the entity, then call `then`. Instant cut under reduced motion. */
function cameraTo(e: EntityDef, camera: CameraSpec, then: () => void) {
  const target = focusForEntity(e)
  if (prefersReducedMotion()) {
    focusOn(target.x, target.y, camera.zoom)
    then()
    return
  }
  const proxy = viewportToFocus()
  gsap.to(proxy, {
    x: target.x,
    y: target.y,
    zoom: camera.zoom,
    duration: camera.panDuration ?? 1.2,
    ease: 'power2.inOut',
    onUpdate: () => focusOn(proxy.x, proxy.y, proxy.zoom),
    onComplete: then,
  })
}

/** Prime every 'sfx:' track once, inside the first user gesture (mobile unlock). */
function primeAllSfx() {
  if (primed || typeof Audio === 'undefined') return
  primed = true
  const seen = new Set<string>()
  for (const { entity } of entries.values()) {
    for (const key of [...entity.onReveal, ...entity.onClickAction]) {
      if (key.startsWith('sfx:')) {
        const src = key.slice(4)
        if (!seen.has(src)) { seen.add(src); audio.prime(src) }
      }
    }
  }
}

function cancelTimers(entry: Entry) {
  for (const t of entry.timers) if (t.handle !== null) clearTimeout(t.handle)
  entry.timers = []
}

function reveal(entry: Entry) {
  if (entry.revealed) return
  entry.revealed = true
  cancelTimers(entry)
  const e = entry.entity
  progress.markRevealed(e.triggerId)
  const go = () => {
    const h = triggers.get(e.triggerId)
    if (h) h.play()
    else triggers.whenReady(e.triggerId).then((handle) => handle.play())
    runActions(e.onReveal, makeCtx(e, deps.panTo))
  }
  if (e.camera) cameraTo(e, e.camera, go)
  else go()
}

function armTimer(t: Timer) {
  t.startedAt = Date.now()
  t.handle = setTimeout(() => {
    t.handle = null
    reveal(t.entry)
  }, t.remainingMs)
}

function schedule(entry: Entry, delayMs: number) {
  if (entry.revealed) return
  if (delayMs <= 0) { reveal(entry); return }
  const t: Timer = { entry, remainingMs: delayMs, startedAt: Date.now(), handle: null }
  entry.timers.push(t)
  if (!paused) armTimer(t)
}

function push(map: Map<string, Entry[]>, key: string, entry: Entry) {
  const list = map.get(key) ?? []
  list.push(entry)
  map.set(key, list)
}

function clearIndex() {
  for (const entry of entries.values()) cancelTimers(entry)
  entries = new Map()
  byClick = new Map()
  byDone = new Map()
  ready = false
  paused = false
  doneSeen.clear()
}

export const revealEngine = {
  /**
   * Index the entity list and start 'load +Ns' timers. Done events queued
   * while children were mounting (before App's init effect) are kept and
   * flushed at the end.
   */
  init(list: readonly EntityDef[], d?: Partial<Deps>) {
    clearIndex()
    if (d?.panTo) deps = { panTo: d.panTo }
    for (const entity of list) {
      const entry: Entry = { entity, revealed: false, timers: [] }
      entries.set(entity.triggerId, entry)
      for (const s of parseRevealedBy(entity)) {
        if (s.kind === 'click') push(byClick, s.target, entry)
        else if (s.kind === 'done') push(byDone, s.target, entry)
        else if (s.kind === 'static' || s.kind === 'manual' || (s.kind === 'load' && s.delayMs === 0)) {
          // visible / imperative from the start: nothing for the engine to do
          entry.revealed = s.kind !== 'manual'
        }
      }
    }
    ready = true

    // ── Restore what the visitor already revealed (reload) ──
    const restored: Entry[] = []
    for (const entry of entries.values()) {
      if (entry.revealed) continue                         // visible at start anyway
      if (!progress.hasRevealed(entry.entity.triggerId)) continue
      entry.revealed = true
      doneSeen.add(entry.entity.triggerId)                 // never re-fire its done: children by itself
      restored.push(entry)
      const h = triggers.get(entry.entity.triggerId)
      if (h) h.restore()
      else triggers.whenReady(entry.entity.triggerId).then((handle) => handle.restore())
    }
    // Children that can only arrive by timer keep arriving after a reload;
    // anything with a 'click:' source waits for the visitor.
    for (const parent of restored) {
      for (const child of byDone.get(parent.entity.triggerId) ?? []) {
        if (child.revealed) continue
        const sources = parseRevealedBy(child.entity)
        if (sources.some((s) => s.kind === 'click')) continue
        const src = sources.find((s) => s.kind === 'done' && s.target === parent.entity.triggerId)
        schedule(child, src && src.kind === 'done' ? src.delayMs : 0)
      }
    }

    // Delayed loads
    for (const entry of entries.values()) {
      for (const s of parseRevealedBy(entry.entity)) {
        if (s.kind === 'load' && s.delayMs > 0) schedule(entry, s.delayMs)
      }
    }
    // Completions that happened while children were mounting
    for (const id of queuedDone.splice(0)) this.onDone(id)
  },

  /** Drop the index and any queued events (unmount / notebook switch). */
  dispose() {
    clearIndex()
    queuedDone.length = 0
  },

  /** A clickable entity was activated (guard passed, to-do list ran). */
  onClicked(triggerId: string) {
    if (!ready) return
    primeAllSfx()
    for (const entry of byClick.get(triggerId) ?? []) reveal(entry)
  },

  /** An entity finished appearing. Fires 'done:<id>' sources (with their delays). */
  onDone(triggerId: string) {
    if (!ready) { queuedDone.push(triggerId); return }
    if (doneSeen.has(triggerId)) return
    doneSeen.add(triggerId)
    for (const entry of byDone.get(triggerId) ?? []) {
      const src = parseRevealedBy(entry.entity).find((s) => s.kind === 'done' && s.target === triggerId)
      schedule(entry, src && src.kind === 'done' ? src.delayMs : 0)
    }
  },

  /** Freeze pending timers (the legacy pause button; drawings pause via triggers). */
  pauseAll() {
    if (paused) return
    paused = true
    for (const entry of entries.values()) {
      for (const t of entry.timers) {
        if (t.handle === null) continue
        clearTimeout(t.handle)
        t.handle = null
        t.remainingMs = Math.max(0, t.remainingMs - (Date.now() - t.startedAt))
      }
    }
  },

  resumeAll() {
    if (!paused) return
    paused = false
    for (const entry of entries.values()) {
      for (const t of entry.timers) if (t.handle === null) armTimer(t)
    }
  },

  isRevealed(triggerId: string): boolean {
    return entries.get(triggerId)?.revealed ?? false
  },

  /** Test / dev introspection. */
  pendingTimers(triggerId: string): number {
    return entries.get(triggerId)?.timers.filter((t) => t.handle !== null).length ?? 0
  },
}
