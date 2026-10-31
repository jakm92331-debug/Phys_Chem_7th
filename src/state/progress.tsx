import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { BADGES } from '@/data/badges'
import type { LessonStageId } from '@/types/content'

/* ------------------------------------------------------------------ */
/* State shape                                                         */
/* ------------------------------------------------------------------ */

export type LessonStatus = 'not-started' | 'in-progress' | 'completed'

export interface LessonProgress {
  status: LessonStatus
  stagesDone: LessonStageId[]
  /** Best «اختبر نفسك» score, 0–1. */
  quizBestScore: number | null
  quizAttempts: number
  xpEarned: number
  lastVisitedAt: string | null
}

export interface ActivityEvent {
  id: string
  at: string
  label: string
  kind: 'stage' | 'quiz' | 'lab' | 'lesson' | 'badge'
}

export interface ProgressState {
  version: 1
  xp: number
  lessons: Record<string, LessonProgress>
  badges: string[]
  /** Badge ids earned since the last dismissal (drives the toast). */
  newBadges: string[]
  labMissions: string[]
  activity: ActivityEvent[]
  streak: { lastDay: string | null; count: number }
  /** One-time XP award keys — prevents XP farming by repetition. */
  awarded: string[]
}

export const EMPTY_LESSON: LessonProgress = {
  status: 'not-started',
  stagesDone: [],
  quizBestScore: null,
  quizAttempts: 0,
  xpEarned: 0,
  lastVisitedAt: null,
}

export const INITIAL_STATE: ProgressState = {
  version: 1,
  xp: 0,
  lessons: {},
  badges: [],
  newBadges: [],
  labMissions: [],
  activity: [],
  streak: { lastDay: null, count: 0 },
  awarded: [],
}

/* ------------------------------------------------------------------ */
/* XP economy — rewards are tied to meaningful learning actions only   */
/* ------------------------------------------------------------------ */

export const XP = {
  stage: 10,
  quizPass: 30,
  quizPerfectBonus: 20,
  lessonComplete: 50,
} as const

const LEVEL_TITLES = [
  'مستكشف مبتدئ',
  'باحث فضولي',
  'عالم صاعد',
  'مجرّب ماهر',
  'محلّل دقيق',
  'خبير مختبر',
  'نجم العلوم',
]

export const XP_PER_LEVEL = 150

export function levelForXp(xp: number): {
  level: number
  title: string
  xpIntoLevel: number
  xpForLevel: number
  ratio: number
} {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % XP_PER_LEVEL
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xpIntoLevel,
    xpForLevel: XP_PER_LEVEL,
    ratio: xpIntoLevel / XP_PER_LEVEL,
  }
}

/* ------------------------------------------------------------------ */
/* Badges — pure evaluation so the rules are unit-testable             */
/* ------------------------------------------------------------------ */

export function evaluateBadges(state: ProgressState): string[] {
  const earned = new Set(state.badges)
  const lessons = Object.values(state.lessons)
  const conditions: Record<string, boolean> = {
    'first-steps': lessons.some((l) => l.stagesDone.length > 0),
    'lab-explorer': state.labMissions.length >= 1,
    'lab-master': state.labMissions.length >= 3,
    'sharp-mind': lessons.some((l) => (l.quizBestScore ?? 0) >= 0.8),
    'first-lesson': lessons.some((l) => l.status === 'completed'),
    'xp-300': state.xp >= 300,
  }
  return BADGES.filter((b) => conditions[b.id] && !earned.has(b.id)).map((b) => b.id)
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'MARK_STAGE'; entryId: string; stageId: LessonStageId; requiredStages: LessonStageId[]; entryTitle: string }
  | { type: 'RECORD_QUIZ'; entryId: string; score: number; entryTitle: string }
  | { type: 'COMPLETE_MISSION'; missionId: string; entryId: string; xp: number; missionTitle: string }
  | { type: 'VISIT_LESSON'; entryId: string }
  | { type: 'DISMISS_BADGES' }
  | { type: 'RESET' }

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function touchStreak(state: ProgressState): ProgressState['streak'] {
  const today = todayKey()
  const { lastDay, count } = state.streak
  if (lastDay === today) return state.streak
  if (!lastDay) return { lastDay: today, count: 1 }
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  return { lastDay: today, count: lastDay === yesterday ? count + 1 : 1 }
}

function pushActivity(
  state: ProgressState,
  ev: Omit<ActivityEvent, 'id' | 'at'>,
): ActivityEvent[] {
  const next: ActivityEvent = {
    ...ev,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
  }
  return [next, ...state.activity].slice(0, 20)
}

/** Applies badge evaluation + streak touch after any meaningful change. */
function finalize(state: ProgressState): ProgressState {
  const fresh = evaluateBadges(state)
  let next = { ...state, streak: touchStreak(state) }
  if (fresh.length > 0) {
    next = {
      ...next,
      badges: [...next.badges, ...fresh],
      newBadges: [...next.newBadges, ...fresh],
    }
    for (const id of fresh) {
      const badge = BADGES.find((b) => b.id === id)
      if (badge) {
        next = { ...next, activity: pushActivity(next, { label: `حصلت على شارة «${badge.title}»`, kind: 'badge' }) }
      }
    }
  }
  return next
}

function awardXp(
  state: ProgressState,
  entryId: string,
  key: string,
  amount: number,
): { state: ProgressState; gained: number } {
  if (state.awarded.includes(key) || amount <= 0) return { state, gained: 0 }
  const lesson = state.lessons[entryId] ?? EMPTY_LESSON
  return {
    state: {
      ...state,
      xp: state.xp + amount,
      awarded: [...state.awarded, key],
      lessons: {
        ...state.lessons,
        [entryId]: { ...lesson, xpEarned: lesson.xpEarned + amount },
      },
    },
    gained: amount,
  }
}

export function progressReducer(state: ProgressState, action: Action): ProgressState {
  switch (action.type) {
    case 'RESET':
      return INITIAL_STATE

    case 'DISMISS_BADGES':
      return { ...state, newBadges: [] }

    case 'VISIT_LESSON': {
      const lesson = state.lessons[action.entryId] ?? EMPTY_LESSON
      return {
        ...state,
        lessons: {
          ...state.lessons,
          [action.entryId]: {
            ...lesson,
            status: lesson.status === 'not-started' ? 'in-progress' : lesson.status,
            lastVisitedAt: new Date().toISOString(),
          },
        },
      }
    }

    case 'MARK_STAGE': {
      const lesson = state.lessons[action.entryId] ?? EMPTY_LESSON
      if (lesson.stagesDone.includes(action.stageId)) return state
      const stagesDone = [...lesson.stagesDone, action.stageId]
      let next: ProgressState = {
        ...state,
        lessons: {
          ...state.lessons,
          [action.entryId]: {
            ...lesson,
            stagesDone,
            status: 'in-progress',
            lastVisitedAt: new Date().toISOString(),
          },
        },
      }
      next = awardXp(next, action.entryId, `stage:${action.entryId}:${action.stageId}`, XP.stage).state

      const complete = action.requiredStages.every((s) => stagesDone.includes(s))
      if (complete) {
        next = {
          ...next,
          lessons: {
            ...next.lessons,
            [action.entryId]: { ...next.lessons[action.entryId], status: 'completed' },
          },
          activity: pushActivity(next, { label: `أكملت درس «${action.entryTitle}» بالكامل`, kind: 'lesson' }),
        }
        next = awardXp(next, action.entryId, `lesson-complete:${action.entryId}`, XP.lessonComplete).state
      }
      return finalize(next)
    }

    case 'RECORD_QUIZ': {
      const lesson = state.lessons[action.entryId] ?? EMPTY_LESSON
      const best = Math.max(lesson.quizBestScore ?? 0, action.score)
      let next: ProgressState = {
        ...state,
        lessons: {
          ...state.lessons,
          [action.entryId]: {
            ...lesson,
            quizBestScore: best,
            quizAttempts: lesson.quizAttempts + 1,
            status: lesson.status === 'not-started' ? 'in-progress' : lesson.status,
            lastVisitedAt: new Date().toISOString(),
          },
        },
        activity: pushActivity(state, {
          label: `نتيجة اختبار «${action.entryTitle}»: ${Math.round(action.score * 100)}٪`,
          kind: 'quiz',
        }),
      }
      if (action.score >= 0.6) {
        next = awardXp(next, action.entryId, `quiz-pass:${action.entryId}`, XP.quizPass).state
      }
      if (action.score >= 1) {
        next = awardXp(next, action.entryId, `quiz-perfect:${action.entryId}`, XP.quizPerfectBonus).state
      }
      return finalize(next)
    }

    case 'COMPLETE_MISSION': {
      if (state.labMissions.includes(action.missionId)) return state
      let next: ProgressState = {
        ...state,
        labMissions: [...state.labMissions, action.missionId],
        activity: pushActivity(state, { label: `أنجزت مهمّة المختبر: ${action.missionTitle}`, kind: 'lab' }),
      }
      next = awardXp(next, action.entryId, `mission:${action.missionId}`, action.xp).state
      return finalize(next)
    }

    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export const STORAGE_KEY = 'ofuq-progress-v1'

export function loadProgress(storage: Storage | undefined): ProgressState {
  if (!storage) return INITIAL_STATE
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const parsed = JSON.parse(raw) as Partial<ProgressState>
    if (parsed.version !== 1) return INITIAL_STATE
    return { ...INITIAL_STATE, ...parsed }
  } catch {
    return INITIAL_STATE
  }
}

export function saveProgress(storage: Storage | undefined, state: ProgressState): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable — progress simply won't persist */
  }
}

/* ------------------------------------------------------------------ */
/* React context                                                       */
/* ------------------------------------------------------------------ */

interface ProgressApi {
  state: ProgressState
  getLesson: (entryId: string) => LessonProgress
  markStageDone: (
    entryId: string,
    stageId: LessonStageId,
    requiredStages: LessonStageId[],
    entryTitle: string,
  ) => void
  recordQuiz: (entryId: string, score01: number, entryTitle: string) => void
  completeMission: (missionId: string, entryId: string, xp: number, missionTitle: string) => void
  visitLesson: (entryId: string) => void
  dismissNewBadges: () => void
  resetAll: () => void
  completedCount: number
  inProgressCount: number
}

const ProgressContext = createContext<ProgressApi | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, undefined, () =>
    loadProgress(typeof window !== 'undefined' ? window.localStorage : undefined),
  )

  useEffect(() => {
    saveProgress(typeof window !== 'undefined' ? window.localStorage : undefined, state)
  }, [state])

  const api = useMemo<ProgressApi>(() => {
    const lessons = Object.values(state.lessons)
    return {
      state,
      getLesson: (entryId) => state.lessons[entryId] ?? EMPTY_LESSON,
      markStageDone: (entryId, stageId, requiredStages, entryTitle) =>
        dispatch({ type: 'MARK_STAGE', entryId, stageId, requiredStages, entryTitle }),
      recordQuiz: (entryId, score, entryTitle) =>
        dispatch({ type: 'RECORD_QUIZ', entryId, score, entryTitle }),
      completeMission: (missionId, entryId, xp, missionTitle) =>
        dispatch({ type: 'COMPLETE_MISSION', missionId, entryId, xp, missionTitle }),
      visitLesson: (entryId) => dispatch({ type: 'VISIT_LESSON', entryId }),
      dismissNewBadges: () => dispatch({ type: 'DISMISS_BADGES' }),
      resetAll: () => dispatch({ type: 'RESET' }),
      completedCount: lessons.filter((l) => l.status === 'completed').length,
      inProgressCount: lessons.filter((l) => l.status === 'in-progress').length,
    }
  }, [state])

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
