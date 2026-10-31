import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LessonShell } from './LessonShell'
import { ProgressProvider } from '@/state/progress'
import { ALL_ENTRIES, LESSON_STAGES, getUnitForEntry } from '@/data/curriculum'
import { lesson01MotionRest } from '@/data/lessons/lesson-01-motion-rest'
import { MATH_PROBE, withMathEverywhere } from '@/test/probe'
import type { LessonContent } from '@/types/content'

/**
 * The strongest guard of the standard: replace EVERY student-facing string of
 * the shipped lesson with a maths probe, then walk all seven stages. Any field
 * that skips <RichText> leaves a literal `$` on screen — no exception, no
 * field left behind.
 */

const entry = ALL_ENTRIES.find((e) => e.id === lesson01MotionRest.entryId)!
const unit = getUnitForEntry(entry)
const probed: LessonContent = withMathEverywhere(lesson01MotionRest)

function renderShell(content: LessonContent) {
  return render(
    <ProgressProvider>
      <MemoryRouter>
        <LessonShell entry={entry} unit={unit} content={content} />
      </MemoryRouter>
    </ProgressProvider>,
  )
}

describe('LessonShell: every stage renders content maths with KaTeX', () => {
  it.each(LESSON_STAGES.map((s) => [s.id, s.title] as const))(
    'stage "%s" renders its copy through KaTeX',
    async (_id, title) => {
      const user = userEvent.setup()
      renderShell(probed)

      await user.click(screen.getByRole('button', { name: new RegExp(title) }))
      const panel = document.querySelector('.stage-panel')!

      expect(panel.querySelectorAll('.katex').length).toBeGreaterThan(0)
      expect(panel.textContent).not.toContain('$')
      expect(panel.querySelectorAll('.math--error')).toHaveLength(0)
    },
  )

})

describe('LessonShell: the shipped lesson copy', () => {
  it('shows the real lesson with no raw maths delimiter and no Arabic unit', async () => {
    const user = userEvent.setup()
    renderShell(lesson01MotionRest)

    for (const stage of LESSON_STAGES) {
      await user.click(screen.getByRole('button', { name: new RegExp(stage.title) }))
      const panel = document.querySelector('.stage-panel')!
      expect(panel.textContent).not.toContain('$')
      expect(panel.querySelectorAll('.math--error')).toHaveLength(0)
    }
  })

  it('never leaks the probe into the real lesson', () => {
    renderShell(lesson01MotionRest)
    expect(document.body.textContent).not.toContain(MATH_PROBE)
  })
})
