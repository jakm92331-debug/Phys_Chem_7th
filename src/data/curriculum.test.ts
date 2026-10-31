import { describe, expect, it } from 'vitest'
import {
  ALL_ENTRIES,
  LESSON_STAGES,
  TOTAL_LESSONS,
  TOTAL_PROJECTS,
  UNITS,
  getAdjacentEntries,
  getEntryBySlug,
  getUnitForEntry,
} from './curriculum'

/**
 * Guards the verified textbook table of contents. If anyone renames,
 * reorders or renumbers an entry, this suite fails loudly.
 */
const EXPECTED_TOC: [title: string, page: number, kind: 'lesson' | 'project'][] = [
  ['الحركة والسكون', 3, 'lesson'],
  ['القوة والحركة', 17, 'lesson'],
  ['القوى على حامل واحد', 29, 'lesson'],
  ['العمل والاستطاعة', 41, 'lesson'],
  ['الآلات البسيطة', 53, 'lesson'],
  ['الضغط', 65, 'lesson'],
  ['الضغط في السوائل', 71, 'lesson'],
  ['دافعة أرخميدس', 81, 'lesson'],
  ['مشروع وسائل النقل', 92, 'project'],
  ['الحرارة', 93, 'lesson'],
  ['انتشار الحرارة', 101, 'lesson'],
  ['تمدد الأجسام بالحرارة', 111, 'lesson'],
  ['الذرة', 123, 'lesson'],
  ['العناصر والمركبات', 131, 'lesson'],
  ['الأمواج الصوتية', 141, 'lesson'],
  ['مشروع المحافظة الحرارية للسوائل', 155, 'project'],
]

describe('curriculum structure (verified TOC)', () => {
  it('has exactly 4 units with the official titles in order', () => {
    expect(UNITS).toHaveLength(4)
    expect(UNITS.map((u) => u.title)).toEqual([
      'الحركة والتحريك',
      'الضغط ودافعة أرخميدس',
      'المادة والحرارة',
      'المادة والطاقة',
    ])
    expect(UNITS.map((u) => u.order)).toEqual([1, 2, 3, 4])
  })

  it('has exactly 16 entries: 14 lessons and 2 projects', () => {
    expect(ALL_ENTRIES).toHaveLength(16)
    expect(TOTAL_LESSONS).toBe(14)
    expect(TOTAL_PROJECTS).toBe(2)
  })

  it('matches every title, page number and kind from the table of contents', () => {
    EXPECTED_TOC.forEach(([title, page, kind], i) => {
      const entry = ALL_ENTRIES[i]
      expect(entry.order).toBe(i + 1)
      expect(entry.title).toBe(title)
      expect(entry.page).toBe(page)
      expect(entry.kind).toBe(kind)
    })
  })

  it('has unique ids and slugs, and every entry belongs to its unit', () => {
    expect(new Set(ALL_ENTRIES.map((e) => e.id)).size).toBe(16)
    expect(new Set(ALL_ENTRIES.map((e) => e.slug)).size).toBe(16)
    for (const entry of ALL_ENTRIES) {
      const unit = getUnitForEntry(entry)
      expect(unit.entries.some((e) => e.id === entry.id)).toBe(true)
    }
  })

  it('distributes entries across units as 5 / 4 / 3 / 4', () => {
    expect(UNITS.map((u) => u.entries.length)).toEqual([5, 4, 3, 4])
  })

  it('marks only lesson 1 as demo content; everything else awaits the textbook', () => {
    const lesson1 = getEntryBySlug('motion-and-rest')
    expect(lesson1?.contentStatus).toBe('demo-supplementary')
    for (const entry of ALL_ENTRIES) {
      if (entry.id !== lesson1?.id) expect(entry.contentStatus).toBe('pending')
      expect(entry.contentStatus).not.toBe('textbook-verified')
    }
  })

  it('provides working previous/next navigation', () => {
    const first = ALL_ENTRIES[0]
    const last = ALL_ENTRIES[ALL_ENTRIES.length - 1]
    expect(getAdjacentEntries(first).prev).toBeUndefined()
    expect(getAdjacentEntries(first).next?.order).toBe(2)
    expect(getAdjacentEntries(last).next).toBeUndefined()
    expect(getAdjacentEntries(last).prev?.order).toBe(15)
  })

  it('defines the 7 reusable lesson stages in order', () => {
    expect(LESSON_STAGES.map((s) => s.id)).toEqual([
      'hook',
      'discover',
      'lab',
      'check',
      'apply',
      'quiz',
      'summary',
    ])
  })
})
