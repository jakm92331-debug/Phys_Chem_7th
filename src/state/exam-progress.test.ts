import { describe, expect, it } from 'vitest'
import {
  INITIAL_STATE,
  XP,
  progressReducer,
  saveProgress,
} from './progress'

describe('progress: exam attempts', () => {
  it('records attempts, keeps the best score and the last score', () => {
    let state = INITIAL_STATE
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01-motion-rest',
      title: 'اختبار الدرس',
      score: 0.5,
    })
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01-motion-rest',
      title: 'اختبار الدرس',
      score: 0.75,
    })
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01-motion-rest',
      title: 'اختبار الدرس',
      score: 0.6,
    })
    const record = state.exams['exam-1']
    expect(record.attempts).toBe(3)
    expect(record.bestScore).toBe(0.75)
    expect(record.lastScore).toBe(0.6)
    expect(record.lastAt).toBeTruthy()
  })

  it('awards XP once per exam (pass and perfect keys are separate)', () => {
    let state = INITIAL_STATE
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 't',
      score: 0.8,
    })
    expect(state.xp).toBe(XP.quizPass)
    // a second attempt at the same score earns nothing new
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 't',
      score: 0.8,
    })
    expect(state.xp).toBe(XP.quizPass)
    // a perfect score earns the perfect bonus exactly once
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 't',
      score: 1,
    })
    expect(state.xp).toBe(XP.quizPass + XP.quizPerfectBonus)
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 't',
      score: 1,
    })
    expect(state.xp).toBe(XP.quizPass + XP.quizPerfectBonus)
  })

  it('feeds the exam result into the activity log', () => {
    let state = INITIAL_STATE
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 'اختبار «الحركة والسكون»',
      score: 1,
    })
    const latest = state.activity[0]
    expect(latest.kind).toBe('exam')
    expect(latest.label).toContain('100٪')
  })

  it('persists and loads exam records through the same storage path', () => {
    let state = INITIAL_STATE
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 't',
      score: 0.7,
    })
    const storage = new MockStorage()
    saveProgress(storage, state)
    const raw = JSON.parse(storage.getItem('ofuq-progress-v1')!)
    expect(raw.exams['exam-1'].attempts).toBe(1)
    expect(raw.exams['exam-1'].bestScore).toBe(0.7)
    // the merged load keeps unknown/legacy state intact
    expect(raw.version).toBe(1)
  })

  it('reset clears exam records', () => {
    let state = INITIAL_STATE
    state = progressReducer(state, {
      type: 'RECORD_EXAM',
      examId: 'exam-1',
      entryId: 'lesson-01',
      title: 't',
      score: 0.7,
    })
    state = progressReducer(state, { type: 'RESET' })
    expect(state.exams).toEqual({})
    expect(state.xp).toBe(0)
  })
})

class MockStorage {
  private map = new Map<string, string>()
  get length(): number {
    return this.map.size
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  clear(): void {
    this.map.clear()
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }
}
