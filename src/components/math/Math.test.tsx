import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockMath, Measure, RichText, Tex } from './Math'
import { findArabicUnits } from '@/lib/content-standards'

describe('<Tex> — KaTeX rendering', () => {
  it('renders inline maths with KaTeX, isolated as LTR inside the RTL page', () => {
    render(<Tex tex={'\\bar{v} = \\dfrac{d}{t}'} />)
    // the page itself is Arabic RTL …
    expect(document.documentElement.dir).toBe('rtl')
    const box = document.querySelector('.math--inline')!
    // … while the expression keeps its own LTR direction.
    expect(box.getAttribute('dir')).toBe('ltr')
    expect(box.querySelector('.katex')).not.toBeNull()
    expect(box.querySelector('.katex-mathml')).not.toBeNull()
    // the raw LaTeX source is not shown to the student
    expect(box.querySelector('.katex-html')?.textContent).not.toContain('\\')
  })

  it('renders display maths as a block that can scroll on its own', () => {
    render(<BlockMath tex={'v = \\frac{d}{t}'} />)
    const box = document.querySelector('.math--block')!
    expect(box.querySelector('.katex-display')).not.toBeNull()
    expect(box.getAttribute('dir')).toBe('ltr')
  })

  it('renders fractions, powers and roots as real maths, not plain text', () => {
    render(<Tex tex={'\\sqrt{v^2} = \\frac{d}{t}'} />)
    const box = document.querySelector('.math')!
    expect(box.querySelectorAll('.mord')).not.toHaveLength(0)
    expect(box.querySelector('.sqrt')).not.toBeNull()
    expect(box.querySelector('.mfrac')).not.toBeNull()
  })

  it('degrades to the source instead of crashing on a broken expression', () => {
    render(<Tex tex={'\\frac{'} />)
    const box = document.querySelector('.math--error')!
    expect(box.textContent).toBe('\\frac{')
  })
})

describe('<RichText> — Arabic prose with maths', () => {
  it('renders $…$ with KaTeX and keeps the Arabic around it', () => {
    const { container } = render(
      <RichText text="السرعة المتوسطة $v = 5\ \mathrm{m/s}$ والزمن $20\ \mathrm{s}$" />,
    )
    expect(container.querySelectorAll('.katex')).toHaveLength(2)
    expect(container.textContent).toContain('السرعة المتوسطة')
    expect(container.textContent).toContain('والزمن')
    // delimiters are consumed, never printed
    expect(container.textContent).not.toContain('$')
  })

  it('renders $$…$$ as a display block inside the prose', () => {
    const { container } = render(<RichText text="القانون $$\bar{v}=\frac{d}{t}$$ واضح" />)
    expect(container.querySelector('.math--block')).not.toBeNull()
  })

  it('leaves plain text as a plain text node (nothing is wrapped)', () => {
    const { container } = render(<RichText text="الحركة والسكون مفهومان نسبيان" />)
    expect(container.querySelector('.katex')).toBeNull()
    expect(container.textContent).toBe('الحركة والسكون مفهومان نسبيان')
  })

  it('keeps every unit English when maths and prose are mixed', () => {
    const { container } = render(
      <RichText text="قطع العدّاء $100\ \mathrm{m}$ في $20\ \mathrm{s}$" />,
    )
    expect(findArabicUnits(container.textContent ?? '')).toEqual([])
  })
})

describe('<Measure> — value + English unit symbol', () => {
  it('renders the number and its English symbol in one isolated box', () => {
    const { container } = render(<Measure value={12} unit="metresPerSecond" digits={0} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('m/s')).toBeInTheDocument()
    const unit = container.querySelector('.measure__unit')!
    expect(unit.getAttribute('dir')).toBe('ltr')
  })

  it('supports every standard symbol of the platform', () => {
    const cases: [Parameters<typeof Measure>[0]['unit'], string][] = [
      ['metre', 'm'],
      ['second', 's'],
      ['metresPerSecond', 'm/s'],
      ['metresPerSecondSquared', 'm/s²'],
      ['kilogram', 'kg'],
      ['newton', 'N'],
      ['joule', 'J'],
      ['watt', 'W'],
      ['pascal', 'Pa'],
      ['celsius', '°C'],
      ['kilometresPerHour', 'km/h'],
    ]
    for (const [unit, symbol] of cases) {
      const { unmount } = render(<Measure value={3} unit={unit} />)
      expect(screen.getByText(symbol)).toBeInTheDocument()
      unmount()
    }
  })

  it('formats decimals and never prints an Arabic unit', () => {
    const { container } = render(<Measure value={7.25} unit="metre" digits={2} />)
    expect(screen.getByText('7.25')).toBeInTheDocument()
    expect(screen.getByText('m')).toBeInTheDocument()
    expect(findArabicUnits(container.textContent ?? '')).toEqual([])
  })
})
