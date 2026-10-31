/**
 * Measurement units — the single source of truth for the platform.
 *
 * STANDARD (permanent, applies to every lesson, lab, question and screen):
 *   • Units are written in ENGLISH only, using standard scientific symbols.
 *   • Arabic unit words (متر، ثانية…) and Arabic abbreviations (م/ث، كم/ساعة…)
 *     are never used — see `src/lib/content-standards.ts` and its guard tests.
 *   • The surrounding UI stays Arabic RTL; only the symbols are English, and
 *     they are rendered inside `dir="ltr"` isolated boxes so they never
 *     disturb the direction of the Arabic sentence around them.
 *
 * Always read symbols from `UNITS` (or pass a `UnitKey` to the components in
 * `@/components/math/Math`) instead of typing them by hand: the types then
 * make an Arabic unit impossible to write by accident.
 */

export const UNITS = {
  /* ——— Length ——— */
  metre: 'm',
  centimetre: 'cm',
  millimetre: 'mm',
  kilometre: 'km',

  /* ——— Time ——— */
  second: 's',
  minute: 'min',
  hour: 'h',

  /* ——— Derived kinematics ——— */
  metresPerSecond: 'm/s',
  kilometresPerHour: 'km/h',
  metresPerSecondSquared: 'm/s²',

  /* ——— Area & volume ——— */
  squareMetre: 'm²',
  cubicMetre: 'm³',
  litre: 'L',

  /* ——— Mass ——— */
  kilogram: 'kg',
  gram: 'g',

  /* ——— Mechanics, energy, heat, electricity ——— */
  newton: 'N',
  joule: 'J',
  watt: 'W',
  pascal: 'Pa',
  celsius: '°C',
  kelvin: 'K',
  hertz: 'Hz',
  volt: 'V',
  ampere: 'A',
} as const

export type UnitKey = keyof typeof UNITS

/** Every unit symbol allowed on the platform (English only). */
export type UnitSymbol = (typeof UNITS)[UnitKey]

/** Returns the English symbol for a unit key, e.g. `unit('metresPerSecond')`. */
export function unit(key: UnitKey): UnitSymbol {
  return UNITS[key]
}

/** True when the given string is one of the registered English unit symbols. */
export function isUnitSymbol(value: string): value is UnitSymbol {
  return (Object.values(UNITS) as string[]).includes(value)
}

/**
 * Rounds a measurement for display: at most `digits` decimals (default 1),
 * with trailing zeros trimmed — `12.0` prints as `12`, `12.5` as `12.5`.
 */
export function formatNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0'
  const factor = 10 ** digits
  const rounded = Math.round(value * factor) / factor
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(digits)
}

/**
 * Formats a value *with* its English unit symbol for plain-text contexts
 * (canvas labels, aria-labels, plain strings): `formatQuantity(5, 'm/s')` →
 * `5 m/s`. Inside React trees prefer `<Measure value unit />`, which keeps the
 * numeral and the unit symbol in separate, direction-isolated spans.
 */
export function formatQuantity(
  value: number,
  unitSymbol: UnitKey | UnitSymbol,
  digits = 1,
): string {
  const symbol = (isUnitSymbol(unitSymbol) ? unitSymbol : UNITS[unitSymbol as UnitKey]) as string
  return symbol ? `${formatNumber(value, digits)} ${symbol}` : formatNumber(value, digits)
}
