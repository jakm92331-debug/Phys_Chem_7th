/**
 * The teacher-area server: an authenticated API + the static SPA build.
 *
 * Security model:
 *   • ALL teacher data (solutions) is served ONLY through
 *     `GET /api/teacher/solutions`, and that endpoint requires a valid
 *     session cookie. A direct request to any file path can never reach the
 *     data directory — static file serving is confined to `dist/` and the
 *     data directory is never on the static path.
 *   • Login is rate-limited per IP; failures return a generic message and
 *     never reveal whether the credential was close.
 *   • The server refuses to start without a valid `TEACHER_PASSWORD_HASH`
 *     (scrypt), so a deployment without the secret has no working login at
 *     all — it cannot fall back to "everything open".
 *
 * The handler is exported as a factory so tests can boot it on an
 * ephemeral port with a temporary data directory.
 */
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import {
  expiredCookie,
  hashPassword,
  isValidHashFormat,
  LoginRateLimiter,
  readSessionCookie,
  SessionStore,
  sessionCookie,
  verifyPassword,
} from './auth.js'
import { SolutionStore } from './store.js'

const JSON_CT = 'application/json; charset=utf-8'
const MAX_LOGIN_BODY = 4096
const MAX_SOLUTIONS_BODY = 1_000_000

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': JSON_CT,
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function send(res, status, body, headers = {}) {
  const finalHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers,
  }
  res.writeHead(status, finalHeaders)
  res.end(body)
}

function sendJson(res, status, payload, headers = {}) {
  send(res, status, JSON.stringify(payload), { 'Content-Type': JSON_CT, ...headers })
}

function readBody(req, limit) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        rejectPromise(Object.assign(new Error('body too large'), { code: 'TOO_LARGE' }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')))
    req.on('error', rejectPromise)
  })
}

function clientIp(req) {
  let ip = req.socket.remoteAddress ?? 'unknown'
  if (ip.startsWith('::ffff:')) ip = ip.slice(7)
  return ip
}

/** Resolves a URL pathname to a file inside `distDir`, or null when it escapes. */
function resolveStatic(distDir, pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  if (rel.includes('..')) return null
  const full = resolve(join(distDir, rel))
  if (full !== distDir && !full.startsWith(distDir + sep)) return null
  return full
}

export function createApp({
  passwordHash,
  distDir,
  dataDir,
  secureCookies = false,
} = {}) {
  if (!isValidHashFormat(passwordHash)) {
    throw new Error(
      'TEACHER_PASSWORD_HASH must be a scrypt hash in the format scrypt$N$r$p$salt$hash — generate one with `npm run hash:password`',
    )
  }
  const sessions = new SessionStore()
  const rateLimiter = new LoginRateLimiter()
  const store = new SolutionStore({ dataDir })

  function requireSession(req, res) {
    const token = readSessionCookie(req, 'tf_session')
    if (!sessions.isValid(token)) {
      sendJson(res, 401, { ok: false, error: 'authentication-required' })
      return null
    }
    return token
  }

  async function handleLogin(req, res) {
    const ip = clientIp(req)
    if (rateLimiter.isLocked(ip)) {
      sendJson(res, 429, { ok: false, error: 'rate-limited', retryAfterSeconds: 900 })
      return
    }
    let password
    try {
      const raw = await readBody(req, MAX_LOGIN_BODY)
      const body = JSON.parse(raw)
      password = body?.password
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad-request' })
      return
    }
    if (typeof password !== 'string') {
      sendJson(res, 400, { ok: false, error: 'bad-request' })
      return
    }
    if (!(await verifyPassword(passwordHash, password))) {
      rateLimiter.recordFailure(ip)
      sendJson(res, 401, { ok: false, error: 'invalid-credentials' })
      return
    }
    rateLimiter.reset(ip)
    const token = sessions.create()
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(token, { secure: secureCookies }) })
  }

  async function handleLogout(req, res) {
    const token = readSessionCookie(req, 'tf_session')
    if (token) sessions.destroy(token)
    sendJson(res, 200, { ok: true }, { 'Set-Cookie': expiredCookie() })
  }

  async function handleSession(req, res) {
    const token = readSessionCookie(req, 'tf_session')
    sendJson(res, 200, { ok: true, authenticated: sessions.isValid(token) })
  }

  async function handleSolutions(req, res) {
    if (!requireSession(req, res)) return
    const solutions = await store.getAll()
    sendJson(res, 200, { ok: true, solutions })
  }

  async function handleSolutionWrite(req, res, entryId) {
    if (!requireSession(req, res)) return
    let body
    try {
      const raw = await readBody(req, MAX_SOLUTIONS_BODY)
      body = JSON.parse(raw)
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad-request' })
      return
    }
    if (!body || typeof body !== 'object' || body.entryId !== entryId) {
      sendJson(res, 400, { ok: false, error: 'entry-mismatch' })
      return
    }
    const saved = await store.set(entryId, body)
    sendJson(res, 200, { ok: true, solutionSet: saved })
  }

  async function handleSolutionDelete(req, res, entryId) {
    if (!requireSession(req, res)) return
    const existed = await store.delete(entryId)
    sendJson(res, 200, { ok: true, deleted: existed })
  }

  async function serveStatic(req, res, pathname) {
    if (!distDir) {
      sendJson(res, 404, { ok: false, error: 'no-static-build' })
      return
    }
    // index.html for the app root and any client route (SPA fallback)
    if (pathname === '/' || pathname === '/index.html') {
      const html = await readFile(join(distDir, 'index.html'))
      send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      return
    }
    const file = resolveStatic(distDir, pathname)
    if (!file) {
      sendJson(res, 400, { ok: false, error: 'bad-path' })
      return
    }
    try {
      const data = await readFile(file)
      const ext = extname(file).toLowerCase()
      const ct = CONTENT_TYPES[ext]
      if (!ct) {
        send(res, 403, 'forbidden', { 'Content-Type': 'text/plain; charset=utf-8' })
        return
      }
      const cacheable = ext !== '.html'
      send(res, 200, data, {
        'Content-Type': ct,
        'Cache-Control': cacheable ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
    } catch {
      // unknown client route → let the SPA router handle it
      const html = await readFile(join(distDir, 'index.html')).catch(() => null)
      if (html) {
        send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      } else {
        sendJson(res, 404, { ok: false, error: 'not-found' })
      }
    }
  }

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost')
    const pathname = url.pathname
    const method = req.method ?? 'GET'

    try {
      // ——— authenticated API ———
      if (pathname === '/api/teacher/health' && method === 'GET') {
        sendJson(res, 200, { ok: true, auth: 'server' })
        return
      }
      if (pathname === '/api/teacher/login' && method === 'POST') {
        await handleLogin(req, res)
        return
      }
      if (pathname === '/api/teacher/logout' && method === 'POST') {
        await handleLogout(req, res)
        return
      }
      if (pathname === '/api/teacher/session' && method === 'GET') {
        await handleSession(req, res)
        return
      }
      if (pathname === '/api/teacher/solutions' && method === 'GET') {
        await handleSolutions(req, res)
        return
      }
      const writeMatch = pathname.match(/^\/api\/teacher\/solutions\/([^/]+)$/)
      if (writeMatch) {
        const entryId = decodeURIComponent(writeMatch[1])
        if (method === 'POST') {
          await handleSolutionWrite(req, res, entryId)
          return
        }
        if (method === 'DELETE') {
          await handleSolutionDelete(req, res, entryId)
          return
        }
      }
      if (pathname.startsWith('/api/')) {
        sendJson(res, 404, { ok: false, error: 'not-found' })
        return
      }

      // ——— static SPA ———
      if (method === 'GET' || method === 'HEAD') {
        await serveStatic(req, res, pathname)
        return
      }
      sendJson(res, 405, { ok: false, error: 'method-not-allowed' })
    } catch (err) {
      console.error('[teacher-server] request failed:', err)
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: 'internal-error' })
      } else {
        res.end()
      }
    }
  }
}

// Re-exported so the hash-password script shares one implementation.
export { hashPassword }
