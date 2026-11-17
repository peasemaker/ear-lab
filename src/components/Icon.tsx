import type { ReactNode } from 'react'

type IconName = 'headphones' | 'play' | 'repeat' | 'arrow' | 'check' | 'chevron' | 'volume' | 'sparkle' | 'x' | 'music'

const paths: Record<IconName, ReactNode> = {
  headphones: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>,
  play: <path d="m9 5 11 7-11 7Z" fill="currentColor" strokeLinejoin="round" />,
  repeat: <><path d="M20 7H9a6 6 0 0 0 0 12h6" /><path d="m16 3 4 4-4 4" /></>,
  arrow: <path d="M4 12h15M14 6l6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  volume: <><path d="m11 5-5 4H3v6h3l5 4Z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
  sparkle: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />,
  x: <path d="m6 6 12 12M6 18 18 6" />,
  music: <><path d="M9 18V5l11-2v13M9 8l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>,
}

export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
