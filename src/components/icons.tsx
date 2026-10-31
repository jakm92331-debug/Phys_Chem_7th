import {
  Atom,
  AudioWaveform,
  Award,
  Compass,
  Flame,
  FlaskConical,
  Gauge,
  Rocket,
  Target,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type { Badge, UnitTheme } from '@/types/content'

export const UNIT_ICONS: Record<UnitTheme['icon'], LucideIcon> = {
  motion: Gauge,
  fluid: Waves,
  heat: Flame,
  atom: Atom,
}

export const BADGE_ICONS: Record<Badge['icon'], LucideIcon> = {
  rocket: Rocket,
  flask: FlaskConical,
  target: Target,
  compass: Compass,
  award: Award,
  flame: Flame,
  atom: Atom,
  wave: AudioWaveform,
}

/**
 * Decorative scientific motifs, one per unit identity.
 * Purely ornamental — always rendered aria-hidden.
 */
export function UnitMotif({
  motif,
  className,
}: {
  motif: UnitTheme['motif']
  className?: string
}) {
  if (motif === 'trajectory') {
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden="true" focusable="false">
        <path
          d="M8 104 C 60 100, 92 20, 188 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray="1 9"
          strokeLinecap="round"
        />
        <path d="M176 6 L192 12 L180 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="103" r="6" fill="currentColor" />
        <circle cx="70" cy="72" r="4" fill="currentColor" opacity="0.55" />
        <circle cx="122" cy="38" r="3" fill="currentColor" opacity="0.35" />
        <path d="M20 84 h34 M46 78 l8 6 -8 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </svg>
    )
  }
  if (motif === 'waves') {
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden="true" focusable="false">
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M-5 ${34 + i * 20} Q 30 ${14 + i * 20}, 60 ${34 + i * 20} T 125 ${34 + i * 20} T 205 ${34 + i * 20}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity={1 - i * 0.2}
          />
        ))}
        <circle cx="150" cy="26" r="5" fill="currentColor" opacity="0.7" />
        <circle cx="168" cy="44" r="3.5" fill="currentColor" opacity="0.5" />
        <circle cx="140" cy="52" r="2.5" fill="currentColor" opacity="0.4" />
      </svg>
    )
  }
  if (motif === 'particles') {
    const dots: [number, number, number, number][] = [
      [30, 86, 6, 0.9], [58, 60, 4, 0.6], [84, 90, 7, 0.8], [104, 44, 4.5, 0.55],
      [128, 74, 6, 0.85], [150, 32, 4, 0.5], [168, 64, 7.5, 0.75], [44, 30, 3.5, 0.45],
      [186, 96, 4, 0.6], [114, 98, 3, 0.4],
    ]
    return (
      <svg viewBox="0 0 200 120" className={className} aria-hidden="true" focusable="false">
        {dots.map(([cx, cy, r, o], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="currentColor" opacity={o} />
        ))}
        <path d="M64 52 l10 -10 M138 62 l12 -6 M92 78 l8 -12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      </svg>
    )
  }
  // orbit
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        <ellipse cx="100" cy="60" rx="72" ry="28" />
        <ellipse cx="100" cy="60" rx="72" ry="28" transform="rotate(60 100 60)" />
        <ellipse cx="100" cy="60" rx="72" ry="28" transform="rotate(120 100 60)" />
      </g>
      <circle cx="100" cy="60" r="8" fill="currentColor" />
      <circle cx="168" cy="48" r="4.5" fill="currentColor" opacity="0.8" />
      <circle cx="52" cy="96" r="4" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

/** Brand mark — an atom/orbit glyph evoking exploration. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="0.55" stopColor="#0899B8" />
          <stop offset="1" stopColor="#0EA5A4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0B1226" />
      <g fill="none" stroke="url(#logo-g)" strokeWidth="2.6">
        <ellipse cx="32" cy="32" rx="22" ry="9" />
        <ellipse cx="32" cy="32" rx="22" ry="9" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="22" ry="9" transform="rotate(120 32 32)" />
      </g>
      <circle cx="32" cy="32" r="5.5" fill="#F5B301" />
      <circle cx="52" cy="27" r="3" fill="#7DD3FC" />
    </svg>
  )
}
