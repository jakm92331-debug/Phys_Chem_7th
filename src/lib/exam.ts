import type { Exam, ExamQuestion, ExamQuestionType } from '@/types/content'

/**
 * The exam engine — pure functions, fully unit-tested.
 *
 * Grading model:
 *   • `mcq` and `true-false` — exact match.
 *   • `calculation` — the answer is parsed for its leading number and
 *     compared with the expected value within a relative tolerance; when an
 *     expected unit symbol is declared, the answer must also contain it
 *     (a quantity without its unit is not a complete quantity).
 *   • open questions (`understanding`, `application`, `inference`) are NOT
 *     auto-graded: the platform stores a model answer and a rubric, reveals
 *     them in the review, and keeps them out of the auto-graded score. The
 *     review always states this explicitly — no fake precision.
 */

export interface ExamResponse {
  mcq?: number
  trueFalse?: boolean
  calculation?: string
  open?: string
}

export interface QuestionResult {
  questionId: string
  /** false for open questions — they are not auto-graded. */
  autoGraded: boolean
  /** null for open questions. */
  correct: boolean | null
  response: ExamResponse
}

export interface ExamResult {
  /** Correct ÷ auto-graded questions (0–1). Open questions excluded. */
  score01: number
  correctCount: number
  autoGradedCount: number
  openCount: number
  results: QuestionResult[]
}

export function isAutoGradable(type: ExamQuestionType): boolean {
  return type.kind !== 'open'
}

/** True when the student has entered anything for this question. */
export function isAnswered(q: ExamQuestion, r: ExamResponse | undefined): boolean {
  if (!r) return false
  switch (q.type.kind) {
    case 'mcq':
      return typeof r.mcq === 'number'
    case 'true-false':
      return typeof r.trueFalse === 'boolean'
    case 'calculation':
      return typeof r.calculation === 'string' && r.calculation.trim().length > 0
    case 'open':
      return typeof r.open === 'string' && r.open.trim().length > 0
  }
}

/** Extracts the leading number of an answer («12», «12 m/s», «0.5 كجم» → 12, 12, 0.5). */
export function extractNumber(text: string): number | null {
  const match = text
    .replace(/,/g, '')
    .match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

/** Case-insensitive, space-insensitive containment (so «12 m/s» matches «m/s»). */
function containsUnit(text: string, unit: string): boolean {
  const needle = unit.toLowerCase().replace(/\s+/g, '')
  const haystack = text.toLowerCase().replace(/\s+/g, '')
  return haystack.includes(needle)
}

export function gradeQuestion(
  q: ExamQuestion,
  r: ExamResponse | undefined,
): QuestionResult {
  switch (q.type.kind) {
    case 'mcq': {
      const correct = typeof r?.mcq === 'number' && r.mcq === q.correctIndex
      return { questionId: q.id, autoGraded: true, correct, response: r ?? {} }
    }
    case 'true-false': {
      const correct = typeof r?.trueFalse === 'boolean' && r.trueFalse === q.correct
      return { questionId: q.id, autoGraded: true, correct, response: r ?? {} }
    }
    case 'calculation': {
      const text = r?.calculation?.trim() ?? ''
      let correct = false
      if (text) {
        const value = extractNumber(text)
        if (value !== null && q.expectedValue !== undefined) {
          const tolerance = q.tolerance ?? 0.01
          const within =
            Math.abs(value - q.expectedValue) <=
            Math.max(tolerance * Math.abs(q.expectedValue), 1e-9)
          if (within) {
            correct = !q.expectedUnit || containsUnit(text, q.expectedUnit)
          }
        }
      }
      return { questionId: q.id, autoGraded: true, correct, response: r ?? {} }
    }
    case 'open':
      return { questionId: q.id, autoGraded: false, correct: null, response: r ?? {} }
  }
}

export function gradeExam(
  exam: Exam,
  responses: Record<string, ExamResponse>,
): ExamResult {
  const results = exam.questions.map((q) => gradeQuestion(q, responses[q.id]))
  const graded = results.filter((r) => r.autoGraded)
  const correctCount = graded.filter((r) => r.correct).length
  const openCount = results.length - graded.length
  return {
    score01: graded.length ? correctCount / graded.length : 0,
    correctCount,
    autoGradedCount: graded.length,
    openCount,
    results,
  }
}

/** Human-readable score line for the review. */
export function formatScore(result: ExamResult): string {
  if (result.autoGradedCount === 0) {
    return `${result.correctCount}/${result.autoGradedCount} — لا توجد أسئلة قابلة للتصحيح الآلي في هذا الاختبار`
  }
  return `${result.correctCount}/${result.autoGradedCount} = ${Math.round(result.score01 * 100)}٪`
}
