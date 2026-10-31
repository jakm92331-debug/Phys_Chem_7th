import { describe, expect, it } from 'vitest'
import {
  formatNumber,
  formatQuantity,
  isUnitSymbol,
  UNITS,
  unit,
  type UnitSymbol,
} from './units'
import { findArabicUnits, hasArabicUnits } from './content-standards'

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

describe('Arabic-unit detector', () => {
  it('flags every Arabic unit form we must avoid', () => {
    expect(findArabicUnits('سرعة السيارة 5 م/ث')).not.toHaveLength(0)
    expect(findArabicUnits('السرعة 72 كم/ساعة')).not.toHaveLength(0)
    expect(findArabicUnits('وحدة القياس متر/ثانية')).not.toHaveLength(0)
    expect(findArabicUnits('درجة الحرارة °م')).not.toHaveLength(0)
    expect(findArabicUnits('قطع 100 متر')).not.toHaveLength(0)
    expect(findArabicUnits('استغرق 20 ثانية')).not.toHaveLength(0)
    expect(findArabicUnits('كتلته 3 كجم')).not.toHaveLength(0)
    expect(findArabicUnits('<span>12</span> م')).not.toHaveLength(0)
  })

  it('accepts English symbols and ordinary Arabic words', () => {
    for (const text of [
      'سرعة السيارة 5 m/s',
      'المسافة 100 m والزمن 20 s',
      'درجة الحرارة °C',
      'سيارة كبيرة تسير على طريق مستقيم',
      'أثقال كبيرة وجهد صغير',
      'عقرب الساعة يرسم دائرة',
      'الدرس الأول من الوحدة الثانية',
    ]) {
      expect(findArabicUnits(text), `"${text}" يجب أن يُقبل`).toEqual([])
      expect(hasArabicUnits(text)).toBe(false)
    }
  })
})
