import * as Tone from 'tone'
import type { InstrumentSound } from './sounds'

export type AudioPhase = 'tonic' | 'target'
export type PlaybackMode = 'once' | 'hold'

export class PianoSamplesError extends Error {
  constructor() {
    super('Не удалось загрузить пианино. Проверьте соединение и повторите прослушивание.')
    this.name = 'PianoSamplesError'
  }
}

type TargetInstrument = Tone.PolySynth<Tone.Synth> | Tone.Sampler

export interface SequenceEvent {
  notes: readonly string[]
  duration: number
  intervalMs: number
}

/** Owns Web Audio only. No React or music theory dependencies. */
export class PianoEngine {
  private synth: Tone.PolySynth<Tone.Synth> | null = null
  private targetFilter: Tone.Filter | null = null
  private piano: Tone.Sampler | null = null
  private pianoReady: Promise<void> | null = null
  private cancelPianoLoad: (() => void) | null = null
  private background: Tone.Synth | null = null
  private backgroundFilter: Tone.Filter | null = null
  private ambience: Tone.Reverb | null = null
  private backgroundNote: string | null = null
  private backgroundRevision = 0
  private timers: ReturnType<typeof setTimeout>[] = []
  private generation = 0
  private finish: ((completed: boolean) => void) | null = null
  private holding = false
  private heldNote: string | string[] | null = null
  private heldInstrument: TargetInstrument | null = null

  unlock(): Promise<void> {
    return Tone.start()
  }

  isInstrumentReady(sound: InstrumentSound): boolean {
    return sound === 'ambient' || (this.piano?.loaded ?? false)
  }

  prepareInstrument(sound: InstrumentSound): Promise<void> {
    if (sound === 'ambient') return Promise.resolve()
    if (this.pianoReady) return this.pianoReady

    let resolveLoad!: () => void
    let rejectLoad!: (error: Error) => void
    const ready = new Promise<void>((resolve, reject) => {
      resolveLoad = resolve
      rejectLoad = reject
    })
    let settled = false
    let sampler: Tone.Sampler | null = null
    const settle = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (this.piano === sampler) this.cancelPianoLoad = null
      if (error) rejectLoad(new PianoSamplesError())
      else resolveLoad()
    }
    const timeout = setTimeout(() => settle(new PianoSamplesError()), 15000)

    this.pianoReady = ready.catch((error: unknown) => {
      if (this.piano === sampler) {
        this.piano?.dispose()
        this.piano = null
        this.pianoReady = null
        this.cancelPianoLoad = null
      }
      throw error
    })
    this.cancelPianoLoad = () => settle(new PianoSamplesError())
    try {
      sampler = new Tone.Sampler({
        urls: {
          C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
          C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
          C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
          C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
          C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
        },
        baseUrl: `${import.meta.env.BASE_URL}audio/piano/`,
        attack: 0.005,
        release: 0.35,
        volume: 0,
        onload: () => settle(),
        onerror: (error) => settle(error),
      }).toDestination()
      this.piano = sampler
    } catch {
      settle(new PianoSamplesError())
    }
    return this.pianoReady
  }

  async play(
    tonic: string,
    target: string | readonly string[],
    onPhase: (phase: AudioPhase) => void,
    mode: PlaybackMode = 'once',
    sound: InstrumentSound = 'ambient',
  ): Promise<boolean> {
    this.cancelPlayback()
    this.holding = mode === 'hold'
    const generation = this.generation
    const backgroundRevision = this.backgroundRevision
    // Must run from a click/keyboard gesture, including retries on mobile Safari.
    await Tone.start()
    if (generation !== this.generation) return false

    const notes = typeof target === 'string' ? [target] : [...target]
    const targetNotes = typeof target === 'string' ? target : notes
    const velocity = 0.7 / Math.sqrt(notes.length)

    await this.prepareAmbience()
    if (generation !== this.generation) return false
    try {
      await this.prepareInstrument(sound)
    } catch (error) {
      if (generation !== this.generation) return false
      throw error
    }
    if (generation !== this.generation) return false

    // Keep a quieter, continuous voice between questions. Respect a stop
    // request made while the browser was unlocking the audio context.
    if (backgroundRevision === this.backgroundRevision) this.startBackground(tonic)

    const instrument = this.targetInstrument(sound)
    this.tuneTargetFilter(sound, notes)

    return new Promise<boolean>((resolve) => {
      this.finish = resolve
      if (mode === 'hold') {
        this.heldNote = targetNotes
        this.heldInstrument = instrument
        instrument.triggerAttack(targetNotes, Tone.now(), velocity)
        onPhase('target')
        return
      }
      onPhase('tonic')
      this.timers.push(setTimeout(() => {
        onPhase('target')
        instrument.triggerAttackRelease(targetNotes, 1, Tone.now(), velocity)
      }, 700))
      // Wait for the held note, release tail and Web Audio lookahead.
      this.timers.push(setTimeout(() => {
        this.timers = []
        this.finish = null
        resolve(true)
      }, 2300))
    })
  }

  private targetInstrument(sound: InstrumentSound): TargetInstrument {
    if (sound === 'ambient' && !this.synth) {
      this.targetFilter ??= new Tone.Filter({
        frequency: 1200,
        type: 'lowpass',
        rolloff: -24,
        Q: 0.7,
      }).toDestination()
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'custom', partials: [1, 0.14, 0.03, 0.005] },
        envelope: { attack: 0.25, decay: 0.25, sustain: 0.8, release: 0.35 },
        // Match the old fundamental level after custom-wave normalisation.
        volume: -6,
      }).connect(this.targetFilter)
    }
    return sound === 'piano' ? this.piano! : this.synth!
  }

  private tuneTargetFilter(sound: InstrumentSound, notes: readonly string[]): void {
    if (sound !== 'ambient') return
    const highestFrequency = Math.max(...notes.map((note) => Tone.Frequency(note).toFrequency()))
    const cutoff = Math.max(500, Math.min(3000, highestFrequency * 1.6))
    this.targetFilter!.frequency.setValueAtTime(cutoff, Tone.now())
  }

  releaseHeldTarget(): void {
    if (!this.holding) return
    this.holding = false
    if (this.heldNote === null) {
      // Released while the browser was still unlocking audio: never start late.
      this.cancelPlayback()
      return
    }
    this.heldInstrument?.triggerRelease(this.heldNote, Tone.now())
    this.heldNote = null
    this.heldInstrument = null
    this.timers.push(setTimeout(() => {
      this.timers = []
      this.finish?.(true)
      this.finish = null
    }, 600))
  }

  /** A fixed sequence with silent gaps; never starts a background drone. */
  async playSequence(events: readonly (readonly string[] | SequenceEvent)[], onEvent: (index: number) => void, sound: InstrumentSound = 'ambient'): Promise<boolean> {
    this.cancelPlayback()
    this.stopBackground()
    const generation = this.generation
    await Tone.start()
    if (generation !== this.generation) return false
    try {
      await this.prepareInstrument(sound)
    } catch (error) {
      if (generation !== this.generation) return false
      throw error
    }
    if (generation !== this.generation) return false
    const instrument = this.targetInstrument(sound)
    return new Promise<boolean>((resolve) => {
      this.finish = resolve
      let offsetMs = 0
      events.forEach((event, index) => {
        const { notes: eventNotes, duration, intervalMs } = 'notes' in event ? event : { notes: event, duration: 1, intervalMs: 1500 }
        const play = () => {
          const notes = [...eventNotes]
          this.tuneTargetFilter(sound, notes)
          onEvent(index)
          instrument.triggerAttackRelease(notes, duration, Tone.now(), 0.7 / Math.sqrt(notes.length))
        }
        if (index === 0) play()
        else this.timers.push(setTimeout(play, offsetMs))
        offsetMs += intervalMs
      })
      this.timers.push(setTimeout(() => {
        this.timers = []
        this.finish = null
        resolve(true)
      }, offsetMs))
    })
  }

  get isBackgroundPlaying(): boolean {
    return this.backgroundNote !== null
  }

  private async prepareAmbience(): Promise<void> {
    if (!this.ambience) {
      this.ambience = new Tone.Reverb({ decay: 1.2, preDelay: 0.025, wet: 0.16 }).toDestination()
      this.backgroundFilter = new Tone.Filter({
        frequency: 1800,
        type: 'lowpass',
        Q: 0.5,
      }).connect(this.ambience)
    }
    // Convolution needs a generated impulse response before the first note.
    await this.ambience.ready
  }

  private startBackground(tonic: string): void {
    this.background ??= new Tone.Synth({
      // Upper harmonics keep the low tonic audible on small speakers.
      oscillator: { type: 'custom', partials: [1, 0.4, 0.16, 0.06] },
      envelope: { attack: 0.7, decay: 0.3, sustain: 1, release: 0.35 },
      volume: -13,
    }).connect(this.backgroundFilter!)

    if (this.backgroundNote === null) {
      this.background.triggerAttack(tonic, Tone.now(), 0.65)
      this.backgroundNote = tonic
    } else {
      this.retuneBackground(tonic)
    }
  }

  retuneBackground(tonic: string): void {
    if (!this.background || this.backgroundNote === null || this.backgroundNote === tonic) return
    this.background.frequency.rampTo(tonic, 0.15)
    this.backgroundNote = tonic
  }

  stopBackground(): void {
    this.backgroundRevision += 1
    if (this.backgroundNote !== null) this.background?.triggerRelease()
    this.backgroundNote = null
  }

  /** Cancel the question while keeping the tonic sounding. */
  cancelPlayback(): void {
    this.generation += 1
    this.holding = false
    this.heldNote = null
    this.heldInstrument = null
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.synth?.releaseAll()
    this.piano?.releaseAll()
    this.finish?.(false)
    this.finish = null
  }

  dispose(): void {
    this.stop()
    this.synth?.dispose()
    this.synth = null
    this.targetFilter?.dispose()
    this.targetFilter = null
    this.cancelPianoLoad?.()
    this.cancelPianoLoad = null
    this.piano?.dispose()
    this.piano = null
    this.pianoReady = null
    this.background?.dispose()
    this.background = null
    this.backgroundFilter?.dispose()
    this.backgroundFilter = null
    this.ambience?.dispose()
    this.ambience = null
  }

  stop(): void {
    this.cancelPlayback()
    this.stopBackground()
  }
}
