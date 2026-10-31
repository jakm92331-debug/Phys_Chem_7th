/**
 * Test helpers for the content standards.
 *
 * `MATH_PROBE` is a maths expression wrapped in `$…$`. If any content string
 * reaches the screen without going through `<RichText>`/`<Tex>`, the literal
 * `$` characters survive in the DOM — so "no `$` in the rendered text" is a
 * complete, field-by-field proof that no rendering path bypasses KaTeX.
 */

/** Prose + maths, so both halves of a field are exercised. */
export const MATH_PROBE = 'قيمة $v = \\frac{d}{t}$ هنا'

/**
 * Object keys that are identifiers, enums or LaTeX — never student-facing
 * copy, so they must not be replaced by the probe.
 */
const NON_COPY_KEYS = new Set([
  'entryId',
  'source',
  'labId',
  'kind',
  'variant',
  'id',
  'correctIndex',
  'difficulty',
  'tex', // already LaTeX, rendered by <Tex>
  'symbol', // legend symbol: LaTeX, rendered by <Tex>
  'unit', // legend unit: an English symbol by standard, never maths
])

/** Deep-replaces every student-facing string in a content object with maths. */
export function withMathEverywhere<T>(value: T, key?: string): T {
  if (typeof value === 'string') {
    return (key && NON_COPY_KEYS.has(key) ? value : MATH_PROBE) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => withMathEverywhere(item, key)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = withMathEverywhere(v, k)
    return out as unknown as T
  }
  return value
}
