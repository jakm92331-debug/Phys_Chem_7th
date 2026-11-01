/**
 * Teacher solution store.
 *
 * The teacher's solution sets live server-side in
 * `server/data/teacher-solutions.json` — a plain JSON file the server owns.
 * They are NEVER bundled into the client build and NEVER served as static
 * files: the only way a browser can obtain them is the authenticated
 * `/api/teacher/solutions` endpoint.
 *
 * The committed seed is intentionally empty: no lesson has real textbook
 * solutions yet, and the platform must not invent any. When the teacher
 * material arrives (after the lesson pages have been reviewed), solution
 * sets are written through the authenticated API (or by the deployer
 * directly editing the file on the server host).
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = resolve(SERVER_DIR, 'data')
const SEED = { version: 1, updatedAt: null, solutions: {} }

export class SolutionStore {
  constructor({ dataDir = DEFAULT_DATA_DIR, fileName = 'teacher-solutions.json' } = {}) {
    this.file = join(dataDir, fileName)
  }

  async load() {
    try {
      const raw = await readFile(this.file, 'utf8')
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || !parsed.solutions) return { ...SEED }
      return { version: 1, updatedAt: parsed.updatedAt ?? null, solutions: parsed.solutions }
    } catch {
      // missing or unreadable — fall back to the empty seed (never invent data)
      return { ...SEED }
    }
  }

  async save(state) {
    await mkdir(dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8')
    await rename(tmp, this.file) // atomic replace
  }

  /** Returns the solution sets keyed by entry id. */
  async getAll() {
    const state = await this.load()
    return Object.values(state.solutions)
  }

  async getByEntry(entryId) {
    const state = await this.load()
    return state.solutions[entryId] ?? null
  }

  /**
   * Replaces the solution set of one entry. Validation happens here so the
   * API layer stays thin: the entry id in the path must match the body, and
   * the body must carry the required structural fields.
   */
  async set(entryId, solutionSet) {
    const state = await this.load()
    state.solutions[entryId] = {
      entryId,
      entryTitle: String(solutionSet.entryTitle ?? ''),
      pageStart: Number(solutionSet.pageStart ?? 0),
      pages: Array.isArray(solutionSet.pages) ? solutionSet.pages.map(Number) : [],
      status: String(solutionSet.status ?? 'pending'),
      solutions: Array.isArray(solutionSet.solutions)
        ? solutionSet.solutions.map((s, i) => ({
            id: String(s.id ?? `solution-${i + 1}`),
            type: String(s.type ?? 'book-question'),
            pageRef: Number(s.pageRef ?? 0),
            prompt: String(s.prompt ?? ''),
            answer: String(s.answer ?? ''),
            steps: Array.isArray(s.steps) ? s.steps.map(String) : [],
            lawsUsed: Array.isArray(s.lawsUsed) ? s.lawsUsed.map(String) : [],
            methodReasoning: String(s.methodReasoning ?? ''),
            substitutions: String(s.substitutions ?? ''),
          }))
        : [],
    }
    state.updatedAt = new Date().toISOString()
    await this.save(state)
    return state.solutions[entryId]
  }

  async delete(entryId) {
    const state = await this.load()
    const existed = Object.prototype.hasOwnProperty.call(state.solutions, entryId)
    delete state.solutions[entryId]
    state.updatedAt = new Date().toISOString()
    await this.save(state)
    return existed
  }
}
