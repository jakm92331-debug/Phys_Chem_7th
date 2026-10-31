import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  FlaskConical,
  PartyPopper,
  Sparkles,
  Target,
} from 'lucide-react'
import type { CurriculumEntry, LessonContent, LessonStageId, Unit } from '@/types/content'
import { LESSON_STAGES, getAdjacentEntries } from '@/data/curriculum'
import { useProgress } from '@/state/progress'
import { ActionButton, ProgressBar } from '@/components/ui/ui'
import { RichText } from '@/components/math/Math'
import { ContentBlocks } from './ContentBlocks'
import { CheckSet, QuizSet } from './QuestionSet'
import { getLab } from '@/components/lab/registry'
import './LessonShell.css'

function StageDoneButton({
  done,
  label,
  onMark,
}: {
  done: boolean
  label: string
  onMark: () => void
}) {
  if (done) {
    return (
      <p className="stage-done-note">
        <CheckCircle2 size={19} aria-hidden="true" /> أكملت هذه المرحلة — أحسنت!
      </p>
    )
  }
  return (
    <ActionButton size="lg" onClick={onMark}>
      <Check size={19} aria-hidden="true" /> {label}
    </ActionButton>
  )
}

export function LessonShell({
  entry,
  unit,
  content,
}: {
  entry: CurriculumEntry
  unit: Unit
  content: LessonContent
}) {
  const { state, getLesson, markStageDone, recordQuiz, visitLesson } = useProgress()
  const progress = getLesson(entry.id)
  const panelRef = useRef<HTMLDivElement>(null)

  const requiredStages = useMemo<LessonStageId[]>(
    () =>
      LESSON_STAGES.map((s) => s.id).filter((id) => id !== 'lab' || Boolean(content.labId)),
    [content.labId],
  )
  const visibleStages = LESSON_STAGES.filter((s) => requiredStages.includes(s.id))

  const [activeStage, setActiveStage] = useState<LessonStageId>(() => {
    const firstUndone = requiredStages.find((id) => !progress.stagesDone.includes(id))
    return firstUndone ?? 'summary'
  })

  useEffect(() => {
    visitLesson(entry.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id])

  const markDone = useCallback(
    (stageId: LessonStageId, advance = false) => {
      markStageDone(entry.id, stageId, requiredStages, entry.title)
      if (advance) {
        const idx = requiredStages.indexOf(stageId)
        const next = requiredStages[idx + 1]
        if (next) setActiveStage(next)
      }
    },
    [entry.id, entry.title, markStageDone, requiredStages],
  )

  // Lab stage completes once the student has genuinely explored (>= 2 missions)
  const labMissionIds = useMemo(
    () => content.labGuide?.missions.map((m) => m.id) ?? [],
    [content.labGuide],
  )
  const doneLabCount = state.labMissions.filter((id) => labMissionIds.includes(id)).length
  useEffect(() => {
    if (content.labId && doneLabCount >= 2) markDone('lab')
  }, [content.labId, doneLabCount, markDone])

  const goToStage = (id: LessonStageId) => {
    setActiveStage(id)
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const isDone = (id: LessonStageId) => progress.stagesDone.includes(id)
  const doneCount = requiredStages.filter((id) => isDone(id)).length
  const activeMeta = LESSON_STAGES.find((s) => s.id === activeStage)!
  const activeIdx = requiredStages.indexOf(activeStage)
  const LabComponent = getLab(content.labId)
  const { next } = getAdjacentEntries(entry)
  const completed = progress.status === 'completed'

  const handleQuizSubmit = (score01: number) => {
    recordQuiz(entry.id, score01, entry.title)
    if (score01 >= 0.6) markDone('quiz')
  }

  return (
    <div className="lesson-shell">
      {/* ——— Stage stepper ——— */}
      <nav className="stage-stepper" aria-label="مراحل الدرس">
        <div className="stage-stepper__head">
          <span>
            تقدّمك في الدرس: <strong className="num">{doneCount}</strong> من{' '}
            <strong className="num">{requiredStages.length}</strong> مراحل
          </span>
          <ProgressBar
            ratio={requiredStages.length ? doneCount / requiredStages.length : 0}
            color={unit.theme.primary}
            label="تقدّمك في مراحل الدرس"
            size="sm"
          />
        </div>
        <ol className="stage-stepper__list">
          {visibleStages.map((stage, i) => {
            const done = isDone(stage.id)
            const active = stage.id === activeStage
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  className={`stage-btn${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => goToStage(stage.id)}
                >
                  <span className="stage-btn__num" aria-hidden="true">
                    {done ? <Check size={16} /> : <span className="num">{i + 1}</span>}
                  </span>
                  <span className="stage-btn__text">
                    <span className="stage-btn__title">
                      <RichText text={stage.title} inlineOnly />
                    </span>
                    <span className="stage-btn__desc">
                      <RichText text={stage.description} inlineOnly />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* ——— Stage panel ——— */}
      <div className="stage-panel" ref={panelRef}>
        <header className="stage-panel__head">
          <p className="stage-panel__kicker">
            المرحلة <span className="num">{activeIdx + 1}</span> من{' '}
            <span className="num">{requiredStages.length}</span>
            {isDone(activeStage) && (
              <span className="stage-panel__done">
                <CheckCircle2 size={15} aria-hidden="true" /> مكتملة
              </span>
            )}
          </p>
          <h2 className="stage-panel__title">
            <RichText text={activeMeta.title} />
          </h2>
          <p className="stage-panel__desc">
            <RichText text={activeMeta.description} />
          </p>
        </header>

        {activeStage === 'hook' && (
          <div className="stage-body">
            <div
              className="hook-question"
              style={{
                background: `linear-gradient(130deg, ${unit.theme.primary}, ${unit.theme.secondary})`,
              }}
            >
              <Sparkles size={26} aria-hidden="true" />
              <p>
                <RichText text={content.hook.question} />
              </p>
            </div>
            <p className="hook-scenario">
              <RichText text={content.hook.scenario} />
            </p>
            <aside className="hook-challenge">
              <Target size={20} aria-hidden="true" />
              <p>
                <RichText text={content.hook.challenge} />
              </p>
            </aside>
            <div className="hook-objectives">
              <h3>في نهاية هذا الدرس، سأستطيع أن:</h3>
              <ul>
                {content.objectives.map((obj) => (
                  <li key={obj}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <RichText text={obj} />
                  </li>
                ))}
              </ul>
              <p className="hook-objectives__note">
                أهداف تعلّم مقترحة لهذه النسخة التوضيحية، بانتظار مطابقتها مع أهداف الكتاب.
              </p>
            </div>
            <StageDoneButton
              done={isDone('hook')}
              label="أنا مستعد — لنبدأ الاكتشاف"
              onMark={() => markDone('hook', true)}
            />
          </div>
        )}

        {activeStage === 'discover' && (
          <div className="stage-body">
            <ContentBlocks blocks={content.discover} />
            <StageDoneButton
              done={isDone('discover')}
              label="فهمت المفاهيم — إلى المختبر"
              onMark={() => markDone('discover', true)}
            />
          </div>
        )}

        {activeStage === 'lab' && (
          <div className="stage-body">
            {content.labGuide && (
              <p className="lab-intro">
                <RichText text={content.labGuide.intro} />
              </p>
            )}
            {LabComponent && content.labGuide ? (
              <LabComponent entryId={entry.id} missions={content.labGuide.missions} />
            ) : (
              <p className="lab-missing">
                <FlaskConical size={20} aria-hidden="true" /> لا توجد تجربة تفاعلية مسجّلة لهذا
                الدرس بعد.
              </p>
            )}
            {isDone('lab') ? (
              <p className="stage-done-note">
                <CheckCircle2 size={19} aria-hidden="true" /> أكملت مرحلة المختبر — عمل رائع أيها
                الباحث!
              </p>
            ) : (
              <p className="lab-progress-hint" aria-live="polite">
                أكمل <strong>مهمّتين</strong> على الأقلّ من مهام المختبر لإنهاء هذه المرحلة (أنجزت{' '}
                <span className="num">{doneLabCount}</span> حتى الآن).
              </p>
            )}
          </div>
        )}

        {activeStage === 'check' && (
          <div className="stage-body">
            {isDone('check') && (
              <p className="stage-done-note">
                <CheckCircle2 size={19} aria-hidden="true" /> أكملت هذه المرحلة سابقاً — يمكنك
                إعادة التدريب متى شئت.
              </p>
            )}
            <CheckSet questions={content.checkQuestions} onAllSolved={() => markDone('check')} />
          </div>
        )}

        {activeStage === 'apply' && (
          <div className="stage-body">
            <ContentBlocks blocks={content.apply} />
            <StageDoneButton
              done={isDone('apply')}
              label="جرّبت التطبيقات — أكملت هذه المرحلة"
              onMark={() => markDone('apply', true)}
            />
          </div>
        )}

        {activeStage === 'quiz' && (
          <div className="stage-body">
            <p className="quiz-intro">
              اختبار قصير من <strong className="num">{content.quiz.length}</strong> أسئلة مع شرح
              فوري لكلّ إجابة. تحتاج إلى <strong>60٪</strong> على الأقلّ لإكمال هذه المرحلة — ويمكنك
              إعادة المحاولة دائماً.
              {progress.quizBestScore !== null && (
                <>
                  {' '}
                  أفضل نتيجة سابقة لك: <strong className="num">{Math.round(progress.quizBestScore * 100)}٪</strong>
                </>
              )}
            </p>
            <QuizSet questions={content.quiz} onSubmitScore={handleQuizSubmit} />
          </div>
        )}

        {activeStage === 'summary' && (
          <div className="stage-body">
            <div className="summary-ideas">
              <h3>الأفكار الكبرى في هذا الدرس</h3>
              <ol>
                {content.summary.keyIdeas.map((idea, i) => (
                  <li key={i}>
                    <span className="num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <p>
                      <RichText text={idea} />
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="summary-vocab">
              <h3>
                <BookMarked size={20} aria-hidden="true" /> مفرداتي العلمية
              </h3>
              <dl>
                {content.summary.vocabulary.map((v) => (
                  <div key={v.term}>
                    <dt>
                      <RichText text={v.term} inlineOnly />
                    </dt>
                    <dd>
                      <RichText text={v.meaning} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside className="summary-remember">
              <Sparkles size={22} aria-hidden="true" />
              <div>
                <strong>تذكّر دائماً:</strong>
                <p>
                  <RichText text={content.summary.remember} />
                </p>
              </div>
            </aside>

            {completed ? (
              <div className="lesson-celebrate" role="status">
                <PartyPopper size={30} aria-hidden="true" />
                <div>
                  <h3>أكملت الدرس بالكامل!</h3>
                  <p>
                    جمعت في هذا الدرس <strong className="num">{progress.xpEarned}</strong> نقطة
                    خبرة. راجع شاراتك في لوحة تعلّمك، أو تابع إلى المحطة التالية في رحلتك.
                  </p>
                </div>
                {next && (
                  <Link to={`/lesson/${next.slug}`} className="btn btn--gold btn--md">
                    التالي: {next.title}
                    <ArrowLeft size={18} aria-hidden="true" />
                  </Link>
                )}
              </div>
            ) : (
              <StageDoneButton
                done={isDone('summary')}
                label="راجعت الملخص — أنهيت الدرس"
                onMark={() => markDone('summary')}
              />
            )}
          </div>
        )}

        {/* ——— Stage prev/next ——— */}
        <footer className="stage-nav">
          <ActionButton
            variant="secondary"
            disabled={activeIdx === 0}
            onClick={() => goToStage(requiredStages[activeIdx - 1])}
          >
            <ArrowRight size={18} aria-hidden="true" /> المرحلة السابقة
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={activeIdx >= requiredStages.length - 1}
            onClick={() => goToStage(requiredStages[activeIdx + 1])}
          >
            المرحلة التالية <ArrowLeft size={18} aria-hidden="true" />
          </ActionButton>
        </footer>
      </div>
    </div>
  )
}
