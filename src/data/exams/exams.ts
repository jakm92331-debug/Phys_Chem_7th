import type { Exam } from '@/types/content'
import { demoExamLesson01 } from './demo-exam-01-motion-rest'
import { ALL_ENTRIES } from '@/data/curriculum'

/**
 * Exam registry.
 *
 * To register a real lesson exam once a lesson has been approved:
 * 1. Create a file in this folder exporting an `Exam` object.
 * 2. Register it here.
 * 3. Keep `source` honest (`textbook-verified` only after the exam has
 *    been matched to the textbook; otherwise `demo-supplementary`).
 *
 * UNIT-EXAM RULE (permanent workflow rule, also in docs/EXAM_WORKFLOW.md):
 * a unit exam is created ONLY when the user explicitly says the lesson just
 * added is the last lesson of that unit. Nothing here — or anywhere else —
 * infers the end of a unit from lesson order, numbering or any other
 * signal, and unit exams are never auto-created. They exist solely as
 * explicitly registered entries of `kind: 'unit'`.
 */
const EXAMS: Exam[] = [demoExamLesson01]

export function getExamById(id: string): Exam | undefined {
  return EXAMS.find((e) => e.id === id)
}

/** The active exam of a curriculum entry (a lesson exam, never a unit exam). */
export function getExamForEntry(entryId: string): Exam | undefined {
  return EXAMS.find((e) => e.entryId === entryId && e.status === 'active')
}

/**
 * Explicitly registered unit exams for a unit. Deliberately derived from
 * the registry only: because unit exams can never be auto-created, an empty
 * result here means exactly «no unit exam yet» — and the UI says so.
 */
export function getUnitExams(unitId: string): Exam[] {
  return EXAMS.filter((e) => e.kind === 'unit' && e.unitId === unitId && e.status === 'active')
}

/** All exams a student can see inside a unit: its lesson exams + its unit exam. */
export function examsForUnit(unitId: string): Exam[] {
  const lessonExams = EXAMS.filter(
    (e) =>
      e.kind === 'lesson' &&
      e.status === 'active' &&
      !!e.entryId &&
      entryBelongsToUnit(e.entryId, unitId),
  )
  return [...lessonExams, ...getUnitExams(unitId)]
}

function entryBelongsToUnit(entryId: string, unitId: string): boolean {
  return ALL_ENTRIES.some((e) => e.id === entryId && e.unitId === unitId)
}

/** Every registered exam in a stable order. */
export function allExams(): Exam[] {
  return [...EXAMS].sort((a, b) => a.id.localeCompare(b.id))
}

/** Every active exam (students only ever see active ones). */
export function allActiveExams(): Exam[] {
  return allExams().filter((e) => e.status === 'active')
}
