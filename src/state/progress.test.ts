import { describe, expect, it } from 'vitest'
import {
  INITIAL_STATE,
  STORAGE_KEY,
  XP,
  evaluateBadges,
  levelForXp,
  loadProgress,
  progressReducer,
  saveProgress,
  type ProgressState,
} from './progress'
import type { LessonStageId } from '@/types/content'

const ALL_STAGES: LessonStageId[] = [
  'hook',
  'discover',
  'lab',
  'check',
  'apply',
  'quiz',
  'summary',
]
const E = 'lesson-01-motion-rest'

function markStage(state: ProgressState, stageId: LessonStageId): ProgressState {
  return progressReducer(state, {
    type: 'MARK_STAGE',
    entryId: E,
    stageId,
    requiredStages: ALL_STAGES,
    entryTitle: 'الحركة والسكون',
  })
}

describe('progress reducer — XP integrity', () => {
  it('awards stage XP exactly once, even if dispatched repeatedly', () => {
    let s = markStage(INITIAL_STATE, 'hook')
    expect(s.xp).toBe(XP.stage)
    s = markStage(s, 'hook')
    s = markStage(s, 'hook')
    expect(s.xp).toBe(XP.stage)
    expect(s.lessons[E].stagesDone).toEqual(['hook'])
  })

  it('marks the lesson completed + bonus only when ALL stages are done', () => {
    let s = INITIAL_STATE
    for (const st of ALL_STAGES.slice(0, 6)) s = markStage(s, st)
    expect(s.lessons[E].status).toBe('in-progress')
    s = markStage(s, 'summary')
    expect(s.lessons[E].status).toBe('completed')
    expect(s.xp).toBe(ALL_STAGES.length * XP.stage + XP.lessonComplete)
  })

  it('awards quiz XP for passing once, and the perfect bonus once', () => {
    let s = progressReducer(INITIAL_STATE, {
      type: 'RECORD_QUIZ',
      entryId: E,
      score: 0.5, // fail — no XP
      entryTitle: 'الحركة والسكون',
    })
    expect(s.xp).toBe(0)
    expect(s.lessons[E].quizBestScore).toBe(0.5)

    s = progressReducer(s, { type: 'RECORD_QUIZ', entryId: E, score: 0.8, entryTitle: 'x' })
    expect(s.xp).toBe(XP.quizPass)

    s = progressReducer(s, { type: 'RECORD_QUIZ', entryId: E, score: 1, entryTitle: 'x' })
    expect(s.xp).toBe(XP.quizPass + XP.quizPerfectBonus)

    // repeating a perfect score must not farm more XP, but attempts still count
    s = progressReducer(s, { type: 'RECORD_QUIZ', entryId: E, score: 1, entryTitle: 'x' })
    expect(s.xp).toBe(XP.quizPass + XP.quizPerfectBonus)
    expect(s.lessons[E].quizAttempts).toBe(4)
    expect(s.lessons[E].quizBestScore).toBe(1)
  })

  it('awards lab mission XP once per mission', () => {
    let s = progressReducer(INITIAL_STATE, {
      type: 'COMPLETE_MISSION',
      missionId: 'motion-switch-frame',
      entryId: E,
      xp: 15,
      missionTitle: 'عيون أخرى',
    })
    expect(s.xp).toBe(15)
    s = progressReducer(s, {
      type: 'COMPLETE_MISSION',
      missionId: 'motion-switch-frame',
      entryId: E,
      xp: 15,
      missionTitle: 'عيون أخرى',
    })
    expect(s.xp).toBe(15)
    expect(s.labMissions).toEqual(['motion-switch-frame'])
  })

  it('starts a learning streak on first meaningful activity and logs activity', () => {
    const s = markStage(INITIAL_STATE, 'hook')
    expect(s.streak.count).toBe(1)
    expect(s.streak.lastDay).not.toBeNull()
    expect(s.activity.length).toBeGreaterThan(0)
  })

  it('RESET returns to a clean slate', () => {
    const s = markStage(INITIAL_STATE, 'hook')
    expect(progressReducer(s, { type: 'RESET' })).toEqual(INITIAL_STATE)
  })
})

describe('badge evaluation', () => {
  it('earns first-steps after any stage, lab badges by mission count', () => {
    let s = markStage(INITIAL_STATE, 'hook')
    expect(s.badges).toContain('first-steps')

    s = progressReducer(s, {
      type: 'COMPLETE_MISSION',
      missionId: 'm1',
      entryId: E,
      xp: 1,
      missionTitle: 'm1',
    })
    expect(s.badges).toContain('lab-explorer')
    expect(s.badges).not.toContain('lab-master')

    for (const id of ['m2', 'm3']) {
      s = progressReducer(s, {
        type: 'COMPLETE_MISSION',
        missionId: id,
        entryId: E,
        xp: 1,
        missionTitle: id,
      })
    }
    expect(s.badges).toContain('lab-master')
    // newly earned badges are queued for the toast exactly once
    expect(new Set(s.badges).size).toBe(s.badges.length)
  })

  it('earns sharp-mind at >=80% and first-lesson on completion', () => {
    let s = progressReducer(INITIAL_STATE, {
      type: 'RECORD_QUIZ',
      entryId: E,
      score: 0.83,
      entryTitle: 'x',
    })
    expect(s.badges).toContain('sharp-mind')

    for (const st of ALL_STAGES) s = markStage(s, st)
    expect(s.badges).toContain('first-lesson')
  })

  it('evaluateBadges never re-awards an owned badge', () => {
    const s = markStage(INITIAL_STATE, 'hook')
    expect(evaluateBadges(s)).not.toContain('first-steps')
  })
})

describe('levels', () => {
  it('maps XP to levels with 150 XP steps', () => {
    expect(levelForXp(0).level).toBe(1)
    expect(levelForXp(149).level).toBe(1)
    expect(levelForXp(150).level).toBe(2)
    expect(levelForXp(150).xpIntoLevel).toBe(0)
    expect(levelForXp(225).ratio).toBeCloseTo(0.5)
  })
})

describe('persistence', () => {
  function memoryStorage(): Storage {
    const map = new Map<string, string>()
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
      clear: () => map.clear(),
      key: (i) => [...map.keys()][i] ?? null,
      get length() {
        return map.size
      },
    }
  }

  it('round-trips state through storage', () => {
    const storage = memoryStorage()
    const s = markStage(INITIAL_STATE, 'hook')
    saveProgress(storage, s)
    expect(storage.getItem(STORAGE_KEY)).toBeTruthy()
    const loaded = loadProgress(storage)
    expect(loaded.xp).toBe(s.xp)
    expect(loaded.lessons[E].stagesDone).toEqual(['hook'])
  })

  it('falls back safely on corrupt or version-mismatched data', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadProgress(storage)).toEqual(INITIAL_STATE)
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, xp: 5000 }))
    expect(loadProgress(storage)).toEqual(INITIAL_STATE)
    expect(loadProgress(undefined)).toEqual(INITIAL_STATE)
  })
})
