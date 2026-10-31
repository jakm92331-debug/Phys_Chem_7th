import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findArabicUnits } from '@/lib/content-standards'

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
