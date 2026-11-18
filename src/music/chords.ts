import { Note } from 'tonal'
import { createQuestion, getMajorScale, OCTAVE_OFFSETS, type Degree, type OctaveOffset, type Question, type Tonic } from './majorScale'

const TRIADS = [
  { roman: 'I', suffix: '', quality: 'Мажорное трезвучие' },
  { roman: 'ii', suffix: 'm', quality: 'Минорное трезвучие' },
  { roman: 'iii', suffix: 'm', quality: 'Минорное трезвучие' },
  { roman: 'IV', suffix: '', quality: 'Мажорное трезвучие' },
  { roman: 'V', suffix: '', quality: 'Мажорное трезвучие' },
  { roman: 'vi', suffix: 'm', quality: 'Минорное трезвучие' },
  { roman: 'vii°', suffix: 'dim', quality: 'Уменьшённое трезвучие' },
] as const

export function getChordDegreeLabel(degree: Degree): string {
  return TRIADS[degree - 1].roman
}

export interface ChordQuestion extends Question {
  chord: {
    notes: [string, string, string]
    bass: string
    symbol: string
    roman: string
    quality: string
  }
}

export function getChordVoicing(question: ChordQuestion): [string, string, string, string] {
  return [question.chord.bass, ...question.chord.notes]
}

export type ChordRound = [ChordQuestion, ChordQuestion, ChordQuestion, ChordQuestion]
export const CADENCE_DEGREES = [1, 4, 5, 1] as const

/** Keep the complete round fixed for replays; the tonic can occur anywhere. */
export function createChordRound(tonic: Tonic, degrees: readonly Degree[], octaves: readonly OctaveOffset[], random: () => number = Math.random): ChordRound {
  const next = () => createChordQuestion(tonic, degrees, octaves, random)
  const round: ChordRound = [next(), next(), next(), next()]
  if (!round.some((question) => question.degree === 1)) {
    const slot = Math.floor(random() * round.length)
    round[slot] = createChordQuestion(tonic, [1], octaves, random)
  }
  return round
}

export function createCadence(tonic: Tonic): ChordRound {
  return CADENCE_DEGREES.map((degree) => createChordQuestion(tonic, [degree], [0], () => 0)) as ChordRound
}

/** Stack scale thirds, carrying wrapped notes into the next octave. */
export function createChordQuestion(
  tonic: Tonic,
  degrees: readonly Degree[],
  octaves: readonly OctaveOffset[] = OCTAVE_OFFSETS,
  random: () => number = Math.random,
): ChordQuestion {
  const question = createQuestion(tonic, degrees, octaves, random)
  const rootOctave = Note.get(question.tonic).oct!
  const selectedScale = getMajorScale(tonic, (rootOctave - 4) as OctaveOffset)
  const voice = (step: number) => {
    const index = question.degree - 1 + step
    return index < 7 ? selectedScale[index] : Note.transpose(selectedScale[index % 7], '8P')
  }
  const triad = TRIADS[question.degree - 1]
  return {
    ...question,
    chord: {
      notes: [voice(0), voice(2), voice(4)],
      bass: Note.transpose(question.note, '-8P'),
      symbol: `${Note.get(question.note).pc}${triad.suffix}`,
      roman: triad.roman,
      quality: triad.quality,
    },
  }
}

export function getChordRange(tonic: Tonic, degrees: readonly Degree[], octaves: readonly OctaveOffset[]) {
  const notes = octaves.flatMap((octave) => degrees.flatMap((degree) => getChordVoicing(createChordQuestion(tonic, [degree], [octave], () => 0))))
    .sort((a, b) => Note.midi(a)! - Note.midi(b)!)
  if (!notes.length) throw new Error('Выберите хотя бы одну ступень и одну октаву.')
  return { lowest: notes[0], highest: notes[notes.length - 1] }
}
