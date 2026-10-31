import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckSet, QuizSet } from './QuestionSet'
import { MATH_PROBE } from '@/test/probe'
import type { QuizQuestion } from '@/types/content'

/**
 * Questions, options, explanations and misconception hints all reach the
 * student — every one of them must be KaTeX-capable, and none of them may
 * host a block-level maths box (they live inside inline labels).
 */

const question: QuizQuestion = {
  id: 'probe-q',
  prompt: MATH_PROBE,
  choices: [MATH_PROBE, 'خيار ثانٍ', 'خيار ثالث'],
  correctIndex: 0,
  explanation: MATH_PROBE,
  misconception: MATH_PROBE,
  difficulty: 'easy',
}

function expectMathsRendered(host: Element) {
  expect(host.querySelectorAll('.katex').length).toBeGreaterThan(0)
  expect(host.textContent).not.toContain('$')
  expect(host.querySelectorAll('.math--error')).toHaveLength(0)
  // choices / prompts / feedback live inside inline elements
  expect(host.querySelectorAll('.math--block')).toHaveLength(0)
}

describe('CheckSet (افهم وتحقق): maths in every field', () => {
  it('renders the prompt and the choices with KaTeX', () => {
    const { container } = render(<CheckSet questions={[question]} onAllSolved={() => {}} />)
    expectMathsRendered(container.querySelector('.q-card__prompt')!)
    expectMathsRendered(container.querySelectorAll('.q-choice')[0])
    // plain options stay plain text — no maths box is invented
    const plain = container.querySelectorAll('.q-choice')[1]
    expect(plain.textContent).toContain('خيار ثانٍ')
    expect(plain.querySelectorAll('.katex')).toHaveLength(0)
  })

  it('renders the explanation with KaTeX once the answer is right', async () => {
    const user = userEvent.setup()
    const { container } = render(<CheckSet questions={[question]} onAllSolved={() => {}} />)
    // the option label is split into text + KaTeX nodes → click the option
    const options = container.querySelectorAll('.q-choice')
    await user.click(options[0])
    expectMathsRendered(container.querySelector('.q-feedback--right')!)
  })

  it('renders the misconception hint with KaTeX on a wrong pick', async () => {
    const user = userEvent.setup()
    const { container } = render(<CheckSet questions={[question]} onAllSolved={() => {}} />)
    const options = container.querySelectorAll('.q-choice')
    await user.click(options[1])
    expectMathsRendered(container.querySelector('.q-feedback--wrong')!)
  })
})

describe('QuizSet (اختبر نفسك): maths in explanation and hint', () => {
  it('renders KaTeX in the reviewed explanation after submitting', async () => {
    const user = userEvent.setup()
    const { container } = render(<QuizSet questions={[question]} onSubmitScore={vi.fn()} />)
    // pick the second option on purpose → the review shows the hint too
    await user.click(container.querySelectorAll('.q-choice')[1])
    await user.click(screen.getByRole('button', { name: /أرسل الإجابات/ }))

    const feedback = container.querySelector('.q-feedback')!
    expectMathsRendered(feedback)
    // both the explanation and the misconception hint are maths-aware
    expect(feedback.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2)
  })
})
