import { describe, expect, it } from 'vitest'
import { hasMath, renderTex, splitMath, texUnit } from './tex'

describe('splitMath', () => {
  it('keeps plain Arabic text as a single text segment', () => {
    expect(splitMath('السرعة المتوسطة مفهوم مهم')).toEqual([
      { type: 'text', value: 'السرعة المتوسطة مفهوم مهم' },
    ])
    expect(hasMath('السرعة المتوسطة مفهوم مهم')).toBe(false)
  })

  it('splits inline $…$ maths out of the Arabic prose', () => {
    const segments = splitMath('السرعة $v = 5\\ \\mathrm{m/s}$ كبيرة')
    expect(segments).toEqual([
      { type: 'text', value: 'السرعة ' },
      { type: 'inline', value: 'v = 5\\ \\mathrm{m/s}' },
      { type: 'text', value: ' كبيرة' },
    ])
    expect(hasMath('السرعة $v$ كبيرة')).toBe(true)
  })

  it('splits display $$…$$ blocks', () => {
    expect(splitMath('قانون السرعة $$\\bar{v}=\\frac{d}{t}$$ والسلام')).toEqual([
      { type: 'text', value: 'قانون السرعة ' },
      { type: 'block', value: '\\bar{v}=\\frac{d}{t}' },
      { type: 'text', value: ' والسلام' },
    ])
  })

  it('handles several expressions in one paragraph', () => {
    const segments = splitMath('عند $t = 2\\ \\mathrm{s}$ تصبح $d = 10\\ \\mathrm{m}$')
    expect(segments.filter((s) => s.type !== 'text')).toHaveLength(2)
    expect(segments.map((s) => s.type)).toEqual(['text', 'inline', 'text', 'inline'])
  })
})

describe('renderTex', () => {
  it('renders KaTeX markup for fractions, roots, powers and units', () => {
    for (const tex of [
      '\\bar{v} = \\dfrac{d}{t}',
      '\\sqrt{25} = 5',
      'v^2 = v_0^2 + 2 a d',
      '5\\ \\mathrm{m/s}',
      '\\frac{100\\ \\mathrm{m}}{20\\ \\mathrm{s}} = 5\\ \\mathrm{m/s}',
    ]) {
      const { html, error } = renderTex(tex)
      expect(error, `"${tex}" يجب أن يُعرض بلا خطأ`).toBeUndefined()
      expect(html).toContain('katex')
    }
  })

  it('renders display maths in block mode', () => {
    const inline = renderTex('\\frac{1}{2}')
    const block = renderTex('\\frac{1}{2}', true)
    expect(inline.html).not.toContain('katex-display')
    expect(block.html).toContain('katex-display')
  })

  it('preserves normal inline style and lets authors choose a display-sized fraction', () => {
    const simple = renderTex('v = d + t').html
    const fraction = renderTex('v = \\frac{d}{t}').html
    const largeFraction = renderTex('v = \\dfrac{d}{t}').html
    expect(simple).not.toContain('\\displaystyle')
    expect(fraction).not.toContain('\\displaystyle')
    expect(simple).toContain('v = d + t</annotation>')
    expect(fraction).toContain('<mfrac>')
    expect(largeFraction).toContain('<mfrac>')
    expect(fraction).not.toContain('displaystyle="true"')
    expect(largeFraction).toContain('displaystyle="true"')
  })

  it('ships MathML so screen readers can read the expression', () => {
    const { html } = renderTex('v = \\frac{d}{t}')
    expect(html).toContain('<math')
  })

  it('never throws — it reports the error and lets the UI show the source', () => {
    const { html, error } = renderTex('\\frac{')
    expect(html).toBe('')
    expect(error).toBeTruthy()
  })

  it('never turns maths into a link or script (trust disabled)', () => {
    const { html } = renderTex('\\href{javascript:alert(1)}{x}')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('href=')
    expect(html).not.toContain('<script')
    // The untrusted command is rendered as an error node, never as a link.
    expect(html).toContain('#cc0000')
  })
})

describe('texUnit', () => {
  it('keeps SI symbols upright and in English inside maths', () => {
    expect(texUnit('m/s')).toBe('\\mathrm{m/s}')
    expect(texUnit('°C')).toBe('\\mathrm{°C}')
  })
})
