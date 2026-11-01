import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { revealEngine } from '../src/motion/reveal'
import { triggers, type EntityHandle } from '../src/store/triggers'
import { progress } from '../src/store/progress'
import { handwriting, button } from '../src/entities/factories'

// Node has no DOM: entities are plain rows, the phone book gets fake handles,
// and timers are faked so 'done:<id> +Ns' and 'load +Ns' can be stepped.

function fakeHandle(): EntityHandle & { play: ReturnType<typeof vi.fn> } {
  return { reveal: vi.fn(), play: vi.fn(), pause: vi.fn(), resume: vi.fn(), reset: vi.fn() }
}

const hw = (id: string, extra: Record<string, unknown> = {}) =>
  handwriting({ id, x: 0, y: 0, width: 100, src: `/handwriting/${id}.json`, ...extra })

const PLAY = button({ id: 'play', x: 0, y: 0, imgSrc: '/b.svg', imgW: 10, imgH: 10 })

const handles: Record<string, ReturnType<typeof fakeHandle>> = {}
function register(...ids: string[]) {
  for (const id of ids) {
    handles[id] = fakeHandle()
    triggers.register(id, handles[id])
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  progress.reset()
})
afterEach(() => {
  revealEngine.dispose()
  for (const id of Object.keys(handles)) { triggers.unregister(id); delete handles[id] }
  vi.useRealTimers()
})

describe('revealEngine', () => {
  it('reveals children of a click, once', () => {
    register('play', 'a', 'b')
    revealEngine.init([PLAY, hw('a', { revealedBy: 'click:play' }), hw('b', { revealedBy: 'click:play' })])
    revealEngine.onClicked('play')
    expect(handles.a.play).toHaveBeenCalledTimes(1)
    expect(handles.b.play).toHaveBeenCalledTimes(1)
    revealEngine.onClicked('play')
    expect(handles.a.play).toHaveBeenCalledTimes(1)
    expect(revealEngine.isRevealed('a')).toBe(true)
  })

  it("'done:<id> +Ns' waits N seconds after the target finishes", () => {
    register('a', 'b')
    revealEngine.init([hw('a', { revealedBy: 'static' }), hw('b', { revealedBy: 'done:a +3s' })])
    revealEngine.onDone('a')
    expect(handles.b.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2999)
    expect(handles.b.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(handles.b.play).toHaveBeenCalledTimes(1)
  })

  it('first source wins and cancels the other', () => {
    register('a', 'b')
    revealEngine.init([
      hw('a', { revealedBy: 'static', clickable: true }),
      hw('b', { revealedBy: ['click:a', 'done:a +5s'] }),
    ])
    revealEngine.onDone('a')                   // timer armed
    expect(revealEngine.pendingTimers('b')).toBe(1)
    revealEngine.onClicked('a')                // click wins
    expect(handles.b.play).toHaveBeenCalledTimes(1)
    expect(revealEngine.pendingTimers('b')).toBe(0)
    vi.advanceTimersByTime(10_000)
    expect(handles.b.play).toHaveBeenCalledTimes(1)
  })

  it("'load +Ns' reveals N seconds after init", () => {
    register('a')
    revealEngine.init([hw('a', { revealedBy: 'load +2s' })])
    vi.advanceTimersByTime(1999)
    expect(handles.a.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(handles.a.play).toHaveBeenCalledTimes(1)
  })

  it('queues done events that arrive before init', () => {
    register('a', 'b')
    revealEngine.dispose()
    revealEngine.onDone('a')                   // children mount before App's init effect
    revealEngine.init([hw('a', { revealedBy: 'static' }), hw('b', { revealedBy: 'done:a' })])
    expect(handles.b.play).toHaveBeenCalledTimes(1)
  })

  it('pauses and resumes pending timers with the remaining time', () => {
    register('a', 'b')
    revealEngine.init([hw('a', { revealedBy: 'static' }), hw('b', { revealedBy: 'done:a +4s' })])
    revealEngine.onDone('a')
    vi.advanceTimersByTime(1000)
    revealEngine.pauseAll()
    vi.advanceTimersByTime(10_000)
    expect(handles.b.play).not.toHaveBeenCalled()
    revealEngine.resumeAll()
    vi.advanceTimersByTime(2999)
    expect(handles.b.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(handles.b.play).toHaveBeenCalledTimes(1)
  })

  it('runs the onReveal to-do list', () => {
    register('a', 'b')
    revealEngine.init([
      hw('a', { revealedBy: 'static', clickable: true }),
      hw('b', { revealedBy: 'click:a', onReveal: 'set:reached-b' }),
    ])
    revealEngine.onClicked('a')
    expect(progress.hasFlag('reached-b')).toBe(true)
  })

  it('a real chain: play → w1 → (click | done +6s) → w2', () => {
    register('play', 'w1', 'w2')
    revealEngine.init([
      PLAY,
      hw('w1', { revealedBy: 'click:play', clickable: true }),
      hw('w2', { revealedBy: ['click:w1', 'done:w1 +6s'] }),
    ])
    revealEngine.onClicked('play')
    expect(handles.w1.play).toHaveBeenCalledTimes(1)
    revealEngine.onDone('w1')                  // visitor does not click
    vi.advanceTimersByTime(6000)
    expect(handles.w2.play).toHaveBeenCalledTimes(1)
  })
})
