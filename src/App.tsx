import { useExercise } from './hooks/useExercise'
import { MAJOR_KEYS } from './music/majorScale'
import { SettingsPanel } from './components/SettingsPanel'
import { ListeningPanel } from './components/ListeningPanel'
import { AnswerPanel } from './components/AnswerPanel'
import { Icon } from './components/Icon'
import { ExerciseTabs } from './components/ExerciseTabs'
import { ChordListeningPanel } from './components/ChordListeningPanel'
import { ChordAnswerPanel } from './components/ChordAnswerPanel'
import './App.css'

export default function App() {
  const exercise = useExercise()
  const session = exercise.mode === 'chords' ? exercise.chordSession : exercise.session
  const currentKey = MAJOR_KEYS.find((key) => key.tonic === exercise.tonic)!
  const chords = exercise.mode === 'chords'

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="./" aria-label="Ear Lab — на главную"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>ear<span className="brand-light">lab</span><span className="brand-period">.</span></span></a>
      <div className="header-divider" /><span className="header-caption">Маленькая практика. Большой слух.</span>
      <span className="header-tag"><span /> Время услышать больше</span>
    </header>
    <main>
      <div className="page-intro">
        <div><div className="intro-eyebrow"><span className="intro-line" /> ТРЕНАЖЁР МУЗЫКАЛЬНОГО СЛУХА</div><h1>Слушайте. Узнавайте.<br /><span>Чувствуйте музыку.</span></h1><p>Учитесь слышать ступени и аккорды мажорной тональности.</p></div>
        <div className="piano-art" aria-hidden="true"><span className="piano-sparkle">✦</span><span className="piano-note">♪</span><div className="piano"><div className="piano-white-keys">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i === 2 ? 'piano-highlight' : ''} />)}</div><div className="piano-black-keys">{[1, 2, 4, 5, 6].map((i) => <span key={i} style={{ left: `calc(${i * 12.5}% - 7px)` }} />)}</div></div><span className="piano-caption">НАСТРОЙТЕСЬ НА МУЗЫКУ</span></div>
      </div>
      <ExerciseTabs mode={exercise.mode} onChange={exercise.changeMode} />
      <div role="tabpanel" id="exercise-panel" aria-labelledby={`tab-${exercise.mode}`} tabIndex={0}>
        <div className="exercise-bar"><div><span className="exercise-number">{chords ? '02' : '01'}</span><h2>{chords ? 'Аккорды в тональности' : 'Ступени мажора'}</h2><span className="mode-badge">{chords ? 'Трезвучия · без обращений' : 'Базовое упражнение'}</span></div><div className="session-score" aria-label={`Результат сессии: ${session.correct} верных из ${session.total}`}><span className="score-dot" /><span>Верно <strong>{session.correct}<span> / {session.total}</span></strong></span></div></div>
        <div className="trainer-layout">
          <SettingsPanel mode={exercise.mode} tonic={exercise.tonic} degrees={exercise.degrees} octaves={exercise.octaves} range={exercise.range} sound={exercise.sound} instrumentLoading={exercise.instrumentLoading} onTonicChange={exercise.changeTonic} onDegreeToggle={exercise.toggleDegree} onSelectAll={exercise.selectAll} onSoundChange={exercise.changeSound} onOctaveToggle={exercise.toggleOctave} />
          <div className="training-area">{chords ? <>
            <ChordListeningPanel session={exercise.chordSession} cursor={exercise.chordCursor} keySymbol={currentKey.symbol} instrumentLoading={exercise.instrumentLoading} onListen={exercise.listenChords} onCadence={exercise.listenCadence} />
            <ChordAnswerPanel session={exercise.chordSession} degrees={exercise.degrees} onAnswer={exercise.answerChord} />
          </> : <>
            <ListeningPanel session={exercise.session} audioPhase={exercise.audioPhase} keySymbol={currentKey.symbol} backgroundOn={exercise.backgroundOn} instrumentLoading={exercise.instrumentLoading} onListen={exercise.listen} onPrepare={exercise.prepareAudio} onListenHeld={exercise.listenHeld} onReleaseHeld={exercise.releaseHeldTarget} onStopBackground={exercise.stopBackground} />
            <AnswerPanel session={exercise.session} degrees={exercise.degrees} onSelect={exercise.selectAnswer} onCheck={exercise.checkAnswer} />
          </>}</div>
        </div>
      </div>
      <div className="practice-tip"><span className="tip-icon"><Icon name="sparkle" size={19} /></span><p><strong>Слух развивается с практикой.</strong> Уделите несколько спокойных минут знакомству со звучанием каждой ступени.</p><span className="tip-decoration" aria-hidden="true">♪</span></div>
    </main>
    <footer><span>earlab<span className="brand-period">.</span> <span className="footer-separator">/</span> Ваша ежедневная музыкальная практика</span><a className="sample-credit" href={`${import.meta.env.BASE_URL}audio/piano/README.md`} target="_blank" rel="noreferrer">Пианино: Alexander Holm · CC BY 3.0</a></footer>
  </div>
}
