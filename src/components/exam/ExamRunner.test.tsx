import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProgressProvider, STORAGE_KEY } from '@/state/progress'
import { ExamRunner } from './ExamRunner'
import { demoExamLesson01 } from '@/data/exams/demo-exam-01-motion-rest'
import { UNITS, getEntryBySlug } from '@/data/curriculum'

function renderRunner() {
  const entry = getEntryBySlug('motion-and-rest')!
  const unit = UNITS.find((u) => u.id === entry.unitId)!
  return render(
    <ProgressProvider>
      <MemoryRouter>
        <ExamRunner exam={demoExamLesson01} entry={entry} unit={unit} />
      </MemoryRouter>
    </ProgressProvider>,
  )
}

/** The fieldset card whose legend contains `text`. */
function cardWith(text: RegExp): HTMLFieldSetElement {
  return screen.getByText(text).closest('fieldset') as HTMLFieldSetElement
}

describe('ExamRunner: renders every question type', () => {
  it('renders the demo exam with mcq, true-false, calculation and open questions', () => {
    const { container } = renderRunner()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('الحركة والسكون')
    expect(container.querySelectorAll('.exam-q')).toHaveLength(6)
    // the calculation input exists with its unit hint
    expect(screen.getByLabelText(/اكتب القيمة مع رمز الوحدة/)).toBeInTheDocument()
    // open questions show the non-auto-grading note
    expect(screen.getAllByText(/لا يُصحَّح آلياً/)).toHaveLength(3)
  })

  it('does not enable submission until the auto-graded questions are answered', async () => {
    const user = userEvent.setup()
    renderRunner()
    const submit = screen.getByRole('button', { name: /تسليم الإجابات/ })
    expect(submit).toBeDisabled()
    // open questions alone never unlock submission
    await user.type(screen.getAllByLabelText(/اكتب إجابتك/)[0], 'إجابة مفتوحة')
    expect(submit).toBeDisabled()
  })
})

describe('ExamRunner: submission, grading and review', () => {
  it('grades a perfect attempt, shows the score and reveals explanations + model answers', async () => {
    const user = userEvent.setup()
    renderRunner()

    // mcq — pick the correct choice (choice 2 «الراكب ساكن بالنسبة إلى القطار…»)
    const mcqCard = cardWith(/راكب جالس في قطار/)
    await user.click(
      within(mcqCard).getByRole('radio', {
        name: /الراكب ساكن بالنسبة إلى القطار، ومتحرك بالنسبة إلى الأرض/,
      }),
    )
    // true-false — the statement is false → pick «خطأ»
    const tfCard = cardWith(/تُعدّ حركة متسارعة/)
    await user.click(within(tfCard).getByRole('radio', { name: 'خطأ' }))
    // calculation — «5 m/s»
    await user.type(screen.getByLabelText(/اكتب القيمة مع رمز الوحدة/), '5 m/s')

    const submit = screen.getByRole('button', { name: /تسليم الإجابات/ })
    expect(submit).toBeEnabled()
    await user.click(submit)

    // score panel
    const result = await screen.findByRole('status')
    expect(result).toHaveTextContent('100٪')
    expect(result).toHaveTextContent('3/3')
    // open questions revealed for review with their model answers
    expect(screen.getAllByText(/مفتاح الإجابة والمعايير/)).toHaveLength(3)
    expect(screen.getAllByText(/الوصف يعتمد على المرجع/).length).toBeGreaterThanOrEqual(1)
    // auto-graded review shows the correct explanation
    expect(screen.getAllByText(/إجابة صحيحة/).length).toBeGreaterThanOrEqual(1)
  })

  it('grades a partially wrong attempt and shows the wrong-answer feedback', async () => {
    const user = userEvent.setup()
    renderRunner()

    // mcq — wrong choice
    const mcqCard = cardWith(/راكب جالس في قطار/)
    await user.click(
      within(mcqCard).getByRole('radio', { name: /الراكب ساكن تماماً لأنه لا يمشي/ }),
    )
    // true-false — «خطأ» is correct here
    const tfCard = cardWith(/تُعدّ حركة متسارعة/)
    await user.click(within(tfCard).getByRole('radio', { name: 'خطأ' }))
    // calculation — wrong value
    await user.type(screen.getByLabelText(/اكتب القيمة مع رمز الوحدة/), '7 m/s')

    await user.click(screen.getByRole('button', { name: /تسليم الإجابات/ }))
    const result = await screen.findByRole('status')
    expect(result).toHaveTextContent('33٪')
    expect(screen.getAllByText(/ليست صحيحة/).length).toBeGreaterThanOrEqual(1)
  })

  it('saves the attempt into the platform progress system', async () => {
    const user = userEvent.setup()
    renderRunner()

    const mcqCard = cardWith(/راكب جالس في قطار/)
    await user.click(
      within(mcqCard).getByRole('radio', {
        name: /الراكب ساكن بالنسبة إلى القطار، ومتحرك بالنسبة إلى الأرض/,
      }),
    )
    const tfCard = cardWith(/تُعدّ حركة متسارعة/)
    await user.click(within(tfCard).getByRole('radio', { name: 'خطأ' }))
    await user.type(screen.getByLabelText(/اكتب القيمة مع رمز الوحدة/), '5 m/s')
    await user.click(screen.getByRole('button', { name: /تسليم الإجابات/ }))

    await screen.findByRole('status')
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const saved = JSON.parse(raw!)
    expect(saved.exams[demoExamLesson01.id]).toBeDefined()
    expect(saved.exams[demoExamLesson01.id].attempts).toBe(1)
    expect(saved.exams[demoExamLesson01.id].bestScore).toBe(1)
    // XP flow follows the platform economy
    expect(saved.xp).toBeGreaterThan(0)
    expect(saved.activity.some((ev: { kind: string }) => ev.kind === 'exam')).toBe(true)
  })

  it('shows the demo banner honestly for the demonstration exam', () => {
    const { container } = renderRunner()
    expect(container.querySelector('.demo-banner')).toHaveTextContent('توضيحية')
  })
})

describe('ExamRunner: KaTeX everywhere', () => {
  it('renders the calculation prompt maths with KaTeX, never raw delimiters', () => {
    const { container } = renderRunner()
    const calcCard = container.querySelectorAll('.exam-q')[2]!
    expect(calcCard.querySelectorAll('.katex').length).toBeGreaterThan(0)
    expect(calcCard.textContent).not.toContain('$')
    expect(calcCard.querySelectorAll('.math--error')).toHaveLength(0)
  })
})
