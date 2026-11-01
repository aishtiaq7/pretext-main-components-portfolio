import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { NOTEBOOKS } from '../src/notebooks'
import { formatErrors, validateDrawing } from '../ink-studio/src/validate'

// Linkage test — every handwriting entity in every notebook points at a
// real JSON under public/ and that JSON satisfies the ink-studio schema.
// Discovered at import time so each entity becomes its own case.
const here = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(here, '..', 'public')

for (const notebook of NOTEBOOKS) {
  const inks = notebook.entities.filter((e) => e.handwritingSrc !== null)
  if (inks.length === 0) continue

  describe(`${notebook.id}: handwriting → public/ linkage`, () => {
    for (const e of inks) {
      const src = e.handwritingSrc!
      it(`${e.id} → ${src} loads and validates`, () => {
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
}
