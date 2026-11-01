import { describe, expect, it } from 'vitest'
import { ENTITIES } from '../src/entities'
import { handwriting, button, doodle } from '../src/entities/factories'
import { validateEntities } from '../src/entities/validate'
import {
  isHiddenAtStart,
  loadSource,
  parseKey,
  parseRevealSource,
  splitDelay,
} from '../src/entities/reveal'

// ── The real entity list must be clean ──────────────────────
describe('ENTITIES pass the validator', () => {
  const problems = validateEntities(ENTITIES)
  const errors = problems.filter((p) => p.level === 'error')

  it('has no errors', () => {
    expect(errors.map((p) => `${p.entityId}: ${p.message}`)).toEqual([])
  })

  it('every entity carries every behaviour column', () => {
    for (const e of ENTITIES) {
      expect(typeof e.triggerId).toBe('string')
      expect(Array.isArray(e.revealedBy)).toBe(true)
      expect(e.revealedBy.length).toBeGreaterThan(0)
      expect(typeof e.clickable).toBe('boolean')
      expect(Array.isArray(e.onClickAction)).toBe(true)
      expect(Array.isArray(e.onReveal)).toBe(true)
      expect(e.enabledWhen === null || typeof e.enabledWhen === 'string').toBe(true)
      expect(e.camera === null || typeof e.camera.zoom === 'number').toBe(true)
      expect(e.tabOrder === null || typeof e.tabOrder === 'number').toBe(true)
    }
  })

  it('triggerId defaults to id', () => {
    const plain = ENTITIES.find((e) => e.id === 'hw-1')!
    expect(plain.triggerId).toBe('hw-1')
    const aliased = ENTITIES.find((e) => e.id === 'hw-welcome')!
    expect(aliased.triggerId).toBe('welcome-1')
  })
})

// ── Grammar ─────────────────────────────────────────────────
describe('reveal grammar', () => {
  it('splits trailing delays', () => {
    expect(splitDelay('done:a +3s')).toEqual({ body: 'done:a', delayMs: 3000 })
    expect(splitDelay('load + 250ms')).toEqual({ body: 'load', delayMs: 250 })
    expect(splitDelay('click:a')).toEqual({ body: 'click:a', delayMs: 0 })
  })

  it('splits keys on the first colon only', () => {
    expect(parseKey('link:https://x.y/z')).toEqual({ kind: 'link', arg: 'https://x.y/z' })
    expect(parseKey('once')).toEqual({ kind: 'once', arg: '' })
  })

  it('parses every source kind and rejects junk', () => {
    expect(parseRevealSource('static')).toEqual({ kind: 'static' })
    expect(parseRevealSource('load')).toEqual({ kind: 'load', delayMs: 0 })
    expect(parseRevealSource('load +2s')).toEqual({ kind: 'load', delayMs: 2000 })
    expect(parseRevealSource('manual')).toEqual({ kind: 'manual' })
    expect(parseRevealSource('click:welcome-1')).toEqual({ kind: 'click', target: 'welcome-1' })
    expect(parseRevealSource('done:welcome-1 +3s')).toEqual({ kind: 'done', target: 'welcome-1', delayMs: 3000 })
    expect(parseRevealSource('click:')).toBeNull()
    expect(parseRevealSource('click:a +1s')).toBeNull()
    expect(parseRevealSource('hover:a')).toBeNull()
    expect(parseRevealSource('static +1s')).toBeNull()
  })

  it('derives startup visibility', () => {
    expect(isHiddenAtStart({ revealedBy: ['static'] })).toBe(false)
    expect(isHiddenAtStart({ revealedBy: ['load +1s'] })).toBe(false)
    expect(isHiddenAtStart({ revealedBy: ['manual'] })).toBe(true)
    expect(isHiddenAtStart({ revealedBy: ['click:a', 'done:a +2s'] })).toBe(true)
    expect(loadSource({ revealedBy: ['load +1s'] })).toEqual({ delayMs: 1000 })
    expect(loadSource({ revealedBy: ['static'] })).toBeNull()
  })
})

// ── Validator on synthetic data ─────────────────────────────
describe('validateEntities', () => {
  const hw = (id: string, extra: Record<string, unknown> = {}) =>
    handwriting({ id, x: 0, y: 0, width: 100, src: `/handwriting/${id}.json`, ...extra })

  it('accepts a well-formed chain', () => {
    const list = [
      button({ id: 'play', x: 0, y: 0, imgSrc: '/b.svg', imgW: 10, imgH: 10 }),
      hw('a', { revealedBy: 'click:play', clickable: true, onReveal: 'sfx:/s.mp3', camera: { zoom: 1 } }),
      hw('b', { revealedBy: ['click:a', 'done:a +3s'], clickable: true, onClickAction: 'link:https://x', enabledWhen: 'after:a' }),
    ]
    expect(validateEntities(list).filter((p) => p.level === 'error')).toEqual([])
  })

  it('reports dangling references, bad grammar and self-reference as errors', () => {
    const list = [
      hw('a', { revealedBy: 'click:nobody' }),
      hw('b', { revealedBy: 'hover:a' }),
      hw('c', { revealedBy: 'click:c' }),
      hw('d', { onClickAction: 'trigger:ghost' }),
      hw('e', { onClickAction: 'explode:now' }),
      hw('f', { enabledWhen: 'after:ghost' }),
      hw('g', { camera: { zoom: 9 } }),
    ]
    const errors = validateEntities(list).filter((p) => p.level === 'error').map((p) => p.entityId)
    expect(errors).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd', 'e', 'f', 'g']))
  })

  it('flags duplicate triggerIds', () => {
    const list = [hw('a', { triggerId: 'same' }), hw('b', { triggerId: 'same' })]
    expect(validateEntities(list).some((p) => p.level === 'error' && /triggerId "same"/.test(p.message))).toBe(true)
  })

  it('warns when a hidden entity can never be reached', () => {
    const list = [
      hw('a', { revealedBy: 'static', clickable: true }),
      hw('b', { revealedBy: 'click:c', clickable: true }),   // c is only revealed by b → cycle, unreachable
      hw('c', { revealedBy: 'click:b', clickable: true }),
    ]
    const warned = validateEntities(list).filter((p) => p.level === 'warn' && /never revealed/.test(p.message)).map((p) => p.entityId)
    expect(warned.sort()).toEqual(['b', 'c'])
  })

  it('warns when click: points at something not clickable', () => {
    const list = [
      doodle({ id: 'label', x: 0, y: 0, content: 'hi' }),
      hw('a', { revealedBy: 'click:label' }),
    ]
    expect(validateEntities(list).some((p) => p.level === 'warn' && /not clickable/.test(p.message))).toBe(true)
  })
})
