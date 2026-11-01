import type { BlockOrigin, ContentBlock, LessonContent } from '@/types/content'

/**
 * Machine-checkable authoring standards for platform content.
 *
 * Two permanent rules (enforced by the guard tests in
 * `src/content-standards.test.ts` and `src/data/lessons/*.test.ts`):
 *
 *   1. Units are English-only standard symbols — never Arabic names
 *      («متر», «ثانية»…) and never Arabic abbreviations («م/ث», «كم/ساعة»).
 *   2. Mathematical expressions are authored as LaTeX and rendered with
 *      KaTeX (`$…$` inline, `$$…$$` display, `tex` field on formula blocks).
 *
 * A third, structural rule: the permanent separation between textbook
 * content and educational enrichment (see `checkBlockOrigins` below and
 * `docs/CONTENT_STANDARDS.md`).
 *
 * This module is the single place where "what counts as an Arabic unit" is
 * defined, so a new lesson cannot silently reintroduce one: add the content,
 * run `npm test`, and the guard fails until the units are corrected.
 *
 * Detection strategy (precision first — a false alarm blocks a lesson):
 *   • Some forms are ALWAYS a unit (Arabic abbreviations such as «م/ث»).
 *   • A number before the word («20 ثانية») is a strong enough cue.
 *   • Without a number, the word is only reported when the context marks it
 *     as a measurement: a measurement cue («وحدة», «يُقاس», «قياس»…) or the
 *     “per/with” preposition («بالمتر», «بالثانية»).
 *   • Words that double as ordinary Arabic («الثانية» ordinal, «الساعة»
 *     clock, «دقيقة» “precise”) are never reported in their definite/ordinal
 *     form, so «الوحدة الثانية» and «عقرب الساعة» stay legal prose.
 */

export interface UnitRule {
  id: string
  pattern: RegExp
  /** Human-readable instruction for whoever authored the offending string. */
  hint: string
  /** Why the rule exists — surfaced in test output when it fires. */
  why: string
}

/* ------------------------------------------------------------------ */
/* Arabic word plumbing                                                */
/* ------------------------------------------------------------------ */

/** Arabic diacritics, tanween and tatweel that may trail a written word. */
const TAIL = '(?:اً|ًا|ا)?[\\u064B-\\u0652\\u0670\\u0640]*'

/** The word must end here — no letter or digit may follow it. */
const WORD_END = '(?![\\p{L}\\p{N}_])'

/** The word must start here. `\b` is useless for Arabic (`\w` is ASCII). */
const WORD_START = '(?<![\\p{L}\\p{N}_])'

/** A number in Latin or Arabic-Indic digits, e.g. `12`, `3.5`, `٥`. */
const NUM = '[\\p{N}]+(?:[.,][\\p{N}]+)?'

const group = (words: string[]) => `(?:${words.join('|')})`

/* ------------------------------------------------------------------ */
/* Unit vocabularies                                                   */
/* ------------------------------------------------------------------ */

/** Length — unambiguous in Arabic. */
const LENGTH_UNITS = [
  'متر', 'متران', 'مترين', 'مترات', 'أمتار',
  'سنتيمتر', 'سنتيمتران', 'سنتيمترات',
  'مليمتر', 'مليمترات',
  'كيلومتر', 'كيلومتران', 'كيلومترات',
]

/** Area / volume. */
const SPACE_UNITS = [
  'متر مربع', 'متر مكعب', 'أمتار مربعة', 'أمتار مكعبة',
  'سنتيمتر مربع', 'سنتيمتر مكعب', 'سنتيمترات مكعبة',
  'لتر', 'لتران', 'لترات', 'ملليلتر', 'ملليلترات',
]

/** Mass. */
const MASS_UNITS = [
  'غرام', 'غرامات', 'مليغرام', 'مليغرامات',
  'كيلوغرام', 'كيلوغرامان', 'كيلوغرامات',
  'طن', 'طنان', 'أطنان',
]

/** Units named after scientists / base units. */
const NAMED_UNITS = [
  'نيوتن', 'جول', 'واط', 'باسكال', 'هرتز',
  'أمبير', 'فولت', 'كلفن', 'مول',
  'درجة مئوية', 'الدرجة المئوية', 'درجات مئوية', 'الدرجات المئوية',
]

/**
 * Time units — these double as ordinary words («الثانية» ordinal,
 * «الساعة» clock, «دقيقة» “precise”), so they are handled separately and
 * never reported with the definite article.
 */
const TIME_UNITS = [
  'ثانية', 'ثانيتان', 'ثانيتين', 'ثوان', 'ثواني', 'ثوانٍ',
  'دقيقة', 'دقيقتان', 'دقيقتين', 'دقائق',
  'ساعة', 'ساعتان', 'ساعتين', 'ساعات',
]

/** Arabic abbreviations of unit names. */
const UNIT_ABBREVIATIONS = [
  'كجم', 'كغم', 'كغ', 'جم', 'سم', 'سم²', 'سم³', 'ملم', 'ملل', 'مل',
]

/** Units safe to report with the definite article («المتر»). */
const DEFINITE_SAFE_UNITS = [
  ...LENGTH_UNITS,
  ...SPACE_UNITS,
  ...MASS_UNITS,
  ...NAMED_UNITS,
]

/** Units that need extra care: only reported without the article. */
const BARE_ONLY_UNITS = [...TIME_UNITS]

const ALL_UNIT_WORDS = [...DEFINITE_SAFE_UNITS, ...BARE_ONLY_UNITS, ...UNIT_ABBREVIATIONS]
const CONTEXT_UNIT_WORDS = [...DEFINITE_SAFE_UNITS, ...UNIT_ABBREVIATIONS]

/** Words that mark the sentence as being about a measurement. */
const MEASURE_CUE =
  '(?:وحدة|وحدات|وحدت(?:ها|ه|هما|ك|نا|ي)?|القياس|قياس|يقاس|يُقاس|تُقاس|تقاس|مقاسة|بوحدة|كوحدة|لوحدة)'

export const ARABIC_UNIT_RULES: UnitRule[] = [
  {
    id: 'arabic-unit-symbol',
    pattern:
      /(?:م\s*\/\s*ث|ك\s*م\s*\/\s*س(?:اعة)?|س\s*م\s*\/\s*ث|متر\s*\/\s*ثانية|كيلومتر\s*\/\s*ساعة|سنتيمتر\s*\/\s*ثانية|°\s*م)/gu,
    hint: 'استعمل الرمز الإنكليزي: m/s أو km/h أو °C',
    why: 'اختصار عربي للوحدة — لا لُبس فيه',
  },
  {
    id: 'quantity-with-arabic-unit',
    pattern: new RegExp(
      `${WORD_START}${NUM}\\s*(?:ال)?${group(ALL_UNIT_WORDS)}${TAIL}${WORD_END}`,
      'gu',
    ),
    hint: 'استبدل اسم الوحدة العربي برمزه الإنكليزي (m، s، m/s، kg، …)',
    why: 'رقم متبوع باسم وحدة عربي',
  },
  {
    id: 'unit-after-measure-cue',
    pattern: new RegExp(
      `${MEASURE_CUE}[^.\\n؛]{0,40}?(?:ال)?${group(CONTEXT_UNIT_WORDS)}${TAIL}${WORD_END}`,
      'gu',
    ),
    hint: 'اسم وحدة عربي في سياق قياس — استعمل الرمز الإنكليزي',
    why: 'سياق القياس يدل على أن الكلمة وحدة',
  },
  {
    id: 'unit-before-measure-cue',
    // The unit word must not be a substring of a larger Arabic word:
    // «جم» (gram) inside «جميع», «سم» inside «سمع»… are false alarms.
    // (The same reasoning already guards the other rules via WORD_END.)
    pattern: new RegExp(
      `${WORD_START}(?:ال)?${group(CONTEXT_UNIT_WORDS)}${TAIL}(?![\\p{L}\\p{N}])` +
        `[^.\\n؛]{0,30}?(?:وحدة|وحدات|للقياس)`,
      'gu',
    ),
    hint: 'اسم وحدة عربي قبل كلمة «وحدة/للقياس» — استعمل الرمز الإنكليزي',
    why: 'الوحدة مذكورة صراحة بعد اسمها العربي',
  },
  {
    id: 'time-unit-after-measure-cue',
    pattern: new RegExp(
      `${MEASURE_CUE}[^.\\n؛]{0,40}?(?<!ال)${group(BARE_ONLY_UNITS)}${TAIL}${WORD_END}`,
      'gu',
    ),
    hint: 'وحدة زمن عربية في سياق قياس — استعمل الرمز الإنكليزي (s، min، h)',
    why: 'سياق القياس مع صيغة نكرة (لا ترتيب ولا ساعة)',
  },
  {
    id: 'unit-with-attached-preposition',
    // «بالمتر» / «بالثانية» / «بالمتر»… «بـ» هنا بمعنى «بوحدة/لكل»، وهو
    // أقوى قرينة على أن الكلمة وحدة قياس.
    pattern: new RegExp(
      `${WORD_START}ب(?:ال)?${group(ALL_UNIT_WORDS)}${TAIL}${WORD_END}`,
      'gu',
    ),
    hint: '«بـ» + اسم وحدة — استعمل الرمز الإنكليزي (m، s، kg، …)',
    why: 'حرف الجر «بـ» مع اسم وحدة عربي',
  },
  {
    id: 'unit-word-in-parentheses',
    // «المسافة (متر)», «الزمن (ثانية)» — a unit name written as a label.
    // Time units are again only reported without the article.
    pattern: new RegExp(
      `\\(\\s*(?:ال)?${group(CONTEXT_UNIT_WORDS)}${TAIL}\\s*\\)|\\(\\s*(?<!ال)${group(BARE_ONLY_UNITS)}${TAIL}\\s*\\)`,
      'gu',
    ),
    hint: 'اكتب رمز الوحدة الإنكليزي بين القوسين: (m)، (s)، (m/s)',
    why: 'اسم وحدة عربي مستعمل كتسمية بين قوسين',
  },
  {
    id: 'lone-arabic-unit-letter',
    // A single Arabic unit letter right after a numeral, tag, brace or
    // bracket, e.g. «…</span> م», «(م)», «${x} م», «20 ث» — and word-final,
    // so ordinary words («كبيرة», «أثقال», «(من») are never matched.
    pattern: /(?:[\p{N}(>»)\]}])\s*([مثكغ])(?![\p{L}])/gu,
    hint: 'استبدل اختصار الوحدة العربي برمزه الإنكليزي (m، s، kg، …)',
    why: 'حرف عربي مفرد يستعمل اختصاراً للوحدة',
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
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)
    for (const match of text.matchAll(pattern)) {
      offences.push({ rule, match: match[0].trim(), index: match.index ?? 0 })
    }
  }
  return offences.sort((a, b) => a.index - b.index)
}

/** Convenience predicate used by the guard tests. */
export function hasArabicUnits(text: string): boolean {
  return ARABIC_UNIT_RULES.some((rule) => new RegExp(rule.pattern.source, rule.pattern.flags).test(text))
}

/** Human-readable report — used by the guard test failure message. */
export function describeOffence(offence: ArabicUnitOffence): string {
  return `${offence.rule.id}: «${offence.match}» → ${offence.rule.hint} (${offence.rule.why})`
}

/* ------------------------------------------------------------------ */
/* Textbook vs enrichment separation                                    */
/* ------------------------------------------------------------------ */

export interface OriginViolation {
  /** Where the offending block sits. */
  block: string
  problem: string
}

/** Content-block kinds that can carry an `origin` field. */
const ORIGIN_BLOCK_KINDS = new Set<ContentBlock['kind']>([
  'text',
  'definition',
  'callout',
  'list',
  'compare',
  'steps',
])

/**
 * Checks the permanent separation between textbook content and educational
 * enrichment:
 *
 *   - a block claiming `{ kind: 'textbook' }` must carry a real page number
 *     (the book page the quote came from);
 *   - a lesson whose editorial status is `demo-supplementary` may not claim
 *     any textbook origin at all — its content is enrichment by construction
 *     and has not been verified against the book;
 *   - blocks without an `origin` field are enrichment (the default) and are
 *     never attributed to the book.
 */
export function checkBlockOrigins(content: LessonContent): OriginViolation[] {
  const violations: OriginViolation[] = []
  const blocks: ContentBlock[] = [...content.discover, ...content.apply]

  blocks.forEach((block, i) => {
    if (!ORIGIN_BLOCK_KINDS.has(block.kind)) return
    const origin: BlockOrigin | undefined = 'origin' in block ? block.origin : undefined
    if (!origin || origin.kind !== 'textbook') return

    const where = `${block.kind}#${i}`
    if (content.source === 'demo-supplementary') {
      violations.push({
        block: where,
        problem:
          'درس توضيحي لا يمكنه ادعاء نسبه إلى الكتاب (لم يُطابَق مع صفحات الكتاب)',
      })
    } else if (!Number.isInteger(origin.page) || origin.page < 1) {
      violations.push({
        block: where,
        problem: 'محتوى مُنسَب للكتاب بلا رقم صفحة موثَّق',
      })
    }
  })

  return violations
}
