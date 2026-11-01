import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findArabicUnits } from '@/lib/content-standards'
import { hasMath, renderTex, splitMath } from '@/lib/tex'
import type { ContentBlock, LessonContent } from '@/types/content'
import { ALL_ENTRIES } from '@/data/curriculum'
import { allLessonContent, getLessonContent, hasLessonContent } from '.'

/**
 * Content-level guard. It runs over **every lesson registered in
 * `src/data/lessons/index.ts`** (via `allLessonContent()`), so a future lesson
 * inherits the standards automatically: English units + KaTeX maths.
 */

/** This very test file, read back so it can police its own lesson source. */
const TEST_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/data/lessons/content-standards.test.ts'),
  'utf8',
)

/** Walks a content object and yields every user-facing string. */
function stringsIn(value: unknown, path = 'content'): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }]
  if (Array.isArray(value)) return value.flatMap((v, i) => stringsIn(v, `${path}[${i}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => stringsIn(v, `${path}.${k}`))
  }
  return []
}

/** Every `formula` (law) block of a lesson, wherever it sits in the lesson. */
function lawsOf(lesson: LessonContent): Extract<ContentBlock, { kind: 'formula' }>[] {
  return [...lesson.discover, ...lesson.apply].filter(
    (b): b is Extract<ContentBlock, { kind: 'formula' }> => b.kind === 'formula',
  )
}

const LESSONS = allLessonContent()

describe('lesson content: the checked set is the registry itself', () => {
  it('covers every lesson registered under a curriculum entry', () => {
    const registered = ALL_ENTRIES.filter((e) => hasLessonContent(e.id)).map(
      (e) => getLessonContent(e.id)!,
    )
    // the guard below is only meaningful while at least one lesson is registered
    expect(registered.length).toBeGreaterThan(0)
    expect(new Set(registered).size, 'السجل يحوي درساً مكرراً').toBe(registered.length)

    const covered = new Set(LESSONS)
    for (const lesson of registered) {
      expect(covered.has(lesson), `الدرس «${lesson.entryId}» غير مشمول بالفحص`).toBe(true)
    }
    // and nothing outside the registry is checked either
    expect(LESSONS.length).toBe(registered.length)
  })

  it('registers every lesson under the curriculum entry it belongs to', () => {
    for (const lesson of LESSONS) {
      const entry = ALL_ENTRIES.find((e) => e.id === lesson.entryId)
      expect(entry, `درس غير موجود في المنهج: ${lesson.entryId}`).toBeDefined()
      expect(getLessonContent(lesson.entryId), lesson.entryId).toBe(lesson)
      expect(hasLessonContent(lesson.entryId), lesson.entryId).toBe(true)
      expect(entry!.contentStatus, lesson.entryId).toBe(lesson.source)
    }
  })

  it('reads the lessons from the registry, not from a hard-coded list', () => {
    // Regression guard: if a lesson file is imported directly here, a lesson
    // added later to the registry would silently escape every check below.
    expect(TEST_SOURCE).not.toMatch(/from\s+['"]\.\/lesson-/)
    expect(TEST_SOURCE).toMatch(/allLessonContent\(\)/)
  })
})

describe('lesson content: English-only units', () => {
  it('has no Arabic unit in any lesson string', () => {
    const offences: string[] = []
    for (const lesson of LESSONS) {
      for (const { path, text } of stringsIn(lesson)) {
        for (const offence of findArabicUnits(text)) {
          offences.push(`${lesson.entryId} ${path} [${offence.rule.id}] «${offence.match}»`)
        }
      }
    }
    expect(offences, `وحدات عربية في محتوى الدروس:\n${offences.join('\n')}`).toEqual([])
  })

  it('states every formula unit as an English SI symbol', () => {
    for (const lesson of LESSONS) {
      for (const law of lawsOf(lesson)) {
        for (const symbol of law.symbols ?? []) {
          if (symbol.unit === undefined) continue
          expect(symbol.unit, `${lesson.entryId}: ${symbol.meaning}`).toMatch(
            /^(m|s|m\/s|m\/s²|km\/h|kg|g|N|J|W|Pa|°C|cm|mm|km|L|m²|m³|K|Hz|V|A)$/,
          )
        }
      }
    }
  })
})

describe('lesson content: mathematics is LaTeX rendered by KaTeX', () => {
  it('renders every law that a lesson states, without a KaTeX error', () => {
    for (const lesson of LESSONS) {
      for (const law of lawsOf(lesson)) {
        expect(law.tex.trim(), `${lesson.entryId}: قانون فارغ`).not.toBe('')
        const { error } = renderTex(law.tex, true)
        expect(error, `${lesson.entryId}: KaTeX could not render "${law.tex}"`).toBeUndefined()
      }
    }
  })

  it('requires a law only from lessons whose type declares one', () => {
    // A descriptive lesson may teach no formula at all; a quantitative lesson
    // (`requiresLaw`) must state at least one, and it must be an equation.
    for (const lesson of LESSONS) {
      const laws = lawsOf(lesson)
      if (!lesson.requiresLaw) continue
      expect(laws.length, `${lesson.entryId} يعلّم قانوناً كمّياً لكنه بلا صيغة`).toBeGreaterThan(0)
      for (const law of laws) {
        expect(law.tex, `${lesson.entryId}: القانون علاقة رياضية`).toContain('=')
        expect(law.symbols?.length ?? 0, `${lesson.entryId}: سجلّ الرموز`).toBeGreaterThan(0)
      }
    }
  })

  it('renders every $…$ expression in the copy without a KaTeX error', () => {
    const failures: string[] = []
    for (const lesson of LESSONS) {
      for (const { path, text } of stringsIn(lesson)) {
        if (!hasMath(text)) continue
        for (const segment of splitMath(text)) {
          if (segment.type === 'text') continue
          const { error } = renderTex(segment.value, segment.type === 'block')
          if (error) failures.push(`${lesson.entryId} ${path}: «${segment.value}» — ${error}`)
        }
      }
    }
    expect(failures, `تعبيرات رياضية غير صالحة:\n${failures.join('\n')}`).toEqual([])
  })

  it('states the law and the worked substitution in maths, not in plain text', () => {
    const quantitative = LESSONS.filter((lesson) => lesson.requiresLaw)
    expect(quantitative.length, 'لا درس كمّي مسجّل — تحقّق من السجل').toBeGreaterThan(0)

    for (const lesson of quantitative) {
      // the law itself is a KaTeX formula block…
      const law = lawsOf(lesson)[0]
      expect(law, `${lesson.entryId}: بلا قانون`).toBeDefined()
      expect(law.tex).toContain('=')

      // …and the worked example shows the substitution in maths too
      const examples = lesson.discover.filter((b) => b.kind === 'callout' && b.variant === 'example')
      expect(examples.length, `${lesson.entryId}: بلا مثال محلول`).toBeGreaterThan(0)
      expect(
        examples.some((b) => b.kind === 'callout' && hasMath(b.text)),
        'المثال المحلول يجب أن يعرض التعويض بصيغة KaTeX',
      ).toBe(true)
    }
  })
})

describe('lesson registry', () => {
  it('renders content only for entries that declare it', () => {
    for (const entry of ALL_ENTRIES) {
      if (hasLessonContent(entry.id)) {
        expect(getLessonContent(entry.id)?.entryId).toBe(entry.id)
      } else {
        expect(getLessonContent(entry.id)).toBeUndefined()
      }
    }
  })

  it('exposes a stable, non-empty list of lessons', () => {
    expect(allLessonContent().length).toBeGreaterThan(0)
    expect(allLessonContent().map((l) => l.entryId)).toEqual(
      [...allLessonContent().map((l) => l.entryId)].sort((a, b) => a.localeCompare(b)),
    )
  })
})


describe('lesson content: use vertical fractions for mathematical division', () => {
  it('rejects raw slash division in every registered law and LaTeX expression, while allowing compound units', () => {
    const failures: string[] = []
    for (const lesson of LESSONS) {
      const expressions = [
        ...lawsOf(lesson).map(law => law.tex),
        ...stringsIn(lesson).flatMap(({ text }) => splitMath(text).filter(segment => segment.type !== 'text').map(segment => segment.value)),
      ]
      for (const tex of expressions) {
        const withoutUnits = tex.replace(/\\(?:mathrm|text)\{[^{}]*\}/g, '')
        if (withoutUnits.includes('/')) failures.push(`${lesson.entryId}: ${tex}`)
      }
    }
    expect(failures).toEqual([])
  })
})

/** Plain prose division is also forbidden; compound SI unit slashes are not division. */
function hasPlainSlashDivision(text: string): boolean {
  const withoutUnits = text.replace(/(?<![A-Za-z])(km\/h|m\/s²|m\/s)(?![A-Za-z²])/g, '')
  return /[A-Za-z0-9)]\s*\/\s*[A-Za-z0-9(]/.test(withoutUnits)
}

describe('lesson content: no unmarked slash division in prose', () => {
  it('distinguishes division from compound units', () => {
    expect(hasPlainSlashDivision('v = d/t')).toBe(true)
    expect(hasPlainSlashDivision('20/5')).toBe(true)
    expect(hasPlainSlashDivision('5 m/s و 20 km/h')).toBe(false)
  })
  it('checks every registered lesson', () => {
    const failures: string[] = []
    for (const lesson of LESSONS) {
      for (const { path, text } of stringsIn(lesson)) {
        for (const segment of splitMath(text)) {
          if (segment.type === 'text' && hasPlainSlashDivision(segment.value)) failures.push(`${path}: ${segment.value}`)
        }
      }
    }
    expect(failures).toEqual([])
  })
})
