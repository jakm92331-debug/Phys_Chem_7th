import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LessonShell } from './LessonShell'
import { ProgressProvider } from '@/state/progress'
import { ALL_ENTRIES, LESSON_STAGES, getUnitForEntry } from '@/data/curriculum'
import { allLessonContent } from '@/data/lessons'
import { MATH_PROBE, withMathEverywhere } from '@/test/probe'
import type { LessonContent } from '@/types/content'

/**
 * The strongest guard of the standard: replace EVERY student-facing string of
 * every registered lesson with a maths probe, then walk all seven stages. Any
 * field that skips <RichText> leaves a literal `$` on screen — no exception,
 * no field and no lesson left behind.
 */

const LESSONS = allLessonContent()
expect(LESSONS.length, 'لا دروس مسجّلة في سجل المحتوى').toBeGreaterThan(0)

function renderShell(content: LessonContent) {
  const entry = ALL_ENTRIES.find((e) => e.id === content.entryId)!
  return render(
    <ProgressProvider>
      <MemoryRouter>
        <LessonShell entry={entry} unit={getUnitForEntry(entry)} content={content} />
      </MemoryRouter>
    </ProgressProvider>,
  )
}

describe('LessonShell: every stage renders content maths with KaTeX', () => {
  it.each(
    LESSONS.flatMap((lesson) =>
      LESSON_STAGES.map((s) => [lesson.entryId, s.id, s.title, lesson] as const),
    ),
  )('%s — stage "%s" renders its copy through KaTeX', async (_lessonId, _id, title, lesson) => {
    const user = userEvent.setup()
    renderShell(withMathEverywhere(lesson))

    await user.click(screen.getByRole('button', { name: new RegExp(title) }))
    const panel = document.querySelector('.stage-panel')!

    expect(panel.querySelectorAll('.katex').length).toBeGreaterThan(0)
    expect(panel.textContent).not.toContain('$')
    expect(panel.querySelectorAll('.math--error')).toHaveLength(0)
  })
})

describe('LessonShell: the real lesson copy', () => {
  it.each(LESSONS.map((l) => [l.entryId, l] as const))(
    '%s shows no raw maths delimiter in any stage',
    async (entryId, lesson) => {
      const user = userEvent.setup()
      renderShell(lesson)

      for (const stage of LESSON_STAGES) {
        await user.click(screen.getByRole('button', { name: new RegExp(stage.title) }))
        const panel = document.querySelector('.stage-panel')!
        expect(panel.textContent).not.toContain('$')
        expect(panel.querySelectorAll('.math--error')).toHaveLength(0)
      }
      expect(entryId).toBe(lesson.entryId)
    },
  )

  it.each(LESSONS.map((l) => [l.entryId, l] as const))(
    '%s never leaks the probe into the real copy',
    (_entryId, lesson) => {
      renderShell(lesson)
      expect(document.body.textContent).not.toContain(MATH_PROBE)
    },
  )
})
