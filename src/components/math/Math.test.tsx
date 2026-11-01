import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
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
    const quantity = container.querySelector('.measure')!
    expect(quantity).toHaveAttribute('dir', 'ltr')
    expect(quantity).toHaveAccessibleName('12 m/s')
    expect(quantity.querySelector('.katex-html')?.textContent).toBe('12\u00a0m/s')
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
      const { unmount, container } = render(<Measure value={3} unit={unit} />)
      expect(container.querySelector('.measure')).toHaveAccessibleName(`3 ${symbol}`)
      expect(container.querySelector('.katex-html')?.textContent).toBe(`3\u00a0${symbol}`)
      unmount()
    }
  })

  it('formats decimals and never prints an Arabic unit', () => {
    const { container } = render(<Measure value={7.25} unit="metre" digits={2} />)
    expect(container.querySelector('.measure')).toHaveAccessibleName('7.25 m')
    expect(container.querySelector('.katex-html')?.textContent).toBe('7.25\u00a0m')
    expect(findArabicUnits(container.textContent ?? '')).toEqual([])
  })
})

describe('math and quantity regressions in RTL prose', () => {
  it('isolates plain quantities in Arabic, including compound units and decimals', () => {
    const { container } = render(<RichText as="p" text="قطع الجسم مسافة 20 m في زمن 5 s، السرعة المتوسطة 5 m/s ثم 10.2 s و81.4 m و8 m/s و25 °C." />)
    const p = container.querySelector('p')!
    expect(p.closest('html')).toHaveAttribute('dir', 'rtl')
    const boxes = [...p.querySelectorAll('.measure')]
    expect(boxes.map(box => box.getAttribute('aria-label'))).toEqual(['20 m', '5 s', '5 m/s', '10.2 s', '81.4 m', '8 m/s', '25 °C'])
    for (const box of boxes) {
      expect(box).toHaveAttribute('dir', 'ltr')
      expect(box.querySelector('.katex')).not.toBeNull()
    }
    expect(p.textContent).toContain('قطع الجسم مسافة')
    expect(p.textContent).toContain('السرعة المتوسطة')
  })

  it('keeps a substituted fraction and a compound fraction as MathML fractions', () => {
    const { container } = render(<><BlockMath tex={'v=\\frac{20\\ \\mathrm{m}}{5\\ \\mathrm{s}}=4\\ \\mathrm{m/s}'} /><Tex tex={'\\frac{a+b}{c+d}'} /></>)
    const boxes = [...container.querySelectorAll('.math')]
    expect(boxes).toHaveLength(2)
    for (const box of boxes) {
      expect(box).toHaveAttribute('dir', 'ltr')
      expect(box.querySelector('mfrac')?.children).toHaveLength(2)
      expect(box.querySelector('.katex-html .frac-line')).not.toBeNull()
    }
    expect(boxes[0].querySelector('mfrac')?.children[0].textContent).toContain('20')
    expect(boxes[0].querySelector('mfrac')?.children[1].textContent).toContain('5')
    expect(boxes[1].querySelector('mfrac')?.children[0].textContent).toBe('a+b')
    expect(boxes[1].querySelector('mfrac')?.children[1].textContent).toBe('c+d')
  })
})
