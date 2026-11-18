const WAVE_HEIGHTS = [12, 21, 15, 30, 44, 25, 53, 70, 43, 61, 84, 57, 97, 74, 110, 81, 60, 94, 68, 48, 73, 51, 32, 54, 37, 24, 33, 16, 22, 12]

export function SoundVisual() {
  return <div className="sound-visual" aria-hidden="true"><div className="sound-orbit orbit-one" /><div className="sound-orbit orbit-two" /><div className="waveform">{WAVE_HEIGHTS.map((height, i) => <span key={i} style={{ height: `${height}px`, animationDelay: `${i * -0.07}s` }} />)}</div></div>
}
