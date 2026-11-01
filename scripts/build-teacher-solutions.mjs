#!/usr/bin/env node
/**
 * Builds server/data/teacher-solutions.json from teacher-solutions.intake.json.
 *
 * The intake document is maintained by hand (one JSON file, one slot per
 * textbook question per lesson). This script validates it with the same
 * structural rules the server enforces (mirrored from src/lib/solution-intake.ts)
 * and writes the store the authenticated server loads.
 *
 * Usage:
 *   node scripts/build-teacher-solutions.mjs [intakeFile] [outFile]
 *
 * Defaults: teacher-solutions.intake.json → server/data/teacher-solutions.json
 *
 * Exits non-zero on any validation error, printing every problem found.
 * Nothing here is a secret: the intake file contains only the teacher's
 * written solutions, never credentials.
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INTAKE_PATH = process.argv[2] ? resolve(process.argv[2]) : resolve(ROOT, 'teacher-solutions.intake.json')
const OUT_PATH = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, 'server/data/teacher-solutions.json')

/** Mirrors src/lib/solution-intake.ts — structural validation only. */
function validateSet(set) {
  const errors = []
  if (!set || typeof set !== 'object' || Array.isArray(set)) {
    return ['مجموعة الحلول يجب أن تكون كائناً']
  }
  if (typeof set.entryId !== 'string' || !set.entryId.trim()) errors.push('معرّف الدرس مطلوب')
  if (typeof set.entryTitle !== 'string' || !set.entryTitle.trim()) errors.push('عنوان الدرس مطلوب')
  if (!Number.isInteger(set.pageStart) || set.pageStart < 1) errors.push('صفحة البداية غير صحيحة')
  if (!Array.isArray(set.pages) || !set.pages.every((p) => Number.isInteger(p) && p >= 1)) {
    errors.push('صفحات الكتاب غير صحيحة')
  }
  if (!['pending', 'textbook-verified'].includes(set.status)) {
    errors.push('حالة الدرس يجب أن تكون pending أو textbook-verified')
  }
  if (!Array.isArray(set.solutions)) {
    errors.push('الحلول يجب أن تكون مصفوفة')
  } else {
    set.solutions.forEach((sol, i) => {
      if (!sol || typeof sol !== 'object' || Array.isArray(sol)) {
        errors.push(`الحل رقم ${i + 1}: يجب أن يكون كائناً`)
        return
      }
      const e = []
      if (typeof sol.id !== 'string' || !sol.id.trim()) e.push('المعرّف')
      if (!['understanding', 'exercise', 'problem'].includes(sol.type)) e.push('نوع السؤال')
      if (!Number.isInteger(sol.pageRef) || sol.pageRef < 1) e.push('رقم الصفحة')
      if (typeof sol.prompt !== 'string' || !sol.prompt.trim()) e.push('نص السؤال')
      if (typeof sol.answer !== 'string' || !sol.answer.trim()) e.push('الإجابة')
      if (!Array.isArray(sol.steps) || sol.steps.length === 0) e.push('خطوات الحل')
      if (!Array.isArray(sol.lawsUsed) || sol.lawsUsed.length === 0) e.push('القوانين')
      if (typeof sol.methodReasoning !== 'string' || !sol.methodReasoning.trim()) e.push('سبب اختيار الطريقة')
      if (typeof sol.substitutions !== 'string' || !sol.substitutions.trim()) e.push('التعويضات')
      e.forEach((msg) => errors.push(`الحل رقم ${i + 1}: ${msg} غير صحيح`))
    })
  }
  return errors
}

function main() {
  if (!existsSync(INTAKE_PATH)) {
    console.error(
      `ملف القبول غير موجود: ${INTAKE_PATH}\n` +
        'أنشئه من teacher-solutions.intake.example.json (أمثلة البنية)، ثم املأ الحلول.',
    )
    process.exit(1)
  }

  let doc
  try {
    doc = JSON.parse(readFileSync(INTAKE_PATH, 'utf8'))
  } catch (err) {
    console.error(`تعذّر قراءة ملف القبول: ${err.message}`)
    process.exit(1)
  }

  const errors = []
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    console.error('ملف القبول يجب أن يكون كائناً')
    process.exit(1)
  }
  if (doc.version !== 1) errors.push('الإصدار يجب أن يكون 1')
  if (!Array.isArray(doc.sets)) errors.push('مجموعات الحلول يجب أن تكون مصفوفة')
  else {
    doc.sets.forEach((set, i) => {
      validateSet(set).forEach((e) => errors.push(`المجموعة «${set?.entryId ?? i + 1}»: ${e}`))
    })
  }

  if (errors.length > 0) {
    console.error('فشل التحقق من ملف القبول:\n')
    errors.forEach((e) => console.error(`  • ${e}`))
    process.exit(1)
  }

  // intake (sets array) → store (solutions map keyed by entry id)
  const solutions = {}
  for (const set of doc.sets) {
    solutions[set.entryId] = set
  }

  const store = {
    version: 1,
    updatedAt: new Date().toISOString(),
    solutions,
  }

  // atomic write (same pattern as the server store)
  const tmp = `${OUT_PATH}.tmp`
  writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  renameSync(tmp, OUT_PATH)

  const count = Object.values(solutions).reduce((n, s) => n + s.solutions.length, 0)
  console.log(`تم بناء مستودع الحلول: ${OUT_PATH}`)
  console.log(`  ${Object.keys(solutions).length} درساً · ${count} حلاً`)
}

main()
