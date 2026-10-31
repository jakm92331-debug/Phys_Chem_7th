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
  | { kind: 'text'; text: string }
  | { kind: 'definition'; term: string; text: string }
  | {
      kind: 'callout'
      variant: 'idea' | 'question' | 'example' | 'warning'
      title?: string
      text: string
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
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | {
      kind: 'compare'
      leftTitle: string
      rightTitle: string
      rows: { label: string; left: string; right: string }[]
    }
  | { kind: 'steps'; steps: { title: string; text: string }[] }

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
