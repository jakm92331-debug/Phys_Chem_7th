/**
 * Machine-checkable authoring standards for platform content.
 *
 * Two permanent rules (enforced by the guard tests in
 * `src/content-standards.test.ts` and `src/data/lessons/*.test.ts`):
 *
 *   1. Units are English-only standard symbols — never Arabic words
 *      («متر», «ثانية») and never Arabic abbreviations («م/ث», «كم/ساعة»).
 *   2. Mathematical expressions are authored as LaTeX and rendered with
 *      KaTeX (`$…$` inline, `$$…$$` display, `tex` field on formula blocks).
 *
 * This module is the single place where "what counts as an Arabic unit" is
 * defined, so a new lesson cannot silently reintroduce one: add the content,
 * run `npm test`, and the guard fails until the units are corrected.
 */

export interface UnitRule {
  id: string
  pattern: RegExp
  /** Human-readable instruction for whoever authored the offending string. */
  hint: string
}

/** A number (Latin or Arabic-Indic digits), e.g. `12`, `3.5`, `١٢`. */
const NUM = String.raw`[\p{N}]+(?:[.,][\p{N}]+)?`

/** Arabic unit words that must be replaced by their English symbol. */
const ARABIC_UNIT_WORDS = [
  'متراً',
  'متر',
  'أمتار',
  'كيلومترات',
  'كيلومتر',
  'سنتيمترات',
  'سنتيمتر',
  'مليمتر',
  'ثانيتين',
  'ثانية',
  'ثوانٍ',
  'ثوان',
  'دقائق',
  'دقيقة',
  'ساعات',
  'ساعة',
  'غرامات',
  'غرام',
  'كيلوغرام',
  'كجم',
  'كغم',
].join('|')

export const ARABIC_UNIT_RULES: UnitRule[] = [
  {
    id: 'metre-per-second',
    pattern: /م\s*\/\s*ث/u,
    hint: 'اكتب وحدة السرعة بالإنكليزية: m/s',
  },
  {
    id: 'kilometre-per-hour',
    pattern: /ك\s*م\s*\/\s*س(?:اعة)?/u,
    hint: 'اكتب وحدة السرعة بالإنكليزية: km/h',
  },
  {
    id: 'centimetre-per-second',
    pattern: /س\s*م\s*\/\s*ث/u,
    hint: 'اكتب وحدة السرعة بالإنكليزية: cm/s',
  },
  {
    id: 'word-per-word',
    pattern: /متر\s*\/?\s*ثانية|كيلومتر\s*\/?\s*ساعة|سنتيمتر\s*\/?\s*ثانية/u,
    hint: 'استعمل الرمز الإنكليزي: m/s أو km/h',
  },
  {
    id: 'arabic-celsius',
    pattern: /°\s*م/u,
    hint: 'اكتب درجة الحرارة بالإنكليزية: °C',
  },
  {
    id: 'quantity-with-arabic-unit',
    pattern: new RegExp(String.raw`${NUM}\s*(?:${ARABIC_UNIT_WORDS})(?![^\s<«"'(،؛:.]*\p{L})`, 'gu'),
    hint: 'استبدل اسم الوحدة العربي برمزه الإنكليزي (m، s، m/s، kg، …)',
  },
  {
    id: 'lone-arabic-unit-letter',
    // A single Arabic unit letter standing right after a numeral, a closed
    // tag/brace or a bracket, and NOT continuing a word — the classic
    // «…</span> م», «(م)», «${x} م» or «20 ث» abbreviation. Requiring the
    // letter to be word-final keeps ordinary words («كبيرة», «أثقال») safe.
    pattern: /(?:[\p{N}>»)\]}])\s*([مثكغ])(?![\p{L}])/gu,
    hint: 'استبدل اختصار الوحدة العربي برمزه الإنكليزي (m، s، kg، …)',
  },
]

export interface ArabicUnitOffence {
  rule: UnitRule
  /** The offending substring. */
  match: string
  index: number
}

/** Finds every Arabic unit usage in `text` (empty array ⇒ the text is clean). */
export function findArabicUnits(text: string): ArabicUnitOffence[] {
  const offences: ArabicUnitOffence[] = []
  for (const rule of ARABIC_UNIT_RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', '') + 'g')
    for (const match of text.matchAll(pattern)) {
      offences.push({ rule, match: match[0].trim(), index: match.index ?? 0 })
    }
  }
  return offences.sort((a, b) => a.index - b.index)
}

/** Convenience predicate used by the guard tests and by future linting. */
export function hasArabicUnits(text: string): boolean {
  return ARABIC_UNIT_RULES.some((rule) =>
    new RegExp(rule.pattern.source, rule.pattern.flags.replace('g', '')).test(text),
  )
}
