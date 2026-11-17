import { useEffect, useReducer, useRef, useState } from 'react'
import { PianoEngine, type AudioPhase } from '../audio/piano'
import { createQuestion, DEGREES, type Degree, type Question, type Tonic } from '../music/majorScale'
import { initialSession, sessionReducer } from '../music/session'

export function useExercise() {
  const [tonic, setTonic] = useState<Tonic>('C')
  const [degrees, setDegrees] = useState<Degree[]>([...DEGREES])
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [audioPhase, setAudioPhase] = useState<AudioPhase | null>(null)
  const engine = useRef<PianoEngine | null>(null)
  const request = useRef(0)

  useEffect(() => () => {
    request.current += 1
    engine.current?.dispose()
    engine.current = null
  }, [])

  function resetQuestion() {
    request.current += 1
    engine.current?.stop()
    setAudioPhase(null)
    dispatch({ type: 'reset' })
  }

  async function play(question: Question, isNew: boolean) {
    const id = ++request.current
    dispatch(isNew ? { type: 'start', question } : { type: 'replay' })
    engine.current ??= new PianoEngine()
    try {
      const completed = await engine.current.play(question.tonic, question.note, setAudioPhase)
      if (id !== request.current) return
      setAudioPhase(null)
      if (completed) dispatch({ type: 'heard' })
    } catch {
      if (id !== request.current) return
      engine.current?.stop()
      setAudioPhase(null)
      dispatch({ type: 'error', message: 'Не удалось включить звук. Проверьте звук устройства и нажмите «Слушать» ещё раз.' })
    }
  }

  function listen() {
    if (session.phase === 'playing') return
    const isNew = !session.question || session.feedback !== null
    const question = isNew ? createQuestion(tonic, degrees) : session.question!
    void play(question, isNew)
  }

  function replay() {
    if (session.question && session.phase !== 'playing') void play(session.question, false)
  }

  function changeTonic(value: Tonic) {
    resetQuestion()
    setTonic(value)
  }

  function toggleDegree(degree: Degree) {
    if (degrees.length === 1 && degrees.includes(degree)) return
    resetQuestion()
    setDegrees((current) => current.includes(degree)
      ? current.filter((value) => value !== degree)
      : [...current, degree].sort((a, b) => a - b))
  }

  function selectAll() {
    if (degrees.length === DEGREES.length) return
    resetQuestion()
    setDegrees([...DEGREES])
  }

  return {
    tonic, degrees, session, audioPhase, listen, replay, changeTonic, toggleDegree, selectAll,
    selectAnswer: (degree: Degree) => dispatch({ type: 'select', degree }),
    checkAnswer: () => dispatch({ type: 'check' }),
  }
}
