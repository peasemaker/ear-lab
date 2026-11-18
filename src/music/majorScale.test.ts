import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { createQuestion, DEGREES, formatNote, getBackgroundTonic, getExerciseRange, getMajorScale, MAJOR_KEYS, OCTAVE_OFFSETS } from './majorScale'

describe('major scale exercises', () => {
  it.each(MAJOR_KEYS)('uses major intervals in $tonic and keeps notes in an ascending octave', ({ tonic }) => {
    const notes = getMajorScale(tonic)
    expect(notes).toHaveLength(7)
    const midi = notes.map((note) => Note.midi(note)!)
    expect(midi.map((value) => value - midi[0])).toEqual([0, 2, 4, 5, 7, 9, 11])
    const backgroundMidi = Note.midi(getBackgroundTonic(tonic))!
    expect(backgroundMidi).toBeGreaterThanOrEqual(42) // F#2
    expect(backgroundMidi).toBeLessThanOrEqual(53) // F3
    expect([12, 24]).toContain(midi[0] - backgroundMidi)
    for (const offset of OCTAVE_OFFSETS) {
      for (const degree of DEGREES) {
        const question = createQuestion(tonic, [degree], [offset])
        expect(question.degree).toBe(degree)
        expect(Note.midi(question.tonic)).toBe(midi[0] + offset * 12)
        expect(Note.midi(question.note)).toBe(midi[degree - 1] + offset * 12)
        expect(Note.midi(question.note)! - Note.midi(question.tonic)!).toBe([0, 2, 4, 5, 7, 9, 11][degree - 1])
        expect(Note.midi(question.note)! - backgroundMidi).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('keeps C and B backgrounds a semitone apart instead of nearly an octave', () => {
    expect(getBackgroundTonic('C')).toBe('C3')
    expect(getBackgroundTonic('B')).toBe('B2')
    expect(Note.midi(getBackgroundTonic('C'))! - Note.midi(getBackgroundTonic('B'))!).toBe(1)
  })

  it('chooses only enabled degrees, including the random range boundaries', () => {
    expect(createQuestion('C', [3, 5], [0], () => 0)).toEqual({ tonic: 'C4', note: 'E4', degree: 3 })
    expect(createQuestion('C', [3, 5], [0], () => 0.999999)).toEqual({ tonic: 'C4', note: 'G4', degree: 5 })
  })

  it('selects only enabled degrees and octaves at every combination boundary', () => {
    expect(createQuestion('C', [3, 5], [-1, 1], () => 0)).toEqual({ tonic: 'C3', note: 'E3', degree: 3 })
    expect(createQuestion('C', [3, 5], [-1, 1], () => 0.25)).toEqual({ tonic: 'C3', note: 'G3', degree: 5 })
    expect(createQuestion('C', [3, 5], [-1, 1], () => 0.5)).toEqual({ tonic: 'C5', note: 'E5', degree: 3 })
    expect(createQuestion('C', [3, 5], [-1, 1], () => 0.999999)).toEqual({ tonic: 'C5', note: 'G5', degree: 5 })
  })

  it('makes all 21 degree/register pairs available with equal probability by default', () => {
    const questions = Array.from({ length: 21 }, (_, i) => createQuestion('C', DEGREES, undefined, () => (i + 0.5) / 21))
    expect(new Set(questions.map((question) => question.note)).size).toBe(21)
    expect(questions[0].note).toBe('C3')
    expect(questions[20].note).toBe('B5')
    for (const degree of DEGREES) expect(questions.filter((question) => question.degree === degree)).toHaveLength(3)
    for (const root of ['C3', 'C4', 'C5']) expect(questions.filter((question) => question.tonic === root)).toHaveLength(7)
  })

  it('reports the actual enabled pitch range, including sparse selections and key boundaries', () => {
    expect(getExerciseRange('C', DEGREES, OCTAVE_OFFSETS)).toEqual({ lowest: 'C3', highest: 'B5' })
    expect(getExerciseRange('B', DEGREES, OCTAVE_OFFSETS)).toEqual({ lowest: 'B3', highest: 'A#6' })
    expect(getExerciseRange('C', [3], [1, -1])).toEqual({ lowest: 'E3', highest: 'E5' })
  })

  it('rejects an empty exercise', () => {
    expect(() => createQuestion('C', [])).toThrow('Выберите хотя бы одну ступень.')
    expect(() => createQuestion('C', [1], [])).toThrow('Выберите хотя бы одну октаву.')
  })

  it('preserves theoretical spellings across the octave boundary', () => {
    expect(createQuestion('F#', [7], [0]).note).toBe('E#5')
    expect(createQuestion('F#', [7], [-1]).note).toBe('E#4')
    expect(createQuestion('F#', [7], [1]).note).toBe('E#6')
    expect(createQuestion('B', [2], [0]).note).toBe('C#5')
    expect(createQuestion('B', [2], [-1]).note).toBe('C#4')
    expect(createQuestion('B', [7], [1]).note).toBe('A#6')
    expect(formatNote('E#5')).toBe('Ми♯ · E#5')
  })
})
