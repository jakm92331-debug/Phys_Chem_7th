import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2, Clock, FileText, Shapes } from 'lucide-react'
import type { CurriculumEntry, Unit } from '@/types/content'
import { useProgress } from '@/state/progress'
import { ProgressBar, SourceBadge, StatusChip } from '@/components/ui/ui'
import { UNIT_ICONS, UnitMotif } from '@/components/icons'
import { mathToPlainText } from '@/lib/tex'
import { Measure, RichText } from '@/components/math/Math'
import './cards.css'

function unitVars(unit: Unit): CSSProperties {
  return {
    '--unit-primary': unit.theme.primary,
    '--unit-secondary': unit.theme.secondary,
    '--unit-soft': unit.theme.soft,
  } as CSSProperties
}

/** Large unit card used on the home page. */
export function UnitCard({ unit }: { unit: Unit }) {
  const { getLesson } = useProgress()
  const Icon = UNIT_ICONS[unit.theme.icon]
  const total = unit.entries.length
  const completed = unit.entries.filter((e) => getLesson(e.id).status === 'completed').length
  const lessons = unit.entries.filter((e) => e.kind === 'lesson').length
  const projects = unit.entries.filter((e) => e.kind === 'project').length

  return (
    <article className="unit-card" style={unitVars(unit)}>
      <div className="unit-card__band">
        <UnitMotif motif={unit.theme.motif} className="unit-card__motif" />
        <span className="unit-card__order">
          الوحدة <span className="num">{unit.order}</span>
        </span>
        <span className="unit-card__icon">
          <Icon size={30} aria-hidden="true" />
        </span>
      </div>
      <div className="unit-card__body">
        <h3 className="unit-card__title">
          <RichText text={unit.title} />
        </h3>
        <p className="unit-card__subtitle">
          <RichText text={unit.subtitle} />
        </p>
        <p className="unit-card__desc">
          <RichText text={unit.description} />
        </p>

        <div className="unit-card__meta">
          <span>
            <BookOpen size={15} aria-hidden="true" /> <span className="num">{lessons}</span> دروس
          </span>
          {projects > 0 && (
            <span>
              <Shapes size={15} aria-hidden="true" /> <span className="num">{projects}</span> مشروع
            </span>
          )}
          <span>
            <CheckCircle2 size={15} aria-hidden="true" /> أكملت <span className="num">{completed}</span> من{' '}
            <span className="num">{total}</span>
          </span>
        </div>

        <ProgressBar
          ratio={total ? completed / total : 0}
          color={unit.theme.primary}
          label={`تقدّمك في وحدة ${mathToPlainText(unit.title)}`}
          size="sm"
        />

        <Link
          to={`/curriculum#${unit.id}`}
          className="unit-card__cta"
          aria-label={`استكشف دروس وحدة ${mathToPlainText(unit.title)}`}
        >
          استكشف دروس الوحدة
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

/** Curriculum entry (lesson or project) card used in the explorer. */
export function EntryCard({ entry, unit }: { entry: CurriculumEntry; unit: Unit }) {
  const { getLesson } = useProgress()
  const progress = getLesson(entry.id)
  const isProject = entry.kind === 'project'
  const stageRatio = progress.stagesDone.length / 7

  return (
    <article
      className={`entry-card${isProject ? ' entry-card--project' : ''}`}
      style={unitVars(unit)}
    >
      <div className="entry-card__top">
        <span className="entry-card__number" aria-hidden="true">
          <span className="num">{entry.order}</span>
        </span>
        <span className={`entry-card__kind${isProject ? ' is-project' : ''}`}>
          {isProject ? (
            <>
              <Shapes size={14} aria-hidden="true" /> مشروع الوحدة
            </>
          ) : (
            <>
              <BookOpen size={14} aria-hidden="true" /> درس
            </>
          )}
        </span>
        <StatusChip status={progress.status} />
      </div>

      <h3 className="entry-card__title">
        <RichText text={entry.title} />
      </h3>
      <p className="entry-card__teaser">
        <RichText text={entry.teaser} />
      </p>

      {(progress.status !== 'not-started') && (
        <ProgressBar
          ratio={progress.status === 'completed' ? 1 : stageRatio}
          color={unit.theme.primary}
          label={`تقدّمك في ${mathToPlainText(entry.title)}`}
          size="sm"
        />
      )}

      <div className="entry-card__meta">
        <span>
          <FileText size={15} aria-hidden="true" /> صفحة <span className="num">{entry.page}</span> في الكتاب
        </span>
        <span>
          <Clock size={15} aria-hidden="true" /> نحو{' '}
          <Measure value={entry.estimatedMinutes} unit="minute" digits={0} />
        </span>
      </div>

      <div className="entry-card__foot">
        <SourceBadge status={entry.contentStatus} />
        <Link
          to={`/lesson/${entry.slug}`}
          className="entry-card__cta"
          aria-label={`${progress.status === 'not-started' ? 'افتح' : 'تابع'}: ${mathToPlainText(entry.title)}`}
        >
          {progress.status === 'completed'
            ? 'راجع الدرس'
            : progress.status === 'in-progress'
              ? 'تابِع التعلّم'
              : isProject
                ? 'افتح المشروع'
                : 'افتح الدرس'}
          <ArrowLeft size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
