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
