import { describe, expect, it } from 'vitest'
import { initialSession, sessionReducer, type Session } from './session'

const question = { tonic: 'C4', note: 'E4', degree: 3 } as const
function ready(): Session {
  return sessionReducer(sessionReducer(initialSession, { type: 'start', question }), { type: 'heard' })
}

describe('exercise lifecycle', () => {
  it('does not accept answers before the notes finish or without a selection', () => {
    const playing = sessionReducer(initialSession, { type: 'start', question })
    expect(sessionReducer(playing, { type: 'select', degree: 3 }).selected).toBeNull()
    expect(sessionReducer(playing, { type: 'check' }).total).toBe(0)
    expect(sessionReducer(ready(), { type: 'check' }).total).toBe(0)
  })

  it('counts a correct answer once and locks it after checking', () => {
    const selected = sessionReducer(ready(), { type: 'select', degree: 3 })
    const checked = sessionReducer(selected, { type: 'check' })
    expect(checked).toMatchObject({ feedback: true, correct: 1, total: 1 })
    expect(sessionReducer(checked, { type: 'check' })).toEqual(checked)
    expect(sessionReducer(checked, { type: 'select', degree: 2 })).toEqual(checked)
  })

  it('counts an incorrect answer and keeps the right answer available for feedback', () => {
    const selected = sessionReducer(ready(), { type: 'select', degree: 2 })
    expect(sessionReducer(selected, { type: 'check' })).toMatchObject({ feedback: false, correct: 0, total: 1, question })
  })

  it('replays the same question and cannot count a checked answer again after replay', () => {
    const selected = sessionReducer(ready(), { type: 'select', degree: 3 })
    const checked = sessionReducer(selected, { type: 'check' })
    const replayed = sessionReducer(sessionReducer(checked, { type: 'replay' }), { type: 'heard' })
    expect(replayed.question).toBe(question)
    expect(sessionReducer(replayed, { type: 'check' })).toEqual(checked)
  })

  it('clears the question and selection on settings changes, preserving session score', () => {
    const checked = sessionReducer(sessionReducer(ready(), { type: 'select', degree: 3 }), { type: 'check' })
    expect(sessionReducer(checked, { type: 'reset' })).toEqual({ ...initialSession, correct: 1, total: 1 })
  })

  it('preserves the question when audio fails and allows retry', () => {
    const failed = sessionReducer(ready(), { type: 'error', message: 'Audio unavailable' })
    expect(failed).toMatchObject({ phase: 'idle', question, total: 0 })
    expect(sessionReducer(failed, { type: 'replay' })).toMatchObject({ phase: 'playing', question, error: null })
  })
})
