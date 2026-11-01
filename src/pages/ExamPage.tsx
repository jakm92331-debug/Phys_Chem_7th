import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getExamById } from '@/data/exams'
import { UNITS, ALL_ENTRIES } from '@/data/curriculum'
import type { Unit } from '@/types/content'
import { ExamRunner } from '@/components/exam/ExamRunner'
import { LinkButton } from '@/components/ui/ui'
import { mathToPlainText } from '@/lib/tex'

export function ExamPage() {
  const { id } = useParams<{ id: string }>()
  const exam = id ? getExamById(decodeURIComponent(id)) : undefined

  useEffect(() => {
    document.title = exam
      ? `${mathToPlainText(exam.title)} | أفق العلوم`
      : 'اختبار غير موجود | أفق العلوم'
    return () => {
      document.title = 'أفق العلوم | الفيزياء والكيمياء — الصف السابع'
    }
  }, [exam])

  if (!exam) {
    return (
      <div className="container exam-missing">
        <h1>عذراً، هذا الاختبار غير موجود</h1>
        <p>ربما تغيّر الرابط أو لم يُعتمد الاختبار بعد.</p>
        <LinkButton to="/exams">عودة إلى قائمة الاختبارات</LinkButton>
      </div>
    )
  }

  if (exam.status !== 'active') {
    return (
      <div className="container exam-missing">
        <h1>هذا الاختبار غير متاح حالياً</h1>
        <p>
          حالته الحالية «{exam.status === 'draft' ? 'مسودة' : 'مُؤرشف'}» — الاختبارات المسودّة لا
          تُعرض للطلاب قبل اعتمادها.
        </p>
        <LinkButton to="/exams">عودة إلى قائمة الاختبارات</LinkButton>
      </div>
    )
  }

  let unit: Unit | undefined
  if (exam.kind === 'unit') {
    unit = UNITS.find((u) => u.id === exam.unitId)
  } else {
    const entry = ALL_ENTRIES.find((e) => e.id === exam.entryId)
    if (entry) unit = UNITS.find((u) => u.id === entry.unitId)
  }

  return (
    <ExamRunner
      exam={exam}
      entry={ALL_ENTRIES.find((e) => e.id === exam.entryId)}
      unit={unit}
    />
  )
}
