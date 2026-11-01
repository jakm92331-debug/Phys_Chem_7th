import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProgressProvider } from '@/state/progress'
import { ExamsPage } from './ExamsPage'
import { demoExamLesson01 } from '@/data/exams/demo-exam-01-motion-rest'

function renderPage() {
  return render(
    <ProgressProvider>
      <MemoryRouter>
        <ExamsPage />
      </MemoryRouter>
    </ProgressProvider>,
  )
}

describe('ExamsPage: exams are organised by unit and lesson', () => {
  it('lists the demo exam inside unit 1 and nothing elsewhere', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /الحركة والسكون/ })).toBeInTheDocument()
    // the demo exam is labelled as a lesson exam of unit 1
    expect(screen.getByText('اختبار الدرس')).toBeInTheDocument()
    // other units have no exams yet
    expect(screen.getAllByText(/لا يوجد اختبار لهذه الوحدة بعد/).length).toBeGreaterThanOrEqual(1)
    // the unit-exam rule is stated explicitly
    expect(screen.getByText(/لا يُنشأ اختبار الوحدة تلقائياً بعد كلّ درس/)).toBeInTheDocument()
  })

  it('links to the exam runner route', () => {
    const { container } = renderPage()
    const link = screen.getByRole('link', { name: /الحركة والسكون/ })
    expect(link).toHaveAttribute('href', `/exam/${encodeURIComponent(demoExamLesson01.id)}`)
    expect(container.querySelector('.exams-card')).toBeTruthy()
  })

  it('shows the best score after an attempt is recorded', () => {
    const { container } = render(
      <ProgressProvider>
        <MemoryRouter>
          <ExamsPage />
        </MemoryRouter>
      </ProgressProvider>,
    )
    // the card starts with the "not attempted" state
    expect(container.textContent).toMatch(/لم تجرِّه بعد/)
    // a pre-seeded attempt shows the best score
    window.localStorage.setItem(
      'ofuq-progress-v1',
      JSON.stringify({
        version: 1,
        xp: 30,
        lessons: {},
        exams: {
          [demoExamLesson01.id]: { attempts: 2, bestScore: 0.75, lastScore: 0.5, lastAt: '' },
        },
        badges: [],
        newBadges: [],
        labMissions: [],
        activity: [],
        streak: { lastDay: null, count: 0 },
        awarded: [],
      }),
    )
    const { unmount } = render(
      <ProgressProvider>
        <MemoryRouter>
          <ExamsPage />
        </MemoryRouter>
      </ProgressProvider>,
    )
    expect(screen.getByText(/أفضل نتيجة/)).toHaveTextContent('75٪')
    expect(screen.getByText(/2 محاولات/)).toBeInTheDocument()
    unmount()
  })
})
