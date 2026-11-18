import { afterEach, describe, expect, it, vi } from 'vitest'

interface MockSamplerOptions {
  onload: () => void
  onerror: (error: Error) => void
}

const mocks = vi.hoisted(() => ({
  start: vi.fn(), note: vi.fn(), attack: vi.fn(), targetRelease: vi.fn(), release: vi.fn(), dispose: vi.fn(),
  backgroundAttack: vi.fn(), backgroundRelease: vi.fn(), backgroundRamp: vi.fn(), backgroundDispose: vi.fn(),
  reverbReady: vi.fn(), reverbDispose: vi.fn(), filterDispose: vi.fn(),
  filterToDestination: vi.fn(), filterFrequency: vi.fn(), synthConnect: vi.fn(),
  samplerReady: vi.fn(), samplerCreate: vi.fn(), pianoNote: vi.fn(), pianoAttack: vi.fn(),
  pianoRelease: vi.fn(), pianoReleaseAll: vi.fn(), pianoDispose: vi.fn(),
}))
vi.mock('tone', () => ({
  start: mocks.start,
  now: () => 0,
  Frequency: () => ({ toFrequency: () => 440 }),
  Sampler: class {
    loaded = false
    constructor(options: MockSamplerOptions) {
      mocks.samplerCreate()
      void Promise.resolve(mocks.samplerReady()).then(() => {
        this.loaded = true
        options.onload()
      }, options.onerror)
    }
    toDestination() { return this }
    triggerAttackRelease = mocks.pianoNote
    triggerAttack = mocks.pianoAttack
    triggerRelease = mocks.pianoRelease
    releaseAll = mocks.pianoReleaseAll
    dispose = mocks.pianoDispose
  },
  Reverb: class {
    ready = Promise.resolve(mocks.reverbReady())
    toDestination() { return this }
    dispose = mocks.reverbDispose
  },
  Filter: class {
    connect() { return this }
    toDestination() { mocks.filterToDestination(); return this }
    frequency = { setValueAtTime: mocks.filterFrequency }
    dispose = mocks.filterDispose
  },
  Synth: class {
    toDestination() { return this }
    connect() { return this }
    triggerAttack = mocks.backgroundAttack
    triggerRelease = mocks.backgroundRelease
    frequency = { rampTo: mocks.backgroundRamp }
    dispose = mocks.backgroundDispose
  },
  PolySynth: class {
    toDestination() { return this }
    connect() { mocks.synthConnect(); return this }
    triggerAttackRelease = mocks.note
    triggerAttack = mocks.attack
    triggerRelease = mocks.targetRelease
    releaseAll = mocks.release
    dispose = mocks.dispose
  },
}))

import { PianoEngine, PianoSamplesError } from './piano'

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks() })

describe('sampled piano', () => {
  it.each(['ambient', 'piano'] as const)('plays the bass and triad together with %s, with balanced gain and no drone', async (sound) => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const notes = ['C3', 'C4', 'E4', 'G4']
    const playback = engine.playSequence([{ notes, duration: 0.5, intervalMs: 900 }], vi.fn(), sound)
    await vi.advanceTimersByTimeAsync(900)
    expect(await playback).toBe(true)
    const note = sound === 'ambient' ? mocks.note : mocks.pianoNote
    expect(note).toHaveBeenCalledExactlyOnceWith(notes, 0.5, 0, 0.35)
    expect(mocks.backgroundAttack).not.toHaveBeenCalled()
    engine.dispose()
  })
  it.each(['ambient', 'piano'] as const)('plays a faster cadence before four full-length exercise chords with %s', async (sound) => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const engine = new PianoEngine()
    const notes = ['C4', 'E4', 'G4']
    const exerciseNotes = ['C3', ...notes]
    const events = [
      ...[0, 1, 2].map(() => ({ notes, duration: 0.5, intervalMs: 900 })),
      { notes, duration: 0.8, intervalMs: 1300 },
      ...[0, 1, 2, 3].map(() => ({ notes: exerciseNotes, duration: 1, intervalMs: 1500 })),
    ]
    const onsets: number[] = []
    const playback = engine.playSequence(events, () => { onsets.push(Date.now()) }, sound)
    await vi.advanceTimersByTimeAsync(9999)
    const note = sound === 'ambient' ? mocks.note : mocks.pianoNote
    expect(onsets).toEqual([0, 900, 1800, 2700, 4000, 5500, 7000, 8500])
    expect(note.mock.calls.map((call) => call[1])).toEqual([0.5, 0.5, 0.5, 0.8, 1, 1, 1, 1])
    expect(note.mock.calls.map((call) => call[0])).toEqual([notes, notes, notes, notes, exerciseNotes, exerciseNotes, exerciseNotes, exerciseNotes])
    await vi.advanceTimersByTimeAsync(1)
    expect(await playback).toBe(true)
    expect(engine.isBackgroundPlaying).toBe(false)
    engine.dispose()
  })
  it.each(['ambient', 'piano'] as const)('plays a four-chord sequence with %s in order, with no drone', async (sound) => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const events = [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4']]
    const cursor = vi.fn()
    const playback = engine.playSequence(events, cursor, sound)
    await vi.advanceTimersByTimeAsync(0)
    const note = sound === 'ambient' ? mocks.note : mocks.pianoNote
    expect(note).toHaveBeenCalledTimes(1)
    for (let index = 0; index < events.length; index++) {
      if (index) await vi.advanceTimersByTimeAsync(1500)
      expect(note).toHaveBeenNthCalledWith(index + 1, events[index], 1, 0, 0.7 / Math.sqrt(3))
      expect(cursor).toHaveBeenNthCalledWith(index + 1, index)
    }
    await vi.advanceTimersByTimeAsync(1500)
    expect(await playback).toBe(true)
    expect(engine.isBackgroundPlaying).toBe(false)
    expect(mocks.backgroundAttack).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('stops an existing note drone before playing a sequence and cancels every later chord', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const note = engine.play('C3', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(2300)
    await note
    expect(engine.isBackgroundPlaying).toBe(true)
    mocks.note.mockClear()
    const sequence = engine.playSequence([['C4', 'E4', 'G4'], ['G4', 'B4', 'D5']], vi.fn())
    await vi.advanceTimersByTimeAsync(200)
    expect(engine.isBackgroundPlaying).toBe(false)
    expect(mocks.backgroundRelease).toHaveBeenCalledTimes(1)
    engine.cancelPlayback()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await sequence).toBe(false)
    expect(mocks.note).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('does not start a late sequence after cancellation while samples load', async () => {
    vi.useFakeTimers()
    let finish!: () => void
    mocks.samplerReady.mockReturnValue(new Promise<void>((resolve) => { finish = resolve }))
    const engine = new PianoEngine()
    const sequence = engine.playSequence([['C4', 'E4', 'G4']], vi.fn(), 'piano')
    await vi.advanceTimersByTimeAsync(0)
    engine.cancelPlayback()
    finish()
    await vi.advanceTimersByTimeAsync(3000)
    expect(await sequence).toBe(false)
    expect(mocks.pianoNote).not.toHaveBeenCalled()
    engine.dispose()
  })
  it.each(['ambient', 'piano'] as const)('plays all three chord voices simultaneously with %s and releases the held chord', async (sound) => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const notes = ['G4', 'B4', 'D5']
    const note = sound === 'ambient' ? mocks.note : mocks.pianoNote
    const attack = sound === 'ambient' ? mocks.attack : mocks.pianoAttack
    const release = sound === 'ambient' ? mocks.targetRelease : mocks.pianoRelease
    const once = engine.play('C3', notes, vi.fn(), 'once', sound)
    await vi.advanceTimersByTimeAsync(2300)
    expect(await once).toBe(true)
    expect(note).toHaveBeenCalledExactlyOnceWith(notes, 1, 0, 0.7 / Math.sqrt(3))
    const held = engine.play('C3', notes, vi.fn(), 'hold', sound)
    await vi.advanceTimersByTimeAsync(5000)
    expect(attack).toHaveBeenCalledExactlyOnceWith(notes, 0, 0.7 / Math.sqrt(3))
    expect(release).not.toHaveBeenCalled()
    engine.releaseHeldTarget()
    expect(release).toHaveBeenCalledExactlyOnceWith(notes, 0)
    await vi.advanceTimersByTimeAsync(600)
    expect(await held).toBe(true)
    expect(mocks.backgroundAttack).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it.each(['ambient', 'piano'] as const)('cancels every pending chord voice with %s without stopping the background', async (sound) => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const pending = engine.play('C3', ['C4', 'E4', 'G4'], vi.fn(), 'once', sound)
    await vi.advanceTimersByTimeAsync(200)
    engine.cancelPlayback()
    await vi.advanceTimersByTimeAsync(3000)
    expect(await pending).toBe(false)
    expect(mocks.note).not.toHaveBeenCalled()
    expect(mocks.pianoNote).not.toHaveBeenCalled()
    expect(engine.isBackgroundPlaying).toBe(true)
    engine.dispose()
  })
  it('filters the ambient target while keeping the sampled piano on its dry path', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const ambient = engine.play('C3', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(2300)
    expect(await ambient).toBe(true)
    expect(mocks.synthConnect).toHaveBeenCalledTimes(1)
    expect(mocks.filterToDestination).toHaveBeenCalledTimes(1)
    expect(mocks.filterFrequency).toHaveBeenCalledTimes(1)
    const piano = engine.play('C3', 'E4', vi.fn(), 'once', 'piano')
    await vi.advanceTimersByTimeAsync(2300)
    expect(await piano).toBe(true)
    expect(mocks.pianoNote).toHaveBeenCalledTimes(1)
    expect(mocks.filterFrequency).toHaveBeenCalledTimes(1)
    engine.dispose()
    expect(mocks.filterDispose).toHaveBeenCalledTimes(2)
  })

  it('loads samples only when selected and reuses them after switching sounds', async () => {
    const engine = new PianoEngine()
    await engine.prepareInstrument('ambient')
    expect(mocks.samplerCreate).not.toHaveBeenCalled()
    const first = engine.prepareInstrument('piano')
    const second = engine.prepareInstrument('piano')
    expect(second).toBe(first)
    await first
    expect(engine.isInstrumentReady('piano')).toBe(true)
    await engine.prepareInstrument('ambient')
    await engine.prepareInstrument('piano')
    expect(mocks.samplerCreate).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('plays a dry piano note and holds/releases the selected piano voice', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const once = engine.play('C3', 'E4', vi.fn(), 'once', 'piano')
    await vi.advanceTimersByTimeAsync(2300)
    expect(await once).toBe(true)
    expect(mocks.pianoNote).toHaveBeenCalledExactlyOnceWith('E4', 1, 0, 0.7)
    expect(mocks.note).not.toHaveBeenCalled()
    const held = engine.play('C3', 'G4', vi.fn(), 'hold', 'piano')
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.pianoAttack).toHaveBeenCalledExactlyOnceWith('G4', 0, 0.7)
    expect(mocks.pianoRelease).not.toHaveBeenCalled()
    engine.releaseHeldTarget()
    await vi.advanceTimersByTimeAsync(600)
    expect(await held).toBe(true)
    expect(mocks.pianoRelease).toHaveBeenCalledExactlyOnceWith('G4', 0)
    expect(mocks.backgroundAttack).toHaveBeenCalledTimes(1)
    expect(mocks.samplerCreate).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('reports a failed download and allows retry with a new sampler', async () => {
    mocks.samplerReady.mockImplementationOnce(() => Promise.reject(new Error('Network unavailable')))
    const engine = new PianoEngine()
    await expect(engine.prepareInstrument('piano')).rejects.toBeInstanceOf(PianoSamplesError)
    expect(engine.isInstrumentReady('piano')).toBe(false)
    expect(mocks.pianoDispose).toHaveBeenCalledTimes(1)
    await engine.prepareInstrument('piano')
    expect(engine.isInstrumentReady('piano')).toBe(true)
    expect(mocks.samplerCreate).toHaveBeenCalledTimes(2)
    engine.dispose()
  })

  it('times out a stalled download and allows a retry', async () => {
    vi.useFakeTimers()
    mocks.samplerReady.mockImplementationOnce(() => new Promise<void>(() => {}))
    const engine = new PianoEngine()
    const failed = expect(engine.prepareInstrument('piano')).rejects.toBeInstanceOf(PianoSamplesError)
    await vi.advanceTimersByTimeAsync(15000)
    await failed
    expect(engine.isInstrumentReady('piano')).toBe(false)
    await engine.prepareInstrument('piano')
    expect(engine.isInstrumentReady('piano')).toBe(true)
    engine.dispose()
  })

  it('never starts an old piano question after switching back to ambient during loading', async () => {
    vi.useFakeTimers()
    let loaded!: () => void
    mocks.samplerReady.mockImplementationOnce(() => new Promise<void>((resolve) => { loaded = resolve }))
    const engine = new PianoEngine()
    const old = engine.play('C3', 'E4', vi.fn(), 'hold', 'piano')
    await vi.advanceTimersByTimeAsync(0)
    engine.cancelPlayback()
    const current = engine.play('C3', 'G4', vi.fn())
    loaded()
    await vi.advanceTimersByTimeAsync(2300)
    expect(await old).toBe(false)
    expect(await current).toBe(true)
    expect(mocks.pianoAttack).not.toHaveBeenCalled()
    expect(mocks.pianoNote).not.toHaveBeenCalled()
    expect(mocks.note).toHaveBeenCalledExactlyOnceWith('G4', 1, 0, 0.7)
    engine.dispose()
  })

  it('disposes a loading sampler and rejects preload without playing late notes', async () => {
    let loaded!: () => void
    mocks.samplerReady.mockImplementationOnce(() => new Promise<void>((resolve) => { loaded = resolve }))
    const engine = new PianoEngine()
    const rejected = expect(engine.prepareInstrument('piano')).rejects.toBeInstanceOf(PianoSamplesError)
    engine.dispose()
    loaded()
    await rejected
    expect(engine.isInstrumentReady('piano')).toBe(false)
    expect(mocks.pianoDispose).toHaveBeenCalledTimes(1)
    expect(mocks.pianoAttack).not.toHaveBeenCalled()
  })
})

describe('piano playback with a continuous tonic', () => {
  it('cancels first playback while reverb is preparing and disposes the effects', async () => {
    vi.useFakeTimers()
    let ready!: () => void
    mocks.reverbReady.mockImplementationOnce(() => new Promise<void>((resolve) => { ready = resolve }))
    const engine = new PianoEngine()
    const playback = engine.play('C3', 'E4', vi.fn(), 'hold')
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.reverbReady).toHaveBeenCalledTimes(1)
    engine.dispose()
    ready()
    expect(await playback).toBe(false)
    expect(mocks.attack).not.toHaveBeenCalled()
    expect(mocks.backgroundAttack).not.toHaveBeenCalled()
    expect(mocks.reverbDispose).toHaveBeenCalledTimes(1)
    expect(mocks.filterDispose).toHaveBeenCalledTimes(1)
  })

  it('holds the target beyond the normal duration and releases it only on request', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const completed = vi.fn()
    const playback = engine.play('C3', 'E4', vi.fn(), 'hold')
    void playback.then(completed)
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.attack).toHaveBeenCalledExactlyOnceWith('E4', 0, 0.7)
    expect(mocks.note).not.toHaveBeenCalled()
    expect(mocks.targetRelease).not.toHaveBeenCalled()
    expect(completed).not.toHaveBeenCalled()
    engine.releaseHeldTarget()
    engine.releaseHeldTarget()
    expect(mocks.targetRelease).toHaveBeenCalledExactlyOnceWith('E4', 0)
    await vi.advanceTimersByTimeAsync(599)
    expect(completed).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(await playback).toBe(true)
    expect(engine.isBackgroundPlaying).toBe(true)
    engine.dispose()
  })

  it('never starts a held target after release while the audio context is unlocking', async () => {
    let unlock!: () => void
    mocks.start.mockImplementationOnce(() => new Promise<void>((resolve) => { unlock = resolve }))
    const engine = new PianoEngine()
    const playback = engine.play('C3', 'E4', vi.fn(), 'hold')
    engine.releaseHeldTarget()
    unlock()
    expect(await playback).toBe(false)
    expect(mocks.attack).not.toHaveBeenCalled()
    expect(mocks.backgroundAttack).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('cancels a held target on settings changes and ignores late release during a normal question', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const held = engine.play('C3', 'E4', vi.fn(), 'hold')
    await vi.advanceTimersByTimeAsync(0)
    engine.cancelPlayback()
    expect(await held).toBe(false)
    const next = engine.play('D3', 'F#4', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    engine.releaseHeldTarget()
    await vi.advanceTimersByTimeAsync(2300)
    expect(await next).toBe(true)
    expect(mocks.targetRelease).not.toHaveBeenCalled()
    expect(mocks.note).toHaveBeenCalledExactlyOnceWith('F#4', 1, 0, 0.7)
    engine.dispose()
  })

  it('keeps the target held when muting the background and cancels it on disposal', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const completed = vi.fn()
    const held = engine.play('C3', 'E4', vi.fn(), 'hold')
    void held.then(completed)
    await vi.advanceTimersByTimeAsync(0)
    engine.stopBackground()
    await vi.advanceTimersByTimeAsync(5000)
    expect(completed).not.toHaveBeenCalled()
    expect(mocks.targetRelease).not.toHaveBeenCalled()
    engine.dispose()
    expect(await held).toBe(false)
    expect(mocks.dispose).toHaveBeenCalledTimes(1)
    expect(mocks.backgroundDispose).toHaveBeenCalledTimes(1)
    expect(mocks.reverbDispose).toHaveBeenCalledTimes(1)
    expect(mocks.filterDispose).toHaveBeenCalledTimes(2)
  })

  it('starts the tonic, plays the target over it and keeps the tonic after playback', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const phase = vi.fn()
    const playback = engine.play('C2', 'E4', phase)
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.backgroundAttack).toHaveBeenCalledWith('C2', 0, 0.65)
    expect(mocks.note).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(700)
    expect(mocks.note).toHaveBeenCalledExactlyOnceWith('E4', 1, 0, 0.7)
    expect(phase.mock.calls.map((call) => call[0])).toEqual(['tonic', 'target'])
    const completed = vi.fn()
    void playback.then(completed)
    await vi.advanceTimersByTimeAsync(1400)
    expect(completed).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(200)
    expect(await playback).toBe(true)
    expect(engine.isBackgroundPlaying).toBe(true)
    expect(mocks.backgroundRelease).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('does not restart the background on repeat or the next question', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const first = engine.play('C2', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(2300)
    await first
    const next = engine.play('C2', 'G4', vi.fn())
    await vi.advanceTimersByTimeAsync(2300)
    await next
    expect(mocks.backgroundAttack).toHaveBeenCalledTimes(1)
    expect(mocks.backgroundRelease).not.toHaveBeenCalled()
    expect(mocks.note.mock.calls.map((call) => call[0])).toEqual(['E4', 'G4'])
    engine.dispose()
  })

  it('cancels pending target notes while preserving the background during settings changes', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const playback = engine.play('C2', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    engine.cancelPlayback()
    await vi.advanceTimersByTimeAsync(3000)
    expect(await playback).toBe(false)
    expect(mocks.note).not.toHaveBeenCalled()
    expect(engine.isBackgroundPlaying).toBe(true)
    expect(mocks.backgroundRelease).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('retunes an active background without reattacking it and leaves a stopped background off', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const playback = engine.play('C2', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    engine.cancelPlayback()
    await playback
    engine.retuneBackground('D2')
    engine.retuneBackground('D2')
    expect(mocks.backgroundRamp).toHaveBeenCalledExactlyOnceWith('D2', 0.15)
    expect(mocks.backgroundAttack).toHaveBeenCalledTimes(1)
    engine.stopBackground()
    engine.retuneBackground('F2')
    expect(mocks.backgroundRamp).toHaveBeenCalledTimes(1)
    expect(engine.isBackgroundPlaying).toBe(false)
    engine.dispose()
  })

  it('can mute the tonic during playback without cancelling the target, then restart it on listen', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const playback = engine.play('C2', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    engine.stopBackground()
    expect(engine.isBackgroundPlaying).toBe(false)
    await vi.advanceTimersByTimeAsync(2300)
    expect(await playback).toBe(true)
    expect(mocks.note.mock.calls.map((call) => call[0])).toEqual(['E4'])
    expect(engine.isBackgroundPlaying).toBe(false)
    const next = engine.play('C2', 'G4', vi.fn())
    await vi.advanceTimersByTimeAsync(2300)
    await next
    expect(engine.isBackgroundPlaying).toBe(true)
    expect(mocks.backgroundAttack).toHaveBeenCalledTimes(2)
    engine.dispose()
  })

  it('does not play anything if cancelled while the audio context is starting', async () => {
    let unlock!: () => void
    mocks.start.mockImplementationOnce(() => new Promise<void>((resolve) => { unlock = resolve }))
    const engine = new PianoEngine()
    const playback = engine.play('C2', 'G4', vi.fn())
    engine.stop()
    unlock()
    expect(await playback).toBe(false)
    expect(mocks.note).not.toHaveBeenCalled()
    expect(mocks.backgroundAttack).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('respects a background stop made while the audio context is starting', async () => {
    vi.useFakeTimers()
    let unlock!: () => void
    mocks.start.mockImplementationOnce(() => new Promise<void>((resolve) => { unlock = resolve }))
    const engine = new PianoEngine()
    const playback = engine.play('C2', 'G4', vi.fn())
    engine.stopBackground()
    unlock()
    await vi.advanceTimersByTimeAsync(2300)
    expect(await playback).toBe(true)
    expect(mocks.backgroundAttack).not.toHaveBeenCalled()
    expect(mocks.note).toHaveBeenCalledTimes(1)
    engine.dispose()
  })

  it('releases and disposes both voices and cancels pending notes on unmount', async () => {
    vi.useFakeTimers()
    const engine = new PianoEngine()
    const playback = engine.play('C2', 'E4', vi.fn())
    await vi.advanceTimersByTimeAsync(0)
    engine.dispose()
    await vi.advanceTimersByTimeAsync(3000)
    expect(await playback).toBe(false)
    expect(engine.isBackgroundPlaying).toBe(false)
    expect(mocks.backgroundRelease).toHaveBeenCalledTimes(1)
    expect(mocks.backgroundDispose).toHaveBeenCalledTimes(1)
    expect(mocks.dispose).toHaveBeenCalledTimes(1)
    expect(mocks.note).not.toHaveBeenCalled()
  })
})
