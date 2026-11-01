import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { CheckSet, QuizSet } from '@/components/lesson/QuestionSet'
import { lesson01MotionRest } from '@/data/lessons/lesson-01-motion-rest'

describe('shipped index.html', () => {
  it('declares Arabic RTL at the document level', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('<html lang="ar" dir="rtl">')
    expect(html).toContain('أفق العلوم')
  })
})

describe('home page', () => {
  it('presents the platform identity, the journey CTA and all four units', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: /ادخل مختبرك العلمي/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ابدأ رحلتك العلمية/ })).toBeInTheDocument()
    for (const title of ['الحركة والتحريك', 'الضغط ودافعة أرخميدس', 'المادة والحرارة', 'المادة والطاقة']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    // document really is RTL Arabic
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')
  })
})

describe('navigation: home → curriculum → lesson 1', () => {
  it('shows all curriculum entries and opens the demo lesson with XP flow', async () => {
    const user = userEvent.setup()
    render(<App />)

    // scope to the header — the footer contains a same-named link too
    const headerNav = within(document.querySelector('header')!)
    await user.click(headerNav.getByRole('link', { name: /المنهج الدراسي/ }))

    // spot-check first/last entries and a project
    expect(screen.getByRole('heading', { name: 'الحركة والسكون' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'مشروع وسائل النقل' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'مشروع المحافظة الحرارية للسوائل' }),
    ).toBeInTheDocument()
    // exactly two entries carry the "project" kind label (exact text match —
    // project teasers also start with the same words)
    expect(screen.getAllByText('مشروع الوحدة')).toHaveLength(2)

    await user.click(screen.getByRole('link', { name: /الحركة والسكون/ }))

    // honest demo labelling + first stage
    expect(screen.getByText(/نسخة توضيحية تجريبية/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'التهيئة والاستكشاف' })).toBeInTheDocument()

    // completing the hook stage awards XP visible in the header
    await user.click(screen.getByRole('button', { name: /أنا مستعد/ }))
    const header = within(document.querySelector('header')!)
    expect(await header.findByText('10')).toBeInTheDocument()
  })
})

describe('pending lesson (awaiting textbook)', () => {
  it('renders an honest placeholder with the textbook page reference', async () => {
    window.location.hash = '#/lesson/force-and-motion'
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: /محتوى هذا الدرس قيد الإعداد/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/لا ننشر هنا أيّ محتوى لم يُتحقَّق منه/)).toBeInTheDocument()
  })
})

describe('CheckSet (افهم وتحقق) interaction', () => {
  it('gives a misconception hint on a wrong pick and completes on mastery', async () => {
    const user = userEvent.setup()
    const onAllSolved = vi.fn()
    const questions = lesson01MotionRest.checkQuestions
    render(<CheckSet questions={questions} onAllSolved={onAllSolved} />)

    // Q1 wrong pick (index 0) → hint appears, not solved yet
    const q1 = questions[0]
    await user.click(screen.getByText(q1.choices[0]))
    expect(screen.getByText(/ليست الإجابة الصحيحة/)).toBeInTheDocument()
    expect(onAllSolved).not.toHaveBeenCalled()

    // answer every question correctly
    for (const q of questions) {
      await user.click(screen.getByRole('radio', { name: q.choices[q.correctIndex] }))
    }
    expect(screen.getAllByText(/إجابة صحيحة!/)).toHaveLength(questions.length)
    expect(onAllSolved).toHaveBeenCalledTimes(1)
  })
})

describe('QuizSet (اختبر نفسك) interaction', () => {
  it('blocks submission until all answered, then reports the true score', async () => {
    const user = userEvent.setup()
    const onSubmitScore = vi.fn()
    const questions = lesson01MotionRest.quiz
    render(<QuizSet questions={questions} onSubmitScore={onSubmitScore} />)

    const submit = screen.getByRole('button', { name: /أجب عن جميع الأسئلة أولاً/ })
    expect(submit).toBeDisabled()

    // answer Q1 wrongly, the rest correctly → 5/6
    for (const [i, q] of questions.entries()) {
      const pick = i === 0 ? (q.correctIndex + 1) % q.choices.length : q.correctIndex
      await user.click(screen.getByRole('radio', { name: q.choices[pick] }))
    }

    await user.click(screen.getByRole('button', { name: /أرسل الإجابات/ }))
    expect(onSubmitScore).toHaveBeenCalledWith(expect.closeTo(5 / 6, 5))
    expect(screen.getByText(/نتيجتك:/)).toBeInTheDocument()
    expect(screen.getByText('83٪')).toBeInTheDocument()
  })
})
