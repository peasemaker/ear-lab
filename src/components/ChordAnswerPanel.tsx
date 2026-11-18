import { DEGREES, formatNote, type Degree } from '../music/majorScale'
import type { ChordSession } from '../music/chordSession'
import { Icon } from './Icon'
import { getChordDegreeLabel } from '../music/chords'
import { useRef } from 'react'

interface Props {
  session: ChordSession
  degrees: readonly Degree[]
  onAnswer: (degree: Degree, index: number) => void
}

export function ChordAnswerPanel({ session, degrees, onAnswer }: Props) {
  const pointerType = useRef('mouse')
  const index = session.answers.length
  const complete = index === 4
  const enabled = session.phase === 'ready' && !complete
  const lastAnswer = session.answers[index - 1]
  const lastQuestion = session.round?.[index - 1]
  return <section className="answer-panel card" aria-labelledby="answer-title">
    <div className="answer-heading"><div><h2 id="answer-title">{complete ? 'Последовательность разобрана' : `Определите аккорд ${index + 1} из 4`}</h2><p>Нажмите на ступень — ответ сразу принимается.</p></div><span className="step-badge">I–vii°</span></div>
    <ol className="chord-answer-progress" aria-label="Ответы на четыре аккорда">
      {[0, 1, 2, 3].map((slot) => {
        const answer = session.answers[slot]
        const chord = answer ? session.round?.[slot].chord : null
        return <li key={slot} className={`${answer ? answer.correct ? 'is-correct' : 'is-wrong' : slot === index ? 'is-current' : ''}`} aria-current={!complete && slot === index ? 'step' : undefined}>
          <small>Аккорд {slot + 1}</small><strong>{chord ? <>{chord.roman}<Icon name={answer.correct ? 'check' : 'x'} size={13} /></> : '—'}</strong>
          {answer && !answer.correct && <small>Ваш: {getChordDegreeLabel(answer.selected)}</small>}
        </li>
      })}
    </ol>
    <div className="answer-buttons" role="group" aria-label="Ответ: ступень аккорда">
      {DEGREES.map((degree) => <button key={degree} type="button"
        className={`answer-key ${!degrees.includes(degree) ? 'is-unavailable' : ''}`}
        disabled={!enabled || !degrees.includes(degree)}
        aria-label={`Ответ: ${getChordDegreeLabel(degree)}, ${degree}-я ступень`}
        onPointerDown={(event) => { pointerType.current = event.pointerType }}
        onClick={(event) => { if (pointerType.current !== 'mouse' || event.detail <= 1) onAnswer(degree, index) }}
        onKeyDown={(event) => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault() }}><span>{getChordDegreeLabel(degree)}</span><small>{degree}</small></button>)}
    </div>
    <div className="answer-bottom">
      <div className="answer-message" role="status" aria-live="polite">
        {session.error ? <p className="audio-error">{session.error}</p> : <div>
          {lastAnswer && lastQuestion && <div className={lastAnswer.correct ? 'message-success' : 'message-incorrect'}>
            <strong>Аккорд {index}: {lastAnswer.correct ? 'верно!' : `это ${lastQuestion.chord.roman} ступень.`}</strong>
            <p>{lastQuestion.chord.symbol} · {lastQuestion.chord.quality}</p><p>{lastQuestion.chord.notes.map(formatNote).join(' / ')}</p><p>Бас: {formatNote(lastQuestion.chord.bass)}</p>
          </div>}
          <p>{session.phase === 'playing' ? 'Сначала дослушайте последовательность.' : complete ? `Готово: ${session.answers.filter((answer) => answer.correct).length} из 4. Нажмите «Следующее задание».` : !session.roundHeard ? 'Нажмите «Слушать», чтобы начать.' : `Теперь выберите ступень аккорда ${index + 1}.`}</p>
        </div>}
      </div>
    </div>
  </section>
}
