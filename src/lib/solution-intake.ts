/**
 * Solution intake (مستودع حلول المعلّم)
 * ======================================
 *
 * The teacher maintains one JSON document — `teacher-solutions.intake.json` —
 * that describes every textbook question of every lesson and its full
 * solution. This module is the client-side counterpart of the server-side
 * store: it parses and validates that document, generates the per-lesson
 * template (one slot per textbook question), and builds the final
 * `TeacherSolutionSet[]` that `scripts/build-teacher-solutions.mjs` writes
 * into the server's data file.
 *
 * The shape mirrors `TeacherSolution` in `@/types/content` exactly: every
 * solution carries the question prompt, the correct answer, the solution
 * steps, the laws used, the reasoning behind the chosen method, the
 * substitutions and units, and the textbook page reference. Nothing here is
 * bundled into the student-facing app — the app only ever consumes the
 * server-side store behind authentication.
 *
 * The intake document is intentionally plain JSON so it can be reviewed,
 * diffed and filled by the teacher without any tooling beyond a text editor.
 */

import { ALL_ENTRIES, getEntryById } from '@/data/curriculum'
import type { CurriculumEntry, TeacherSolution, TeacherSolutionSet } from '@/types/content'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Kind of a textbook question, matching the lesson question families. */
export type QuestionType = 'understanding' | 'exercise' | 'problem'

/**
 * One textbook question of one lesson. The first four fields describe the
 * question; the remaining fields carry the teacher's solution. An unfilled
 * slot has `filled: false` and null solution fields — the workflow never
 * invents answers, it only records what the teacher actually entered.
 */
export interface QuestionSlot {
  pageRef: number
  questionType: QuestionType
  prompt: string
  answer: string | null
  steps: string[]
  lawsUsed: string[]
  methodReasoning: string | null
  substitutions: string | null
  filled: boolean
}

/** A filled slot is a complete teacher solution for that question. */
export interface FilledSlot extends Omit<QuestionSlot, 'filled'> {
  filled: true
}

/** Per-lesson template produced by the intake workflow. */
export interface EntryIntakeTemplate {
  entryId: string
  entryTitle: string
  pageStart: number
  pages: number[]
  slots: QuestionSlot[]
}

/**
 * The whole intake document. `sets` is what the build script writes into
 * the server store; `updatedAt` is stamped by the build script.
 */
export interface SolutionIntakeData {
  version: 1
  updatedAt: string | null
  sets: TeacherSolutionSet[]
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] }

const QUESTION_TYPES: QuestionType[] = ['understanding', 'exercise', 'problem']
const SET_STATUSES = ['pending', 'textbook-verified']

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString) && value.length > 0
}

/**
 * Validates a single teacher solution. Mirrors the server-side structural
 * validation so intake errors surface before the build step.
 */
export function validateTeacherSolution(raw: unknown): ValidationResult<TeacherSolution> {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['الحل يجب أن يكون كائناً'] }
  }
  const s = raw as Record<string, unknown>
  if (!isString(s.id)) errors.push('معرّف الحل مطلوب')
  if (!isString(s.type)) errors.push('نوع السؤال مطلوب')
  if (s.type !== undefined && s.type !== 'understanding' && s.type !== 'exercise' && s.type !== 'problem') {
    errors.push('نوع السؤال يجب أن يكون understanding أو exercise أو problem')
  }
  if (typeof s.pageRef !== 'number' || !Number.isInteger(s.pageRef) || s.pageRef < 1) {
    errors.push('رقم الصفحة يجب أن يكون عدداً صحيحاً موجباً')
  }
  if (!isString(s.prompt)) errors.push('نص السؤال مطلوب')
  if (!isString(s.answer)) errors.push('الإجابة الصحيحة مطلوبة')
  if (!isNonEmptyStringArray(s.steps)) errors.push('خطوات الحل مطلوبة على الأقل خطوة واحدة')
  if (!isNonEmptyStringArray(s.lawsUsed)) errors.push('القوانين المستعملة مطلوبة على الأقل قانون واحد')
  if (!isString(s.methodReasoning)) errors.push('سبب اختيار الطريقة مطلوب')
  if (!isString(s.substitutions)) errors.push('التعويضات والوحدات مطلوبة')
  return errors.length === 0 ? { ok: true, value: s as unknown as TeacherSolution } : { ok: false, errors }
}

/** Validates one solution set (entry id must match the curriculum). */
export function validateSolutionSet(raw: unknown): ValidationResult<TeacherSolutionSet> {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['مجموعة الحلول يجب أن تكون كائناً'] }
  }
  const set = raw as Record<string, unknown>
  if (!isString(set.entryId)) {
    errors.push('معرّف الدرس مطلوب')
  } else if (!getEntryById(set.entryId)) {
    errors.push(`الدرس «${set.entryId}» غير موجود في المنهج`)
  }
  if (!isString(set.entryTitle)) errors.push('عنوان الدرس مطلوب')
  if (typeof set.pageStart !== 'number' || !Number.isInteger(set.pageStart)) {
    errors.push('صفحة البداية يجب أن تكون عدداً صحيحاً')
  }
  if (!Array.isArray(set.pages) || !set.pages.every((p: unknown) => typeof p === 'number' && Number.isInteger(p))) {
    errors.push('صفحات الكتاب يجب أن تكون أعداداً صحيحة')
  }
  if (!SET_STATUSES.includes(String(set.status))) {
    errors.push('حالة الدرس يجب أن تكون pending أو textbook-verified')
  }
  if (!Array.isArray(set.solutions)) {
    errors.push('الحلول يجب أن تكون مصفوفة')
  } else {
    set.solutions.forEach((sol: unknown, i: number) => {
      const res = validateTeacherSolution(sol)
      if (!res.ok) {
        res.errors.forEach((e) => errors.push(`الحل رقم ${i + 1}: ${e}`))
      }
    })
  }
  return errors.length === 0 ? { ok: true, value: set as unknown as TeacherSolutionSet } : { ok: false, errors }
}

/** Validates the whole intake document. */
export function parseIntakeData(raw: unknown): ValidationResult<SolutionIntakeData> {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['ملف القبول يجب أن يكون كائناً'] }
  }
  const doc = raw as Record<string, unknown>
  if (doc.version !== 1) errors.push('الإصدار يجب أن يكون 1')
  if (!Array.isArray(doc.sets)) {
    errors.push('مجموعات الحلول يجب أن تكون مصفوفة')
  } else {
    doc.sets.forEach((set: unknown, i: number) => {
      const res = validateSolutionSet(set)
      if (!res.ok) {
        res.errors.forEach((e) => errors.push(`المجموعة رقم ${i + 1}: ${e}`))
      }
    })
  }
  const sets = Array.isArray(doc.sets) ? (doc.sets as unknown[]).map((s) => validateSolutionSet(s)) : []
  const value: SolutionIntakeData = {
    version: 1,
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : null,
    sets: sets.filter((r) => r.ok).map((r) => r.ok && r.value),
  }
  return errors.length === 0 ? { ok: true, value } : { ok: false, errors }
}

/* ------------------------------------------------------------------ */
/* Per-lesson template workflow                                        */
/* ------------------------------------------------------------------ */

/**
 * Creates the intake template for one lesson: a slot per textbook question
 * the teacher will answer. The curriculum only fixes the page range of the
 * lesson, so the template lists one slot per page and one per question
 * family (أسئلة الفهم، التمارين، المسائل) — the teacher fills the prompt
 * and the solution, or deletes slots that do not exist in the book.
 *
 * Nothing is pre-filled: an unfilled slot has no answer, no steps and no
 * laws. Solutions are recorded only when the teacher enters them.
 */
export function createEntryTemplate(entry: CurriculumEntry): EntryIntakeTemplate {
  const pages = [entry.page]

  const slots: QuestionSlot[] = []
  for (const questionType of QUESTION_TYPES) {
    for (const pageRef of pages) {
      slots.push({
        pageRef,
        questionType,
        prompt: '',
        answer: null,
        steps: [],
        lawsUsed: [],
        methodReasoning: null,
        substitutions: null,
        filled: false,
      })
    }
  }
  return {
    entryId: entry.id,
    entryTitle: entry.title,
    pageStart: entry.page,
    pages,
    slots,
  }
}

/**
 * Builds the teacher solution set for one lesson from its filled slots.
 * Empty prompts are dropped. If nothing is filled, returns null (the lesson
 * has no teacher solutions yet).
 */
export function buildSolutionSet(
  entry: CurriculumEntry,
  slots: QuestionSlot[],
  status: TeacherSolutionSet['status'] = 'pending',
): TeacherSolutionSet | null {
  const solutions: TeacherSolution[] = []
  let filledCount = 0
  for (const slot of slots) {
    if (!slot.filled || !slot.prompt.trim()) continue
    filledCount += 1
    const sol = validateTeacherSolution({
      id: `${entry.id}-p${slot.pageRef}-${slot.questionType}`,
      type: slot.questionType,
      pageRef: slot.pageRef,
      prompt: slot.prompt,
      answer: slot.answer,
      steps: slot.steps,
      lawsUsed: slot.lawsUsed,
      methodReasoning: slot.methodReasoning,
      substitutions: slot.substitutions,
    })
    if (sol.ok) solutions.push(sol.value)
  }
  // A lesson enters the store only when at least one slot is filled —
  // empty lessons stay out entirely instead of registering as empty sets.
  if (filledCount === 0) return null
  return {
    entryId: entry.id,
    entryTitle: entry.title,
    pageStart: entry.page,
    pages: Array.from(new Set(slots.filter((s) => s.filled).map((s) => s.pageRef))).sort((a, b) => a - b),
    status,
    solutions,
  }
}

/** Full template for the whole curriculum, ready to be filled lesson by lesson. */
export function createIntakeTemplate(): EntryIntakeTemplate[] {
  return ALL_ENTRIES.map((entry) => createEntryTemplate(entry))
}

/* ------------------------------------------------------------------ */
/* Sample intake document (illustrative, not bundled into the app)     */
/* ------------------------------------------------------------------ */

/**
 * An illustrative sample of a filled intake document. It exists so the
 * structure is documented and the parser can be tested end to end; it is
 * NOT imported by any application code, so it never reaches the student
 * bundle. The lesson used here is the same one the lesson content already
 * illustrates (الحركة والسكون), and the content is clearly labeled
 * «توضيحي» — it is a formatting example, not a verified textbook solution.
 */
export const SAMPLE_INTAKE_DATA: SolutionIntakeData = {
  version: 1,
  updatedAt: null,
  sets: [
    {
      entryId: 'lesson-01-motion-rest',
      entryTitle: 'الحركة والسكون',
      pageStart: 3,
      pages: [3, 4, 5],
      status: 'pending',
      solutions: [
        {
          id: 'lesson-01-motion-rest-p4-exercise',
          type: 'exercise',
          pageRef: 4,
          prompt: 'نص السؤال التوضيحي (مثال بنية الحل فقط)',
          answer: 'الإجابة التوضيحية: $v = 5\\\\ \\\\mathrm{m/s}$',
          steps: ['الخطوة الأولى: تحويل الوحدات', 'الخطوة الثانية: استعمال قانون السرعة'],
          lawsUsed: ['$v = \\\\dfrac{d}{t}$'],
          methodReasoning:
            'استعملنا قانون السرعة المتوسطة لأنه يربط المسافة المستقيمة بالزمن عندما تكون السرعة ثابتة.',
          substitutions: '$d = v\\\\,t = 5\\\\ \\\\mathrm{m/s} \\\\times 10\\\\ \\\\mathrm{s} = 50\\\\ \\\\mathrm{m}$',
        },
      ],
    },
  ],
}
