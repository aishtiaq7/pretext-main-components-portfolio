import type { ActionKey, EntityDef, GuardKey, RevealSource } from '../types'

// ═══════════════════════════════════════════════════════════
// Reveal & click grammar — parsing only, no runtime behaviour.
// Strings are parsed here once; the validator (validate.ts)
// reports anything that does not parse, and the reveal engine
// (motion/reveal.ts) consumes the parsed form.
//   docs/architecture.md §3.2–3.4 is the reference.
// ═══════════════════════════════════════════════════════════

export type ParsedSource =
  | { kind: 'static' }
  | { kind: 'load'; delayMs: number }
  | { kind: 'manual' }
  | { kind: 'click'; target: string }
  | { kind: 'done'; target: string; delayMs: number }

export type ParsedKey = { kind: string; arg: string }

export const ACTION_KINDS = ['trigger', 'link', 'pan', 'sfx', 'fn', 'set'] as const
export const GUARD_KINDS = ['after', 'flag', 'zoomMin', 'once'] as const
export const SOURCE_KINDS = ['static', 'load', 'manual', 'click', 'done'] as const

// Trailing "+3s" / "+250ms" / "+ 1.5 s" on a source string.
const DELAY_RE = /\s*\+\s*([\d.]+)\s*(ms|s)?\s*$/i

/** Split "done:welcome-1 +3s" into { body: "done:welcome-1", delayMs: 3000 }. */
export function splitDelay(src: string): { body: string; delayMs: number } {
  const m = DELAY_RE.exec(src)
  if (!m) return { body: src.trim(), delayMs: 0 }
  const n = parseFloat(m[1])
  const unit = (m[2] ?? 's').toLowerCase()
  const delayMs = Number.isFinite(n) ? (unit === 'ms' ? n : n * 1000) : 0
  return { body: src.slice(0, m.index).trim(), delayMs }
}

/**
 * "kind:arg" → { kind, arg }. Splits on the FIRST colon only so URLs survive
 * ('link:https://x' → arg 'https://x'). A bare word has arg ''.
 */
export function parseKey(key: string): ParsedKey {
  const i = key.indexOf(':')
  if (i === -1) return { kind: key.trim(), arg: '' }
  return { kind: key.slice(0, i).trim(), arg: key.slice(i + 1).trim() }
}

/** Parse one reveal source. Returns null when the string is not valid grammar. */
export function parseRevealSource(src: RevealSource): ParsedSource | null {
  const { body, delayMs } = splitDelay(src)
  const { kind, arg } = parseKey(body)
  switch (kind) {
    case 'static':
      return arg === '' && delayMs === 0 ? { kind: 'static' } : null
    case 'load':
      return arg === '' ? { kind: 'load', delayMs } : null
    case 'manual':
      return arg === '' && delayMs === 0 ? { kind: 'manual' } : null
    case 'click':
      return arg !== '' && delayMs === 0 ? { kind: 'click', target: arg } : null
    case 'done':
      return arg !== '' ? { kind: 'done', target: arg, delayMs } : null
    default:
      return null
  }
}

/** Parsed sources of an entity, invalid strings dropped (the validator reports them). */
export function parseRevealedBy(entity: Pick<EntityDef, 'revealedBy'>): ParsedSource[] {
  const out: ParsedSource[] = []
  for (const s of entity.revealedBy) {
    const p = parseRevealSource(s)
    if (p) out.push(p)
  }
  return out
}

/** True when nothing makes the entity visible at startup (no 'static' / 'load'). */
export function isHiddenAtStart(entity: Pick<EntityDef, 'revealedBy'>): boolean {
  for (const p of parseRevealedBy(entity)) {
    if (p.kind === 'static' || p.kind === 'load') return false
  }
  return true
}

/** The 'load' source if present (the entity animates on page load after delayMs). */
export function loadSource(entity: Pick<EntityDef, 'revealedBy'>): { delayMs: number } | null {
  for (const p of parseRevealedBy(entity)) {
    if (p.kind === 'load') return { delayMs: p.delayMs }
  }
  return null
}

export function isActionKind(kind: string): kind is (typeof ACTION_KINDS)[number] {
  return (ACTION_KINDS as readonly string[]).includes(kind)
}

export function isGuardKind(kind: string): kind is (typeof GUARD_KINDS)[number] {
  return (GUARD_KINDS as readonly string[]).includes(kind)
}

export function parseActionKey(key: ActionKey): ParsedKey | null {
  const p = parseKey(key)
  return isActionKind(p.kind) ? p : null
}

export function parseGuardKey(key: GuardKey): ParsedKey | null {
  const p = parseKey(key)
  return isGuardKind(p.kind) ? p : null
}
