import type { Degree } from './majorScale'
import type { ChordRound } from './chords'

export interface ChordAnswer {
  selected: Degree
  correct: boolean
}

export interface ChordSession {
  round: ChordRound | null
  roundHeard: boolean
  answers: ChordAnswer[]
  phase: 'idle' | 'playing' | 'ready'
  correct: number
  total: number
  error: string | null
}

export const initialChordSession: ChordSession = {
  round: null, roundHeard: false, answers: [], phase: 'idle', correct: 0, total: 0, error: null,
}

export type ChordSessionAction =
  | { type: 'start'; round: ChordRound }
  | { type: 'replay' }
  | { type: 'heard'; roundPlayed: boolean }
  | { type: 'answer'; degree: Degree; index: number }
  | { type: 'reset' }
  | { type: 'error'; message: string }

export function chordSessionReducer(state: ChordSession, action: ChordSessionAction): ChordSession {
  switch (action.type) {
    case 'start': return { ...state, round: action.round, roundHeard: false, answers: [], phase: 'playing', error: null }
    case 'replay': return { ...state, phase: 'playing', error: null }
    case 'heard': {
      const roundHeard = state.roundHeard || action.roundPlayed
      return { ...state, roundHeard, phase: state.round && roundHeard ? 'ready' : 'idle' }
    }
    case 'answer': {
      const question = state.round?.[action.index]
      if (state.phase !== 'ready' || !question || action.index !== state.answers.length) return state
      const correct = action.degree === question.degree
      return {
        ...state, answers: [...state.answers, { selected: action.degree, correct }],
        correct: state.correct + Number(correct), total: state.total + 1,
      }
    }
    case 'reset': return { ...initialChordSession, correct: state.correct, total: state.total }
    case 'error': return { ...state, phase: 'idle', error: action.message }
  }
}
