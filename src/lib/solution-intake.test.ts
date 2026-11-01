import { describe, expect, it } from 'vitest'
import {
  buildSolutionSet,
  createIntakeTemplate,
  parseIntakeData,
  SAMPLE_INTAKE_DATA,
  validateTeacherSolution,
} from './solution-intake'
import { ALL_ENTRIES, getEntryById } from '@/data/curriculum'

describe('solution-intake: template workflow', () => {
  it('creates a template for every curriculum entry with its page range', () => {
    const templates = createIntakeTemplate()
    expect(templates).toHaveLength(ALL_ENTRIES.length)
    for (const tpl of templates) {
      const entry = getEntryById(tpl.entryId)
      expect(entry).not.toBeUndefined()
      expect(tpl.pages).toEqual([entry!.page])
      // one slot per page per question family, all unfilled
      const expected = tpl.pages.length * 3
      expect(tpl.slots).toHaveLength(expected)
      expect(tpl.slots.every((s) => !s.filled)).toBe(true)
      expect(tpl.slots.every((s) => s.answer === null && s.steps.length === 0 && s.lawsUsed.length === 0)).toBe(true)
    }
  })
})

describe('solution-intake: building a solution set', () => {
  const entry = getEntryById('lesson-01-motion-rest')!

  const filledSlot = {
    pageRef: 4,
    questionType: 'exercise' as const,
    prompt: 'سؤال الكتاب',
    answer: 'الإجابة $5\\\\ \\\\mathrm{m/s}$',
    steps: ['الخطوة'],
    lawsUsed: ['$v = \\\\dfrac{d}{t}$'],
    methodReasoning: 'سبب',
    substitutions: 'تعويض',
    filled: true,
  }
  const emptySlot = { ...filledSlot, prompt: '  ', filled: false }

  it('returns null when nothing is filled', () => {
    expect(buildSolutionSet(entry, [emptySlot])).toBeNull()
  })

  it('builds a set with all required fields and page metadata', () => {
    const set = buildSolutionSet(entry, [filledSlot])
    expect(set).not.toBeNull()
    expect(set!.entryId).toBe(entry.id)
    expect(set!.entryTitle).toBe(entry.title)
    expect(set!.pages).toEqual([4])
    expect(set!.solutions).toHaveLength(1)
    const sol = set!.solutions[0]
    expect(sol.answer).toBe(filledSlot.answer)
    expect(sol.steps).toBe(filledSlot.steps)
    expect(sol.lawsUsed).toBe(filledSlot.lawsUsed)
    expect(sol.methodReasoning).toBe(filledSlot.methodReasoning)
    expect(sol.substitutions).toBe(filledSlot.substitutions)
    expect(sol.pageRef).toBe(4)
  })

  it('drops unfilled slots and skips empty prompts', () => {
    const set = buildSolutionSet(entry, [emptySlot, filledSlot])
    expect(set!.solutions).toHaveLength(1)
  })
})

describe('solution-intake: parser', () => {
  it('accepts the documented sample intake document', () => {
    const res = parseIntakeData(SAMPLE_INTAKE_DATA)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.version).toBe(1)
      expect(res.value.sets).toHaveLength(1)
      expect(res.value.sets[0].entryId).toBe('lesson-01-motion-rest')
    }
  })

  it('accepts an empty document (no solutions yet)', () => {
    const res = parseIntakeData({ version: 1, updatedAt: null, sets: [] })
    expect(res.ok).toBe(true)
  })

  it('rejects solutions missing required fields', () => {
    const bad = { ...SAMPLE_INTAKE_DATA.sets[0], solutions: [{ ...SAMPLE_INTAKE_DATA.sets[0].solutions[0], answer: '' }] }
    const res = parseIntakeData({ version: 1, updatedAt: null, sets: [bad] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/الإجابة/)
  })

  it('rejects unknown curriculum entries', () => {
    const bad = { ...SAMPLE_INTAKE_DATA.sets[0], entryId: 'not-in-curriculum' }
    const res = parseIntakeData({ version: 1, updatedAt: null, sets: [bad] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/غير موجود في المنهج/)
  })

  it('rejects wrong version and non-array sets', () => {
    expect(parseIntakeData({ version: 2, sets: [] }).ok).toBe(false)
    expect(parseIntakeData({ version: 1, sets: 'nope' }).ok).toBe(false)
  })
})

describe('solution-intake: single solution validation', () => {
  it('flags a solution without steps', () => {
    const res = validateTeacherSolution({ ...SAMPLE_INTAKE_DATA.sets[0].solutions[0], steps: [] })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toMatch(/خطوات/)
  })
})
