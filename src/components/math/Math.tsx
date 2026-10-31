import type { ReactNode } from 'react'
import { renderTex, splitMath } from '@/lib/tex'
import {
  formatNumber,
  isUnitSymbol,
  type UnitKey,
  type UnitSymbol,
  UNITS,
} from '@/lib/units'
import 'katex/dist/katex.min.css'
import './Math.css'

/**
 * The platform's maths & measurement components.
 *
 * Every mathematical expression in «أفق العلوم» — laws, formulas, fractions,
 * powers, roots, variables, substitutions, and the relations inside questions,
 * answers, solutions and labs — is rendered by KaTeX through these components:
 *
 *   <Tex tex="\bar{v}=\frac{d}{t}" />          inline maths
 *   <Tex tex="…" display />                    display (block) maths
 *   <RichText text="السرعة $5\ \mathrm{m/s}$" />  prose + inline maths
 *   <Measure value={12} unit="metresPerSecond" />  value + English unit symbol
 *
 * RTL: each box is `dir="ltr"` and bidi-isolated, so Arabic paragraphs keep
 * their direction while the maths keeps its own.
 */

function resolveSymbol(key: UnitKey | UnitSymbol): string {
  return isUnitSymbol(key) ? key : UNITS[key as UnitKey]
}

export function Tex({
  tex,
  display = false,
  className = '',
  label,
}: {
  /** LaTeX source. */
  tex: string
  /** Render as a centred block instead of inline. */
  display?: boolean
  className?: string
  /** Optional accessible description of the expression. */
  label?: string
}) {
  const { html, error } = renderTex(tex, display)
  const classes = ['math', display ? 'math--block' : 'math--inline', className]
    .filter(Boolean)
    .join(' ')

  // A broken expression must never blank out a lesson: show the source.
  if (error) {
    return (
      <span className={`${classes} math--error`} dir="ltr" data-tex-error="true" title={error}>
        {tex}
      </span>
    )
  }

  return (
    <span
      className={classes}
      dir="ltr"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** Display maths shortcut — centred block, scrolls on its own on small screens. */
export function BlockMath({ tex, className, label }: Omit<Parameters<typeof Tex>[0], 'display'>) {
  return <Tex tex={tex} display className={className} label={label} />
}

/**
 * Renders a string of Arabic prose that may contain `$…$` (inline) and
 * `$$…$$` (display) LaTeX. Strings without maths are returned untouched, so
 * plain text keeps its normal text nodes (and stays matchable in tests).
 */
export function RichText({
  text,
  className,
  as,
}: {
  text: string
  className?: string
  /** Element to wrap the result in; omit for a bare fragment. */
  as?: 'span' | 'p' | 'div' | 'li'
}) {
  const segments = splitMath(text)
  const isPlain = segments.every((s) => s.type === 'text')

  if (isPlain) {
    const content = segments.map((s) => s.value).join('')
    return as ? <Wrap as={as} className={className}>{content}</Wrap> : <>{content}</>
  }

  const content = segments.map((segment, i) =>
    segment.type === 'text' ? (
      <span key={i}>{segment.value}</span>
    ) : (
      <Tex key={i} tex={segment.value} display={segment.type === 'block'} />
    ),
  )

  return as ? (
    <Wrap as={as} className={className}>
      {content}
    </Wrap>
  ) : (
    <>{content}</>
  )
}

function Wrap({
  as,
  className,
  children,
}: {
  as: 'span' | 'p' | 'div' | 'li'
  className?: string
  children: ReactNode
}) {
  const Tag = as
  return <Tag className={className}>{children}</Tag>
}

/**
 * A measurement: the number and its ENGLISH unit symbol in one unbreakable,
 * bidi-isolated box. The `unit` prop is typed to the unit registry, so an
 * Arabic unit is a compile-time error, not a content bug.
 */
export function Measure({
  value,
  unit,
  digits = 1,
  className = '',
}: {
  value: number
  /** Registry key (`'metresPerSecond'`) or the symbol itself (`'m/s'`). */
  unit: UnitKey | UnitSymbol
  digits?: number
  className?: string
}) {
  const symbol = resolveSymbol(unit)
  return (
    <span className={`measure ${className}`.trim()}>
      <span className="num">{formatNumber(value, digits)}</span>{' '}
      <span className="measure__unit" dir="ltr">
        {symbol}
      </span>
    </span>
  )
}
