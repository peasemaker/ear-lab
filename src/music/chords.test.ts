import { describe, expect, it } from 'vitest'
import { Note } from 'tonal'
import { createCadence, createChordQuestion, createChordRound, getChordDegreeLabel, getChordRange, getChordVoicing } from './chords'
import { DEGREES, getMajorScale, MAJOR_KEYS, OCTAVE_OFFSETS } from './majorScale'

describe('diatonic major triads', () => {
  it('uses major, minor and diminished degree labels consistently with triad quality', () => {
    expect(DEGREES.map(getChordDegreeLabel)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    for (const degree of DEGREES) expect(getChordDegreeLabel(degree)).toBe(createChordQuestion('C', [degree], [0]).chord.roman)
  })
  it.each(MAJOR_KEYS)('always includes a tonic in four chords of $tonic, respecting enabled registers', ({ tonic }) => {
    for (const value of [0, 0.2, 0.5, 0.8, 0.999999]) {
      const round = createChordRound(tonic, [1, 3, 5, 7], [-1, 1], () => value)
      expect(round).toHaveLength(4)
      expect(round.some((question) => question.degree === 1)).toBe(true)
      for (const question of round) {
        expect([1, 3, 5, 7]).toContain(question.degree)
        expect([3, 5]).toContain(Note.get(question.tonic).oct)
      }
    }
  })

  it('can place the guaranteed tonic in any slot rather than always at the beginning', () => {
    for (let slot = 0; slot < 4; slot++) {
      const values = [0.9999, 0.9999, 0.9999, 0.9999, (slot + 0.5) / 4, 0]
      const round = createChordRound('C', [1, 5], [0], () => values.shift()!)
      expect(round.map((question) => question.degree)).toEqual([0, 1, 2, 3].map((index) => index === slot ? 1 : 5))
    }
  })

  it.each(MAJOR_KEYS)('builds a deterministic I–IV–V–I cadence in $tonic', ({ tonic }) => {
    const cadence = createCadence(tonic)
    expect(cadence.map((question) => question.degree)).toEqual([1, 4, 5, 1])
    expect(cadence[0]).toEqual(createChordQuestion(tonic, [1], [0], () => 0))
    expect(cadence[3]).toEqual(cadence[0])
  })
  it.each(MAJOR_KEYS)('builds every triad in $tonic in root position across three registers', ({ tonic }) => {
    const pitchClasses = getMajorScale(tonic).map((note) => Note.get(note).pc)
    const intervals = [[0, 4, 7], [0, 3, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 3, 7], [0, 3, 6]]
    for (const octave of OCTAVE_OFFSETS) {
      const scale = getMajorScale(tonic, octave)
      for (const degree of DEGREES) {
        const question = createChordQuestion(tonic, [degree], [octave])
        const midi = question.chord.notes.map((note) => Note.midi(note)!)
        expect(question.degree).toBe(degree)
        expect(question.chord.notes[0]).toBe(scale[degree - 1])
        expect(question.note).toBe(question.chord.notes[0])
        expect(midi.map((value) => value - midi[0])).toEqual(intervals[degree - 1])
        expect(Note.midi(question.chord.bass)).toBe(midi[0] - 12)
        expect(Note.get(question.chord.bass).pc).toBe(Note.get(question.note).pc)
        expect(getChordVoicing(question)).toEqual([question.chord.bass, ...question.chord.notes])
        expect(getChordVoicing(question)).toHaveLength(4)
        for (const note of question.chord.notes) expect(pitchClasses).toContain(Note.get(note).pc)
      }
    }
  })

  it('keeps wrapped thirds and fifths above the root and preserves theoretical spellings', () => {
    expect(createChordQuestion('C', [5], [0]).chord).toMatchObject({ notes: ['G4', 'B4', 'D5'], symbol: 'G', roman: 'V' })
    expect(createChordQuestion('C', [7], [-1]).chord).toMatchObject({ notes: ['B3', 'D4', 'F4'], symbol: 'Bdim', roman: 'vii°' })
    expect(createChordQuestion('F#', [7], [0]).chord).toMatchObject({ notes: ['E#5', 'G#5', 'B5'], symbol: 'E#dim' })
    expect(createChordQuestion('B', [7], [1]).chord.notes).toEqual(['A#6', 'C#7', 'E7'])
    expect(createChordQuestion('Db', [2], [0]).chord.symbol).toBe('Ebm')
  })

  it('samples only enabled pairs and makes all 21 pairs equally available by default', () => {
    const questions = Array.from({ length: 21 }, (_, i) => createChordQuestion('C', DEGREES, undefined, () => (i + 0.5) / 21))
    expect(new Set(questions.map((question) => question.chord.notes.join(','))).size).toBe(21)
    for (const degree of DEGREES) expect(questions.filter((question) => question.degree === degree)).toHaveLength(3)
    expect(createChordQuestion('C', [2, 6], [-1, 1], () => 0)).toMatchObject({ degree: 2, note: 'D3' })
    expect(createChordQuestion('C', [2, 6], [-1, 1], () => 0.99999)).toMatchObject({ degree: 6, note: 'A5' })
  })

  it('reports the complete audible range, including the fifth above the highest root', () => {
    expect(getChordRange('C', DEGREES, OCTAVE_OFFSETS)).toEqual({ lowest: 'C2', highest: 'F6' })
    expect(getChordRange('B', DEGREES, OCTAVE_OFFSETS)).toEqual({ lowest: 'B2', highest: 'E7' })
    expect(getChordRange('C', [5], [0])).toEqual({ lowest: 'G3', highest: 'D5' })
  })

  it('rejects empty selections', () => {
    expect(() => createChordQuestion('C', [], [0])).toThrow()
    expect(() => createChordQuestion('C', [1], [])).toThrow()
    expect(() => getChordRange('C', [], [0])).toThrow()
    expect(() => getChordRange('C', [1], [])).toThrow()
  })
})
