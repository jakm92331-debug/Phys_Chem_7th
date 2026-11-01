/**
 * End-to-end test of the teacher area against a REAL server pair:
 *
 *   vite dev (with the /api/teacher proxy)  ↔  node server (authenticated)
 *
 * What it verifies:
 *   1. The student experience is untouched: the lesson page renders and
 *      makes NO request to the teacher API, and the teacher solution
 *      marker text never appears in the student-facing page.
 *   2. The teacher area asks for authentication on a host with a live
 *      backend, rejects a wrong password, and accepts the real one.
 *   3. After login, the seeded teacher solution is served by the real
 *      server and rendered through the real UI (login → dashboard →
 *      solution set with every required field).
 *   4. Logging out returns to the login form.
 *
 * Requires a Chromium executable: set CHROMIUM_PATH (see docs/TEACHER_AUTH.md
 * for how to obtain one). Playwright needs the shared libraries of that
 * Chromium on LD_LIBRARY_PATH when it is not installed system-wide.
 *
 * Usage: CHROMIUM_PATH=/path/to/chromium node e2e/teacher-flow.mjs
 *
 * The script starts both servers itself and kills them on exit.
 */

import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from '../server/auth.js'

const ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const DEV_PORT = 5199
const TEACHER_PORT = 18_789 // distinct from the default 8787 so a stray server can never mask this run
const BASE = `http://localhost:${DEV_PORT}`

const PASSWORD = 'e2e-test-password-only'
const MARK = 'MARKER-TEACHER-SOLUTION-E2E'
const teacherLog = []

// Shared libraries for the extracted Chromium (if any).
const libsDir = process.env.CHROMIUM_LIBS
if (libsDir) process.env.LD_LIBRARY_PATH = `${libsDir}${process.env.LD_LIBRARY_PATH ? ':' : ''}${process.env.LD_LIBRARY_PATH ?? ''}`

const executablePath = process.env.CHROMIUM_PATH
if (!executablePath) throw new Error('Set CHROMIUM_PATH to a Chromium executable (see docs/TEACHER_AUTH.md)')

const dataDir = mkdtempSync(join(tmpdir(), 'teacher-e2e-'))
writeFileSync(
  join(dataDir, 'teacher-solutions.json'),
  JSON.stringify({
    version: 1,
    updatedAt: null,
    solutions: {
      'lesson-01-motion-rest': {
        entryId: 'lesson-01-motion-rest',
        entryTitle: 'الحركة والسكون',
        pageStart: 3,
        pages: [4],
        status: 'pending',
        solutions: [
          {
            id: 'e2e-solution',
            type: 'exercise',
            pageRef: 4,
            prompt: `${MARK} — نص السؤال`,
            answer: 'الإجابة التوضيحية',
            steps: ['الخطوة الأولى'],
            lawsUsed: ['قانون السرعة'],
            methodReasoning: 'سبب اختيار الطريقة',
            substitutions: 'التعويضات والوحدات',
          },
        ],
      },
    },
  }),
  'utf8',
)
let dev
let teacher

// Stop both servers reliably: SIGTERM to the process group, then SIGKILL
// shortly after, so no stray listener can survive this run and poison the
// next one (a stale server on the port would answer waitForPort instead).
function killChild(child, signal) {
  if (!child) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // already gone
    }
  }
}

async function portOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(1000) })
    return res.status > 0
  } catch {
    return false
  }
}

function stopAll() {
  for (const child of [dev, teacher]) killChild(child, 'SIGTERM')
  setTimeout(() => {
    for (const child of [dev, teacher]) killChild(child, 'SIGKILL')
  }, 1000).unref()
  rmSync(dataDir, { recursive: true, force: true })
}
process.on('exit', stopAll)
process.on('SIGINT', () => { stopAll(); process.exit(130) })
process.on('SIGTERM', () => { stopAll(); process.exit(143) })

async function waitForPort(port, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(2000) })
      if (res.status > 0) return
    } catch {
      // not up yet — keep polling
    }
  }
  throw new Error(`port ${port} did not come up`)
}

async function main() {
  const hash = await hashPassword(PASSWORD)
  dev = spawn('node', ['node_modules/vite/bin/vite.js', '--port', String(DEV_PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, TEACHER_SERVER_URL: `http://localhost:${TEACHER_PORT}` },
  })
  teacher = spawn('node', ['server/index.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env: {
      ...process.env,
      PORT: String(TEACHER_PORT),
      TEACHER_DATA_DIR: dataDir,
      TEACHER_PASSWORD_HASH: hash,
    },
  })
  teacher.stdout.on('data', (d) => teacherLog.push(String(d)))
  teacher.stderr.on('data', (d) => teacherLog.push(String(d)))
  await waitForPort(TEACHER_PORT)
  await waitForPort(DEV_PORT)

  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const requests = []
  page.on('request', (req) => requests.push(req.url()))
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))

  /* ---- 1. student experience is untouched ---- */
  await page.goto(`${BASE}/#/lesson/motion-and-rest`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.lesson-header', { timeout: 30_000 })
  const lessonText = await page.locator('body').innerText()
  assert.ok(lessonText.includes('الحركة والسكون'), 'lesson page should render its content')
  assert.ok(!lessonText.includes(MARK), 'student page must not contain teacher solution data')
  assert.ok(
    !requests.some((u) => u.includes('/api/teacher')),
    `student page must not request the teacher API (saw: ${requests.filter((u) => u.includes('/api/teacher'))})`,
  )

  /* ---- 2. teacher area asks for authentication ---- */
  await page.goto(`${BASE}/#/teacher`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#teacher-password', { timeout: 30_000 })
  assert.ok(true, 'teacher area shows the login form on a live backend')

  /* ---- 3. wrong password is rejected ---- */
  await page.fill('#teacher-password', 'wrong-password')
  await page.click('button[type="submit"]')
  await page.waitForSelector('[role="alert"]', { timeout: 10_000 })
  const alertText = await page.locator('[role="alert"]').innerText()
  assert.ok(alertText.includes('كلمة المرور غير صحيحة'), `unexpected alert: ${alertText}`)
  assert.ok(!(await page.locator('#teacher-password').count()) === false, 'still on the login form')

  /* ---- 4. real login reveals the server-side solutions ---- */
  await page.fill('#teacher-password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForSelector('.teacher-dash', { timeout: 15_000 })
  assert.ok(true, 'login succeeded and the dashboard rendered')

  const entry = page.locator('.teacher-entry', { hasText: 'الحركة والسكون' })
  await entry.click()
  try {
    await page.waitForSelector('.teacher-solution', { timeout: 10_000 })
  } catch (err) {
    const html = await page.locator('.teacher-dash__detail').innerHTML()
    console.error('DETAIL-HTML:', html.slice(0, 800))
    const listHtml = await page.locator('.teacher-dash__list').innerHTML().catch(() => '(no list)')
    console.error('LIST-HTML:', listHtml.slice(0, 500))
    const probe = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/teacher/solutions', { headers: { Accept: 'application/json' } })
        const body = await r.text()
        return `status=${r.status} body=${body.slice(0, 200)}`
      } catch (e) {
        return `fetch error: ${e.message}`
      }
    })
    console.error('PROBE:', probe)
    throw err
  }
  // textContent (not innerText): the solution fields sit inside a collapsed
  // <details> element until the teacher expands it.
  const detailText = await page.locator('.teacher-dash__detail').textContent()
  for (const field of ['الإجابة', 'خطوات الحل', 'القوانين المستعملة', 'سبب اختيار الطريقة', 'التعويضات والوحدات']) {
    assert.ok(detailText.includes(field), `solution set must show ${field}`)
  }
  // the seeded solution's marker is served by the REAL server
  assert.ok(detailText.includes(MARK), 'dashboard must show the seeded solution from the server store')

  // the solution expands with the full fields
  const summary = page.locator('summary', { hasText: MARK })
  await summary.click()
  const bodyText = await summary.evaluate((el) => el.closest('li').innerText)
  assert.ok(bodyText.includes('الإجابة التوضيحية'), 'expanded solution shows the answer')
  assert.ok(bodyText.includes('الخطوة الأولى'), 'expanded solution shows the steps')
  assert.ok(bodyText.includes('صفحة 4 في الكتاب المدرسي'), 'expanded solution shows the page reference')

  /* ---- 5. logout returns to the login form ---- */
  await page.click('button:has-text("تسجيل الخروج")')
  await page.waitForSelector('#teacher-password', { timeout: 10_000 })
  assert.ok(true, 'logout returns to the login form')

  assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`)

  await browser.close()
  console.log('e2e: teacher flow PASSED')
}

main()
  .then(() => finish(0))
  .catch((err) => {
    console.error('teacher server log:', teacherLog.join('').slice(0, 2000))
    console.error(err)
    finish(1)
  })

/** SIGTERM both servers, wait until their ports are actually closed,
 *  then force-exit. Fails loudly if a listener survives — a stale server
 *  would answer the next run's waitForPort and mask real failures. */
async function finish(code) {
  stopAll()
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    if (!(await portOpen(TEACHER_PORT)) && !(await portOpen(DEV_PORT))) break
    await new Promise((r) => setTimeout(r, 250))
  }
  const survivors = []
  if (await portOpen(TEACHER_PORT)) survivors.push(`teacher:${TEACHER_PORT}`)
  if (await portOpen(DEV_PORT)) survivors.push(`dev:${DEV_PORT}`)
  if (survivors.length > 0) {
    console.error(`ERROR: servers still listening after teardown: ${survivors.join(', ')}`)
    process.exit(1)
  }
  process.exit(code)
}
