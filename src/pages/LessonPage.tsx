import { useEffect, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Clock,
  FileText,
  Hourglass,
  Shapes,
} from 'lucide-react'
import {
  LESSON_STAGES,
  getAdjacentEntries,
  getEntryBySlug,
  getUnitForEntry,
} from '@/data/curriculum'
import { getLessonContent } from '@/data/lessons'
import type { CurriculumEntry, Unit } from '@/types/content'
import { LessonShell } from '@/components/lesson/LessonShell'
import { LinkButton, ProgressBar, SourceBadge, StatusChip } from '@/components/ui/ui'
import { UNIT_ICONS, UnitMotif } from '@/components/icons'
import { useProgress } from '@/state/progress'
import './LessonPage.css'

function LessonHeader({ entry, unit }: { entry: CurriculumEntry; unit: Unit }) {
  const { getLesson } = useProgress()
  const progress = getLesson(entry.id)
  const Icon = UNIT_ICONS[unit.theme.icon]
  const isProject = entry.kind === 'project'

  return (
    <section
      className="lesson-header"
      style={
        {
          '--unit-primary': unit.theme.primary,
          '--unit-secondary': unit.theme.secondary,
        } as CSSProperties
      }
    >
      <div className="container lesson-header__inner">
        <nav className="crumbs" aria-label="مسار التنقّل">
          <Link to="/curriculum">المنهج الدراسي</Link>
          <ChevronLeft size={15} aria-hidden="true" />
          <Link to={`/curriculum#${unit.id}`}>
            الوحدة <span className="num">{unit.order}</span>: {unit.title}
          </Link>
          <ChevronLeft size={15} aria-hidden="true" />
          <span aria-current="page">{entry.title}</span>
        </nav>

        <div className="lesson-header__main">
          <span className="lesson-header__icon">
            <Icon size={30} aria-hidden="true" />
          </span>
          <div className="lesson-header__titles">
            <p className="lesson-header__kicker">
              {isProject ? (
                <>
                  <Shapes size={15} aria-hidden="true" /> مشروع الوحدة
                </>
              ) : (
                <>
                  <BookOpen size={15} aria-hidden="true" /> الدرس{' '}
                  <span className="num">{entry.order}</span>
                </>
              )}
            </p>
            <h1 className="lesson-header__title">{entry.title}</h1>
            <p className="lesson-header__teaser">{entry.teaser}</p>
          </div>
          <UnitMotif motif={unit.theme.motif} className="lesson-header__motif" />
        </div>

        <div className="lesson-header__meta">
          <span>
            <FileText size={16} aria-hidden="true" /> صفحة{' '}
            <span className="num">{entry.page}</span> في الكتاب المدرسي
          </span>
          <span>
            <Clock size={16} aria-hidden="true" /> نحو{' '}
            <span className="num">{entry.estimatedMinutes}</span> دقيقة
          </span>
          <SourceBadge status={entry.contentStatus} />
          <StatusChip status={progress.status} />
          {progress.status !== 'not-started' && (
            <span className="lesson-header__progress">
              <ProgressBar
                ratio={progress.status === 'completed' ? 1 : progress.stagesDone.length / 7}
                label="تقدّمك في هذا الدرس"
                size="sm"
              />
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Honest placeholder for entries whose textbook content has not been added
 * yet. Shows exactly what the reusable lesson environment will contain.
 */
function PendingLesson({ entry }: { entry: CurriculumEntry }) {
  const isProject = entry.kind === 'project'
  return (
    <div className="pending-lesson">
      <div className="pending-lesson__banner">
        <Hourglass size={30} aria-hidden="true" />
        <div>
          <h2>محتوى هذا {isProject ? 'المشروع' : 'الدرس'} قيد الإعداد</h2>
          <p>
            نعمل على إضافة الشروح والأنشطة التفاعلية لهذا {isProject ? 'المشروع' : 'الدرس'} بعد
            مطابقتها مع صفحات الكتاب المدرسي (صفحة <span className="num">{entry.page}</span>).
            لا ننشر هنا أيّ محتوى لم يُتحقَّق منه — دقّة العلم أولاً.
          </p>
        </div>
      </div>

      <h3 className="pending-lesson__subtitle">ماذا سيضمّ هذا الدرس عند اكتماله؟</h3>
      <ol className="pending-stages">
        {LESSON_STAGES.map((stage, i) => (
          <li key={stage.id}>
            <span className="num" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <strong>{stage.title}</strong>
              <p>{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="pending-lesson__actions">
        <LinkButton to="/lesson/motion-and-rest">
          جرّب الدرس التوضيحي الأوّل كاملاً
          <ArrowLeft size={18} aria-hidden="true" />
        </LinkButton>
        <LinkButton to="/curriculum" variant="secondary">
          عودة إلى المنهج
        </LinkButton>
      </div>
      <p className="pending-lesson__note">
        في هذه الأثناء، يمكنك قراءة الدرس في كتابك المدرسي ابتداءً من صفحة{' '}
        <span className="num">{entry.page}</span>.
      </p>
    </div>
  )
}

function AdjacentNav({ entry }: { entry: CurriculumEntry }) {
  const { prev, next } = getAdjacentEntries(entry)
  return (
    <nav className="adjacent-nav" aria-label="التنقّل بين الدروس">
      {prev ? (
        <Link to={`/lesson/${prev.slug}`} className="adjacent-card">
          <span className="adjacent-card__label">
            <ArrowRight size={16} aria-hidden="true" /> السابق
          </span>
          <strong>
            {prev.kind === 'project' ? 'مشروع: ' : `الدرس ${prev.order}: `}
            {prev.title}
          </strong>
          <span className="adjacent-card__page">
            صفحة <span className="num">{prev.page}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={`/lesson/${next.slug}`} className="adjacent-card adjacent-card--next">
          <span className="adjacent-card__label">
            التالي <ArrowLeft size={16} aria-hidden="true" />
          </span>
          <strong>
            {next.kind === 'project' ? 'مشروع: ' : `الدرس ${next.order}: `}
            {next.title}
          </strong>
          <span className="adjacent-card__page">
            صفحة <span className="num">{next.page}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

export function LessonPage() {
  const { slug } = useParams<{ slug: string }>()
  const entry = slug ? getEntryBySlug(slug) : undefined

  useEffect(() => {
    document.title = entry
      ? `${entry.title} | أفق العلوم`
      : 'درس غير موجود | أفق العلوم'
    return () => {
      document.title = 'أفق العلوم | الفيزياء والكيمياء — الصف السابع'
    }
  }, [entry])

  if (!entry) {
    return (
      <div className="container lesson-missing">
        <h1>عذراً، هذا الدرس غير موجود</h1>
        <p>ربما تغيّر الرابط. عودة إلى خريطة المنهج لاختيار الدرس الصحيح.</p>
        <LinkButton to="/curriculum">عودة إلى المنهج الدراسي</LinkButton>
      </div>
    )
  }

  const unit = getUnitForEntry(entry)
  const content = getLessonContent(entry.id)

  return (
    <>
      <LessonHeader entry={entry} unit={unit} />
      <div className="container lesson-body">
        {content ? (
          <>
            {content.source === 'demo-supplementary' && (
              <p className="demo-banner" role="note">
                <strong>نسخة توضيحية تجريبية:</strong> شروح وأنشطة هذا الدرس موادّ إضافية سليمة
                علمياً أُعدّت لعرض إمكانات المنصّة، ولم تُطابَق بعدُ حرفياً مع الكتاب المدرسي.
              </p>
            )}
            <LessonShell entry={entry} unit={unit} content={content} />
          </>
        ) : (
          <PendingLesson entry={entry} />
        )}
        <AdjacentNav entry={entry} />
      </div>
    </>
  )
}
