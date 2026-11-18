import type { AudioPhase } from '../audio/piano'
import type { Session } from '../music/session'
import { Icon } from './Icon'
import { ListenButton } from './ListenButton'
import { SoundVisual } from './SoundVisual'

interface Props {
  session: Session
  audioPhase: AudioPhase | null
  keySymbol: string
  backgroundOn: boolean
  instrumentLoading: boolean
  onListen: () => void
  onPrepare: () => void
  onListenHeld: () => void
  onReleaseHeld: () => void
  onStopBackground: () => void
}


export function ListeningPanel({ session, audioPhase, keySymbol, backgroundOn, instrumentLoading, onListen, onPrepare, onListenHeld, onReleaseHeld, onStopBackground }: Props) {
  const playing = session.phase === 'playing'
  const status = instrumentLoading ? 'Загружаем пианино…' : playing
    ? audioPhase === 'tonic' ? 'Тоника задаёт опору' : audioPhase === 'target' ? 'Звучит случайная ступень' : 'Прислушайтесь…'
    : session.feedback !== null ? 'Продолжим тренировку?' : session.phase === 'ready' ? 'Какая ступень прозвучала?' : 'Всё начинается с одной ноты'
  const label = instrumentLoading ? 'Загружаем пианино…' : playing ? 'Звучит упражнение…' : session.feedback !== null ? 'Следующее задание' : session.question ? 'Повторить' : 'Слушать'
  const actionIcon = session.feedback !== null ? 'arrow' : session.question ? 'repeat' : 'play'

  return <section className={`listening-panel ${playing ? 'is-playing' : ''}`} aria-labelledby="listening-title" aria-busy={playing || instrumentLoading}>
    <div className="listening-top"><span className="panel-label"><span className="live-dot" /> СЛУШАЙТЕ И ЧУВСТВУЙТЕ</span><span className="key-badge">{keySymbol} major</span></div>
    <SoundVisual />
    <div className="listening-copy"><h2 id="listening-title" aria-live="polite">{status}</h2><p>Тоника звучит на фоне, ступень — поверх неё.</p></div>
    <div className="listen-actions">
      <ListenButton className="button button-primary" disabled={playing || instrumentLoading} describedBy="listen-hint" onPrepare={onPrepare} onTap={onListen} onHold={onListenHeld} onRelease={onReleaseHeld}><Icon name={playing ? 'play' : actionIcon} size={16} />{label}</ListenButton>
    </div>
    <p id="listen-hint" className="hold-hint">Нажмите — 1 секунда. Удерживайте — до отпускания.</p>
    <div className="background-control">
      <button type="button" className={`background-button ${backgroundOn ? 'is-on' : ''}`} onClick={onStopBackground} disabled={!backgroundOn}>
        <Icon name="volume" size={15} />
        {backgroundOn ? 'Выключить тонический фон' : 'Тонический фон выключен'}
        <span className="background-dot" aria-hidden="true" />
      </button>
      <p aria-live="polite">{backgroundOn ? 'Тоника звучит непрерывно, даже во время ответа' : 'Включится при нажатии «Слушать»'}</p>
    </div>
  </section>
}
