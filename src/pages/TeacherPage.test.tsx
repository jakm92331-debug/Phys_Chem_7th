import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProgressProvider } from '@/state/progress'
import { TeacherPage } from './TeacherPage'
import type { TeacherSolutionSet } from '@/types/content'

const SOLUTION_SET: TeacherSolutionSet = {
  entryId: 'lesson-01-motion-rest',
  entryTitle: 'الحركة والسكون',
  pageStart: 3,
  pages: [3, 4, 5],
  status: 'textbook-verified',
  solutions: [
    {
      id: 'sol-1',
      type: 'exercise',
      pageRef: 4,
      prompt: 'سؤال تجريبي',
      answer: 'الإجابة $5\\ \\mathrm{m/s}$',
      steps: ['الخطوة الأولى', 'الخطوة الثانية'],
      lawsUsed: ['$v = \\\\dfrac{d}{t}$'],
      methodReasoning: 'استعملنا قانون السرعة المتوسطة لأنه يربط المسافة بالزمن.',
      substitutions: '$d = v\\\\,t = 5\\\\ \\\\mathrm{m/s} \\\\times 10\\\\ \\\\mathrm{s} = 50\\\\ \\\\mathrm{m}$',
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function mockFetch(routes: Record<string, (init?: RequestInit) => Promise<Response>>) {
  const calls: string[] = []
  const fn = vi.fn((input: unknown, init?: RequestInit) => {
    const url = String(input)
    calls.push(url)
    for (const [prefix, handler] of Object.entries(routes)) {
      if (url.includes(prefix)) return handler(init)
    }
    return jsonResponse({ error: 'not-found' }, 404)
  })
  vi.stubGlobal('fetch', fn)
  return { calls, fn }
}

function renderPage() {
  return render(
    <ProgressProvider>
      <MemoryRouter>
        <TeacherPage />
      </MemoryRouter>
    </ProgressProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TeacherPage: honest status when no authenticated backend exists', () => {
  it('shows the static-host explanation instead of pretending the area is protected', async () => {
    // static host: the API request 404s / fails
    mockFetch({})
    renderPage()
    const panel = await screen.findByText(/خادم المصادقة غير متوفّر على هذا المضيف/)
    expect(panel).toBeInTheDocument()
    expect(screen.getByText(/GitHub Pages/)).toBeInTheDocument()
    // no login form pretends security on a host that cannot verify anything
    expect(screen.queryByLabelText(/كلمة المرور/)).not.toBeInTheDocument()
    expect(screen.getByText(/ليست محمية على المضيف الثابت/)).toBeInTheDocument()
  })
})

describe('TeacherPage: login flow', () => {
  it('shows a login form when the backend exists but no session is held', async () => {
    mockFetch({ '/api/teacher/session': () => jsonResponse({ authenticated: false }) })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText(/كلمة المرور/)).toBeInTheDocument())
  })

  it('rejects a wrong password with an error and never reveals anything else', async () => {
    const user = userEvent.setup()
    mockFetch({
      '/api/teacher/session': () => jsonResponse({ authenticated: false }),
      '/api/teacher/login': () => jsonResponse({ ok: false, error: 'invalid-credentials' }, 401),
    })
    renderPage()
    const input = await screen.findByLabelText(/كلمة المرور/)
    await user.type(input, 'whatever')
    await user.click(screen.getByRole('button', { name: 'دخول' }))
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('كلمة المرور غير صحيحة')
    // the teacher data is still not requested
    expect(screen.queryByRole('heading', { level: 2, name: 'مستودع حلول المعلّم' })).not.toBeInTheDocument()
  })

  it('logs in and opens the solutions dashboard', async () => {
    const user = userEvent.setup()
    mockFetch({
      '/api/teacher/session': () => jsonResponse({ authenticated: false }),
      '/api/teacher/login': () => jsonResponse({ ok: true }),
      '/api/teacher/solutions': () => jsonResponse({ ok: true, solutions: [] }),
    })
    renderPage()
    const input = await screen.findByLabelText(/كلمة المرور/)
    await user.type(input, 'secret-from-server')
    await user.click(screen.getByRole('button', { name: 'دخول' }))

    await screen.findByRole('heading', { level: 2, name: 'مستودع حلول المعلّم' })
    // no entry is selected yet — the picker state is shown
    expect(screen.getByText(/اختر درساً لعرض حلولهما/)).toBeInTheDocument()
    // every curriculum entry is listed; none has solutions yet
    expect(screen.getAllByText(/لا حلول بعد/).length).toBe(16)
  })
})

describe('TeacherPage: solutions dashboard', () => {
  it('shows the authenticated entry list and the structure of an empty solution set', async () => {
    mockFetch({
      '/api/teacher/session': () => jsonResponse({ authenticated: true }),
      '/api/teacher/solutions': () =>
        jsonResponse({
          ok: true,
          solutions: [{ entryId: 'lesson-01-motion-rest', entryTitle: 'الحركة والسكون', pageStart: 3, pages: [], status: 'pending', solutions: [] }],
        }),
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { level: 2, name: 'مستودع حلول المعلّم' })
    await user.click(screen.getByRole('button', { name: /الحركة والسكون/ }))
    // the set exists but carries no solutions yet
    const empty = await screen.findByText(/هذا الدرس مُسجَّل في مستودع الحلول بلا أسئلة بعد/)
    expect(empty).toHaveTextContent('خطوات الحل')
    expect(empty).toHaveTextContent('القوانين')
    expect(empty).toHaveTextContent('سبب اختيار الطريقة')
  })

  it('renders a full solution set with every required field', async () => {
    mockFetch({
      '/api/teacher/session': () => jsonResponse({ authenticated: true }),
      '/api/teacher/solutions': () =>
        jsonResponse({ ok: true, solutions: [SOLUTION_SET] }),
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('heading', { level: 2, name: 'مستودع حلول المعلّم' })
    await user.click(screen.getByRole('button', { name: /الحركة والسكون/ }))

    // the set header and its page metadata
    const head = await screen.findByRole('heading', { name: 'الحركة والسكون' })
    expect(head).toBeInTheDocument()
    expect(screen.getByText(/صفحات: 3، 4، 5/)).toBeInTheDocument()
    // the solution is collapsed until opened
    expect(screen.getByText(/سؤال تجريبي/)).toBeInTheDocument()
    await user.click(screen.getByText(/سؤال تجريبي/))
    // every required field of the teacher solution is present
    expect(screen.getByText(/الإجابة/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/الخطوة الأولى/)).toBeInTheDocument()
    expect(screen.getByText(/الخطوة الثانية/)).toBeInTheDocument()
    expect(screen.getByText(/القوانين المستعملة/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/سبب اختيار الطريقة/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/التعويضات والوحدات/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/استعملنا قانون السرعة المتوسطة/)).toBeInTheDocument()
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && (el?.textContent ?? '').includes('صفحة 4 في الكتاب المدرسي')),
    ).toBeInTheDocument()
    // page metadata of the set
    expect(screen.getByText(/صفحات: 3، 4، 5/)).toBeInTheDocument()
  })

  it('falls back to the login form when the session expired', async () => {
    mockFetch({
      '/api/teacher/session': () => jsonResponse({ authenticated: true }),
      '/api/teacher/solutions': () => jsonResponse({ ok: false, error: 'authentication-required' }, 401),
    })
    renderPage()
    await screen.findByRole('heading', { level: 2, name: 'مستودع حلول المعلّم' })
    // solutions request came back 401 → gate returns to the login form
    await waitFor(() => expect(screen.getByLabelText(/كلمة المرور/)).toBeInTheDocument())
  })
})
