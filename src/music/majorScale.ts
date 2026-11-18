import { Note, Scale } from 'tonal'

export const DEGREES = [1, 2, 3, 4, 5, 6, 7] as const
export type Degree = (typeof DEGREES)[number]

export const OCTAVE_REGISTERS = [
  { offset: -1, label: 'Нижняя', description: '−1 октава' },
  { offset: 0, label: 'Основная', description: 'Без сдвига' },
  { offset: 1, label: 'Верхняя', description: '+1 октава' },
] as const
export type OctaveOffset = (typeof OCTAVE_REGISTERS)[number]['offset']
export const OCTAVE_OFFSETS: readonly OctaveOffset[] = OCTAVE_REGISTERS.map((register) => register.offset)

export const MAJOR_KEYS = [
  { tonic: 'C', label: 'До мажор', symbol: 'C' },
  { tonic: 'Db', label: 'Ре-бемоль мажор', symbol: 'D♭' },
  { tonic: 'D', label: 'Ре мажор', symbol: 'D' },
  { tonic: 'Eb', label: 'Ми-бемоль мажор', symbol: 'E♭' },
  { tonic: 'E', label: 'Ми мажор', symbol: 'E' },
  { tonic: 'F', label: 'Фа мажор', symbol: 'F' },
  { tonic: 'F#', label: 'Фа-диез мажор', symbol: 'F♯' },
  { tonic: 'G', label: 'Соль мажор', symbol: 'G' },
  { tonic: 'Ab', label: 'Ля-бемоль мажор', symbol: 'A♭' },
  { tonic: 'A', label: 'Ля мажор', symbol: 'A' },
  { tonic: 'Bb', label: 'Си-бемоль мажор', symbol: 'B♭' },
  { tonic: 'B', label: 'Си мажор', symbol: 'B' },
] as const

export type Tonic = (typeof MAJOR_KEYS)[number]['tonic']

export interface Question {
  tonic: string
  note: string
  degree: Degree
}

export function getMajorScale(tonic: Tonic, octaveOffset: OctaveOffset = 0): string[] {
  return Scale.get(`${tonic}${4 + octaveOffset} major`).notes
}

/** Place every tonic in F#2–F3, so C and B are adjacent in register. */
export function getBackgroundTonic(tonic: Tonic): string {
  const note = `${tonic}2`
  const lowestBackgroundMidi = 42 // F#2; lower pitch classes move up an octave.
  return Note.midi(note)! < lowestBackgroundMidi ? Note.transpose(note, '8P') : note
}

function getQuestionPool(
  tonic: Tonic,
  degrees: readonly Degree[],
  octaves: readonly OctaveOffset[],
): Question[] {
  if (degrees.length === 0) throw new Error('Выберите хотя бы одну ступень.')
  if (octaves.length === 0) throw new Error('Выберите хотя бы одну октаву.')
  return octaves.flatMap((offset) => {
    const notes = getMajorScale(tonic, offset)
    return degrees.map((degree) => ({ tonic: notes[0], note: notes[degree - 1], degree }))
  })
}

export function createQuestion(
  tonic: Tonic,
  degrees: readonly Degree[],
  octaves: readonly OctaveOffset[] = OCTAVE_OFFSETS,
  random: () => number = Math.random,
): Question {
  const questions = getQuestionPool(tonic, degrees, octaves)
  return questions[Math.floor(random() * questions.length)]
}

export function getExerciseRange(tonic: Tonic, degrees: readonly Degree[], octaves: readonly OctaveOffset[]) {
  const notes = getQuestionPool(tonic, degrees, octaves)
    .map((question) => question.note)
    .sort((a, b) => Note.midi(a)! - Note.midi(b)!)
  return { lowest: notes[0], highest: notes[notes.length - 1] }
}

const NOTE_NAMES: Record<string, string> = {
  C: 'До', D: 'Ре', E: 'Ми', F: 'Фа', G: 'Соль', A: 'Ля', B: 'Си',
}

export function formatNote(note: string): string {
  const parsed = Note.get(note)
  const accidental = parsed.acc.replaceAll('#', '♯').replaceAll('b', '♭')
  return `${NOTE_NAMES[parsed.letter]}${accidental} · ${parsed.pc}${parsed.oct ?? ''}`
}
