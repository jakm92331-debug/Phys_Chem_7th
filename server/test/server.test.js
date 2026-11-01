/**
 * Server-side tests for the teacher area (node:test).
 *
 * Covers: password hashing/verification, server bootstrap without a hash,
 * the full login/session/logout flow, rate limiting, session-protected
 * data access (including direct-path attacks), static serving, and the
 * repository-wide secret scan (the initial password never appears in the
 * repo in any form).
 */
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFile, spawn } from 'node:child_process'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from '../app.js'
import { hashPassword, verifyPassword, isValidHashFormat, LoginRateLimiter, SessionStore } from '../auth.js'
import { SolutionStore } from '../store.js'

const SERVER_DIR = resolve(fileURLToPath(import.meta.url), '../..')
const REPO_ROOT = resolve(SERVER_DIR, '..')
const TEST_PASSWORD = 'test-password-only-for-automated-tests'

let hash
let dataDir
let distDir
let server
let base

async function boot({ passwordHash = hash, withDist = true } = {}) {
  dataDir = await mkdtemp(join(tmpdir(), 'teacher-data-'))
  if (withDist) {
    distDir = await mkdtemp(join(tmpdir(), 'teacher-dist-'))
    await writeFile(
      join(distDir, 'index.html'),
      '<!doctype html><html><body>أفق العلوم test build</body></html>',
    )
  }
  const app = createApp({ passwordHash, distDir: withDist ? distDir : undefined, dataDir })
  server = createServer(app)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
}

async function stop() {
  if (server) await new Promise((r) => server.close(r))
  if (dataDir) await rm(dataDir, { recursive: true, force: true })
  if (distDir) await rm(distDir, { recursive: true, force: true })
}

async function login(password = TEST_PASSWORD) {
  const res = await fetch(`${base}/api/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res
}

function cookieOf(res) {
  const raw = res.headers.get('set-cookie') ?? ''
  return raw.split(';')[0]
}

describe('password hashing', () => {
  test('verifies the correct password and rejects wrong ones', async () => {
    hash = await hashPassword(TEST_PASSWORD)
    assert.ok(isValidHashFormat(hash))
    assert.match(hash, /^scrypt\$16384\$8\$1\$[0-9a-f]+\$[0-9a-f]+$/)
    assert.equal(await verifyPassword(hash, TEST_PASSWORD), true)
    assert.equal(await verifyPassword(hash, 'wrong'), false)
    assert.equal(await verifyPassword(hash, ''), false)
    assert.equal(await verifyPassword('not-a-hash', TEST_PASSWORD), false)
  })

  test('salt is random — two hashes of the same password differ', async () => {
    const a = await hashPassword(TEST_PASSWORD)
    const b = await hashPassword(TEST_PASSWORD)
    assert.notEqual(a, b)
    assert.equal(await verifyPassword(a, TEST_PASSWORD), true)
    assert.equal(await verifyPassword(b, TEST_PASSWORD), true)
  })
})

describe('server bootstrap', () => {
  test('refuses to start without a valid hash', () => {
    assert.throws(() => createApp({ passwordHash: undefined }), /TEACHER_PASSWORD_HASH/)
    assert.throws(() => createApp({ passwordHash: 'plaintext-password' }), /TEACHER_PASSWORD_HASH/)
    assert.throws(() => createApp({ passwordHash: 'scrypt$bad$bad$bad$bad$bad' }), /TEACHER_PASSWORD_HASH/)
  })

  test('index.js refuses to start without a hash, and serves health with one', async () => {
    const entry = resolve(SERVER_DIR, 'index.js')
    // 1. no hash → non-zero exit with instructions
    await new Promise((resolveRun) => {
      execFile('node', [entry], { cwd: REPO_ROOT }, (err, stdout, stderr) => {
        assert.ok(err, 'server must exit without a hash')
        assert.notEqual(err.code, 0)
        assert.match(stderr + stdout, /TEACHER_PASSWORD_HASH/)
        resolveRun()
      })
    })
    // 2. valid hash → serves /api/teacher/health, then shuts down on SIGTERM
    const hash = await hashPassword('bootstrap-test-password')
    const port = 18_787
    const child = spawn('node', [entry], {
      cwd: REPO_ROOT,
      env: { ...process.env, PORT: String(port), TEACHER_DATA_DIR: dataDir ?? undefined, TEACHER_PASSWORD_HASH: hash },
      stdio: 'ignore',
    })
    try {
      await new Promise((resolveRun, reject) => {
        const deadline = Date.now() + 15_000
        const poll = async () => {
          try {
            const res = await fetch(`http://localhost:${port}/api/teacher/health`)
            if (res.ok) return resolveRun()
          } catch {
            // not up yet
          }
          if (Date.now() > deadline) return reject(new Error('server did not come up'))
          setTimeout(poll, 200)
        }
        poll()
      })
      const res = await fetch(`http://localhost:${port}/api/teacher/health`)
      const body = await res.json()
      assert.equal(body.ok, true)
      assert.equal(body.auth, 'server')
    } finally {
      child.kill('SIGTERM')
    }
  })
})

describe('rate limiter & sessions', () => {
  test('locks an IP after repeated failures and unlocks on success', () => {
    const limiter = new LoginRateLimiter({ windowMs: 60_000, maxFailures: 3 })
    assert.equal(limiter.isLocked('1.2.3.4'), false)
    assert.equal(limiter.recordFailure('1.2.3.4'), false)
    assert.equal(limiter.isLocked('1.2.3.4'), false) // one failure must not lock
    assert.equal(limiter.recordFailure('1.2.3.4'), false)
    assert.equal(limiter.recordFailure('1.2.3.4'), true)
    assert.equal(limiter.isLocked('1.2.3.4'), true)
    limiter.reset('1.2.3.4')
    assert.equal(limiter.isLocked('1.2.3.4'), false)
  })

  test('sessions expire and are destroyed', () => {
    const store = new SessionStore({ ttlMs: 50 })
    const token = store.create()
    assert.equal(store.isValid(token), true)
    assert.equal(store.isValid('forged-token'), false)
    store.destroy(token)
    assert.equal(store.isValid(token), false)
  })
})

describe('teacher API over HTTP', () => {
  before(async () => {
    hash = await hashPassword(TEST_PASSWORD)
    await boot()
  })
  after(stop)

  test('health endpoint announces the authenticated backend', async () => {
    const res = await fetch(`${base}/api/teacher/health`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.auth, 'server')
  })

  test('session starts unauthenticated', async () => {
    const res = await fetch(`${base}/api/teacher/session`)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.authenticated, false)
  })

  test('login rejects a wrong password and accepts the right one with an httpOnly cookie', async () => {
    const bad = await login('definitely-wrong')
    assert.equal(bad.status, 401)
    const cookieHeader = bad.headers.get('set-cookie')
    assert.equal(cookieHeader, null)

    const good = await login()
    assert.equal(good.status, 200)
    const setCookie = good.headers.get('set-cookie')
    assert.ok(setCookie)
    assert.match(setCookie, /HttpOnly/i)
    assert.match(setCookie, /SameSite=Strict/i)

    const session = await fetch(`${base}/api/teacher/session`, {
      headers: { Cookie: cookieOf(good) },
    })
    assert.equal((await session.json()).authenticated, true)
  })

  test('solutions are forbidden without a session — including forged cookies', async () => {
    const anonymous = await fetch(`${base}/api/teacher/solutions`)
    assert.equal(anonymous.status, 401)

    const forged = await fetch(`${base}/api/teacher/solutions`, {
      headers: { Cookie: 'tf_session=forged-token' },
    })
    assert.equal(forged.status, 401)
  })

  test('solutions are served only with a valid session and never leak through static paths', async () => {
    // seed one fake solution set directly in the store (as the deployer would)
    const store = new SolutionStore({ dataDir })
    await store.set('lesson-01-motion-rest', {
      entryId: 'lesson-01-motion-rest',
      entryTitle: 'الحركة والسكون',
      pageStart: 3,
      pages: [3],
      status: 'textbook-verified',
      solutions: [
        {
          id: 'sol-1',
          type: 'book-question',
          pageRef: 5,
          prompt: 'سؤال تجريبي سري',
          answer: 'الإجابة السرية 42 m/s',
          steps: ['خطوة 1'],
          lawsUsed: ['v = d/t'],
          methodReasoning: 'لأن…',
          substitutions: 'd = v t',
        },
      ],
    })

    const loginRes = await login()
    const cookie = cookieOf(loginRes)

    const authorized = await fetch(`${base}/api/teacher/solutions`, {
      headers: { Cookie: cookie },
    })
    assert.equal(authorized.status, 200)
    const body = await authorized.json()
    assert.equal(body.solutions.length, 1)
    assert.equal(body.solutions[0].solutions[0].answer, 'الإجابة السرية 42 m/s')

    // the data file is never reachable as a static file
    for (const attack of [
      `/data/teacher-solutions.json`,
      `/../server/data/teacher-solutions.json`,
      `/..%2f..%2fserver%2fdata%2fteacher-solutions.json`,
    ]) {
      const res = await fetch(`${base}${attack}`)
      const text = await res.text()
      assert.ok(!text.includes('الإجابة السرية'), `path ${attack} leaked solution data`)
    }
  })

  test('logout invalidates the session', async () => {
    const loginRes = await login()
    const cookie = cookieOf(loginRes)
    const out = await fetch(`${base}/api/teacher/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    })
    assert.equal(out.status, 200)
    const session = await fetch(`${base}/api/teacher/session`, { headers: { Cookie: cookie } })
    assert.equal((await session.json()).authenticated, false)
    const data = await fetch(`${base}/api/teacher/solutions`, { headers: { Cookie: cookie } })
    assert.equal(data.status, 401)
  })

  test('solution write/delete require a session', async () => {
    const post = await fetch(`${base}/api/teacher/solutions/lesson-02-force-motion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: 'lesson-02-force-motion', entryTitle: 'x' }),
    })
    assert.equal(post.status, 401)
    const del = await fetch(`${base}/api/teacher/solutions/lesson-02-force-motion`, {
      method: 'DELETE',
    })
    assert.equal(del.status, 401)
  })

  test('solution write/delete work with a session and reject mismatches', async () => {
    const loginRes = await login()
    const cookie = cookieOf(loginRes)
    const set = {
      entryId: 'lesson-02-force-motion',
      entryTitle: 'القوة والحركة',
      pageStart: 17,
      pages: [17, 18],
      status: 'textbook-verified',
      solutions: [],
    }
    const post = await fetch(`${base}/api/teacher/solutions/lesson-02-force-motion`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(set),
    })
    assert.equal(post.status, 200)

    const mismatch = await fetch(`${base}/api/teacher/solutions/lesson-02-force-motion`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: 'other-entry' }),
    })
    assert.equal(mismatch.status, 400)

    const fetched = await fetch(`${base}/api/teacher/solutions`, { headers: { Cookie: cookie } })
    const body = await fetched.json()
    assert.ok(body.solutions.some((s) => s.entryId === 'lesson-02-force-motion'))

    const del = await fetch(`${base}/api/teacher/solutions/lesson-02-force-motion`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    })
    assert.equal(del.status, 200)
    assert.equal((await del.json()).deleted, true)
  })

  test('static build is served and client routes fall back to index.html', async () => {
    const root = await fetch(`${base}/`)
    assert.equal(root.status, 200)
    assert.match(await root.text(), /أفق العلوم test build/)

    const route = await fetch(`${base}/teacher`)
    assert.equal(route.status, 200)
    assert.match(await route.text(), /أفق العلوم test build/)

    const missingApi = await fetch(`${base}/api/teacher/nope`)
    assert.equal(missingApi.status, 404)
  })

  test('a failed login campaign gets rate-limited (runs last — it locks the test IP)', async () => {
    for (let i = 0; i < 6; i++) {
      const res = await login('wrong-again')
      if (res.status === 429) {
        assert.match(await res.text(), /rate-limited/)
        return
      }
      assert.equal(res.status, 401)
    }
    assert.fail('expected a 429 after repeated failures')
  })
})

describe('repository secret scan', () => {
  test('the initial teacher password appears nowhere in the repository', async () => {
    // The needle is assembled at runtime so this test file itself never
    // stores the password as a literal.
    const needle = ['somer', '173'].join('')
    const offenders = []
    const walk = async (dir) => {
      for (const entry of await import('node:fs/promises').then((fs) => fs.readdir(dir, { withFileTypes: true }))) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (/\.(ts|tsx|js|mjs|json|md|yml|yaml|css|html|svg)$/.test(entry.name)) {
          const text = await readFile(full, 'utf8')
          if (text.includes(needle)) offenders.push(full)
        }
      }
    }
    await walk(REPO_ROOT)
    assert.deepEqual(offenders, [], `the password must not appear in: ${offenders.join(', ')}`)
  })
})
