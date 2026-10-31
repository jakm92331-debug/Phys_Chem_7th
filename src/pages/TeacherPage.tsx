import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Database,
  FileEdit,
  HelpCircle,
  LibraryBig,
  ShieldAlert,
} from 'lucide-react'
import { ALL_ENTRIES, getUnitForEntry } from '@/data/curriculum'
import { hasLessonContent } from '@/data/lessons'
import { PageHeader } from '@/components/layout/PageHeader'
import { SourceBadge } from '@/components/ui/ui'
import { RichText } from '@/components/math/Math'
import './TeacherPage.css'

const CAPABILITIES = [
  {
    icon: FileEdit,
    title: 'إدارة محتوى الدروس',
    text: 'تحرير شروح كل درس ومراحله السبع من ملفات محتوى منظمة ومنفصلة تماماً عن واجهة العرض.',
    status: 'الأساس جاهز — المحتوى ملفات بيانات قابلة للتحرير',
  },
  {
    icon: HelpCircle,
    title: 'بنك الأسئلة',
    text: 'أسئلة «افهم وتحقق» و«اختبر نفسك» مخزنة ببنية موحدة تتضمن الشرح ومعالجة الفهم الخاطئ ومستوى الصعوبة.',
    status: 'الأساس جاهز — بنية أسئلة موحدة وقابلة للتوسع',
  },
  {
    icon: BarChart3,
    title: 'متابعة تقدّم الطلاب',
    text: 'تتبّع إكمال المراحل ونتائج الاختبارات ومهام المختبر لكل طالب، على مستوى الدرس والوحدة.',
    status: 'يتطلب حسابات طلاب وخادماً خلفياً — مخطط له',
  },
  {
    icon: BookOpenCheck,
    title: 'مراجعة المحتوى واعتماده',
    text: 'مطابقة كل درس مع صفحات الكتاب ثم ترقية حالته من «توضيحي» إلى «مُتحقَّق من الكتاب».',
    status: 'نظام حالات المحتوى يعمل الآن في المنصة',
  },
  {
    icon: LibraryBig,
    title: 'مراجع الكتاب المدرسي',
    text: 'ربط كل درس بصفحاته في الكتاب وإرفاق المواد المرجعية عند توفرها.',
    status: 'أرقام الصفحات موثقة الآن لكل الدروس والمشاريع',
  },
  {
    icon: Database,
    title: 'نتائج التقييمات والتقارير',
    text: 'تجميع نتائج الاختبارات وتقارير الفهم الخاطئ الشائع لإرشاد التدريس الصفي.',
    status: 'يتطلب بنية خلفية — مخطط له لاحقاً',
  },
]

export function TeacherPage() {
  return (
    <>
      <PageHeader
        kicker="منطقة المعلّم"
        title="أساس جاهز للنموّ"
        lead="هذه الصفحة تعرض خطة منطقة المعلّم وحالة محتوى المنصة الفعلية. البنية مصممة بحيث تُضاف أدوات المعلّم دون إعادة بناء تجربة الطالب."
      />

      <div className="container teacher-body">
        <p className="teacher-warning" role="note">
          <ShieldAlert size={22} aria-hidden="true" />
          <span>
            <strong>تنبيه أمني صريح:</strong> لا يوجد تسجيل دخول أو صلاحيات أدوار في هذه النسخة
            بعد، لذا فهذه المنطقة <strong>ليست محمية</strong> ولا تحتوي أيّ بيانات حقيقية للطلاب.
            عند تفعيل الحسابات ستُقيَّد هذه الأدوات بصلاحية «معلّم» فقط، ولن تظهر أبداً في واجهة
            الطالب.
          </span>
        </p>

        <section aria-labelledby="teacher-cap-title">
          <h2 id="teacher-cap-title" className="teacher-title">
            قدرات مخططة وأسسها الحالية
          </h2>
          <div className="teacher-grid">
            {CAPABILITIES.map((cap) => (
              <article key={cap.title} className="teacher-card">
                <span className="teacher-card__icon">
                  <cap.icon size={24} aria-hidden="true" />
                </span>
                <h3>{cap.title}</h3>
                <p>{cap.text}</p>
                <p className="teacher-card__status">{cap.status}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="teacher-inventory-title">
          <h2 id="teacher-inventory-title" className="teacher-title">
            جرد محتوى المنهج الحالي
          </h2>
          <p className="teacher-lead">
            <AlertTriangle size={17} aria-hidden="true" /> المصدر الوحيد المتوفر من الكتاب حتى
            الآن هو فهرس المحتويات. لذلك كلّ الشروح الحالية موسومة «توضيحية»، وبقية الدروس
            بانتظار صفحات الكتاب لمطابقتها قبل النشر.
          </p>
          <div className="inventory" role="table" aria-label="حالة محتوى دروس المنهج">
            <div className="inventory__row inventory__row--head" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">الدرس / المشروع</span>
              <span role="columnheader">الوحدة</span>
              <span role="columnheader">الصفحة</span>
              <span role="columnheader">حالة المحتوى</span>
              <span role="columnheader">مادة تعليمية</span>
            </div>
            {ALL_ENTRIES.map((entry) => (
              <div key={entry.id} className="inventory__row" role="row">
                <span className="num" role="cell">
                  {entry.order}
                </span>
                <span className="inventory__name" role="cell">
                  {entry.kind === 'project' ? 'مشروع: ' : ''}
                  <RichText text={entry.title} inlineOnly />
                </span>
                <span role="cell">
                  <RichText text={getUnitForEntry(entry).title} inlineOnly />
                </span>
                <span className="num" role="cell">
                  {entry.page}
                </span>
                <span role="cell">
                  <SourceBadge status={entry.contentStatus} />
                </span>
                <span role="cell">
                  {hasLessonContent(entry.id) ? 'متوفرة (توضيحية)' : 'غير متوفرة بعد'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
