import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { HANDWRITINGS } from '../src/entities/handwriting'
import { formatErrors, validateDrawing } from '../ink-studio/src/validate'

// Linkage test — every HANDWRITINGS entry points at a real JSON
// under public/handwriting/ and that JSON satisfies the schema.
// Discovered at import time so each entity becomes its own case.
const here = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(here, '..', 'public')

describe('HANDWRITINGS → public/handwriting linkage', () => {
  const cases = HANDWRITINGS
    .map((e) => ({ id: e.id, src: e.handwritingSrc }))
    .filter((c): c is { id: string; src: string } => typeof c.src === 'string')

  it('every handwriting entity declares a JSON src', () => {
    const missing = HANDWRITINGS.filter((e) => !e.handwritingSrc).map((e) => e.id)
    expect(missing).toEqual([])
  })

  for (const { id, src } of cases) {
    it(`${id} → ${src} loads and validates`, () => {
      const path = resolve(PUBLIC, src.replace(/^\//, ''))
      const raw = readFileSync(path, 'utf8')
      const json = JSON.parse(raw) as unknown
      const result = validateDrawing(json)
      if (!result.ok) {
        throw new Error(`${src} failed schema:\n${formatErrors(result.errors)}`)
      }
      expect(result.ok).toBe(true)
    })
  }
})
