import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContentBlocks } from './ContentBlocks'
import { findArabicUnits } from '@/lib/content-standards'
import type { ContentBlock } from '@/types/content'
import { allLessonContent } from '@/data/lessons'

function renderBlocks(blocks: ContentBlock[]) {
  return render(<ContentBlocks blocks={blocks} />)
}

describe('ContentBlocks: formulas are rendered with KaTeX', () => {
  const formula: ContentBlock = {
    kind: 'formula',
    tex: '\\bar{v} = \\dfrac{d}{t}',
    caption: 'السرعة المتوسطة = المسافة الكلية ÷ الزمن الكلي',
    symbols: [
      { symbol: '\\bar{v}', meaning: 'السرعة المتوسطة', unit: 'm/s' },
      { symbol: 'd', meaning: 'المسافة المقطوعة', unit: 'm' },
      { symbol: 't', meaning: 'الزمن المستغرق', unit: 's' },
    ],
  }

  it('renders the law as display maths, not plain text', () => {
    const { container } = renderBlocks([formula])
    const block = container.querySelector('.math--block')
    expect(block).not.toBeNull()
    expect(block?.querySelector('.katex-display')).not.toBeNull()
    expect(block?.getAttribute('dir')).toBe('ltr')
    // the LaTeX source itself is never shown (only echoed inside the MathML
    // annotation for assistive tech, which is hidden from the student).
    expect(block?.querySelector('.katex-html')?.textContent).not.toContain('\\')
  })

  it('lists the symbols with their English unit symbols', () => {
    renderBlocks([formula])
    const listed = [...document.querySelectorAll('.cb-formula__unit')].map((el) =>
      (el.textContent ?? '').replace(/[^\p{L}\p{N}/°²]/gu, ''),
    )
    expect(listed).toEqual(['m/s', 'm', 's'])
    expect(screen.getByText('السرعة المتوسطة')).toBeInTheDocument()
    // each symbol is typeset by KaTeX
    const symbolBoxes = document.querySelectorAll('.cb-formula__symbols .katex')
    expect(symbolBoxes.length).toBe(3)
  })

  it('keeps the Arabic caption and never leaks an Arabic unit', () => {
    const { container } = renderBlocks([formula])
    expect(container.textContent).toContain('السرعة المتوسطة = المسافة الكلية ÷ الزمن الكلي')
    expect(findArabicUnits(container.textContent ?? '')).toEqual([])
  })
})

describe('ContentBlocks: prose, callouts, lists and steps', () => {
  it('renders inline maths inside Arabic prose', () => {
    const { container } = renderBlocks([
      { kind: 'text', text: 'قطع العدّاء $100\\ \\mathrm{m}$ في $20\\ \\mathrm{s}$' },
    ])
    expect(container.querySelectorAll('.katex')).toHaveLength(2)
    expect(container.textContent).toContain('قطع العدّاء')
    expect(container.textContent).not.toContain('$')
  })

  it('renders maths in callouts, lists, steps and comparisons', () => {
    const { container } = renderBlocks([
      { kind: 'callout', variant: 'example', title: 'مثال', text: 'السرعة $5\\ \\mathrm{m/s}$' },
      { kind: 'list', items: ['المسافة $60\\ \\mathrm{m}$', 'الزمن $12\\ \\mathrm{s}$'] },
      { kind: 'steps', steps: [{ title: 'خطوة', text: 'احسب $v = \\dfrac{d}{t}$' }] },
      {
        kind: 'compare',
        leftTitle: 'يمين',
        rightTitle: 'يسار',
        rows: [{ label: 'السرعة', left: '$5\\ \\mathrm{m/s}$', right: '$0\\ \\mathrm{m/s}$' }],
      },
    ])
    // callout + 2 list items + step + 2 comparison cells
    expect(container.querySelectorAll('.katex').length).toBe(6)
  })

  it('leaves plain paragraphs untouched', () => {
    const { container } = renderBlocks([
      { kind: 'text', text: 'الحركة والسكون مفهومان نسبيان' },
    ])
    expect(container.querySelector('.katex')).toBeNull()
    expect(container.textContent).toBe('الحركة والسكون مفهومان نسبيان')
  })
})

/* ------------------------------------------------------------------ */
/* Every text field must be KaTeX-capable — including the short ones    */
/* (headings, terms, titles, cells) that used to bypass <RichText>.     */
/* ------------------------------------------------------------------ */

const MATH = 'قيمة $v = \\frac{d}{t}$ هنا'

interface FieldCase {
  name: string
  blocks: ContentBlock[]
  /** When the field is rendered inside an inline host, maths must stay inline. */
  inlineHost?: string
}

const FIELD_CASES: FieldCase[] = [
  { name: 'heading.text', blocks: [{ kind: 'heading', text: MATH }] },
  {
    name: 'definition.term',
    blocks: [{ kind: 'definition', term: MATH, text: 'شرح المصطلح' }],
    inlineHost: '.cb-definition__term',
  },
  { name: 'definition.text', blocks: [{ kind: 'definition', term: 'المصطلح', text: MATH }] },
  {
    name: 'callout.title',
    blocks: [{ kind: 'callout', variant: 'idea', title: MATH, text: 'نص التنبيه' }],
    inlineHost: '.cb-callout__title',
  },
  {
    name: 'callout.text',
    blocks: [{ kind: 'callout', variant: 'idea', title: 'عنوان', text: MATH }],
  },
  {
    name: 'formula.caption',
    blocks: [{ kind: 'formula', tex: '\\bar{v}=\\dfrac{d}{t}', caption: MATH }],
  },
  {
    name: 'formula.symbols.meaning',
    blocks: [
      {
        kind: 'formula',
        tex: '\\bar{v}=\\dfrac{d}{t}',
        symbols: [{ symbol: 'v', meaning: MATH, unit: 'm/s' }],
      },
    ],
    inlineHost: '.cb-formula__symbols li',
  },
  { name: 'list.items', blocks: [{ kind: 'list', items: [MATH, 'عنصر'] }] },
  {
    name: 'compare.leftTitle',
    blocks: [
      {
        kind: 'compare',
        leftTitle: MATH,
        rightTitle: 'يمين',
        rows: [{ label: 'وجه', left: 'أ', right: 'ب' }],
      },
    ],
    inlineHost: '.cb-compare__row--head span[role="columnheader"]:nth-of-type(2)',
  },
  {
    name: 'compare.rightTitle',
    blocks: [
      {
        kind: 'compare',
        leftTitle: 'يسار',
        rightTitle: MATH,
        rows: [{ label: 'وجه', left: 'أ', right: 'ب' }],
      },
    ],
    inlineHost: '.cb-compare__row--head span[role="columnheader"]:nth-of-type(3)',
  },
  {
    name: 'compare.row.label',
    blocks: [
      {
        kind: 'compare',
        leftTitle: 'يسار',
        rightTitle: 'يمين',
        rows: [{ label: MATH, left: 'أ', right: 'ب' }],
      },
    ],
    inlineHost: '.cb-compare__label',
  },
  {
    name: 'compare.row.cells',
    blocks: [
      {
        kind: 'compare',
        leftTitle: 'يسار',
        rightTitle: 'يمين',
        rows: [{ label: 'وجه', left: MATH, right: MATH }],
      },
    ],
    inlineHost: '.cb-compare__row:not(.cb-compare__row--head) span[role="cell"]',
  },
  {
    name: 'steps.title',
    blocks: [{ kind: 'steps', steps: [{ title: MATH, text: 'نص الخطوة' }] }],
    inlineHost: '.cb-step__title',
  },
  {
    name: 'steps.text',
    blocks: [{ kind: 'steps', steps: [{ title: 'الخطوة', text: MATH }] }],
  },
]

describe('every content field renders maths with KaTeX', () => {
  it.each(FIELD_CASES)('$name', ({ blocks, inlineHost }) => {
    const { container } = renderBlocks(blocks)
    // 1. the expression really is KaTeX…
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(0)
    // 2. …and nothing leaked through as plain text.
    expect(container.textContent).not.toContain('$')
    expect(container.querySelectorAll('.math--error')).toHaveLength(0)
    // 3. fields hosted by an inline element keep the maths inline.
    if (inlineHost) {
      const hosts = container.querySelectorAll(inlineHost)
      expect(hosts.length).toBeGreaterThan(0)
      for (const host of hosts) {
        expect(host.querySelectorAll('.katex').length).toBeGreaterThan(0)
        expect(host.querySelectorAll('.math--block')).toHaveLength(0)
      }
    }
  })

  it('keeps display maths as a block in block hosts (headings, paragraphs)', () => {
    const { container } = renderBlocks([{ kind: 'heading', text: 'قانون $$v=\\frac{d}{t}$$ هنا' }])
    expect(container.querySelectorAll('.math--block')).toHaveLength(1)
    expect(container.querySelector('.math--block')?.closest('h3')).not.toBeNull()
  })

  it('forces display maths inline inside inline hosts (terms, titles, cells)', () => {
    const { container } = renderBlocks([
      { kind: 'definition', term: 'المصطلح $$v=\\frac{d}{t}$$', text: 'شرح' },
    ])
    expect(container.querySelectorAll('.katex').length).toBe(1)
    expect(container.querySelectorAll('.math--block')).toHaveLength(0)
  })
})

describe('every registered lesson', () => {
  // Registry-driven: a lesson that appears in src/data/lessons/index.ts is
  // swept here automatically — nothing to update when one is added.
  const lessons = allLessonContent()
  expect(lessons.length).toBeGreaterThan(0)

  it.each(lessons.map((l) => [l.entryId, l] as const))(
    '%s renders without a single raw maths delimiter',
    (_entryId, lesson) => {
      renderBlocks([...lesson.discover, ...lesson.apply])
      expect(document.body.textContent).not.toContain('$')
      expect(document.querySelectorAll('.math--error')).toHaveLength(0)
    },
  )
})
