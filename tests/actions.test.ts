import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activate, checkGuard, fns, runActions, type Ctx } from '../src/actions'
import { progress } from '../src/store/progress'
import { triggers } from '../src/store/triggers'
import { handwriting } from '../src/entities/factories'

// Node has no window / Audio / localStorage: the store falls back to memory,
// 'link' and 'sfx' are no-ops, which is exactly what these tests rely on.

function ctx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    entityId: 'hw-x',
    triggerId: 'x',
    viewport: () => ({ zoom: 1, panX: 0, panY: 0 }),
    panTo: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => progress.reset())

describe('runActions', () => {
  it("'trigger:' calls play() on the phone-book handle", () => {
    const play = vi.fn()
    triggers.register('t1', { reveal: vi.fn(), play, pause: vi.fn(), resume: vi.fn(), reset: vi.fn(), restore: vi.fn() })
    runActions(['trigger:t1'], ctx())
    expect(play).toHaveBeenCalledTimes(1)
    triggers.unregister('t1')
  })

  it("'pan:' uses the ctx capability", () => {
    const c = ctx()
    runActions(['pan:somewhere'], c)
    expect(c.panTo).toHaveBeenCalledWith('somewhere')
  })

  it("'set:' writes a visitor flag", () => {
    runActions(['set:secret'], ctx())
    expect(progress.hasFlag('secret')).toBe(true)
  })

  it("'fn:' runs a registered function and tolerates unknown names", () => {
    const spy = vi.fn()
    fns['test-hook'] = spy
    runActions(['fn:test-hook', 'fn:does-not-exist'], ctx())
    expect(spy).toHaveBeenCalledTimes(1)
    delete fns['test-hook']
  })

  it('runs several keys in order and skips unknown kinds', () => {
    const order: string[] = []
    fns.a = () => order.push('a')
    fns.b = () => order.push('b')
    runActions(['fn:a', 'explode:now', 'fn:b'], ctx())
    expect(order).toEqual(['a', 'b'])
    delete fns.a
    delete fns.b
  })
})

describe('checkGuard', () => {
  it('passes with no guard', () => {
    expect(checkGuard(null, ctx())).toBe(true)
  })

  it("'after:' waits for the other entity to finish", () => {
    expect(checkGuard('after:w1', ctx())).toBe(false)
    progress.markPlayed('w1')
    expect(checkGuard('after:w1', ctx())).toBe(true)
  })

  it("'flag:' reads visitor flags", () => {
    expect(checkGuard('flag:secret', ctx())).toBe(false)
    progress.setFlag('secret')
    expect(checkGuard('flag:secret', ctx())).toBe(true)
  })

  it("'noflag:' makes an either/or choice: the first click wins, the rest are blocked", () => {
    const a = handwriting({ id: 'a', x: 0, y: 0, width: 10, src: '/a.json', clickable: true, enabledWhen: 'noflag:chosen', onClickAction: 'set:chosen' })
    const b = handwriting({ id: 'b', x: 0, y: 0, width: 10, src: '/b.json', clickable: true, enabledWhen: 'noflag:chosen', onClickAction: 'set:chosen' })
    expect(activate(a, ctx({ triggerId: 'a' }))).toBe(true)
    expect(activate(b, ctx({ triggerId: 'b' }))).toBe(false)
    expect(activate(a, ctx({ triggerId: 'a' }))).toBe(false)
  })

  it("'zoomMin:' compares against the live zoom", () => {
    expect(checkGuard('zoomMin:0.8', ctx({ viewport: () => ({ zoom: 0.5, panX: 0, panY: 0 }) }))).toBe(false)
    expect(checkGuard('zoomMin:0.8', ctx({ viewport: () => ({ zoom: 1.2, panX: 0, panY: 0 }) }))).toBe(true)
  })

  it("'once' allows only the first click", () => {
    const c = ctx({ triggerId: 'x' })
    expect(checkGuard('once', c)).toBe(true)
    progress.markClicked('x')
    expect(checkGuard('once', c)).toBe(false)
  })

  it('unknown guard kinds fail closed', () => {
    expect(checkGuard('weather:sunny', ctx())).toBe(false)
  })
})

describe('activate', () => {
  const entity = handwriting({
    id: 'hw-x', x: 0, y: 0, width: 10, src: '/x.json',
    triggerId: 'x', clickable: true,
    onClickAction: ['set:reached-x'],
    enabledWhen: 'once',
  })

  it('runs the list once, then the once-guard blocks', () => {
    const c = ctx({ triggerId: 'x' })
    expect(activate(entity, c)).toBe(true)
    expect(progress.hasFlag('reached-x')).toBe(true)
    expect(progress.hasClicked('x')).toBe(true)
    expect(activate(entity, c)).toBe(false)
  })
})

describe('progress store', () => {
  it('is idempotent and resettable', () => {
    progress.markPlayed('a')
    progress.markPlayed('a')
    expect([...progress.get().played]).toEqual(['a'])
    progress.markRevealed('a')
    expect(progress.hasRevealed('a')).toBe(true)
    progress.setFlag('f')
    progress.clearFlag('f')
    expect(progress.hasFlag('f')).toBe(false)
    progress.reset()
    expect(progress.hasPlayed('a')).toBe(false)
    expect(progress.hasRevealed('a')).toBe(false)
  })
})
