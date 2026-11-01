import { describe, expect, it } from 'vitest'
import { parseHash, href } from '../src/router'
import { NOTEBOOKS, getNotebook } from '../src/notebooks'
import { validateEntities } from '../src/entities/validate'

describe('router', () => {
  it('parses hashes into route paths', () => {
    expect(parseHash('')).toBe('/')
    expect(parseHash('#')).toBe('/')
    expect(parseHash('#/')).toBe('/')
    expect(parseHash('#/freshpage1')).toBe('/freshpage1')
    expect(parseHash('#freshpage1')).toBe('/freshpage1')
    expect(parseHash('#/freshpage1/')).toBe('/freshpage1')
  })

  it('builds hrefs that round-trip', () => {
    for (const p of ['/', '/freshpage1']) expect(parseHash(href(p))).toBe(p)
  })
})

describe('notebooks', () => {
  it('have unique ids and paths, and fall back to home', () => {
    const ids = NOTEBOOKS.map((n) => n.id)
    const paths = NOTEBOOKS.map((n) => n.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
    expect(getNotebook('/nope').id).toBe('home')
    expect(getNotebook('/freshpage1').id).toBe('freshpage1')
  })

  for (const n of NOTEBOOKS) {
    it(`${n.id}: entities validate with no errors`, () => {
      const errors = validateEntities(n.entities).filter((p) => p.level === 'error')
      expect(errors.map((p) => `${p.entityId}: ${p.message}`)).toEqual([])
    })
  }
})
