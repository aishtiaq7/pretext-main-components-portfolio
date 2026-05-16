import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { formatErrors, validateDrawing } from '../ink-studio/src/validate'

// Schema-contract test — locks the JSON shape both ink-studio (writer)
// and the portfolio's HandwrittenEntry (reader) depend on.
const here = dirname(fileURLToPath(import.meta.url))
const FIXTURE = resolve(here, 'fixtures/ink-minimal.json')

function loadFixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE, 'utf8'))
}

describe('Drawing JSON schema contract', () => {
  it('accepts the minimal valid fixture', () => {
    const result = validateDrawing(loadFixture())
    if (!result.ok) throw new Error(`fixture rejected:\n${formatErrors(result.errors)}`)
    expect(result.ok).toBe(true)
  })

  it('rejects an empty object', () => {
    const result = validateDrawing({})
    expect(result.ok).toBe(false)
  })

  it('rejects a wrong version', () => {
    const json = loadFixture() as { version: number }
    json.version = 2
    const result = validateDrawing(json)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === '$.version')).toBe(true)
    }
  })

  it('rejects an unknown easing', () => {
    const json = loadFixture() as { strokes: { options: { easing: string } }[] }
    json.strokes[0].options.easing = 'bouncyBouncy'
    const result = validateDrawing(json)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.path.endsWith('.options.easing'))).toBe(true)
    }
  })

  it('rejects a non-numeric pressure', () => {
    const json = loadFixture() as {
      strokes: { points: Array<Record<string, unknown>> }[]
    }
    json.strokes[0].points[0].p = '0.5'
    const result = validateDrawing(json)
    expect(result.ok).toBe(false)
  })

  it('accepts points without tiltX/tiltY (legacy capture)', () => {
    const json = loadFixture() as {
      strokes: { points: Array<Record<string, unknown>> }[]
    }
    for (const p of json.strokes[0].points) {
      delete p.tiltX
      delete p.tiltY
    }
    const result = validateDrawing(json)
    expect(result.ok).toBe(true)
  })
})
