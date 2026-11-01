/**
 * Integration tests for scripts/build-teacher-solutions.mjs: it validates
 * the intake document and writes server/data/teacher-solutions.json.
 *
 * Runs the script with a temp intake file and a temp output file, so the
 * real store is never touched.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER_DIR = resolve(fileURLToPath(import.meta.url), '../..')
const ROOT = resolve(SERVER_DIR, '..')
const SCRIPT = resolve(ROOT, 'scripts/build-teacher-solutions.mjs')

function runBuild(intakeFile, outFile) {
  return new Promise((resolveRun) => {
    execFile('node', [SCRIPT, intakeFile, outFile], { cwd: ROOT }, (err, stdout, stderr) => {
      resolveRun({ code: err?.code ?? 0, stdout, stderr })
    })
  })
}

function validIntake() {
  return {
    version: 1,
    updatedAt: null,
    sets: [
      {
        entryId: 'lesson-01-motion-rest',
        entryTitle: 'الحركة والسكون',
        pageStart: 3,
        pages: [4],
        status: 'pending',
        solutions: [
          {
            id: 'lesson-01-motion-rest-p4-exercise',
            type: 'exercise',
            pageRef: 4,
            prompt: 'نص السؤال',
            answer: 'الإجابة',
            steps: ['خطوة'],
            lawsUsed: ['قانون'],
            methodReasoning: 'سبب',
            substitutions: 'تعويض',
          },
        ],
      },
    ],
  }
}

test('build script writes the server store from a valid intake file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'intake-'))
  const intake = join(dir, 'intake.json')
  const out = join(dir, 'store.json')
  writeFileSync(intake, JSON.stringify(validIntake(), null, 2))

  const result = await runBuild(intake, out)
  assert.equal(result.code, 0, result.stderr)
  assert.ok(existsSync(out))
  const store = JSON.parse(readFileSync(out, 'utf8'))
  assert.equal(store.version, 1)
  assert.ok(typeof store.updatedAt === 'string' && store.updatedAt.length > 0)
  assert.deepEqual(Object.keys(store.solutions), ['lesson-01-motion-rest'])
  const set = store.solutions['lesson-01-motion-rest']
  assert.equal(set.entryTitle, 'الحركة والسكون')
  assert.equal(set.solutions[0].answer, 'الإجابة')
  rmSync(dir, { recursive: true, force: true })
})

test('build script refuses an invalid intake file and leaves the store untouched', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'intake-'))
  const intake = join(dir, 'intake.json')
  const out = join(dir, 'store.json')
  writeFileSync(intake, JSON.stringify({ version: 1, sets: [{ entryId: 'lesson-01-motion-rest', solutions: [{ type: 'exercise' }] }] }))

  const result = await runBuild(intake, out)
  assert.equal(result.code, 1)
  assert.match(result.stderr, /فشل التحقق/)
  assert.match(result.stderr, /الإجابة/)
  assert.ok(!existsSync(out), 'no store file may be written on validation failure')
  rmSync(dir, { recursive: true, force: true })
})

test('build script reports a missing intake file with a helpful message', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'intake-'))
  const result = await runBuild(join(dir, 'nope.json'), join(dir, 'store.json'))
  assert.equal(result.code, 1)
  assert.match(result.stderr, /ملف القبول غير موجود/)
  rmSync(dir, { recursive: true, force: true })
})
