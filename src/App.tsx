import { useExercise } from './hooks/useExercise'
import { MAJOR_KEYS } from './music/majorScale'
import { SettingsPanel } from './components/SettingsPanel'
import { ListeningPanel } from './components/ListeningPanel'
import { AnswerPanel } from './components/AnswerPanel'
import { Icon } from './components/Icon'
import './App.css'

export default function App() {
  const exercise = useExercise()
  const { session } = exercise
  const currentKey = MAJOR_KEYS.find((key) => key.tonic === exercise.tonic)!

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="./" aria-label="Ear Lab — на главную"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><span>ear<span className="brand-light">lab</span><span className="brand-period">.</span></span></a>
      <div className="header-divider" /><span className="header-caption">Маленькая практика. Большой слух.</span>
      <span className="header-tag"><span /> Время услышать больше</span>
    </header>
    <main>
      <div className="page-intro">
        <div><div className="intro-eyebrow"><span className="intro-line" /> ТРЕНАЖЁР МУЗЫКАЛЬНОГО СЛУХА</div><h1>Слушайте. Узнавайте.<br /><span>Чувствуйте музыку.</span></h1><p>Учитесь слышать ступени мажорной гаммы — по одной ноте за раз.</p></div>
        <div className="piano-art" aria-hidden="true"><span className="piano-sparkle">✦</span><span className="piano-note">♪</span><div className="piano"><div className="piano-white-keys">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i === 2 ? 'piano-highlight' : ''} />)}</div><div className="piano-black-keys">{[1, 2, 4, 5, 6].map((i) => <span key={i} style={{ left: `calc(${i * 12.5}% - 7px)` }} />)}</div></div><span className="piano-caption">НАСТРОЙТЕСЬ НА МУЗЫКУ</span></div>
      </div>
      <div className="exercise-bar"><div><span className="exercise-number">01</span><h2>Ступени мажора</h2><span className="mode-badge">Базовое упражнение</span></div><div className="session-score" aria-label={`Результат сессии: ${session.correct} верных из ${session.total}`}><span className="score-dot" /><span>Верно <strong>{session.correct}<span> / {session.total}</span></strong></span></div></div>
      <div className="trainer-layout">
        <SettingsPanel tonic={exercise.tonic} degrees={exercise.degrees} onTonicChange={exercise.changeTonic} onDegreeToggle={exercise.toggleDegree} onSelectAll={exercise.selectAll} />
        <div className="training-area"><ListeningPanel session={session} audioPhase={exercise.audioPhase} keySymbol={currentKey.symbol} onListen={exercise.listen} onReplay={exercise.replay} /><AnswerPanel session={session} degrees={exercise.degrees} onSelect={exercise.selectAnswer} onCheck={exercise.checkAnswer} onNext={exercise.listen} /></div>
      </div>
      <div className="practice-tip"><span className="tip-icon"><Icon name="sparkle" size={19} /></span><p><strong>Слух развивается с практикой.</strong> Уделите несколько спокойных минут знакомству со звучанием каждой ступени.</p><span className="tip-decoration" aria-hidden="true">♪</span></div>
    </main>
    <footer><span>earlab<span className="brand-period">.</span> <span className="footer-separator">/</span> Ваша ежедневная музыкальная практика</span><span>Сделайте паузу. Прислушайтесь.</span></footer>
  </div>
}
