import { useRef } from 'react'
import type { ExerciseMode } from '../music/exercises'

const TABS = [
  { mode: 'notes', label: 'Ступени' },
  { mode: 'chords', label: 'Аккорды' },
] as const

interface Props {
  mode: ExerciseMode
  onChange: (mode: ExerciseMode) => void
}

export function ExerciseTabs({ mode, onChange }: Props) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  return <div className="exercise-tabs" role="tablist" aria-label="Упражнения">
    {TABS.map((tab, index) => <button key={tab.mode} type="button" role="tab"
      id={`tab-${tab.mode}`} aria-controls="exercise-panel" aria-selected={mode === tab.mode}
      tabIndex={mode === tab.mode ? 0 : -1} ref={(node) => { buttons.current[index] = node }}
      onClick={() => onChange(tab.mode)} onKeyDown={(event) => {
        let next: number
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = 1 - index
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = 1
        else return
        event.preventDefault()
        onChange(TABS[next].mode)
        buttons.current[next]?.focus()
      }}>{tab.label}</button>)}
  </div>
}
