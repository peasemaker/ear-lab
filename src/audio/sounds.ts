export const INSTRUMENT_SOUNDS = [
  { id: 'ambient', label: 'Эмбиент', description: 'Тёплый синтезированный pad' },
  { id: 'piano', label: 'Пианино', description: 'Акустическое пианино с естественным затуханием' },
] as const

export type InstrumentSound = (typeof INSTRUMENT_SOUNDS)[number]['id']
