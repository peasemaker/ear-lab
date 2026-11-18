import { useEffect, useReducer, useRef, useState } from 'react'
import { PianoEngine, PianoSamplesError, type AudioPhase, type PlaybackMode } from '../audio/piano'
import type { InstrumentSound } from '../audio/sounds'
import { createQuestion, DEGREES, getBackgroundTonic, getExerciseRange, OCTAVE_OFFSETS, type Degree, type OctaveOffset, type Question, type Tonic } from '../music/majorScale'
import { initialSession, sessionReducer } from '../music/session'

export function useExercise() {
  const [tonic, setTonic] = useState<Tonic>('C')
  const [degrees, setDegrees] = useState<Degree[]>([...DEGREES])
  const [octaves, setOctaves] = useState<OctaveOffset[]>([...OCTAVE_OFFSETS])
  const [sound, setSound] = useState<InstrumentSound>('ambient')
  const [instrumentLoading, setInstrumentLoading] = useState(false)
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [audioPhase, setAudioPhase] = useState<AudioPhase | null>(null)
  const [backgroundOn, setBackgroundOn] = useState(false)
  const engine = useRef<PianoEngine | null>(null)
  const request = useRef(0)
  const loadRequest = useRef(0)

  useEffect(() => () => {
    request.current += 1
    loadRequest.current += 1
    engine.current?.dispose()
    engine.current = null
  }, [])

  function resetQuestion() {
    request.current += 1
    engine.current?.cancelPlayback()
    setAudioPhase(null)
    dispatch({ type: 'reset' })
  }

  function prepareAudio() {
    engine.current ??= new PianoEngine()
    // Unlock directly from the user's initial press, before the hold timer.
    // Playback retries and reports any audio error through the existing UI.
    void engine.current.unlock().catch(() => {})
  }

  function loadInstrument(value: InstrumentSound) {
    const id = ++loadRequest.current
    engine.current ??= new PianoEngine()
    setInstrumentLoading(!engine.current.isInstrumentReady(value))
    void engine.current.prepareInstrument(value).then(() => {
      if (id === loadRequest.current) setInstrumentLoading(false)
    }, (error: unknown) => {
      if (id !== loadRequest.current) return
      setInstrumentLoading(false)
      dispatch({ type: 'error', message: error instanceof PianoSamplesError ? error.message : 'Не удалось подготовить выбранный звук. Повторите прослушивание.' })
    })
  }

  async function play(question: Question, isNew: boolean, playbackMode: PlaybackMode) {
    const id = ++request.current
    dispatch(isNew ? { type: 'start', question } : { type: 'replay' })
    engine.current ??= new PianoEngine()
    loadInstrument(sound)
    try {
      const completed = await engine.current.play(getBackgroundTonic(tonic), question.note, (phase) => {
        if (id !== request.current) return
        setAudioPhase(phase)
        setBackgroundOn(engine.current?.isBackgroundPlaying ?? false)
      }, playbackMode, sound)
      if (id !== request.current) return
      setAudioPhase(null)
      dispatch({ type: completed ? 'heard' : 'reset' })
    } catch (error) {
      if (id !== request.current) return
      if (error instanceof PianoSamplesError) engine.current?.cancelPlayback()
      else engine.current?.stop()
      setBackgroundOn(engine.current?.isBackgroundPlaying ?? false)
      setAudioPhase(null)
      dispatch({ type: 'error', message: error instanceof PianoSamplesError ? error.message : 'Не удалось включить звук. Проверьте звук устройства и нажмите «Слушать» ещё раз.' })
    }
  }

  function listen(playbackMode: PlaybackMode) {
    if (session.phase === 'playing') return
    const isNew = !session.question || session.feedback !== null
    const question = isNew ? createQuestion(tonic, degrees, octaves) : session.question!
    void play(question, isNew, playbackMode)
  }

  function changeTonic(value: Tonic) {
    resetQuestion()
    engine.current?.retuneBackground(getBackgroundTonic(value))
    setTonic(value)
  }

  function changeSound(value: InstrumentSound) {
    if (value === sound) return
    resetQuestion()
    setSound(value)
    loadInstrument(value)
  }

  function stopBackground() {
    engine.current?.stopBackground()
    setBackgroundOn(false)
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

  function toggleOctave(offset: OctaveOffset) {
    if (octaves.length === 1 && octaves.includes(offset)) return
    resetQuestion()
    setOctaves((current) => current.includes(offset)
      ? current.filter((value) => value !== offset)
      : [...current, offset].sort((a, b) => a - b))
  }

  return {
    tonic, degrees, octaves, range: getExerciseRange(tonic, degrees, octaves), sound, instrumentLoading, session, audioPhase, backgroundOn, changeTonic, changeSound, toggleDegree, toggleOctave, selectAll, stopBackground, prepareAudio,
    listen: () => listen('once'),
    listenHeld: () => listen('hold'),
    releaseHeldTarget: () => engine.current?.releaseHeldTarget(),
    selectAnswer: (degree: Degree) => dispatch({ type: 'select', degree }),
    checkAnswer: () => dispatch({ type: 'check' }),
  }
}
