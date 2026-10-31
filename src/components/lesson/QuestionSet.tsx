import { useMemo, useState } from 'react'
import { CheckCircle2, Lightbulb, RotateCcw, Send, XCircle } from 'lucide-react'
import type { QuizQuestion } from '@/types/content'
import { ActionButton, ProgressBar } from '@/components/ui/ui'
import { RichText } from '@/components/math/Math'
import './QuestionSet.css'

const DIFFICULTY_LABEL: Record<QuizQuestion['difficulty'], string> = {
  easy: 'أساسي',
  medium: 'متوسط',
  hard: 'متقدّم',
}

/* ------------------------------------------------------------------ */
/* افهم وتحقق — immediate feedback, retry until correct (mastery)      */
/* ------------------------------------------------------------------ */

function CheckQuestion({
  question,
  index,
  solved,
  onSolved,
}: {
  question: QuizQuestion
  index: number
  solved: boolean
  onSolved: (id: string) => void
}) {
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)

  const pick = (choiceIndex: number) => {
    if (solved) return
    setPicked(choiceIndex)
    if (choiceIndex === question.correctIndex) {
      onSolved(question.id)
    } else if (!wrongPicks.includes(choiceIndex)) {
      setWrongPicks((w) => [...w, choiceIndex])
    }
  }

  const lastWrong = picked !== null && picked !== question.correctIndex && !solved

  return (
    <fieldset className={`q-card${solved ? ' is-solved' : ''}`}>
      <legend className="q-card__legend">
        <span className="q-card__num num">{index + 1}</span>
        <span className="q-card__prompt">
          <RichText text={question.prompt} inlineOnly />
        </span>
        <span className={`q-diff q-diff--${question.difficulty}`}>
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
      </legend>

      <div className="q-choices">
        {question.choices.map((choice, i) => {
          const isWrong = wrongPicks.includes(i) && !solved
          const isCorrectPick = solved && i === question.correctIndex
          return (
            <label
              key={i}
              className={`q-choice${isWrong ? ' is-wrong' : ''}${isCorrectPick ? ' is-correct' : ''}`}
            >
              <input
                type="radio"
                name={question.id}
                className="sr-only"
                checked={picked === i || isCorrectPick}
                disabled={solved || isWrong}
                onChange={() => pick(i)}
              />
              <span className="q-choice__bullet" aria-hidden="true">
                {isCorrectPick ? (
                  <CheckCircle2 size={18} />
                ) : isWrong ? (
                  <XCircle size={18} />
                ) : (
                  <span className="num">{i + 1}</span>
                )}
              </span>
              <span>
                <RichText text={choice} inlineOnly />
              </span>
            </label>
          )
        })}
      </div>

      <div aria-live="polite">
        {lastWrong && (
          <p className="q-feedback q-feedback--wrong">
            <Lightbulb size={18} aria-hidden="true" />
            <span>
              ليست الإجابة الصحيحة — جرّب مجدّداً.
              {question.misconception && (
                <>
                  {' '}
                  تلميح: <RichText text={question.misconception} inlineOnly />
                </>
              )}
            </span>
          </p>
        )}
        {solved && (
          <p className="q-feedback q-feedback--right">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              <strong>إجابة صحيحة!</strong> <RichText text={question.explanation} inlineOnly />
            </span>
          </p>
        )}
      </div>
    </fieldset>
  )
}

export function CheckSet({
  questions,
  onAllSolved,
}: {
  questions: QuizQuestion[]
  onAllSolved: () => void
}) {
  const [solvedIds, setSolvedIds] = useState<string[]>([])

  const handleSolved = (id: string) => {
    setSolvedIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      if (next.length === questions.length) {
        // defer to avoid setState-during-render warnings in parent
        window.setTimeout(onAllSolved, 0)
      }
      return next
    })
  }

  return (
    <div className="q-set">
      <div className="q-set__head">
        <p>
          أجبتَ بشكل صحيح عن <strong className="num">{solvedIds.length}</strong> من{' '}
          <strong className="num">{questions.length}</strong> أسئلة. أخطئت؟ لا مشكلة — اقرأ
          التلميح وحاول مجدداً حتى تتقن الفكرة.
        </p>
        <ProgressBar
          ratio={questions.length ? solvedIds.length / questions.length : 0}
          label="تقدّمك في أسئلة التحقق"
          size="sm"
        />
      </div>
      {questions.map((q, i) => (
        <CheckQuestion
          key={q.id}
          question={q}
          index={i}
          solved={solvedIds.includes(q.id)}
          onSolved={handleSolved}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* اختبر نفسك — answer all, submit, scored review with explanations   */
/* ------------------------------------------------------------------ */

export function QuizSet({
  questions,
  onSubmitScore,
}: {
  questions: QuizQuestion[]
  /** Called once per submission with score 0–1. */
  onSubmitScore: (score01: number) => void
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [submitted, setSubmitted] = useState(false)
  const [attempt, setAttempt] = useState(1)

  const answeredCount = answers.filter((a) => a !== null).length
  const allAnswered = answeredCount === questions.length

  const score = useMemo(() => {
    if (!submitted) return 0
    const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length
    return questions.length ? correct / questions.length : 0
  }, [submitted, answers, questions])

  const submit = () => {
    if (!allAnswered) return
    const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length
    const s = questions.length ? correct / questions.length : 0
    setSubmitted(true)
    onSubmitScore(s)
  }

  const retry = () => {
    setAnswers(questions.map(() => null))
    setSubmitted(false)
    setAttempt((a) => a + 1)
  }

  const pct = Math.round(score * 100)
  const passed = score >= 0.6

  return (
    <div className="q-set" key={attempt}>
      {submitted && (
        <div
          className={`quiz-result${passed ? ' is-pass' : ' is-fail'}`}
          role="status"
          aria-live="polite"
        >
          <p className="quiz-result__score">
            نتيجتك: <strong className="num">{pct}٪</strong>
          </p>
          <p>
            {score >= 1
              ? 'علامة كاملة! لقد أتقنت مفاهيم هذا الدرس.'
              : passed
                ? 'أحسنت! تجاوزت حدّ الإتقان. راجع شرح الأسئلة التي أخطأت فيها لتثبيت فهمك.'
                : 'لم تصل بعدُ إلى حدّ الإتقان (60٪). راجع الشروحات بالأسفل ثم أعد المحاولة — التعلم من الخطأ جزء من الرحلة.'}
          </p>
          <ActionButton variant="secondary" onClick={retry}>
            <RotateCcw size={17} aria-hidden="true" /> إعادة الاختبار
          </ActionButton>
        </div>
      )}

      {questions.map((q, qi) => {
        const userPick = answers[qi]
        const isRight = submitted && userPick === q.correctIndex
        return (
          <fieldset
            key={q.id}
            className={`q-card${submitted ? (isRight ? ' is-solved' : ' is-failed') : ''}`}
          >
            <legend className="q-card__legend">
              <span className="q-card__num num">{qi + 1}</span>
              <span className="q-card__prompt">
                <RichText text={q.prompt} inlineOnly />
              </span>
              <span className={`q-diff q-diff--${q.difficulty}`}>
                {DIFFICULTY_LABEL[q.difficulty]}
              </span>
            </legend>

            <div className="q-choices">
              {q.choices.map((choice, i) => {
                const cls = submitted
                  ? i === q.correctIndex
                    ? ' is-correct'
                    : i === userPick
                      ? ' is-wrong'
                      : ''
                  : userPick === i
                    ? ' is-picked'
                    : ''
                return (
                  <label key={i} className={`q-choice${cls}`}>
                    <input
                      type="radio"
                      name={`${q.id}-quiz`}
                      className="sr-only"
                      checked={userPick === i}
                      disabled={submitted}
                      onChange={() =>
                        setAnswers((prev) => prev.map((a, j) => (j === qi ? i : a)))
                      }
                    />
                    <span className="q-choice__bullet" aria-hidden="true">
                      {submitted && i === q.correctIndex ? (
                        <CheckCircle2 size={18} />
                      ) : submitted && i === userPick ? (
                        <XCircle size={18} />
                      ) : (
                        <span className="num">{i + 1}</span>
                      )}
                    </span>
                    <span>
                      <RichText text={choice} inlineOnly />
                    </span>
                  </label>
                )
              })}
            </div>

            {submitted && (
              <div className={`q-feedback ${isRight ? 'q-feedback--right' : 'q-feedback--wrong'}`}>
                {isRight ? (
                  <CheckCircle2 size={18} aria-hidden="true" />
                ) : (
                  <XCircle size={18} aria-hidden="true" />
                )}
                <span>
                  <strong>{isRight ? 'صحيحة. ' : 'ليست صحيحة. '}</strong>
                  <RichText text={q.explanation} inlineOnly />
                  {!isRight && q.misconception && (
                    <>
                      {' '}
                      تنبيه: <RichText text={q.misconception} inlineOnly />
                    </>
                  )}
                </span>
              </div>
            )}
          </fieldset>
        )
      })}

      {!submitted && (
        <div className="quiz-submit">
          <p aria-live="polite">
            أجبت عن <strong className="num">{answeredCount}</strong> من{' '}
            <strong className="num">{questions.length}</strong> أسئلة
          </p>
          <ActionButton size="lg" disabled={!allAnswered} onClick={submit}>
            <Send size={18} aria-hidden="true" />
            {allAnswered ? 'أرسل الإجابات وشاهد النتيجة' : 'أجب عن جميع الأسئلة أولاً'}
          </ActionButton>
        </div>
      )}
    </div>
  )
}
