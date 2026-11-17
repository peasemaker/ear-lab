import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ start: vi.fn(), note: vi.fn(), release: vi.fn(), dispose: vi.fn() }))
vi.mock('tone', () => ({
  start: mocks.start,
  now: () => 0,
  FMSynth: class {},
  PolySynth: class {
    toDestination() { return this }
    triggerAttackRelease = mocks.note
    releaseAll = mocks.release
    dispose = mocks.dispose
  },
}))

import { PianoEngine } from './piano'

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('piano playback', () => {
  it('plays tonic then target with a gap and resolves after playback', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const phase = vi.fn()
    const playback = engine.play('C4', 'E4', phase)
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.note.mock.calls.map((call) => call[0])).toEqual(['C4'])
    await vi.advanceTimersByTimeAsync(1200)
    expect(mocks.note.mock.calls.map((call) => call[0])).toEqual(['C4', 'E4'])
    expect(phase.mock.calls.map((call) => call[0])).toEqual(['tonic', 'gap', 'target'])
    await vi.advanceTimersByTimeAsync(1150)
    expect(await playback).toBe(true)
    engine.dispose()
  })

  it('cancels pending notes when the exercise changes', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const phase = vi.fn()
    const playback = engine.play('C4', 'E4', phase)
    await vi.advanceTimersByTimeAsync(0)
    engine.stop()
    await vi.advanceTimersByTimeAsync(3000)
    expect(await playback).toBe(false)
    expect(mocks.note).toHaveBeenCalledTimes(1)
    expect(phase).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('does not play if cancelled while the audio context is starting', async () => {
    let unlock!: () => void
    mocks.start.mockImplementationOnce(() => new Promise<void>((resolve) => { unlock = resolve }))
    const engine = new PianoEngine()
    const playback = engine.play('C4', 'G4', vi.fn())
    engine.stop()
    unlock()
    expect(await playback).toBe(false)
    expect(mocks.note).not.toHaveBeenCalled()
    engine.dispose()
  })
})
