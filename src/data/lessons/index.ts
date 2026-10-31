import type { LessonContent } from '@/types/content'
import { lesson01MotionRest } from './lesson-01-motion-rest'

/**
 * Lesson content registry.
 *
 * To add a new lesson once its textbook material is available:
 * 1. Create a file in this folder exporting a `LessonContent` object.
 * 2. Register it here under its curriculum entry id.
 * 3. Update the entry's `contentStatus` in `src/data/curriculum.ts`.
 *
 * Entries without registered content render an honest "awaiting textbook
 * content" state inside the reusable lesson shell.
 */
const LESSON_CONTENT: Record<string, LessonContent> = {
  [lesson01MotionRest.entryId]: lesson01MotionRest,
}

export function getLessonContent(entryId: string): LessonContent | undefined {
  return LESSON_CONTENT[entryId]
}

export function hasLessonContent(entryId: string): boolean {
  return entryId in LESSON_CONTENT
}

/**
 * Every lesson registered in `LESSON_CONTENT`, in a stable order.
 *
 * This is the single entry point for anything that must run over *all* lesson
 * content — most importantly the content-standard checks. Import a specific
 * lesson file only where that one lesson is genuinely the subject; iterating
 * lessons must always go through here, otherwise a newly registered lesson
 * would silently escape the standards.
 */
export function allLessonContent(): LessonContent[] {
  return Object.values(LESSON_CONTENT).sort((a, b) => a.entryId.localeCompare(b.entryId))
}
