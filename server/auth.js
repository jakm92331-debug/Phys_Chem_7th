/**
 * Teacher-area authentication — real server-side verification.
 *
 * Design:
 *   • Passwords are stored ONLY as scrypt hashes (N=16384, r=8, p=1,
 *     keylen=64, random 16-byte salt), in the format
 *     `scrypt$N$r$p$saltHex$hashHex`. Verification uses a constant-time
 *     comparison (`crypto.timingSafeEqual`).
 *   • The hash never lives in the repository. The server reads it from the
 *     `TEACHER_PASSWORD_HASH` environment variable (a deploy secret) and
 *     refuses to start without it — a static host without the secret can
 *     never verify a login.
 *   • Sessions are random 256-bit tokens kept server-side (in memory),
 *     delivered as an httpOnly, SameSite=Strict cookie. The client never
 *     sees the token's meaning; it only presents the cookie.
 *   • Login attempts are rate-limited per IP (5 failures / 15 min).
 *   • The initial teacher password (specified by the platform owner) is
 *     never written to the repo in
 *     any form: the deployer generates its hash with
 *     `npm run hash:password`, stores the hash as a deploy secret, and the
 *     password itself is only ever typed into the generation script's
 *     prompt (never echoed, never committed).
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16

export const HASH_PREFIX = 'scrypt'

/** Generates a scrypt hash for `password` in the `scrypt$N$r$p$salt$hash` format. */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH)
  const hash = await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return [
    HASH_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join('$')
}

/** Parses the hash format; returns null when malformed. */
function parseHash(stored) {
  if (typeof stored !== 'string') return null
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== HASH_PREFIX) return null
  const n = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = Buffer.from(parts[4], 'hex')
  const hash = Buffer.from(parts[5], 'hex')
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return null
  if (salt.length === 0 || hash.length === 0) return null
  return { n, r, p, salt, hash }
}

/**
 * Verifies `password` against a stored hash in constant time.
 * Never throws on malformed input — returns false.
 */
export async function verifyPassword(stored, password) {
  const parsed = parseHash(stored)
  if (!parsed) return false
  if (typeof password !== 'string' || password.length === 0) return false
  const candidate = await scrypt(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
  })
  if (candidate.length !== parsed.hash.length) return false
  return timingSafeEqual(candidate, parsed.hash)
}

/** Cheap structural check used at server startup (no password needed). */
export function isValidHashFormat(stored) {
  return parseHash(stored) !== null
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export class SessionStore {
  constructor({ ttlMs = SESSION_TTL_MS } = {}) {
    this.ttlMs = ttlMs
    this.sessions = new Map()
  }

  create() {
    const token = randomBytes(32).toString('base64url')
    this.sessions.set(token, { expires: Date.now() + this.ttlMs })
    this.sweep()
    return token
  }

  isValid(token) {
    if (typeof token !== 'string' || token.length === 0) return false
    const entry = this.sessions.get(token)
    if (!entry) return false
    if (entry.expires <= Date.now()) {
      this.sessions.delete(token)
      return false
    }
    return true
  }

  destroy(token) {
    this.sessions.delete(token)
  }

  sweep() {
    const now = Date.now()
    for (const [token, entry] of this.sessions) {
      if (entry.expires <= now) this.sessions.delete(token)
    }
  }
}

/* ------------------------------------------------------------------ */
/* Login rate limiting                                                 */
/* ------------------------------------------------------------------ */

const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX_FAILURES = 5

export class LoginRateLimiter {
  constructor({ windowMs = RATE_WINDOW_MS, maxFailures = RATE_MAX_FAILURES } = {}) {
    this.windowMs = windowMs
    this.maxFailures = maxFailures
    this.attempts = new Map()
  }

  /** true when this IP is currently locked out. */
  isLocked(ip) {
    this.sweep()
    const list = this.attempts.get(ip)
    return !!list && list.length >= this.maxFailures
  }

  /** Records a failed attempt; true when the IP just got locked. */
  recordFailure(ip) {
    this.sweep()
    const list = this.attempts.get(ip) ?? []
    list.push(Date.now())
    this.attempts.set(ip, list)
    return list.length >= this.maxFailures
  }

  /** A successful login clears the window. */
  reset(ip) {
    this.attempts.delete(ip)
  }

  sweep() {
    const now = Date.now()
    for (const [ip, list] of this.attempts) {
      const fresh = list.filter((at) => now - at < this.windowMs)
      if (fresh.length === 0) this.attempts.delete(ip)
      else this.attempts.set(ip, fresh)
    }
  }
}

/** Reads and validates the session cookie from a request. */
export function readSessionCookie(req, secretName) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const name = part.slice(0, eq).trim()
    if (name === secretName) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return null
}

/** Builds the Set-Cookie value for a new session. */
export function sessionCookie(token, { secure = false } = {}) {
  const flags = ['HttpOnly', 'SameSite=Strict', 'Path=/', `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`]
  if (secure) flags.push('Secure')
  return `tf_session=${encodeURIComponent(token)}; ${flags.join('; ')}`
}

/** Expires the session cookie. */
export function expiredCookie() {
  return 'tf_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
}
