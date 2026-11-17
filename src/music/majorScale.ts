import { Note, Scale } from 'tonal'

export const DEGREES = [1, 2, 3, 4, 5, 6, 7] as const
export type Degree = (typeof DEGREES)[number]

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

export function getMajorScale(tonic: Tonic): string[] {
  return Scale.get(`${tonic}4 major`).notes
}

export function createQuestion(
  tonic: Tonic,
  degrees: readonly Degree[],
  random: () => number = Math.random,
): Question {
  if (degrees.length === 0) throw new Error('Выберите хотя бы одну ступень.')
  const degree = degrees[Math.floor(random() * degrees.length)]
  const notes = getMajorScale(tonic)
  return { tonic: notes[0], note: notes[degree - 1], degree }
}

const NOTE_NAMES: Record<string, string> = {
  C: 'До', D: 'Ре', E: 'Ми', F: 'Фа', G: 'Соль', A: 'Ля', B: 'Си',
}

export function formatNote(note: string): string {
  const parsed = Note.get(note)
  const accidental = parsed.acc.replaceAll('#', '♯').replaceAll('b', '♭')
  return `${NOTE_NAMES[parsed.letter]}${accidental} · ${parsed.pc}${parsed.oct ?? ''}`
}
