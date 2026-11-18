import { useEffect, useReducer, useRef, useState } from 'react'
import { PianoEngine, PianoSamplesError, type AudioPhase, type PlaybackMode } from '../audio/piano'
import type { InstrumentSound } from '../audio/sounds'
import { createQuestion, DEGREES, getBackgroundTonic, getExerciseRange, OCTAVE_OFFSETS, type Degree, type OctaveOffset, type Question, type Tonic } from '../music/majorScale'
import { createCadence, createChordRound, getChordRange, getChordVoicing, type ChordRound } from '../music/chords'
import type { ExerciseMode } from '../music/exercises'
import { initialSession, sessionReducer } from '../music/session'
import { chordSessionReducer, initialChordSession } from '../music/chordSession'

export interface ChordCursor { stage: 'cadence' | 'round'; index: number }

export function useExercise() {
  const [mode, setMode] = useState<ExerciseMode>('notes')
  const activeMode = useRef<ExerciseMode>('notes')
  const [tonic, setTonic] = useState<Tonic>('C')
  const [degrees, setDegrees] = useState<Degree[]>([...DEGREES])
  const [octaves, setOctaves] = useState<OctaveOffset[]>([...OCTAVE_OFFSETS])
  const [sound, setSound] = useState<InstrumentSound>('piano')
  const [instrumentLoading, setInstrumentLoading] = useState(false)
  const [session, dispatch] = useReducer(sessionReducer, initialSession)
  const [chordSession, dispatchChord] = useReducer(chordSessionReducer, initialChordSession)
  const [chordCursor, setChordCursor] = useState<ChordCursor | null>(null)
  const cadenceKey = useRef<Tonic | null>(null)
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
    setChordCursor(null)
    dispatch({ type: 'reset' })
    dispatchChord({ type: 'reset' })
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
      const action = { type: 'error', message: error instanceof PianoSamplesError ? error.message : 'Не удалось подготовить выбранный звук. Повторите прослушивание.' } as const
      if (activeMode.current === 'chords') dispatchChord(action)
      else dispatch(action)
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

  async function playChords(round: ChordRound | null, isNew: boolean, cadenceOnly = false) {
    const id = ++request.current
    const includeCadence = cadenceOnly || cadenceKey.current !== tonic
    const cadence = includeCadence ? createCadence(tonic) : []
    const questions = cadenceOnly ? cadence : [...cadence, ...round!]
    if (isNew && round) dispatchChord({ type: 'start', round })
    else dispatchChord({ type: 'replay' })
    setChordCursor(null)
    setBackgroundOn(false)
    engine.current ??= new PianoEngine()
    loadInstrument(sound)
    try {
      const completed = await engine.current.playSequence(questions.map((question, index) => {
        const isCadence = index < cadence.length
        const isFinalTonic = isCadence && index === cadence.length - 1
        return {
          notes: isCadence ? question.chord.notes : getChordVoicing(question),
          duration: isCadence ? isFinalTonic ? 0.8 : 0.5 : 1,
          intervalMs: isCadence ? isFinalTonic ? 1300 : 900 : 1500,
        }
      }), (index) => {
        if (id !== request.current) return
        setChordCursor(index < cadence.length ? { stage: 'cadence', index } : { stage: 'round', index: index - cadence.length })
      }, sound)
      if (id !== request.current) return
      setChordCursor(null)
      if (completed && includeCadence) cadenceKey.current = tonic
      dispatchChord(completed ? { type: 'heard', roundPlayed: !cadenceOnly } : { type: 'reset' })
    } catch (error) {
      if (id !== request.current) return
      engine.current?.cancelPlayback()
      setChordCursor(null)
      dispatchChord({ type: 'error', message: error instanceof PianoSamplesError ? error.message : 'Не удалось включить звук. Нажмите «Слушать» ещё раз.' })
    }
  }

  function listenChords() {
    if (chordSession.phase === 'playing' || instrumentLoading) return
    const isNew = !chordSession.round || chordSession.answers.length === 4
    const round = isNew ? createChordRound(tonic, degrees, octaves) : chordSession.round!
    void playChords(round, isNew)
  }

  function listenCadence() {
    if (chordSession.phase === 'playing' || instrumentLoading) return
    void playChords(null, false, true)
  }

  function changeMode(value: ExerciseMode) {
    if (value === mode) return
    resetQuestion()
    activeMode.current = value
    cadenceKey.current = null
    engine.current?.stopBackground()
    setBackgroundOn(false)
    if (value === 'chords' && !degrees.includes(1)) setDegrees((current) => [1 as const, ...current].sort((a, b) => a - b))
    setMode(value)
  }

  function changeTonic(value: Tonic) {
    resetQuestion()
    cadenceKey.current = null
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
    if (mode === 'chords' && degree === 1) return
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
    mode, changeMode, tonic, degrees, octaves, range: (mode === 'chords' ? getChordRange : getExerciseRange)(tonic, degrees, octaves), sound, instrumentLoading, session, chordSession, chordCursor, audioPhase, backgroundOn, changeTonic, changeSound, toggleDegree, toggleOctave, selectAll, stopBackground, prepareAudio,
    listenChords, listenCadence,
    answerChord: (degree: Degree, index: number) => dispatchChord({ type: 'answer', degree, index }),
    listen: () => listen('once'),
    listenHeld: () => listen('hold'),
    releaseHeldTarget: () => engine.current?.releaseHeldTarget(),
    selectAnswer: (degree: Degree) => dispatch({ type: 'select', degree }),
    checkAnswer: () => dispatch({ type: 'check' }),
  }
}
