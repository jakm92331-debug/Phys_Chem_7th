import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Lightbulb,
  RotateCcw,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react'
import type { CurriculumEntry, Exam, Unit } from '@/types/content'
import { useProgress } from '@/state/progress'
import { formatScore, gradeExam, isAnswered, type ExamResponse, type ExamResult } from '@/lib/exam'
import { ActionButton, LinkButton, ProgressBar, SourceBadge } from '@/components/ui/ui'
import { UNIT_ICONS, UnitMotif } from '@/components/icons'
import { RichText } from '@/components/math/Math'
import './ExamRunner.css'

const DIFFICULTY_LABEL = { easy: 'أساسي', medium: 'متوسط', hard: 'متقدّم' } as const

const OPEN_CATEGORY_LABEL = {
  understanding: 'فهم',
  application: 'تطبيق',
  inference: 'استنتاج',
} as const

const TYPE_LABEL = {
  mcq: 'اختيار من متعدد',
  'true-false': 'صح أو خطأ',
  calculation: 'حسابية',
  open: 'إجابة مفتوحة',
} as const

function ExamHeader({ exam, entry, unit }: { exam: Exam; entry?: CurriculumEntry; unit?: Unit }) {
  const Icon = unit ? UNIT_ICONS[unit.theme.icon] : BookOpen
  return (
    <section
      className="exam-header"
      style={
        {
          '--unit-primary': unit?.theme.primary,
          '--unit-secondary': unit?.theme.secondary,
        } as React.CSSProperties
      }
    >
      <div className="container exam-header__inner">
        <nav className="crumbs" aria-label="مسار التنقّل">
          <Link to="/exams">الاختبارات</Link>
          <ChevronLeft size={15} aria-hidden="true" />
          <span aria-current="page">
            <RichText text={exam.title} inlineOnly />
          </span>
        </nav>
        <div className="exam-header__main">
          <span className="exam-header__icon">
            <Icon size={30} aria-hidden="true" />
          </span>
          <div className="exam-header__titles">
            <h1 className="exam-header__title">
              <RichText text={exam.title} />
            </h1>
            <p className="exam-header__sub">
              {exam.kind === 'unit' && unit ? (
                <>
                  اختبار الوحدة <span className="num">{unit.order}</span>:{' '}
                  <RichText text={unit.title} inlineOnly />
                </>
              ) : (
                <>
                  {entry ? (
                    <>
                      درس «<RichText text={entry.title} inlineOnly />» · صفحة{' '}
                      <span className="num">{entry.page}</span> في الكتاب
                    </>
                  ) : (
                    'اختبار درس'
                  )}
                </>
              )}
            </p>
          </div>
          <UnitMotif motif={unit?.theme.motif ?? 'trajectory'} className="exam-header__motif" />
        </div>
        <div className="exam-header__meta">
          <span>
            <BookOpen size={16} aria-hidden="true" /> {exam.questions.length} أسئلة
          </span>
          <SourceBadge status={exam.source} />
        </div>
      </div>
    </section>
  )
}

function QuestionView({
  question,
  index,
  response,
  submitted,
  result,
  onChange,
}: {
  question: Exam['questions'][number]
  index: number
  response: ExamResponse | undefined
  submitted: boolean
  result: QuestionOutcome | undefined
  onChange: (r: ExamResponse) => void
}) {
  const showReview = submitted && result !== undefined
  const isRight = showReview && result?.correct === true
  const isWrong = showReview && result?.correct === false

  return (
    <fieldset
      className={`exam-q${showReview ? (isRight ? ' is-right' : isWrong ? ' is-wrong' : ' is-open') : ''}`}
    >
      <legend className="exam-q__legend">
        <span className="exam-q__num num">{index + 1}</span>
        <span className="exam-q__prompt">
          <RichText text={question.prompt} inlineOnly />
        </span>
        <span className="exam-q__type">{TYPE_LABEL[question.type.kind]}</span>
        <span className={`exam-q__diff exam-q__diff--${question.difficulty}`}>
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
      </legend>

      {/* ——— Answer area ——— */}
      {question.type.kind === 'mcq' && (
        <div className="exam-q__choices">
          {question.choices?.map((choice, i) => (
            <label key={i} className={`exam-choice${response?.mcq === i ? ' is-picked' : ''}`}>
              <input
                type="radio"
                name={question.id}
                className="sr-only"
                disabled={submitted}
                checked={response?.mcq === i}
                onChange={() => onChange({ mcq: i })}
              />
              <span className="exam-choice__bullet num" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <RichText text={choice} inlineOnly />
              </span>
            </label>
          ))}
        </div>
      )}

      {question.type.kind === 'true-false' && (
        <div className="exam-q__tf">
          {[
            { value: true, label: 'صحيح', icon: CheckCircle2 },
            { value: false, label: 'خطأ', icon: XCircle },
          ].map(({ value, label, icon: Icon }) => (
            <label key={String(value)} className={`exam-tf${response?.trueFalse === value ? ' is-picked' : ''}`}>
              <input
                type="radio"
                name={question.id}
                className="sr-only"
                disabled={submitted}
                checked={response?.trueFalse === value}
                onChange={() => onChange({ trueFalse: value })}
              />
              <span className="exam-tf__bullet" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}

      {question.type.kind === 'calculation' && (
        <div className="exam-q__calc">
          <label className="exam-q__calc-label" htmlFor={`calc-${question.id}`}>
            <RichText
              text={
                question.expectedUnit
                  ? `اكتب القيمة مع رمز الوحدة (${question.expectedUnit})`
                  : 'اكتب القيمة العددية'
              }
              inlineOnly
            />
          </label>
          <input
            id={`calc-${question.id}`}
            type="text"
            className="exam-q__calc-input"
            placeholder={question.expectedUnit ? `مثل: 5 m/s` : 'مثل: 5'}
            disabled={submitted}
            value={response?.calculation ?? ''}
            onChange={(e) => onChange({ calculation: e.target.value })}
          />
        </div>
      )}

      {question.type.kind === 'open' && (
        <div className="exam-q__open">
          <label className="exam-q__calc-label" htmlFor={`open-${question.id}`}>
            سؤال {OPEN_CATEGORY_LABEL[question.type.category]} — اكتب إجابتك بالتفصيل
          </label>
          <textarea
            id={`open-${question.id}`}
            className="exam-q__open-input"
            rows={4}
            placeholder="اكتب إجابتك هنا…"
            disabled={submitted}
            value={response?.open ?? ''}
            onChange={(e) => onChange({ open: e.target.value })}
          />
          <p className="exam-q__open-note">
            <Lightbulb size={15} aria-hidden="true" />
            هذا السؤال ذو إجابة مفتوحة: لا يُصحَّح آلياً، ويُعرض مفتاح الإجابة للمراجعة بعد التسليم.
          </p>
        </div>
      )}

      {/* ——— Review ——— */}
      {showReview && (
        <div className={`exam-q__review${isRight ? ' is-right' : isWrong ? ' is-wrong' : ' is-open'}`}>
          {question.type.kind === 'open' ? (
            <>
              <p className="exam-q__review-head">
                <Sparkles size={18} aria-hidden="true" /> مفتاح الإجابة والمعايير (للمراجعة، لا للتصحيح الآلي)
              </p>
              <p className="exam-q__model">
                <strong>الإجابة النموذجية:</strong> <RichText text={question.modelAnswer ?? ''} inlineOnly />
              </p>
              {question.rubric && (
                <p className="exam-q__rubric">
                  <strong>معايير الإجابة:</strong> <RichText text={question.rubric} inlineOnly />
                </p>
              )}
              <p className="exam-q__expl">
                <Lightbulb size={16} aria-hidden="true" />{' '}
                <RichText text={question.explanation} inlineOnly />
              </p>
            </>
          ) : (
            <p className="exam-q__expl">
              {isRight ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <XCircle size={18} aria-hidden="true" />
              )}
              <span>
                <strong>{isRight ? 'إجابة صحيحة. ' : 'ليست صحيحة. '}</strong>
                <RichText text={question.explanation} inlineOnly />
              </span>
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}

type QuestionOutcome = ExamResult['results'][number]

export function ExamRunner({
  exam,
  entry,
  unit,
}: {
  exam: Exam
  entry?: CurriculumEntry
  unit?: Unit
}) {
  const { recordExam, getExam } = useProgress()
  const [responses, setResponses] = useState<Record<string, ExamResponse>>({})
  const [result, setResult] = useState<ExamResult | null>(null)
  const [attempt, setAttempt] = useState(1)

  const autoGradedQuestions = useMemo(
    () => exam.questions.filter((q) => q.type.kind !== 'open'),
    [exam],
  )
  const openQuestions = useMemo(() => exam.questions.length - autoGradedQuestions.length, [exam])

  const answeredAuto = autoGradedQuestions.filter((q) => isAnswered(q, responses[q.id])).length
  const allAutoAnswered = answeredAuto === autoGradedQuestions.length

  const previousAttempt = getExam(exam.id)

  const onChange = (id: string, r: ExamResponse) => {
    setResponses((prev) => ({ ...prev, [id]: r }))
  }

  const submit = () => {
    if (!allAutoAnswered) return
    const graded = gradeExam(exam, responses)
    setResult(graded)
    recordExam(exam.id, entry?.id ?? exam.entryId, exam.title, graded.score01)
  }

  const retry = () => {
    setResponses({})
    setResult(null)
    setAttempt((a) => a + 1)
  }

  const passed = result !== null && result.score01 >= 0.6

  return (
    <>
      <ExamHeader exam={exam} entry={entry} unit={unit} />
      <div className="container exam-body">
        {exam.source === 'demo-supplementary' && (
          <p className="demo-banner" role="note">
            <AlertTriangle size={20} aria-hidden="true" />
            <strong>نسخة توضيحية تجريبية:</strong> هذا الاختبار موادّ إضافية سليمة علمياً أُعدّت لعرض
            إمكانات نظام الاختبارات، ولم تُطابَق بعدُ حرفياً مع الكتاب المدرسي. لا تُنسب أسئلته إلى
            الكتاب.
          </p>
        )}

        {result === null ? (
          <div className="exam-run" key={attempt}>
            <div className="exam-run__head">
              <p>
                أجب عن الأسئلة التالية. الأسئلة ذات الإجابات المفتوحة
                <strong> {openQuestions} </strong>
                لا تُصحَّح آلياً، وتُعرض إجاباتها النموذجية بعد التسليم.
              </p>
              <p>
                أجبت عن{' '}
                <strong className="num">{answeredAuto}</strong> من{' '}
                <strong className="num">{autoGradedQuestions.length}</strong> سؤالاً قابلاً للتصحيح
                الآلي.
              </p>
              <ProgressBar
                ratio={autoGradedQuestions.length ? answeredAuto / autoGradedQuestions.length : 0}
                label="تقدّمك في الإجابات"
                size="sm"
              />
            </div>

            {exam.questions.map((q, i) => (
              <QuestionView
                key={q.id}
                question={q}
                index={i}
                response={responses[q.id]}
                submitted={false}
                result={undefined}
                onChange={(r) => onChange(q.id, r)}
              />
            ))}

            <div className="exam-submit">
              <p aria-live="polite">
                {allAutoAnswered
                  ? 'يمكنك التسليم الآن — تظهر النتيجة والشرح بعد ذلك.'
                  : 'أكمل الإجابات عن الأسئلة القابلة للتصحيح الآلي أولاً.'}
              </p>
              <div className="exam-submit__actions">
                <ActionButton size="lg" disabled={!allAutoAnswered} onClick={submit}>
                  <Send size={18} aria-hidden="true" /> تسليم الإجابات ومشاهدة النتيجة
                </ActionButton>
                <LinkButton to="/exams" variant="secondary">
                  <ArrowLeft size={17} aria-hidden="true" /> العودة إلى الاختبارات
                </LinkButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="exam-review" key={attempt}>
            <div
              className={`exam-result${passed ? ' is-pass' : ' is-fail'}`}
              role="status"
              aria-live="polite"
            >
              <p className="exam-result__score">
                نتيجتك: <strong className="num">{Math.round(result.score01 * 100)}٪</strong>
                <span className="exam-result__fraction"> ({formatScore(result)})</span>
              </p>
              <p>
                {result.score01 >= 1
                  ? 'علامة كاملة على الأسئلة المصحّحة آلياً! راجع الأسئلة المفتوحة بالأسفل.'
                  : passed
                    ? 'أحسنت! تجاوزت حدّ الإتقان. راجع شرح الأسئلة التي أخطأت فيها.'
                    : 'لم تصل بعدُ إلى حدّ الإتقان (60٪). راجع الشروحات ثم أعد المحاولة.'}
              </p>
              {openQuestions > 0 && (
                <p className="exam-result__note">
                  <AlertTriangle size={16} aria-hidden="true" />
                  الأسئلة المفتوحة ({openQuestions}) لا تدخل في النتيجة الآلية؛ يُعرض مفتاح الإجابة
                  وعيايير التقييم للمراجعة.
                </p>
              )}
              {previousAttempt.attempts > 0 && (
                <p className="exam-result__history">
                  محاولات سابقة: <span className="num">{previousAttempt.attempts}</span> · أفضل
                  نتيجة:{' '}
                  <span className="num">{Math.round(previousAttempt.bestScore * 100)}٪</span>
                </p>
              )}
              <ActionButton variant="secondary" onClick={retry}>
                <RotateCcw size={17} aria-hidden="true" /> إعادة الاختبار
              </ActionButton>
            </div>

            {exam.questions.map((q, i) => (
              <QuestionView
                key={q.id}
                question={q}
                index={i}
                response={responses[q.id]}
                submitted
                result={result.results[i]}
                onChange={() => {}}
              />
            ))}

            <div className="exam-submit">
              <LinkButton to="/exams" variant="secondary">
                <ArrowLeft size={17} aria-hidden="true" /> العودة إلى الاختبارات
              </LinkButton>
            </div>
          </div>
        )}

        {entry && (
          <p className="exam-foot-note">
            يحفظ تقدّمك تلقائياً على هذا الجهاز ضمن نظام المنصة (نقاط الخبرة والشارات وسجل
            النشاط).
          </p>
        )}
      </div>
    </>
  )
}
