import { DEGREES, MAJOR_KEYS, OCTAVE_REGISTERS, type Degree, type OctaveOffset, type Tonic } from '../music/majorScale'
import { Icon } from './Icon'
import { INSTRUMENT_SOUNDS, type InstrumentSound } from '../audio/sounds'
import type { ExerciseMode } from '../music/exercises'
import { getChordDegreeLabel } from '../music/chords'

interface Props {
  mode: ExerciseMode
  tonic: Tonic
  degrees: readonly Degree[]
  octaves: readonly OctaveOffset[]
  range: { lowest: string; highest: string }
  sound: InstrumentSound
  instrumentLoading: boolean
  onTonicChange: (tonic: Tonic) => void
  onDegreeToggle: (degree: Degree) => void
  onSelectAll: () => void
  onSoundChange: (sound: InstrumentSound) => void
  onOctaveToggle: (offset: OctaveOffset) => void
}

export function SettingsPanel({ mode, tonic, degrees, octaves, range, sound, instrumentLoading, onTonicChange, onDegreeToggle, onSelectAll, onSoundChange, onOctaveToggle }: Props) {
  const chords = mode === 'chords'
  const selectedSound = INSTRUMENT_SOUNDS.find((value) => value.id === sound)!
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
      <p className="field-hint">{chords ? 'Трезвучия мажора · ступени I–vii°' : 'Мажорная гамма · ступени 1–7'}</p>
    </div>
    <div className="setting-field sound-setting">
      <label htmlFor="instrument-sound">{chords ? 'Звук аккорда' : 'Звук ступени'}</label>
      <div className="select-wrap">
        <select id="instrument-sound" value={sound} onChange={(event) => onSoundChange(event.target.value as InstrumentSound)}>
          {INSTRUMENT_SOUNDS.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
        </select>
        <Icon name="chevron" size={17} />
      </div>
      <p className="field-hint" aria-live="polite">{instrumentLoading ? 'Загружаем пианино…' : selectedSound.description}</p>
      <p className="field-hint">{chords ? 'Четыре аккорда подряд, с паузами между ними.' : 'Тонический фон остаётся мягким и непрерывным.'}</p>
    </div>
    <fieldset className="degrees-field">
      <legend>{chords ? 'Ступени аккордов' : 'Доступные ступени'}</legend>
      <div className="degree-toggles">
        {DEGREES.map((degree) => <button key={degree} type="button"
          className={`degree-toggle ${degrees.includes(degree) ? 'is-active' : ''}`}
          aria-pressed={degrees.includes(degree)} aria-label={`${degree}-я ступень`}
          aria-disabled={(chords && degree === 1) || (degrees.length === 1 && degrees.includes(degree))}
          onClick={() => onDegreeToggle(degree)}>{chords ? getChordDegreeLabel(degree) : degree}</button>)}
      </div>
      <div className="degrees-meta"><span>Выбрано: {degrees.length} из 7</span><button type="button" className="text-button" disabled={degrees.length === 7} onClick={onSelectAll}>Выбрать все</button></div>
      <p className="field-hint">{chords ? 'I ступень обязательна: в каждом задании есть тонический аккорд.' : 'Оставьте хотя бы одну ступень. Начните с 1, 3 и 5, чтобы освоиться.'}</p>
    </fieldset>
    <fieldset className="degrees-field octave-field">
      <legend>{chords ? 'Октавы аккордов' : 'Октавы ступеней'}</legend>
      <div className="octave-toggles">
        {OCTAVE_REGISTERS.map((register) => <button key={register.offset} type="button"
          className={`octave-toggle ${octaves.includes(register.offset) ? 'is-active' : ''}`}
          aria-pressed={octaves.includes(register.offset)}
          aria-label={`${register.label} октава`}
          aria-disabled={octaves.length === 1 && octaves.includes(register.offset)}
          onClick={() => onOctaveToggle(register.offset)}>
          <span>{register.label}</span><small>{register.description}</small>
        </button>)}
      </div>
      <p className="field-hint" aria-live="polite">Диапазон: {range.lowest}–{range.highest}</p>
      <p className="field-hint">{chords ? 'Трезвучие без обращений и бас на октаву ниже основного тона.' : 'Номер ступени одинаков во всех октавах. Оставьте хотя бы одну.'}</p>
    </fieldset>
    <div className="settings-note"><Icon name="headphones" size={19} /><p>В наушниках легче услышать каждую деталь.</p></div>
  </aside>
}
