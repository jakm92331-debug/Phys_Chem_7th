import { Link } from 'react-router-dom'
import { ArrowLeft, AudioWaveform, FlaskConical, Gauge, Thermometer, Waves } from 'lucide-react'
import { getLessonContent } from '@/data/lessons'
import { PageHeader } from '@/components/layout/PageHeader'
import { SourceBadge } from '@/components/ui/ui'
import { MotionLab } from '@/components/lab/MotionLab'
import './LabPage.css'

const FUTURE_LABS = [
  {
    icon: Waves,
    title: 'مختبر الضغط والطفو',
    unit: 'الوحدة الثانية: الضغط ودافعة أرخميدس',
    text: 'اغمر أجساماً مختلفة في السوائل، واكتشف متى تطفو ومتى تغرق — بعد مطابقة المحتوى مع دروس الوحدة.',
  },
  {
    icon: Thermometer,
    title: 'مختبر الحرارة',
    unit: 'الوحدة الثالثة: المادة والحرارة',
    text: 'سخّن جسيمات وبرّدها، وتتبّع انتقال الحرارة وتمدد الأجسام — مخطط له مع محتوى الوحدة.',
  },
  {
    icon: AudioWaveform,
    title: 'مختبر الذرة والأمواج',
    unit: 'الوحدة الرابعة: المادة والطاقة',
    text: 'ابنِ ذرّاتك الخاصة وشكّل أمواجاً صوتية واسمع اختلافها — قيد التصميم مع دروس الوحدة.',
  },
]

export function LabPage() {
  const lesson1 = getLessonContent('lesson-01-motion-rest')

  return (
    <>
      <PageHeader
        kicker="المختبر التفاعلي"
        title="مكانك الآمن للتجربة والخطأ"
        lead="هنا لا توجد إجابات محفوظة: غيّر القيم، راقب النتائج، تنبّأ، وحاول من جديد. كلّ تجربة سؤال صغير ينتظر فضولك."
      />

      <div className="container lab-body">
        <section aria-labelledby="motion-lab-title">
          <div className="lab-intro-row">
            <span className="lab-intro-row__icon">
              <Gauge size={26} aria-hidden="true" />
            </span>
            <div>
              <h2 id="motion-lab-title">مختبر الحركة والسكون</h2>
              <p>
                التجربة التفاعلية المرافقة لدرس «الحركة والسكون» (الدرس 1 — صفحة 3). أنجز المهام
                لتجمع نقاط الخبرة التي تُحتسب في تقدّم الدرس نفسه.
              </p>
            </div>
            <span className="lab-intro-row__badges">
              <SourceBadge status="demo-supplementary" />
              <Link to="/lesson/motion-and-rest" className="lab-lesson-link">
                افتح الدرس كاملاً <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            </span>
          </div>

          {lesson1?.labGuide && (
            <MotionLab entryId={lesson1.entryId} missions={lesson1.labGuide.missions} />
          )}
        </section>

        <section aria-labelledby="future-labs-title">
          <h2 id="future-labs-title" className="future-title">
            <FlaskConical size={22} aria-hidden="true" /> مختبرات قادمة
          </h2>
          <p className="future-lead">
            بُني هذا المختبر بإطار قابل للتوسّع: كلّ تجربة جديدة تُسجَّل كمكوّن مستقل وترتبط
            بدرسها. ستُضاف التجارب التالية تباعاً مع مطابقة محتوى وحداتها مع الكتاب المدرسي.
          </p>
          <div className="future-grid">
            {FUTURE_LABS.map((lab) => (
              <article key={lab.title} className="future-card" aria-disabled="true">
                <span className="future-card__icon">
                  <lab.icon size={26} aria-hidden="true" />
                </span>
                <h3>{lab.title}</h3>
                <p className="future-card__unit">{lab.unit}</p>
                <p>{lab.text}</p>
                <span className="future-card__state">
                  <SourceBadge status="pending" />
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
