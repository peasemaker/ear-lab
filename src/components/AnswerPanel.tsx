import { DEGREES, formatNote, type Degree } from '../music/majorScale'
import type { Session } from '../music/session'
import { Icon } from './Icon'

interface Props {
  session: Session
  degrees: readonly Degree[]
  onSelect: (degree: Degree) => void
  onCheck: () => void
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

export function AnswerPanel({ session, degrees, onSelect, onCheck }: Props) {
  const checked = session.feedback !== null
  const enabled = session.phase === 'ready' && !checked
  return <section className="answer-panel card" aria-labelledby="answer-title">
    <div className="answer-heading"><div><h2 id="answer-title">Узнайте ступень</h2><p>Доверьтесь слуху и выберите ответ.</p></div><span className="step-badge">1–7</span></div>
    <div className="answer-buttons" role="group" aria-label="Ответ: номер ступени">
      {DEGREES.map((degree) => {
        const available = degrees.includes(degree)
        const correct = checked && degree === session.question?.degree
        const wrong = checked && session.selected === degree && !session.feedback
        return <button key={degree} type="button"
          className={`answer-key ${session.selected === degree ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${wrong ? 'is-wrong' : ''} ${!available ? 'is-unavailable' : ''}`}
          disabled={!enabled || !available} aria-pressed={session.selected === degree}
          aria-label={`Ответ: ${degree}-я ступень${!available ? ', исключена из упражнения' : ''}`}
          onClick={() => onSelect(degree)}><span>{degree}</span><small>{ROMAN[degree - 1]}</small>{correct && <Icon name="check" size={14} />}{wrong && <Icon name="x" size={14} />}</button>
      })}
    </div>
    <div className="answer-bottom">
      <div className={`answer-message ${checked ? session.feedback ? 'message-success' : 'message-incorrect' : ''}`} role="status" aria-live="polite">
        {session.error ? <p className="audio-error">{session.error}</p> : checked && session.question ? <><span className="feedback-icon"><Icon name={session.feedback ? 'check' : 'music'} size={17} /></span><div><strong>{session.feedback ? 'Верно! Отличный слух.' : `Это ${session.question.degree}-я ступень. Попробуем ещё!`}</strong><p>{formatNote(session.question.note)}{session.feedback ? ' · Продолжайте в том же духе.' : ` · Ваш ответ: ${session.selected}`}</p></div></> : <p>{session.phase === 'playing' ? 'Сначала дослушайте ступень.' : !session.question || session.phase === 'idle' ? 'Нажмите «Слушать», чтобы начать.' : session.selected ? `Выбрана ${session.selected}-я ступень. Проверим?` : 'Выберите одну из доступных ступеней.'}</p>}
      </div>
      {!checked && <button type="button" className="button button-check" disabled={!enabled || !session.selected} onClick={onCheck}>Проверить<Icon name="check" size={18} /></button>}
    </div>
  </section>
}
