import * as Tone from 'tone'

export type AudioPhase = 'tonic' | 'gap' | 'target'

/** Owns Web Audio only. No React or music theory dependencies. */
export class PianoEngine {
  private synth: Tone.PolySynth<Tone.FMSynth> | null = null
  private timers: ReturnType<typeof setTimeout>[] = []
  private generation = 0
  private finish: ((completed: boolean) => void) | null = null

  async play(
    tonic: string,
    target: string,
    onPhase: (phase: AudioPhase) => void,
  ): Promise<boolean> {
    this.stop()
    const generation = this.generation
    // Must run from a click/keyboard gesture, including retries on mobile Safari.
    await Tone.start()
    if (generation !== this.generation) return false

    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 1.2,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.004, decay: 1.4, sustain: 0, release: 0.35 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0, release: 0.2 },
        volume: -12,
      }).toDestination()
    }

    return new Promise<boolean>((resolve) => {
      this.finish = resolve
      onPhase('tonic')
      this.synth!.triggerAttackRelease(tonic, 0.75, Tone.now(), 0.7)
      this.timers.push(setTimeout(() => onPhase('gap'), 850))
      this.timers.push(setTimeout(() => {
        onPhase('target')
        this.synth!.triggerAttackRelease(target, 0.85, Tone.now(), 0.7)
      }, 1200))
      this.timers.push(setTimeout(() => {
        this.timers = []
        this.finish = null
        resolve(true)
      }, 2350))
    })
  }

  stop(): void {
    this.generation += 1
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.synth?.releaseAll()
    this.finish?.(false)
    this.finish = null
  }

  dispose(): void {
    this.stop()
    this.synth?.dispose()
    this.synth = null
  }
}
