import { describe, expect, it } from 'vitest'
import {
  allActiveExams,
  allExams,
  examsForUnit,
  getExamById,
  getExamForEntry,
  getUnitExams,
} from './exams'
import { demoExamLesson01 } from './demo-exam-01-motion-rest'
import { ALL_ENTRIES, UNITS } from '@/data/curriculum'

describe('exam registry: lesson exams are linked to the right curriculum entry', () => {
  it('registers the demo exam under the curriculum entry it belongs to', () => {
    const exam = getExamForEntry('lesson-01-motion-rest')
    expect(exam).toBeDefined()
    expect(exam!.entryId).toBe('lesson-01-motion-rest')
    expect(exam!.kind).toBe('lesson')
    expect(exam!.source).toBe('demo-supplementary')
    // the entry really exists in the verified curriculum
    const entry = ALL_ENTRIES.find((e) => e.id === 'lesson-01-motion-rest')
    expect(entry).toBeDefined()
    expect(entry!.contentStatus).toBe('demo-supplementary')
  })

  it('gives every registered exam a unique id and an existing entry', () => {
    const ids = allExams().map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const exam of allExams()) {
      if (exam.kind === 'lesson') {
        expect(ALL_ENTRIES.some((e) => e.id === exam.entryId), exam.id).toBe(true)
      }
    }
  })

  it('labels the demo exam clearly as demonstration, never as textbook', () => {
    expect(demoExamLesson01.source).toBe('demo-supplementary')
    expect(demoExamLesson01.title).toMatch(/توضيحية/)
  })
})

describe('exam registry: the unit-exam rule', () => {
  it('creates no unit exam automatically', () => {
    // Unit exams exist only as explicitly registered `kind: 'unit'` entries.
    // Nothing in the registry (or anywhere else) infers the end of a unit
    // from lesson order, numbering or any other signal.
    for (const unit of UNITS) {
      expect(getUnitExams(unit.id), `وحدة ${unit.id}`).toEqual([])
    }
  })

  it('derives unit exam visibility from explicit registration only', () => {
    const unit1 = UNITS.find((u) => u.id === 'unit-1-motion')!
    // the demo lesson exam belongs to unit 1's entry, but no unit exam exists
    expect(examsForUnit(unit1.id)).toHaveLength(1)
    expect(examsForUnit(unit1.id)[0].kind).toBe('lesson')
    expect(getUnitExams(unit1.id)).toHaveLength(0)
  })

  it('never exposes draft exams to students', () => {
    const active = allActiveExams()
    expect(active.length).toBeGreaterThan(0)
    for (const exam of active) {
      expect(exam.status).toBe('active')
      expect(getExamById(exam.id)).toBeDefined()
    }
  })
})

describe('exam registry: the demo exam exercises every question type', () => {
  it('contains mcq, true-false, calculation and all three open categories', () => {
    const kinds = demoExamLesson01.questions.map((q) => q.type.kind)
    expect(kinds).toContain('mcq')
    expect(kinds).toContain('true-false')
    expect(kinds).toContain('calculation')
    expect(kinds.filter((k) => k === 'open')).toHaveLength(3)
    for (const q of demoExamLesson01.questions) {
      if (q.type.kind === 'mcq') {
        expect(q.choices).toBeDefined()
        expect(q.choices!.length).toBeGreaterThanOrEqual(2)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(q.choices!.length)
      }
      if (q.type.kind === 'true-false') {
        expect(typeof q.correct).toBe('boolean')
      }
      if (q.type.kind === 'calculation') {
        expect(q.expectedValue).toBeTypeOf('number')
      }
      if (q.type.kind === 'open') {
        expect(q.modelAnswer).toBeDefined()
        expect(q.rubric).toBeDefined()
      }
      // every question carries an explanation for the review
      expect(q.explanation.length).toBeGreaterThan(0)
    }
  })
})
