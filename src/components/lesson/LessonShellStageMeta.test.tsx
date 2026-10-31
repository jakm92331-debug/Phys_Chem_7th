import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LessonShell } from './LessonShell'
import { ProgressProvider } from '@/state/progress'
import { ALL_ENTRIES, getUnitForEntry } from '@/data/curriculum'
import { allLessonContent } from '@/data/lessons'


/**
 * Stage titles/descriptions come from the curriculum module (not from lesson
 * content). They are student-facing copy too, so they must be KaTeX-capable as
 * well — proven here by probing that module's stage metadata.
 */
vi.mock('@/data/curriculum', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/curriculum')>()
  // Declared inside the factory: vi.mock is hoisted above module scope, so it
  // cannot reference any binding declared in this file.
  const probe = 'قيمة $v = \\frac{d}{t}$ هنا'
  return {
    ...actual,
    LESSON_STAGES: actual.LESSON_STAGES.map((stage) => ({
      ...stage,
      title: probe,
      description: probe,
    })),
  }
})

describe('LessonShell: stage metadata is maths-aware', () => {
  it('renders stage titles and descriptions with KaTeX', () => {
    const lesson = allLessonContent()[0]
    const entry = ALL_ENTRIES.find((e) => e.id === lesson.entryId)!

    render(
      <ProgressProvider>
        <MemoryRouter>
          <LessonShell entry={entry} unit={getUnitForEntry(entry)} content={lesson} />
        </MemoryRouter>
      </ProgressProvider>,
    )

    for (const sel of ['.stage-btn__title', '.stage-btn__desc']) {
      const nodes = document.querySelectorAll(sel)
      expect(nodes.length).toBeGreaterThan(0)
      for (const node of nodes) {
        expect(node.querySelector('.katex')).not.toBeNull()
        expect(node.textContent).not.toContain('$')
      }
    }

    // the panel heading repeats the active stage title/description
    expect(document.querySelector('.stage-panel__title')?.querySelector('.katex')).not.toBeNull()
    expect(document.querySelector('.stage-panel__desc')?.querySelector('.katex')).not.toBeNull()
    // the stage counter is still plain prose around the maths
    expect(document.querySelector('.stage-panel__kicker')?.textContent).toContain('المرحلة')
  })
})
