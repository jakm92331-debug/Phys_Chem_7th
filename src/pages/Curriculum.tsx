import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, CheckCircle2, Shapes } from 'lucide-react'
import { ALL_ENTRIES, TOTAL_LESSONS, TOTAL_PROJECTS, UNITS } from '@/data/curriculum'
import { EntryCard } from '@/components/curriculum/cards'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/ui/ui'
import { UNIT_ICONS, UnitMotif } from '@/components/icons'
import { useProgress } from '@/state/progress'
import type { Unit } from '@/types/content'
import './Curriculum.css'

type Filter = 'all' | 'lessons' | 'projects' | 'in-progress' | 'completed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'lessons', label: 'الدروس فقط' },
  { id: 'projects', label: 'المشاريع فقط' },
  { id: 'in-progress', label: 'ما بدأته' },
  { id: 'completed', label: 'ما أكملته' },
]

function UnitSection({ unit, filter }: { unit: Unit; filter: Filter }) {
  const { getLesson } = useProgress()
  const Icon = UNIT_ICONS[unit.theme.icon]
  const completed = unit.entries.filter((e) => getLesson(e.id).status === 'completed').length

  const visible = unit.entries.filter((e) => {
    const status = getLesson(e.id).status
    switch (filter) {
      case 'lessons':
        return e.kind === 'lesson'
      case 'projects':
        return e.kind === 'project'
      case 'in-progress':
        return status === 'in-progress'
      case 'completed':
        return status === 'completed'
      default:
        return true
    }
  })

  if (visible.length === 0) return null

  return (
    <section
      id={unit.id}
      className="unit-section"
      style={
        {
          '--unit-primary': unit.theme.primary,
          '--unit-secondary': unit.theme.secondary,
          '--unit-soft': unit.theme.soft,
        } as CSSProperties
      }
      aria-labelledby={`${unit.id}-title`}
    >
      <header className="unit-section__head">
        <span className="unit-section__icon">
          <Icon size={28} aria-hidden="true" />
        </span>
        <div className="unit-section__titles">
          <p className="unit-section__kicker">
            الوحدة <span className="num">{unit.order}</span>
          </p>
          <h2 id={`${unit.id}-title`} className="unit-section__title">
            {unit.title}
          </h2>
          <p className="unit-section__subtitle">{unit.subtitle}</p>
        </div>
        <UnitMotif motif={unit.theme.motif} className="unit-section__motif" />
        <div className="unit-section__progress">
          <span>
            <CheckCircle2 size={16} aria-hidden="true" /> أكملت <span className="num">{completed}</span> من{' '}
            <span className="num">{unit.entries.length}</span>
          </span>
          <ProgressBar
            ratio={unit.entries.length ? completed / unit.entries.length : 0}
            color={unit.theme.primary}
            label={`تقدّمك في وحدة ${unit.title}`}
            size="sm"
          />
        </div>
      </header>

      <div className="entries-grid">
        {visible.map((entry) => (
          <EntryCard key={entry.id} entry={entry} unit={unit} />
        ))}
      </div>
    </section>
  )
}

export function CurriculumPage() {
  const { completedCount } = useProgress()
  const [filter, setFilter] = useState<Filter>('all')
  const location = useLocation()

  // Support deep links like /curriculum#unit-2-pressure
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      // wait a tick so layout is ready, then scroll below the sticky header
      const t = window.setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
      return () => window.clearTimeout(t)
    }
  }, [location.hash])

  const visibleUnits = useMemo(() => UNITS, [])
  const anyVisible = visibleUnits.some((u) => u.entries.length > 0)

  return (
    <>
      <PageHeader
        kicker="المنهج الدراسي الكامل"
        title="خريطة رحلتك العلمية"
        lead="أربع وحدات، أربعة عشر درساً ومشروعان — بالترتيب نفسه وأرقام الصفحات نفسها في كتابك المدرسي. افتح أيّ درس لتبدأ رحلة تعلّمه."
      >
        <div className="curr-summary">
          <div className="curr-summary__row">
            <span>
              <BookOpen size={17} aria-hidden="true" /> <span className="num">{TOTAL_LESSONS}</span> درساً
            </span>
            <span>
              <Shapes size={17} aria-hidden="true" /> <span className="num">{TOTAL_PROJECTS}</span> مشروعاً
            </span>
            <span>
              <CheckCircle2 size={17} aria-hidden="true" /> أكملت{' '}
              <span className="num">{completedCount}</span>
            </span>
          </div>
          <ProgressBar
            ratio={ALL_ENTRIES.length ? completedCount / ALL_ENTRIES.length : 0}
            label="تقدّمك الإجمالي في المنهج"
          />
          <p className="curr-summary__hint">يُحفظ تقدّمك تلقائياً على هذا الجهاز</p>
        </div>
      </PageHeader>

      <div className="container curr-body">
        <div className="curr-filters" role="group" aria-label="تصفية عناصر المنهج">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-chip${filter === f.id ? ' is-active' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {anyVisible &&
          UNITS.map((unit) => <UnitSection key={unit.id} unit={unit} filter={filter} />)}

        {filter !== 'all' && (
          <p className="curr-empty-hint">
            تُخفى الوحدات التي لا تحتوي عناصر مطابقة للتصفية الحالية.
          </p>
        )}
      </div>
    </>
  )
}
