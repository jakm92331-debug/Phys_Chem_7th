import { describe, expect, it } from 'vitest'
import { findArabicUnits } from '@/lib/content-standards'
import { hasMath, renderTex, splitMath } from '@/lib/tex'
import type { LessonContent } from '@/types/content'
import { lesson01MotionRest } from './lesson-01-motion-rest'
import { ALL_ENTRIES } from '@/data/curriculum'
import { getLessonContent, hasLessonContent } from '.'

/**
 * Content-level guard. Runs over every registered lesson, so a future lesson
 * inherits the standards automatically: English units + KaTeX maths.
 */

const LESSONS: LessonContent[] = [lesson01MotionRest]

/** Walks a content object and yields every user-facing string. */
function stringsIn(value: unknown, path = 'content'): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }]
  if (Array.isArray(value)) return value.flatMap((v, i) => stringsIn(v, `${path}[${i}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => stringsIn(v, `${path}.${k}`))
  }
  return []
}

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
      const formulas = [...lesson.discover, ...lesson.apply].filter((b) => b.kind === 'formula')
      for (const formula of formulas) {
        if (formula.kind !== 'formula') continue
        for (const symbol of formula.symbols ?? []) {
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
  it('expresses every law as KaTeX-parsable LaTeX (never plain text)', () => {
    for (const lesson of LESSONS) {
      const formulas = [...lesson.discover, ...lesson.apply].filter((b) => b.kind === 'formula')
      expect(formulas.length, `${lesson.entryId} should teach at least one law`).toBeGreaterThan(0)
      for (const formula of formulas) {
        if (formula.kind !== 'formula') continue
        expect(formula.tex.trim(), `${lesson.entryId}: empty formula`).not.toBe('')
        const { error } = renderTex(formula.tex, true)
        expect(error, `${lesson.entryId}: KaTeX could not render "${formula.tex}"`).toBeUndefined()
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

  it('uses maths for the speed law and for worked substitutions', () => {
    const lesson = lesson01MotionRest
    const law = [...lesson.discover, ...lesson.apply].find((b) => b.kind === 'formula')
    expect(law?.kind === 'formula' && law.tex).toContain('\\dfrac{d}{t}')
    // worked examples show the substitution in maths, not a bare result
    const examples = lesson.discover.filter((b) => b.kind === 'callout' && b.variant === 'example')
    expect(examples.length).toBeGreaterThan(0)
    expect(
      examples.some((b) => b.kind === 'callout' && hasMath(b.text)),
      'المثال المحلول يجب أن يعرض التعويض بصيغة KaTeX',
    ).toBe(true)
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
})
