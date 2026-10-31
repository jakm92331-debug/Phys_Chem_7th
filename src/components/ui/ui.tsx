import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, FlaskConical, Hourglass, Zap } from 'lucide-react'
import type { ContentStatus } from '@/types/content'
import type { LessonStatus } from '@/state/progress'
import './ui.css'

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'on-dark'

interface BtnBase {
  variant?: BtnVariant
  size?: 'md' | 'lg' | 'sm'
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  style,
}: BtnBase & { to: string }) {
  return (
    <Link to={to} className={`btn btn--${variant} btn--${size} ${className}`} style={style}>
      {children}
    </Link>
  )
}

export function ActionButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  style,
  ...rest
}: BtnBase & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} style={style} {...rest}>
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Progress bar                                                        */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  ratio,
  color,
  label,
  size = 'md',
}: {
  /** 0–1 */
  ratio: number
  color?: string
  label: string
  size?: 'sm' | 'md'
}) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
  return (
    <div
      className={`progress progress--${size}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="progress__fill"
        style={{ width: `${pct}%`, background: color ?? undefined }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chips & pills                                                       */
/* ------------------------------------------------------------------ */

export function XpPill({ xp }: { xp: number }) {
  return (
    <span className="xp-pill" title="نقاط الخبرة">
      <Zap size={15} aria-hidden="true" />
      <span className="num">{xp}</span>
      <span>نقطة خبرة</span>
    </span>
  )
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  'not-started': 'لم تبدأ بعد',
  'in-progress': 'قيد التعلّم',
  completed: 'مكتمل',
}

export function StatusChip({ status }: { status: LessonStatus }) {
  return <span className={`chip chip--${status}`}>{STATUS_LABEL[status]}</span>
}

/**
 * Editorial-source badge. This is how the platform stays honest about what
 * has been verified against the textbook and what has not.
 */
export function SourceBadge({ status }: { status: ContentStatus }) {
  if (status === 'textbook-verified') {
    return (
      <span className="chip chip--verified">
        <BookOpenCheck size={14} aria-hidden="true" /> محتوى مُتحقَّق من الكتاب
      </span>
    )
  }
  if (status === 'demo-supplementary') {
    return (
      <span className="chip chip--demo">
        <FlaskConical size={14} aria-hidden="true" /> محتوى توضيحي تجريبي
      </span>
    )
  }
  return (
    <span className="chip chip--pending">
      <Hourglass size={14} aria-hidden="true" /> بانتظار محتوى الكتاب
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  kicker,
  title,
  lead,
  align = 'start',
}: {
  kicker?: string
  title: string
  lead?: string
  align?: 'start' | 'center'
}) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      {kicker && <p className="section-heading__kicker">{kicker}</p>}
      <h2 className="section-heading__title">{title}</h2>
      {lead && <p className="section-heading__lead">{lead}</p>}
    </div>
  )
}
