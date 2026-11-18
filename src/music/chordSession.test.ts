import { describe, expect, it } from 'vitest'
import { createChordQuestion, type ChordRound } from './chords'
import { chordSessionReducer, initialChordSession } from './chordSession'

const round: ChordRound = [1, 4, 5, 2].map((degree) => createChordQuestion('C', [degree as 1 | 2 | 4 | 5], [0])) as ChordRound
function ready() {
  return chordSessionReducer(chordSessionReducer(initialChordSession, { type: 'start', round }), { type: 'heard', roundPlayed: true })
}

describe('four-chord exercise lifecycle', () => {
  it('blocks answers until the whole round has played', () => {
    const playing = chordSessionReducer(initialChordSession, { type: 'start', round })
    expect(chordSessionReducer(playing, { type: 'answer', degree: 1, index: 0 })).toBe(playing)
    expect(chordSessionReducer(initialChordSession, { type: 'answer', degree: 1, index: 0 })).toBe(initialChordSession)
  })

  it('immediately checks answers in order and ignores duplicate or out-of-order submissions', () => {
    let state = ready()
    for (const [index, degree] of [1, 2, 5, 2].entries()) {
      expect(chordSessionReducer(state, { type: 'answer', degree: 1, index: index + 1 })).toBe(state)
      const action = { type: 'answer', degree: degree as 1 | 2 | 5, index } as const
      state = chordSessionReducer(state, action)
      expect(state.answers).toHaveLength(index + 1)
      expect(state.total).toBe(index + 1)
      expect(chordSessionReducer(state, action)).toBe(state)
    }
    expect(state).toMatchObject({ correct: 3, total: 4 })
    expect(state.answers.map((answer) => answer.correct)).toEqual([true, false, true, true])
    expect(chordSessionReducer(state, { type: 'answer', degree: 1, index: 4 })).toBe(state)
  })

  it('preserves the fixed round and completed answers across replay and cadence', () => {
    const state = chordSessionReducer(ready(), { type: 'answer', degree: 1, index: 0 })
    const replaying = chordSessionReducer(state, { type: 'replay' })
    expect(replaying.round).toBe(round)
    expect(chordSessionReducer(replaying, { type: 'answer', degree: 4, index: 1 })).toBe(replaying)
    expect(chordSessionReducer(replaying, { type: 'heard', roundPlayed: false })).toEqual(state)
    expect(chordSessionReducer(replaying, { type: 'heard', roundPlayed: true })).toEqual(state)
  })

  it('a cadence alone cannot unlock a round that was never heard', () => {
    let state = chordSessionReducer(initialChordSession, { type: 'start', round })
    state = chordSessionReducer(state, { type: 'error', message: 'Interrupted' })
    state = chordSessionReducer(state, { type: 'replay' })
    state = chordSessionReducer(state, { type: 'heard', roundPlayed: false })
    expect(state).toMatchObject({ phase: 'idle', roundHeard: false, total: 0 })
    expect(chordSessionReducer(state, { type: 'answer', degree: 1, index: 0 })).toBe(state)
  })

  it('keeps standalone cadence outside the answer score', () => {
    const cadence = chordSessionReducer(initialChordSession, { type: 'replay' })
    expect(chordSessionReducer(cadence, { type: 'heard', roundPlayed: false })).toEqual(initialChordSession)
  })

  it('clears a partial round on settings changes and retains the session score', () => {
    const checked = chordSessionReducer(ready(), { type: 'answer', degree: 1, index: 0 })
    expect(chordSessionReducer(checked, { type: 'reset' })).toEqual({ ...initialChordSession, correct: 1, total: 1 })
    const next = chordSessionReducer(checked, { type: 'start', round })
    expect(next).toMatchObject({ answers: [], roundHeard: false, total: 1, phase: 'playing' })
  })
})
