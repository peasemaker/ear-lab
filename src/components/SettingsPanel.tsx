import { DEGREES, MAJOR_KEYS, type Degree, type Tonic } from '../music/majorScale'
import { Icon } from './Icon'

interface Props {
  tonic: Tonic
  degrees: readonly Degree[]
  onTonicChange: (tonic: Tonic) => void
  onDegreeToggle: (degree: Degree) => void
  onSelectAll: () => void
}

export function SettingsPanel({ tonic, degrees, onTonicChange, onDegreeToggle, onSelectAll }: Props) {
  return <aside className="settings-panel card" aria-labelledby="settings-title">
    <div className="section-heading"><span className="eyebrow">ВАША ПРАКТИКА</span><span className="small-dot" /></div>
    <h2 id="settings-title">Настройте упражнение</h2>
    <div className="setting-field">
      <label htmlFor="tonic">Тональность</label>
      <div className="select-wrap">
        <select id="tonic" value={tonic} onChange={(event) => onTonicChange(event.target.value as Tonic)}>
          {MAJOR_KEYS.map((key) => <option key={key.tonic} value={key.tonic}>{key.label} · {key.symbol}</option>)}
        </select>
        <Icon name="chevron" size={17} />
      </div>
      <p className="field-hint">Мажорная гамма · одна октава</p>
    </div>
    <fieldset className="degrees-field">
      <legend>Доступные ступени</legend>
      <div className="degree-toggles">
        {DEGREES.map((degree) => <button key={degree} type="button"
          className={`degree-toggle ${degrees.includes(degree) ? 'is-active' : ''}`}
          aria-pressed={degrees.includes(degree)} aria-label={`${degree}-я ступень`}
          aria-disabled={degrees.length === 1 && degrees.includes(degree)}
          onClick={() => onDegreeToggle(degree)}>{degree}</button>)}
      </div>
      <div className="degrees-meta"><span>Выбрано: {degrees.length} из 7</span><button type="button" className="text-button" disabled={degrees.length === 7} onClick={onSelectAll}>Выбрать все</button></div>
      <p className="field-hint">Оставьте хотя бы одну ступень. Начните с 1, 3 и 5, чтобы освоиться.</p>
    </fieldset>
    <div className="instrument"><span className="instrument-icon"><Icon name="music" size={19} /></span><div><span className="instrument-name">Фортепиано</span><span className="instrument-detail">Мягкий синтезированный звук</span></div><span className="instrument-dot" /></div>
    <div className="settings-note"><Icon name="headphones" size={19} /><p>В наушниках легче услышать каждую деталь.</p></div>
  </aside>
}
