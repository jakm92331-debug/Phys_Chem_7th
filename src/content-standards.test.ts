import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findArabicUnits, hasArabicUnits } from '@/lib/content-standards'

/**
 * Repo-wide guard for the two permanent content standards:
 *   1. units are English SI symbols only — never Arabic words/abbreviations;
 *   2. maths is authored as LaTeX and rendered with KaTeX.
 *
 * Any new lesson, lab, question or screen that reintroduces an Arabic unit
 * (or drops KaTeX) fails here, before it reaches a student.
 */

const SRC = resolve(process.cwd(), 'src')

/** Files that only *define* the standard (they must quote the bad strings). */
const EXEMPT_FILES = new Set([
  resolve(SRC, 'lib/content-standards.ts'),
  resolve(SRC, 'content-standards.test.ts'),
])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = resolve(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    if (!/\.(ts|tsx)$/.test(name)) return []
    // Tests quote Arabic units on purpose to prove the detector works.
    if (/\.test\.tsx?$/.test(name)) return []
    return [full]
  })
}

/** Drops comments, so doc-comments that *document* a forbidden string pass. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('platform standard: English-only measurement units', () => {
  it('has no Arabic unit anywhere in the app source', () => {
    const offences: string[] = []
    for (const file of sourceFiles(SRC)) {
      if (EXEMPT_FILES.has(file)) continue
      const code = stripComments(readFileSync(file, 'utf8'))
      code.split('\n').forEach((line, i) => {
        for (const offence of findArabicUnits(line)) {
          offences.push(
            `${relative(process.cwd(), file)}:${i + 1} [${offence.rule.id}] «${offence.match}» → ${offence.rule.hint}`,
          )
        }
      })
    }
    expect(
      offences,
      `وحدات قياس عربية ممنوعة — استعمل الرموز الإنكليزية:\n${offences.join('\n')}`,
    ).toEqual([])
  })

  it('scans a real set of files (the guard must not silently pass)', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(20)
  })
})

describe('platform standard: KaTeX for mathematics', () => {
  it('ships KaTeX as a runtime dependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    expect(pkg.dependencies?.katex).toBeTruthy()
  })

  it('wires KaTeX in one shared place and ships its stylesheet', () => {
    const texLib = readFileSync(resolve(SRC, 'lib/tex.ts'), 'utf8')
    const mathComponent = readFileSync(resolve(SRC, 'components/math/Math.tsx'), 'utf8')
    // the single place where KaTeX is wired into the app …
    expect(texLib).toContain("import katex from 'katex'")
    expect(texLib).toContain('katex.renderToString')
    // … and its stylesheet is bundled by the shared component.
    expect(mathComponent).toContain("katex/dist/katex.min.css")
    expect(mathComponent).toContain("@/lib/tex")
  })
})

import type { LessonContent } from '@/types/content'
import { checkBlockOrigins } from '@/lib/content-standards'

describe('checkBlockOrigins: textbook content vs enrichment', () => {
  const base: LessonContent = {
    entryId: 'lesson-x',
    source: 'textbook-verified',
    hook: { question: 'q', scenario: 's', challenge: 'c' },
    objectives: [],
    discover: [],
    checkQuestions: [],
    apply: [],
    quiz: [],
    summary: { keyIdeas: [], vocabulary: [], remember: '' },
  }

  it('accepts a textbook block that carries its page number', () => {
    const content: LessonContent = {
      ...base,
      discover: [
        { kind: 'text', text: 'نصّ من الكتاب', origin: { kind: 'textbook', page: 12 } },
      ],
    }
    expect(checkBlockOrigins(content)).toEqual([])
  })

  it('rejects a textbook block without a page number', () => {
    const content: LessonContent = {
      ...base,
      discover: [{ kind: 'text', text: 'نصّ من الكتاب', origin: { kind: 'enrichment' } }],
      apply: [{ kind: 'text', text: 'بدون صفحة', origin: { kind: 'textbook' } as never }],
    }
    const violations = checkBlockOrigins(content)
    expect(violations.length).toBe(1)
    expect(violations[0].problem).toContain('رقم صفحة')
  })

  it('never lets a demonstration lesson claim textbook origin', () => {
    const content: LessonContent = {
      ...base,
      source: 'demo-supplementary',
      discover: [{ kind: 'text', text: 'إثراء', origin: { kind: 'textbook', page: 3 } }],
    }
    const violations = checkBlockOrigins(content)
    expect(violations.length).toBe(1)
    expect(violations[0].problem).toContain('توضيحي')
  })

  it('treats blocks without an origin as enrichment (no violation)', () => {
    const content: LessonContent = {
      ...base,
      discover: [{ kind: 'text', text: 'إثراء بلا وسم' }],
    }
    expect(checkBlockOrigins(content)).toEqual([])
  })
})

describe('detector precision: unit words inside larger Arabic words', () => {
  it('does not flag «جم» inside «جميع» before a measurement cue', () => {
    // regression: the abbreviation «جم» (gram) is a substring of «جميع»
    expect(hasArabicUnits('تضمّ جميع دروس وحدة الحركة والتحريك')).toBe(false)
  })

  it('still flags a real unit before a measurement cue', () => {
    expect(hasArabicUnits('المتر وحدة القياس الصحيحة')).toBe(true)
    expect(hasArabicUnits('الكيلوغرام وحدة قياس الكتلة')).toBe(true)
  })

  it('still flags an abbreviation as a unit when it stands alone', () => {
    expect(hasArabicUnits('(جم) وحدة القياس')).toBe(true)
    expect(hasArabicUnits('20 جم وحدة القياس')).toBe(true)
  })
})
