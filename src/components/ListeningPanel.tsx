import type { AudioPhase } from '../audio/piano'
import type { Session } from '../music/session'
import { Icon } from './Icon'

interface Props {
  session: Session
  audioPhase: AudioPhase | null
  keySymbol: string
  onListen: () => void
  onReplay: () => void
}

const WAVE_HEIGHTS = [12, 21, 15, 30, 44, 25, 53, 70, 43, 61, 84, 57, 97, 74, 110, 81, 60, 94, 68, 48, 73, 51, 32, 54, 37, 24, 33, 16, 22, 12]

export function ListeningPanel({ session, audioPhase, keySymbol, onListen, onReplay }: Props) {
  const playing = session.phase === 'playing'
  const status = playing
    ? audioPhase === 'tonic' ? 'Звучит тоника' : audioPhase === 'target' ? 'Звучит случайная ступень' : 'Прислушайтесь…'
    : session.feedback !== null ? 'Продолжим тренировку?' : session.phase === 'ready' ? 'Какая ступень прозвучала?' : 'Всё начинается с одной ноты'
  const label = playing ? 'Звучит упражнение…' : session.feedback !== null ? 'Следующее задание' : session.question && session.phase === 'ready' ? 'Слушать ещё раз' : 'Слушать задание'

  return <section className={`listening-panel ${playing ? 'is-playing' : ''}`} aria-labelledby="listening-title" aria-busy={playing}>
    <div className="listening-top"><span className="panel-label"><span className="live-dot" /> СЛУШАЙТЕ И ЧУВСТВУЙТЕ</span><span className="key-badge">{keySymbol} major</span></div>
    <div className="sound-visual" aria-hidden="true"><div className="sound-orbit orbit-one" /><div className="sound-orbit orbit-two" /><div className="waveform">{WAVE_HEIGHTS.map((height, i) => <span key={i} style={{ height: `${height}px`, animationDelay: `${i * -0.07}s` }} />)}</div></div>
    <div className="listening-copy"><h2 id="listening-title" aria-live="polite">{status}</h2><p>Тоника задаёт опору. Следующая нота — ваша загадка.</p></div>
    <div className="listen-actions"><button type="button" className="button button-primary" onClick={onListen} disabled={playing}><Icon name={session.feedback !== null && !playing ? 'arrow' : 'play'} size={16} />{label}</button><button type="button" className="replay-button" onClick={onReplay} disabled={!session.question || playing}><Icon name="repeat" size={17} />Повторить</button></div>
    <div className="sound-sequence"><span className={audioPhase === 'tonic' ? 'sequence-active' : ''}>01 · Тоника</span><span className="sequence-line" /><span className={audioPhase === 'target' ? 'sequence-active' : ''}>02 · Ступень</span></div>
  </section>
}
