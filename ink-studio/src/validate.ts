import type { Drawing, EasingName } from './types'

// ═══════════════════════════════════════════════════════════
// Drawing-JSON schema validator. The single guard the writer
// (ink-studio export) and reader (portfolio HandwrittenEntry)
// both lean on — if either side adds, renames, or retypes a
// field, the fixture-driven test in validate.test.ts fails.
// ═══════════════════════════════════════════════════════════

export type ValidationError = { path: string; message: string }
export type ValidationResult =
  | { ok: true; value: Drawing }
  | { ok: false; errors: ValidationError[] }

// Exhaustive Record forces the lookup table to stay in sync with EasingName —
// adding a new easing to the type fails compilation here until it's listed.
const EASING_TABLE: Record<EasingName, true> = {
  linear: true,
  easeIn: true,
  easeOut: true,
  easeInOut: true,
  easeInQuad: true,
  easeOutQuad: true,
  easeInOutQuad: true,
  easeInCubic: true,
  easeOutCubic: true,
  easeInOutCubic: true,
}
const EASING_NAMES: ReadonlySet<string> = new Set(Object.keys(EASING_TABLE))

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

type Err = (path: string, message: string) => void

export function validateDrawing(input: unknown): ValidationResult {
  const errors: ValidationError[] = []
  const err: Err = (path, message) => errors.push({ path, message })

  if (!isObject(input)) {
    return { ok: false, errors: [{ path: '$', message: 'expected object' }] }
  }
  if (input.version !== 1) err('$.version', `expected 1, got ${JSON.stringify(input.version)}`)
  if (typeof input.createdAt !== 'string') err('$.createdAt', 'expected string')
  if (typeof input.width !== 'number' || input.width <= 0) err('$.width', 'expected positive number')
  if (typeof input.height !== 'number' || input.height <= 0) err('$.height', 'expected positive number')

  if (!Array.isArray(input.strokes)) {
    err('$.strokes', 'expected array')
    return { ok: false, errors }
  }
  input.strokes.forEach((s, i) => validateStroke(s, `$.strokes[${i}]`, err))

  return errors.length
    ? { ok: false, errors }
    : { ok: true, value: input as unknown as Drawing }
}

function validateStroke(s: unknown, path: string, err: Err) {
  if (!isObject(s)) { err(path, 'expected object'); return }

  if (!Array.isArray(s.points)) {
    err(`${path}.points`, 'expected array')
  } else if (s.points.length === 0) {
    err(`${path}.points`, 'expected non-empty array')
  } else {
    s.points.forEach((p, j) => validatePoint(p, `${path}.points[${j}]`, err))
  }

  validateOptions(s.options, `${path}.options`, err)

  if (typeof s.color !== 'string') err(`${path}.color`, 'expected string')
  if (typeof s.outlineColor !== 'string') err(`${path}.outlineColor`, 'expected string')
  if (typeof s.outlineWidth !== 'number') err(`${path}.outlineWidth`, 'expected number')
  if (typeof s.startedAt !== 'number') err(`${path}.startedAt`, 'expected number')
  if (s.opacity !== undefined) {
    if (typeof s.opacity !== 'number' || s.opacity < 0 || s.opacity > 1) {
      err(`${path}.opacity`, 'expected number between 0 and 1')
    }
  }
}

function validatePoint(p: unknown, path: string, err: Err) {
  if (!isObject(p)) { err(path, 'expected object'); return }
  for (const k of ['x', 'y', 'p', 't'] as const) {
    if (typeof p[k] !== 'number') err(`${path}.${k}`, 'expected number')
  }
  if (p.tiltX !== undefined && typeof p.tiltX !== 'number') {
    err(`${path}.tiltX`, 'expected number or undefined')
  }
  if (p.tiltY !== undefined && typeof p.tiltY !== 'number') {
    err(`${path}.tiltY`, 'expected number or undefined')
  }
}

function validateOptions(o: unknown, path: string, err: Err) {
  if (!isObject(o)) { err(path, 'expected object'); return }
  for (const k of ['size', 'thinning', 'smoothing', 'streamline', 'taperStart', 'taperEnd'] as const) {
    if (typeof o[k] !== 'number') err(`${path}.${k}`, 'expected number')
  }
  for (const k of ['capStart', 'capEnd'] as const) {
    if (typeof o[k] !== 'boolean') err(`${path}.${k}`, 'expected boolean')
  }
  if (typeof o.easing !== 'string' || !EASING_NAMES.has(o.easing)) {
    err(`${path}.easing`, `expected one of ${[...EASING_NAMES].join(', ')}`)
  }
}

export function formatErrors(errors: ValidationError[]): string {
  return errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')
}
