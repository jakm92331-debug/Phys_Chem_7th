import { describe, expect, it } from 'vitest'
import type { Exam, ExamQuestion } from '@/types/content'
import { demoExamLesson01 } from '@/data/exams/demo-exam-01-motion-rest'
import {
  extractNumber,
  formatScore,
  gradeExam,
  isAnswered,
  isAutoGradable,
} from './exam'

function makeExam(questions: Exam['questions']): Exam {
  return {
    id: 'test-exam',
    entryId: 'lesson-01-motion-rest',
    kind: 'lesson',
    title: 'Test exam',
    source: 'demo-supplementary',
    status: 'active',
    questions,
  }
}

describe('exam engine: mcq and true-false are exact-match graded', () => {
  it('grades mcq by the chosen index', () => {
    const exam = makeExam([
      {
        id: 'q1',
        type: { kind: 'mcq' },
        prompt: 'p',
        choices: ['a', 'b', 'c'],
        correctIndex: 2,
        explanation: 'e',
        difficulty: 'easy',
      },
    ])
    const good = gradeExam(exam, { q1: { mcq: 2 } })
    const bad = gradeExam(exam, { q1: { mcq: 0 } })
    const empty = gradeExam(exam, {})
    expect(good.score01).toBe(1)
    expect(bad.score01).toBe(0)
    expect(empty.score01).toBe(0)
  })

  it('grades true-false by the boolean', () => {
    const exam = makeExam([
      {
        id: 'q1',
        type: { kind: 'true-false' },
        prompt: 'p',
        correct: false,
        explanation: 'e',
        difficulty: 'easy',
      },
    ])
    expect(gradeExam(exam, { q1: { trueFalse: false } }).score01).toBe(1)
    expect(gradeExam(exam, { q1: { trueFalse: true } }).score01).toBe(0)
  })
})

describe('exam engine: calculation grading', () => {
  const calc: ExamQuestion = {
    id: 'q1',
    type: { kind: 'calculation' },
    prompt: 'p',
    expectedValue: 5,
    tolerance: 0.01,
    expectedUnit: 'm/s',
    explanation: 'e',
    difficulty: 'medium',
  }

  it('parses the leading number of the answer', () => {
    expect(extractNumber('12')).toBe(12)
    expect(extractNumber('12 m/s')).toBe(12)
    expect(extractNumber(' 0.5 ')).toBe(0.5)
    expect(extractNumber('الجواب 3.5 كجم')).toBe(3.5)
    expect(extractNumber('لا إجابة')).toBeNull()
  })

  it('accepts answers within the relative tolerance', () => {
    const exam = makeExam([calc])
    expect(gradeExam(exam, { q1: { calculation: '5 m/s' } }).score01).toBe(1)
    expect(gradeExam(exam, { q1: { calculation: '5.04 m/s' } }).score01).toBe(1)
    expect(gradeExam(exam, { q1: { calculation: '5.5 m/s' } }).score01).toBe(0)
  })

  it('requires the declared unit symbol in the answer', () => {
    const exam = makeExam([calc])
    expect(gradeExam(exam, { q1: { calculation: '5' } }).score01).toBe(0)
    expect(gradeExam(exam, { q1: { calculation: '5 km/h' } }).score01).toBe(0)
    expect(gradeExam(exam, { q1: { calculation: '5 m / s' } }).score01).toBe(1)
    expect(gradeExam(exam, { q1: { calculation: '5' } }).results[0].correct).toBe(false)
  })

  it('works without a declared unit', () => {
    const exam = makeExam([{ ...calc, expectedUnit: undefined }])
    expect(gradeExam(exam, { q1: { calculation: '5' } }).score01).toBe(1)
  })

  it('treats an unparseable answer as wrong, not as an error', () => {
    const exam = makeExam([calc])
    const r = gradeExam(exam, { q1: { calculation: 'غير مكتمل' } })
    expect(r.results[0].correct).toBe(false)
  })
})

describe('exam engine: open questions are never auto-graded', () => {
  const open: ExamQuestion = {
    id: 'q1',
    type: { kind: 'open', category: 'understanding' },
    prompt: 'p',
    modelAnswer: 'model',
    rubric: 'rubric',
    explanation: 'e',
    difficulty: 'hard',
  }

  it('excludes open questions from the score entirely', () => {
    const exam = makeExam([open])
    const r = gradeExam(exam, { q1: { open: 'any text' } })
    expect(r.autoGradedCount).toBe(0)
    expect(r.openCount).toBe(1)
    expect(r.score01).toBe(0)
    expect(formatScore(r)).toMatch(/لا توجد أسئلة قابلة للتصحيح الآلي/)
  })

  it('mixes graded and open questions: score is over the graded ones', () => {
    const exam = makeExam([
      {
        id: 'q1',
        type: { kind: 'mcq' },
        prompt: 'p',
        choices: ['a', 'b'],
        correctIndex: 0,
        explanation: 'e',
        difficulty: 'easy',
      },
      open,
    ])
    const r = gradeExam(exam, { q1: { mcq: 0 }, 'q2': { open: 'text' } } as never)
    expect(r.autoGradedCount).toBe(1)
    expect(r.score01).toBe(1)
  })

  it('flags open questions as not auto-graded', () => {
    expect(isAutoGradable(open.type)).toBe(false)
    expect(isAutoGradable({ kind: 'mcq' })).toBe(true)
    expect(isAutoGradable({ kind: 'calculation' })).toBe(true)
  })
})

describe('exam engine: answered-state and score formatting', () => {
  it('detects answered questions', () => {
    const exam = demoExamLesson01
    for (const q of exam.questions) {
      expect(isAnswered(q, undefined)).toBe(false)
    }
    const mcq = exam.questions.find((q) => q.type.kind === 'mcq')!
    expect(isAnswered(mcq, { mcq: 1 })).toBe(true)
    expect(isAnswered(mcq, { mcq: undefined })).toBe(false)
    const calc = exam.questions.find((q) => q.type.kind === 'calculation')!
    expect(isAnswered(calc, { calculation: '  ' })).toBe(false)
    expect(isAnswered(calc, { calculation: '5 m/s' })).toBe(true)
  })

  it('formats the score line', () => {
    const exam = demoExamLesson01
    const r = gradeExam(exam, {
      'ex1-mcq-1': { mcq: 1 },
      'ex1-tf-1': { trueFalse: false },
      'ex1-calc-1': { calculation: '5 m/s' },
    })
    expect(r.autoGradedCount).toBe(3)
    expect(r.score01).toBe(1)
    expect(formatScore(r)).toBe('3/3 = 100٪')
  })
})
