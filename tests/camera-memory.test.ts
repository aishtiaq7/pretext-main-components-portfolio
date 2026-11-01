import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cameraMemory } from '../src/store/cameraMemory'

// Node has no localStorage, so this exercises the in-memory path; the
// localStorage branch is the same code with persist() actually writing.

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cameraMemory.forgetAll()
  vi.useRealTimers()
})

describe('cameraMemory', () => {
  it('returns null for an unknown notebook', () => {
    expect(cameraMemory.load('nope')).toBeNull()
  })

  it('remembers a camera per notebook', () => {
    cameraMemory.save('home', { zoom: 0.9, panX: -120, panY: 40 })
    cameraMemory.save('fresh', { zoom: 1.4, panX: 0, panY: 0 })
    expect(cameraMemory.load('home')).toEqual({ zoom: 0.9, panX: -120, panY: 40 })
    expect(cameraMemory.load('fresh')).toEqual({ zoom: 1.4, panX: 0, panY: 0 })
  })

  it('keeps only the latest value when saves come every frame', () => {
    for (let i = 0; i < 60; i++) cameraMemory.save('home', { zoom: 1, panX: i, panY: 0 })
    vi.advanceTimersByTime(300)
    expect(cameraMemory.load('home')?.panX).toBe(59)
  })

  it('forgets one or all', () => {
    cameraMemory.save('home', { zoom: 1, panX: 1, panY: 1 })
    cameraMemory.save('fresh', { zoom: 1, panX: 2, panY: 2 })
    cameraMemory.forget('home')
    expect(cameraMemory.load('home')).toBeNull()
    expect(cameraMemory.load('fresh')).not.toBeNull()
    cameraMemory.forgetAll()
    expect(cameraMemory.load('fresh')).toBeNull()
  })
})
