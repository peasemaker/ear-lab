import type { ChordSession } from '../music/chordSession'
import type { ChordCursor } from '../hooks/useExercise'
import { Icon } from './Icon'
import { SoundVisual } from './SoundVisual'

interface Props {
  session: ChordSession
  cursor: ChordCursor | null
  keySymbol: string
  instrumentLoading: boolean
  onListen: () => void
  onCadence: () => void
}

const CADENCE_LABELS = ['I', 'IV', 'V', 'I']

export function ChordListeningPanel({ session, cursor, keySymbol, instrumentLoading, onListen, onCadence }: Props) {
  const playing = session.phase === 'playing'
  const complete = session.answers.length === 4
  const busy = playing || instrumentLoading
  const status = instrumentLoading ? 'Загружаем пианино…' : playing
    ? cursor?.stage === 'cadence' ? `Каденция · ${CADENCE_LABELS[cursor.index]}` : cursor ? `Звучит аккорд ${cursor.index + 1} из 4` : 'Прислушайтесь…'
    : complete ? 'Четыре аккорда позади' : session.roundHeard ? 'Определите ступени по порядку' : 'Четыре аккорда в одной тональности'
  const label = instrumentLoading ? 'Загружаем пианино…' : playing ? 'Звучит упражнение…' : complete ? 'Следующее задание' : session.round ? 'Повторить' : 'Слушать'
  return <section className={`listening-panel chord-listening ${playing ? 'is-playing' : ''}`} aria-labelledby="listening-title" aria-busy={busy}>
    <div className="listening-top"><span className="panel-label"><span className="live-dot" /> СЛУШАЙТЕ И ЗАПОМИНАЙТЕ</span><span className="key-badge">{keySymbol} major</span></div>
    <SoundVisual />
    <div className="listening-copy"><h2 id="listening-title" aria-live="polite">{status}</h2><p>Запомните порядок. Хотя бы один аккорд — тоника.</p></div>
    <div className="chord-playback-progress" aria-label="Порядок звучания">
      {[0, 1, 2, 3].map((index) => <span key={index} className={cursor?.stage === 'round' && cursor.index === index ? 'is-current' : ''} aria-current={cursor?.stage === 'round' && cursor.index === index ? 'step' : undefined}>{index + 1}</span>)}
    </div>
    <div className="listen-actions"><button type="button" className="button button-primary" disabled={busy} onClick={onListen}><Icon name={complete ? 'arrow' : session.round ? 'repeat' : 'play'} size={16} />{label}</button></div>
    <p className="hold-hint">Повтор сохраняет последовательность и ваши ответы.</p>
    <div className="cadence-control"><button type="button" className="background-button" disabled={busy} onClick={onCadence}><Icon name="music" size={15} />Каденция I–IV–V–I</button><p>В начале — автоматически. Потом — по желанию.</p></div>
  </section>
}
