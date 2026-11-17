import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { createQuestion, DEGREES, formatNote, getMajorScale, MAJOR_KEYS } from './majorScale'

describe('major scale exercises', () => {
  it.each(MAJOR_KEYS)('uses major intervals in $tonic and keeps notes in an ascending octave', ({ tonic }) => {
    const notes = getMajorScale(tonic)
    expect(notes).toHaveLength(7)
    const midi = notes.map((note) => Note.midi(note)!)
    expect(midi.map((value) => value - midi[0])).toEqual([0, 2, 4, 5, 7, 9, 11])
    for (const degree of DEGREES) {
      const question = createQuestion(tonic, [degree])
      expect(Note.midi(question.note)! - Note.midi(question.tonic)!).toBe([0, 2, 4, 5, 7, 9, 11][degree - 1])
    }
  })

  it('chooses only enabled degrees, including the random range boundaries', () => {
    expect(createQuestion('C', [3, 5], () => 0)).toEqual({ tonic: 'C4', note: 'E4', degree: 3 })
    expect(createQuestion('C', [3, 5], () => 0.999999)).toEqual({ tonic: 'C4', note: 'G4', degree: 5 })
  })

  it('rejects an empty exercise', () => {
    expect(() => createQuestion('C', [])).toThrow('Выберите хотя бы одну ступень.')
  })

  it('preserves theoretical spellings across the octave boundary', () => {
    expect(createQuestion('F#', [7]).note).toBe('E#5')
    expect(createQuestion('B', [2]).note).toBe('C#5')
    expect(formatNote('E#5')).toBe('Ми♯ · E#5')
  })
})
