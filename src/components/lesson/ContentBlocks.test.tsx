import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContentBlocks } from './ContentBlocks'
import { findArabicUnits } from '@/lib/content-standards'
import type { ContentBlock } from '@/types/content'

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
