/**
 * KaTeX plumbing for the whole platform.
 *
 * Every mathematical expression — laws, formulas, fractions, powers, roots,
 * variables, symbol substitutions and the relations inside questions, answers,
 * solutions and labs — is authored as LaTeX and rendered with KaTeX.
 *
 * Authoring convention (used by `<RichText>`):
 *   `$…$`    inline math, e.g. `سرعته $5\ \mathrm{m/s}$`
 *   `$$…$$`  display math (a centred block), e.g. `$$\bar{v}=\frac{d}{t}$$`
 *
 * The module is intentionally React-free so it can be unit-tested and reused
 * outside components (canvas labels, plain strings, tests).
 */

import katex from 'katex'

export type MathSegment =
  | { type: 'text'; value: string }
  | { type: 'inline'; value: string }
  | { type: 'block'; value: string }

export interface TexResult {
  /** Rendered KaTeX markup (empty when the expression could not be parsed). */
  html: string
  /** Parse error message, when KaTeX rejected the expression. */
  error?: string
}

/** KaTeX options shared by every render (kept in one place on purpose). */
const KATEX_OPTIONS = {
  // Surface mistakes instead of painting them red inside the page; <Tex>
  // degrades to the raw source, and the guard tests fail on it.
  throwOnError: true,
  // Do not let content escape the maths box (\href, \includegraphics, …).
  trust: false,
  // Unicode input (², °C, ÷ …) is fine; don't warn about non-strict commands.
  strict: 'ignore' as const,
  // Ships MathML next to the HTML so screen readers can read the expression.
  output: 'htmlAndMathml' as const,
}

/**
 * Renders a LaTeX expression to KaTeX HTML.
 * Never throws: on a parse error it returns an empty `html` plus the message.
 */
export function renderTex(tex: string, displayMode = false): TexResult {
  try {
    return {
      html: katex.renderToString(tex, { ...KATEX_OPTIONS, displayMode }),
    }
  } catch (error) {
    return {
      html: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * `$$…$$` (block) or `$…$` (inline). Blocks are matched first.
 * Built fresh on every call: a shared `/g` regex would carry `lastIndex`
 * between calls and silently drop matches.
 */
const mathPattern = () => /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

/**
 * Flattens a string to plain text for contexts that cannot render maths
 * (`aria-label`, `title`, canvas labels…): the delimiters disappear, the
 * expression stays as readable LaTeX. The visible copy still uses KaTeX.
 */
export function mathToPlainText(source: string): string {
  return splitMath(source)
    .map((segment) => segment.value)
    .join('')
}

/** True when the string contains at least one `$…$` / `$$…$$` expression. */
export function hasMath(source: string): boolean {
  return mathPattern().test(source)
}

/**
 * Splits prose into alternating text / math segments so Arabic text and
 * KaTeX expressions can be interleaved safely inside one paragraph.
 */
export function splitMath(source: string): MathSegment[] {
  const segments: MathSegment[] = []
  let cursor = 0
  for (const match of source.matchAll(mathPattern())) {
    const start = match.index ?? 0
    const [raw, block, inline] = match
    if (start > cursor) segments.push({ type: 'text', value: source.slice(cursor, start) })
    if (block !== undefined) segments.push({ type: 'block', value: block.trim() })
    else if (inline !== undefined) segments.push({ type: 'inline', value: inline.trim() })
    cursor = start + raw.length
  }
  if (cursor < source.length) segments.push({ type: 'text', value: source.slice(cursor) })
  return segments
}

/**
 * Renders the LaTeX inside a unit symbol for use *inside* math mode, e.g.
 * `5\ \mathrm{m/s}`. Keeps the Roman (upright) typography that SI symbols
 * require and leaves the symbol in English whatever the surrounding language.
 */
export function texUnit(symbol: string): string {
  return `\\mathrm{${symbol.replace(/([\\{}%$&^_#])/g, '\\$1')}}`
}
