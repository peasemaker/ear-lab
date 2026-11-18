import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className: string
  disabled: boolean
  describedBy: string
  onPrepare: () => void
  onTap: () => void
  onHold: () => void
  onRelease: () => void
}

interface Press {
  source: number | ' ' | 'Enter'
  timer: ReturnType<typeof setTimeout>
  held: boolean
}

export function ListenButton({ children, className, disabled, describedBy, onPrepare, onTap, onHold, onRelease }: Props) {
  const [holding, setHolding] = useState(false)
  const press = useRef<Press | null>(null)
  const handlers = useRef({ onPrepare, onTap, onHold, onRelease })

  useEffect(() => { handlers.current = { onPrepare, onTap, onHold, onRelease } })

  function finish(tap: boolean) {
    const active = press.current
    if (!active) return
    press.current = null
    clearTimeout(active.timer)
    setHolding(false)
    if (active.held) handlers.current.onRelease()
    else if (tap) handlers.current.onTap()
  }

  useEffect(() => {
    const cancel = () => finish(false)
    const onVisibility = () => { if (document.hidden) cancel() }
    window.addEventListener('blur', cancel)
    window.addEventListener('pagehide', cancel)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('pagehide', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
      const active = press.current
      if (active) {
        clearTimeout(active.timer)
        press.current = null
        if (active.held) handlers.current.onRelease()
      }
    }
  }, [])

  function begin(source: Press['source']) {
    if (disabled || press.current) return
    handlers.current.onPrepare()
    const active: Press = {
      source,
      held: false,
      timer: setTimeout(() => {
        if (press.current !== active) return
        active.held = true
        setHolding(true)
        handlers.current.onHold()
      }, 350),
    }
    press.current = active
  }

  return <button type="button"
    className={`${className} listen-button ${holding ? 'is-held' : ''}`}
    disabled={disabled && !holding}
    aria-describedby={describedBy}
    onPointerDown={(event) => {
      if (!event.isPrimary || event.button !== 0 || disabled || press.current) return
      event.currentTarget.setPointerCapture(event.pointerId)
      begin(event.pointerId)
    }}
    onPointerUp={(event) => { if (press.current?.source === event.pointerId) finish(true) }}
    onPointerCancel={() => finish(false)}
    onLostPointerCapture={() => finish(false)}
    onBlur={() => finish(false)}
    onKeyDown={(event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return
      event.preventDefault()
      if (!event.repeat) begin(event.key)
    }}
    onKeyUp={(event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return
      event.preventDefault()
      if (press.current?.source === event.key) finish(true)
    }}
    onClick={(event) => {
      // Pointer and keyboard activation are handled on release. Keep synthetic
      // clicks from assistive technology working without a preceding press.
      if (event.detail === 0 && !press.current && !disabled) handlers.current.onTap()
    }}
    onContextMenu={(event) => event.preventDefault()}
  >{holding ? 'Отпустите' : children}</button>
}
