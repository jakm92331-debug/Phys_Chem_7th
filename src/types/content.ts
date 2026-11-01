/**
 * Content type system for the «أفق العلوم» platform.
 *
 * Design principle: curriculum structure (verified from the textbook table of
 * contents) is kept strictly separate from lesson *content*. Lesson content is
 * data-driven so the real textbook material can be plugged in later without
 * touching presentation components.
 */

/** Whether a curriculum entry is a regular lesson or a unit project. */
export type EntryKind = 'lesson' | 'project'

/**
 * Editorial status of the educational content attached to an entry.
 * - `textbook-verified`: reviewed against the official textbook.
 * - `demo-supplementary`: clearly-labelled demonstration / supplementary
 *   material that has NOT been verified against the textbook.
 * - `pending`: no content yet — waiting for the textbook material.
 */
export type ContentStatus = 'textbook-verified' | 'demo-supplementary' | 'pending'

export interface UnitTheme {
  /** Primary accent colour (hex). */
  primary: string
  /** Secondary accent colour used for gradients (hex). */
  secondary: string
  /** Soft tinted background derived from the primary colour (hex). */
  soft: string
  /** Lucide icon identifier used by the UI layer. */
  icon: 'motion' | 'fluid' | 'heat' | 'atom'
  /** Scientific motif rendered as decoration. */
  motif: 'trajectory' | 'waves' | 'particles' | 'orbit'
}

export interface CurriculumEntry {
  id: string
  /** Global order across the whole book (1–16). */
  order: number
  kind: EntryKind
  /** Arabic title exactly as printed in the table of contents. */
  title: string
  /** Page number in the printed textbook. */
  page: number
  unitId: string
  /** URL slug. */
  slug: string
  contentStatus: ContentStatus
  /** Short, neutral description of the topic area (not textbook text). */
  teaser: string
  estimatedMinutes: number
}

export interface Unit {
  id: string
  order: number
  /** Arabic unit title exactly as printed in the table of contents. */
  title: string
  /** Short editorial subtitle describing the unit's territory. */
  subtitle: string
  description: string
  theme: UnitTheme
  entries: CurriculumEntry[]
}

/** The seven reusable learning stages of every lesson. */
export type LessonStageId =
  | 'hook' // التهيئة والاستكشاف
  | 'discover' // اكتشف المفهوم
  | 'lab' // المختبر التفاعلي
  | 'check' // افهم وتحقق
  | 'apply' // طبّق ما تعلمت
  | 'quiz' // اختبر نفسك
  | 'summary' // ملخص الدرس

export interface StageMeta {
  id: LessonStageId
  title: string
  shortTitle: string
  description: string
}

/* ------------------------------------------------------------------ */
/* Rich content blocks used inside lesson stages                       */
/* ------------------------------------------------------------------ */

/**
 * Authoring standards for every content string on the platform:
 *
 * 1. UNITS ARE ENGLISH — always the standard scientific symbol (`m`, `s`,
 *    `m/s`, `m/s²`, `kg`, `N`, `J`, `W`, `Pa`, `°C`…). Never an Arabic unit
 *    word («متر», «ثانية») and never an Arabic abbreviation («م/ث»).
 *    The Arabic prose around them stays Arabic.
 * 2. MATHS IS LaTeX — any mathematical expression is written as LaTeX between
 *    `$…$` (inline) or `$$…$$` (display) and rendered with KaTeX by
 *    `<RichText>` / `<Tex>` (see `src/components/math/Math.tsx`).
 */

export type ContentBlock =
  | { kind: 'heading'; text: string }
  | {
      kind: 'text'
      text: string
      origin?: BlockOrigin
    }
  | {
      kind: 'definition'
      term: string
      text: string
      origin?: BlockOrigin
    }
  | {
      kind: 'callout'
      variant: 'idea' | 'question' | 'example' | 'warning'
      title?: string
      text: string
      origin?: BlockOrigin
    }
  | {
      kind: 'formula'
      /**
       * The law as LaTeX, rendered with KaTeX as a display block.
       * e.g. `'\\bar{v} = \\dfrac{d}{t}'` — never plain text, and never with
       * Arabic unit symbols (use `\mathrm{m/s}` for units inside maths).
       */
      tex: string
      /** Arabic explanation of the law (plain prose, may contain `$…$`). */
      caption?: string
      /** Symbol legend: `symbol` is LaTeX, `unit` is an English SI symbol. */
      symbols?: { symbol: string; meaning: string; unit?: string }[]
    }
  | {
      kind: 'list'
      items: string[]
      ordered?: boolean
      origin?: BlockOrigin
    }
  | {
      kind: 'compare'
      leftTitle: string
      rightTitle: string
      rows: { label: string; left: string; right: string }[]
      origin?: BlockOrigin
    }
  | {
      kind: 'steps'
      steps: { title: string; text: string }[]
      origin?: BlockOrigin
    }

/**
 * Provenance of a content block — the permanent separation between what the
 * platform *quotes from the textbook* and what the platform *adds as
 * educational enrichment*:
 *
 *   - `{ kind: 'textbook', page }` — text carried over from the textbook
 *     pages. `page` is REQUIRED (the book page the quote came from). These
 *     blocks render with an explicit «من الكتاب · صفحة N» tag.
 *   - `{ kind: 'enrichment' }` — explanations, examples, applications and
 *     simplifications written by the platform to help understanding. They
 *     must never be attributed to the book. Blocks without an `origin`
 *     field are treated as enrichment (the demo lessons are enrichment).
 *
 * The origin is machine-checked (see `src/lib/content-standards.ts` and the
 * guard test): a `textbook` origin without a page is a violation, and a
 * lesson whose editorial status is `demo-supplementary` may not claim any
 * textbook origin — because its content has not been verified against the
 * book.
 */
export type BlockOrigin =
  | { kind: 'textbook'; page: number }
  | { kind: 'enrichment' }

/**
 * A quiz item. `prompt`, `choices`, `explanation` and `misconception` are
 * rendered through `<RichText>`, so they may contain `$…$` LaTeX for any
 * formula, and every unit inside them must be an English SI symbol.
 */
export interface QuizQuestion {
  id: string
  prompt: string
  choices: string[]
  correctIndex: number
  /** Why the correct answer is correct. */
  explanation: string
  /** Targeted feedback addressing the most common misconception. */
  misconception?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface LabMission {
  id: string
  title: string
  description: string
  xp: number
}

/**
 * All lesson copy. Arabic prose, English units (`m/s`, `s`, …) and LaTeX maths
 * (`$…$`) — see the standards note above and `docs/CONTENT_STANDARDS.md`.
 */
export interface LessonContent {
  entryId: string
  source: ContentStatus
  /**
   * Declares that this lesson is quantitative and therefore must state at least
   * one law as a `formula` block (`tex`) with its symbol table.
   *
   * Optional on purpose: a descriptive lesson (types of paths, lab safety,
   * states of matter…) may legitimately teach no formula, and the standards
   * must not force one. When the flag is absent, every `formula` block that
   * *does* exist is still checked — only its presence is not required.
   */
  requiresLaw?: boolean
  hook: {
    question: string
    scenario: string
    challenge: string
  }
  /** Proposed learning goals — editorial, not quoted from the textbook. */
  objectives: string[]
  discover: ContentBlock[]
  /** Identifier of the interactive lab registered for this lesson. */
  labId?: string
  labGuide?: {
    intro: string
    missions: LabMission[]
  }
  checkQuestions: QuizQuestion[]
  apply: ContentBlock[]
  quiz: QuizQuestion[]
  summary: {
    keyIdeas: string[]
    vocabulary: { term: string; meaning: string }[]
    remember: string
  }
}

/* ------------------------------------------------------------------ */
/* Gamification                                                        */
/* ------------------------------------------------------------------ */

export interface Badge {
  id: string
  title: string
  description: string
  icon: 'rocket' | 'flask' | 'target' | 'compass' | 'award' | 'flame' | 'atom' | 'wave'
  /** Human-readable earning condition shown to the student. */
  condition: string
}

/* ------------------------------------------------------------------ */
/* Exams («الاختبارات»)                                               */
/* ------------------------------------------------------------------ */

/**
 * Question types supported by the exam system. The first three are
 * auto-graded; the three open-response categories (`understanding`,
 * `application`, `inference`) are NOT auto-graded: the platform stores a
 * model answer and a rubric, reveals them after submission for review, and
 * reports them separately from the auto-graded score.
 */
export type ExamQuestionType =
  | { kind: 'mcq' }
  | { kind: 'true-false' }
  | { kind: 'calculation' }
  | { kind: 'open'; category: 'understanding' | 'application' | 'inference' }

export interface ExamQuestion {
  id: string
  type: ExamQuestionType
  /** Rendered through `<RichText>` — may contain `$…$` LaTeX. Units English-only. */
  prompt: string
  /** For `mcq`: the choices. */
  choices?: string[]
  /** For `mcq`: index of the correct choice. */
  correctIndex?: number
  /** For `true-false`: the correct truth value. */
  correct?: boolean
  /** For `calculation`: the expected numerical value. */
  expectedValue?: number
  /** For `calculation`: relative tolerance (default 0.01 = 1%). */
  tolerance?: number
  /** For `calculation`: required unit symbol (English SI, e.g. `m/s`). */
  expectedUnit?: string
  /** For open questions: the model answer revealed after submission. */
  modelAnswer?: string
  /** For open questions: what a full-credit answer must include. */
  rubric?: string
  /** Why the correct answer is correct — shown in the review. */
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * An exam. `kind: 'lesson'` exams belong to exactly one curriculum entry
 * (the lesson they test). `kind: 'unit'` exams test a whole unit.
 *
 * UNIT-EXAM RULE (permanent workflow rule): a unit exam is created ONLY
 * when the user explicitly says the lesson just added is the LAST lesson of
 * that unit. The system never infers the end of a unit from lesson order,
 * numbering or any other signal, and never auto-creates unit exams. Unit
 * exams exist solely as explicitly registered entries in the exam registry.
 */
export interface Exam {
  id: string
  /** Curriculum entry id this exam belongs to (`kind: 'lesson'` only). */
  entryId: string
  kind: 'lesson' | 'unit'
  /** Unit id for `kind: 'unit'` exams. */
  unitId?: string
  title: string
  /** Editorial status — same honest labelling as lessons. */
  source: ContentStatus
  /** `draft` exams are hidden from students until approved. */
  status: 'draft' | 'active' | 'archived'
  questions: ExamQuestion[]
}

/** Per-student exam record kept inside the platform progress system. */
export interface ExamProgress {
  attempts: number
  /** Best score 0–1 over the auto-graded questions. */
  bestScore: number
  lastScore: number
  lastAt: string
}

/* ------------------------------------------------------------------ */
/* Teacher solutions («منطقة المعلّم»)                                 */
/* ------------------------------------------------------------------ */

export type SolutionQuestionType = 'book-question' | 'exercise' | 'problem'

/**
 * One solved question of a lesson, as prepared for the teacher area.
 *
 * NOTE: this data is stored server-side and served ONLY behind an
 * authenticated teacher session (see `server/` and `docs/TEACHER_AUTH.md`).
 * It must never be embedded in the client bundle or stored in a public
 * file the visitor can download.
 */
export interface TeacherSolution {
  id: string
  type: SolutionQuestionType
  /** Book page where the question appears. */
  pageRef: number
  /** The question, rendered through `<RichText>` (may contain `$…$`). */
  prompt: string
  /** The correct answer (may contain `$…$` LaTeX; units English-only). */
  answer: string
  /** Detailed solution steps, in order. */
  steps: string[]
  /** Laws and relations used, as LaTeX expressions. */
  lawsUsed: string[]
  /** Why this solution method was chosen (educational reasoning). */
  methodReasoning: string
  /** Units, substitutions and arithmetic shown step by step. */
  substitutions: string
}

/**
 * The full solution set of one curriculum entry, for the teacher area.
 * Stored server-side (`server/data/teacher-solutions.json`), never in the
 * client bundle.
 */
export interface TeacherSolutionSet {
  entryId: string
  entryTitle: string
  /** First book page of the entry (from the verified curriculum). */
  pageStart: number
  /** All book pages covered by the solutions of this entry. */
  pages: number[]
  status: ContentStatus
  solutions: TeacherSolution[]
}
