import type { Degree, Question } from './majorScale'

export interface Session {
  question: Question | null
  selected: Degree | null
  feedback: boolean | null
  phase: 'idle' | 'playing' | 'ready'
  correct: number
  total: number
  error: string | null
}

export const initialSession: Session = {
  question: null, selected: null, feedback: null, phase: 'idle',
  correct: 0, total: 0, error: null,
}

export type SessionAction =
  | { type: 'start'; question: Question }
  | { type: 'replay' }
  | { type: 'heard' }
  | { type: 'select'; degree: Degree }
  | { type: 'check' }
  | { type: 'reset' }
  | { type: 'error'; message: string }

export function sessionReducer(state: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'start':
      return { ...state, question: action.question, selected: null, feedback: null, phase: 'playing', error: null }
    case 'replay':
      return state.question ? { ...state, phase: 'playing', error: null } : state
    case 'heard':
      return state.question ? { ...state, phase: 'ready' } : state
    case 'select':
      return state.phase === 'ready' && state.feedback === null
        ? { ...state, selected: action.degree } : state
    case 'check': {
      if (state.phase !== 'ready' || !state.question || state.selected === null || state.feedback !== null) return state
      const correct = state.selected === state.question.degree
      return { ...state, feedback: correct, correct: state.correct + Number(correct), total: state.total + 1 }
    }
    case 'reset':
      return { ...initialSession, correct: state.correct, total: state.total }
    case 'error':
      return { ...state, phase: 'idle', error: action.message }
  }
}
