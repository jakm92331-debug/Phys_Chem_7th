import { describe, expect, it } from 'vitest'
import {
  formatNumber,
  formatQuantity,
  isUnitSymbol,
  UNITS,
  unit,
  type UnitSymbol,
} from './units'
import { describeOffence, findArabicUnits, hasArabicUnits } from './content-standards'

const ARABIC_LETTER = /[؀-ۿ]/

describe('unit registry (English-only SI symbols)', () => {
  it('exposes the standard symbols the whole platform must use', () => {
    expect(UNITS.metre).toBe('m')
    expect(UNITS.second).toBe('s')
    expect(UNITS.metresPerSecond).toBe('m/s')
    expect(UNITS.metresPerSecondSquared).toBe('m/s²')
    expect(UNITS.kilogram).toBe('kg')
    expect(UNITS.newton).toBe('N')
    expect(UNITS.joule).toBe('J')
    expect(UNITS.watt).toBe('W')
    expect(UNITS.pascal).toBe('Pa')
    expect(UNITS.celsius).toBe('°C')
    expect(UNITS.kilometresPerHour).toBe('km/h')
  })

  it('never contains an Arabic character in any symbol', () => {
    for (const [key, symbol] of Object.entries(UNITS)) {
      expect(symbol, `unit "${key}" must be English`).not.toMatch(ARABIC_LETTER)
    }
  })

  it('resolves keys to symbols and recognises registered symbols only', () => {
    expect(unit('metresPerSecond')).toBe('m/s')
    expect(isUnitSymbol('m/s')).toBe(true)
    expect(isUnitSymbol('°C')).toBe(true)
    expect(isUnitSymbol('م/ث')).toBe(false)
    expect(isUnitSymbol('كم/ساعة')).toBe(false)
  })
})

describe('number & quantity formatting', () => {
  it('trims trailing zeros but keeps real decimals', () => {
    expect(formatNumber(12)).toBe('12')
    expect(formatNumber(12.04)).toBe('12')
    expect(formatNumber(12.5)).toBe('12.5')
    expect(formatNumber(7.253, 2)).toBe('7.25')
    expect(formatNumber(Number.NaN)).toBe('0')
  })

  it('joins the value with its English unit symbol', () => {
    expect(formatQuantity(5, 'metresPerSecond')).toBe('5 m/s')
    expect(formatQuantity(60, 'm')).toBe('60 m')
    expect(formatQuantity(20, UNITS.second)).toBe('20 s')
    expect(formatQuantity(2.5, 'metresPerSecondSquared')).toBe('2.5 m/s²')
  })

  it('produces strings with no Arabic unit', () => {
    for (const symbol of Object.values(UNITS) as UnitSymbol[]) {
      expect(hasArabicUnits(formatQuantity(3, symbol))).toBe(false)
    }
  })
})

describe('Arabic-unit detector: it catches what must be caught', () => {
  const flagged = (text: string) => findArabicUnits(text).length > 0

  it('catches abbreviations that are always wrong', () => {
    for (const text of [
      'سرعة السيارة 5 م/ث',
      'السرعة 72 كم/ساعة',
      'السرعة 90 كيلومتر/ساعة',
      'تسارع 2 متر/ثانية',
      'سرعة النملة 1 سنتيمتر/ثانية',
      'السرعة 3 سم/ث',
      'درجة الحرارة °م',
    ]) {
      expect(flagged(text), `يجب أن تُلتقط: ${text}`).toBe(true)
    }
  })

  it('catches a number followed by an Arabic unit name (singular, dual, plural)', () => {
    for (const text of [
      'المسافة 100 متر',
      'المسافة 100 متراً',
      'الطول 25 سنتيمتراً',
      'سمك الورقة 0.5 مليمتر',
      'سار 3 كيلومترات',
      'الكتلة 5 غرام',
      'كتلة الجسم 2 كيلوغرامات',
      'الحجم 2 لتر',
      'الزمن 20 ثانية',
      'بعد 5 ثوانٍ',
      'انتظر 10 دقائق',
      'رحلة 3 ساعات',
      'القوة 10 نيوتن',
      'الطاقة 30 جول',
      'الاستطاعة 60 واط',
      'الضغط 1000 باسكال',
      'التردد 50 هرتز',
      'الحرارة 25 درجة مئوية',
      'المساحة 3 أمتار مكعبة',
      'المسافة ٥ متر',
      'كتلته 3 كجم',
      'الطول 12 سم',
      'الحجم 250 مل',
    ]) {
      expect(flagged(text), `يجب أن تُلتقط: ${text}`).toBe(true)
    }
  })

  it('catches a unit name with NO number when the context marks a measurement', () => {
    for (const text of [
      'المسافة تُقاس بالمتر', // «بـ» = بوحدة
      'الزمن يُقاس بالثانية',
      'السرعة بوحدة الكيلومتر في الساعة',
      'وحدة قياس الطول هي المتر',
      'وحدة القياس: المتر',
      'المسافة وحدتها المتر',
      'المتر وحدة قياس الطول',
      'الحجم باللتر',
      'الكتلة بالكيلوغرام',
      'المسافة (متر)',
      'الزمن (ثانية)',
      'وحدة الحرارة الدرجة المئوية',
    ]) {
      expect(flagged(text), `يجب أن تُلتقط: ${text}`).toBe(true)
    }
  })

  it('catches a lone Arabic unit letter after a value or a tag', () => {
    for (const text of ['<span>12</span> م', '${x} م', 'الزمن 20 ث', '(م)']) {
      expect(flagged(text), `يجب أن تُلتقط: ${text}`).toBe(true)
    }
  })
})

describe('Arabic-unit detector: it stays quiet on ordinary Arabic', () => {
  it('accepts English symbols and measurement-free prose', () => {
    for (const text of [
      'سرعة السيارة 5 m/s',
      'المسافة 100 m والزمن 20 s',
      'درجة الحرارة °C',
      'كتلته 3 kg',
      'الطول 12 cm',
      'الحركة والسكون مفهومان نسبيان',
      'سيارة كبيرة تسير على طريق مستقيم',
      'رفع أثقال كبيرة بجهد صغير',
      'باسم الله الرحمن',
    ]) {
      expect(
        findArabicUnits(text),
        `يجب ألّا تُعتبر مخالفة: ${text}`,
      ).toEqual([])
      expect(hasArabicUnits(text)).toBe(false)
    }
  })

  it('does not mistake ordinals, clocks and adjectives for units', () => {
    for (const text of [
      'الدرس الأول من الوحدة الثانية',
      'الوحدة الثانية: الضغط ودافعة أرخميدس',
      'الوحدة الثالثة: المادة والحرارة',
      'الدرجة الثانية',
      'المرحلة الثانية من الدرس',
      'المرة الثانية',
      'عقرب الساعة يرسم دائرة',
      'طرف عقرب الدقائق في الساعة',
      'ملاحظة دقيقة وتفصيل واضح',
      'قصة حب وغرام',
      'النسبة المئوية للإنجاز',
      'تقدّمك في وحدة الحركة والتحريك',
    ]) {
      expect(
        findArabicUnits(text),
        `يجب ألّا تُعتبر مخالفة: ${text}`,
      ).toEqual([])
    }
  })

  it('reports every offence with an actionable Arabic hint', () => {
    const offences = findArabicUnits('المسافة تُقاس بالمتر')
    expect(offences.length).toBeGreaterThan(0)
    expect(offences[0].rule.hint).toMatch(/[؀-ۿ]/) // the hint is in Arabic
    expect(offences[0].rule.why).toBeTruthy()
    expect(describeOffence(offences[0])).toContain('بالمتر')
  })
})
