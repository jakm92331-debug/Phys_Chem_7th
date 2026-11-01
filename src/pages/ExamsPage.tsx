import { Link } from 'react-router-dom'
import { ArrowLeft, FileQuestion, Lock } from 'lucide-react'
import { UNITS } from '@/data/curriculum'
import { examsForUnit, getUnitExams } from '@/data/exams'
import { useProgress } from '@/state/progress'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton, SourceBadge } from '@/components/ui/ui'
import { UNIT_ICONS, UnitMotif } from '@/components/icons'
import { RichText } from '@/components/math/Math'
import { mathToPlainText } from '@/lib/tex'
import './ExamsPage.css'

export function ExamsPage() {
  const { getExam } = useProgress()

  return (
    <>
      <PageHeader
        kicker="الاختبارات"
        title="اختر اختباراً واختبر نفسك"
        lead="اختبارات الدروس تنظَّم حسب الوحدات والدروس تماماً كما في المنهج. بعد كل درس معتمد يمكن إنشاء اختبار خاص به؛ أما اختبارات الوحدات فلا تُنشأ إلا بقرار صريح منك عندما يكون الدرس هو الأخير في وحدته."
      />

      <div className="container exams-body">
        {UNITS.map((unit) => {
          const Icon = UNIT_ICONS[unit.theme.icon]
          const exams = examsForUnit(unit.id)
          const unitExam = getUnitExams(unit.id)
          return (
            <section
              id={unit.id}
              key={unit.id}
              className="exams-unit"
              style={
                {
                  '--unit-primary': unit.theme.primary,
                  '--unit-secondary': unit.theme.secondary,
                  '--unit-soft': unit.theme.soft,
                } as React.CSSProperties
              }
              aria-labelledby={`${unit.id}-title`}
            >
              <header className="exams-unit__head">
                <span className="exams-unit__icon">
                  <Icon size={26} aria-hidden="true" />
                </span>
                <div className="exams-unit__titles">
                  <p className="exams-unit__kicker">
                    الوحدة <span className="num">{unit.order}</span>
                  </p>
                  <h2 id={`${unit.id}-title`} className="exams-unit__title">
                    <RichText text={unit.title} />
                  </h2>
                </div>
                <UnitMotif motif={unit.theme.motif} className="exams-unit__motif" />
              </header>

              {exams.length === 0 ? (
                <p className="exams-empty">
                  <FileQuestion size={20} aria-hidden="true" />
                  لا يوجد اختبار لهذه الوحدة بعد. تُضاف اختبارات الدروس بعد اعتماد الدروس
                  الفعلية، واختبار الوحدة يُنشَأ فقط عند إشارتك الصريحة إلى أنه آخر درس في الوحدة.
                </p>
              ) : (
                <ul className="exams-list">
                  {exams.map((exam) => {
                    const record = getExam(exam.id)
                    return (
                      <li key={exam.id}>
                        <Link to={`/exam/${encodeURIComponent(exam.id)}`} className="exams-card">
                          <span className="exams-card__main">
                            <span className="exams-card__type">
                              {exam.kind === 'unit' ? 'اختبار الوحدة' : 'اختبار الدرس'}
                            </span>
                            <strong>
                              <RichText text={exam.title} inlineOnly />
                            </strong>
                            <span className="exams-card__sub">
                              {exam.kind === 'unit'
                                ? `تضمّ جميع دروس وحدة ${mathToPlainText(unit.title)}`
                                : 'رابط مباشرة بالدرس في المنهج'}
                            </span>
                          </span>
                          <span className="exams-card__side">
                            <SourceBadge status={exam.source} />
                            {record.attempts > 0 ? (
                              <span className="exams-card__score">
                                أفضل نتيجة:{' '}
                                <span className="num">
                                  {Math.round(record.bestScore * 100)}٪
                                </span>
                                <span className="num"> ({record.attempts} محاولات)</span>
                              </span>
                            ) : (
                              <span className="exams-card__score exams-card__score--new">
                                <Lock size={14} aria-hidden="true" /> لم تجرِّه بعد
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              {exams.length > 0 && unitExam.length === 0 && (
                <p className="exams-rule" role="note">
                  <Lock size={15} aria-hidden="true" />
                  قاعدة دائمة: لا يُنشأ اختبار الوحدة تلقائياً بعد كلّ درس. يُنشَأ فقط عندما تحدد
                  صراحةً أن الدرس المُرسَل هو آخر درس في هذه الوحدة.
                </p>
              )}
            </section>
          )
        })}

        <div className="exams-foot">
          <LinkButton to="/curriculum" variant="secondary">
            <ArrowLeft size={17} aria-hidden="true" /> العودة إلى المنهج الدراسي
          </LinkButton>
        </div>
      </div>
    </>
  )
}
