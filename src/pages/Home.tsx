import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Crosshair,
  Eye,
  FlaskConical,
  Lightbulb,
  MousePointerClick,
  PlayCircle,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { ALL_ENTRIES, TOTAL_LESSONS, TOTAL_PROJECTS, UNITS } from '@/data/curriculum'
import { UnitCard } from '@/components/curriculum/cards'
import { LinkButton, ProgressBar, SectionHeading, SourceBadge } from '@/components/ui/ui'
import { levelForXp, useProgress } from '@/state/progress'
import './Home.css'

/** Decorative science scene for the hero (pure SVG, aria-hidden). */
function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <svg viewBox="0 0 520 420" className="hero-visual__svg" focusable="false">
        <defs>
          <linearGradient id="hv-grad" x1="0" y1="0" x2="520" y2="420" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818CF8" />
            <stop offset="0.55" stopColor="#22C3D6" />
            <stop offset="1" stopColor="#2DD4BF" />
          </linearGradient>
          <radialGradient id="hv-glow" cx="0.5" cy="0.5" r="0.5">
            <stop stopColor="#F5B301" stopOpacity="0.9" />
            <stop offset="1" stopColor="#F5B301" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* orbit atom */}
        <g className="hv-atom" fill="none" stroke="url(#hv-grad)" strokeWidth="2.4" opacity="0.95">
          <ellipse cx="330" cy="140" rx="128" ry="50" />
          <ellipse cx="330" cy="140" rx="128" ry="50" transform="rotate(60 330 140)" />
          <ellipse cx="330" cy="140" rx="128" ry="50" transform="rotate(120 330 140)" />
        </g>
        <circle cx="330" cy="140" r="30" fill="url(#hv-glow)" />
        <circle cx="330" cy="140" r="13" fill="#F5B301" />
        <circle cx="452" cy="112" r="7" fill="#7DD3FC" />
        <circle cx="250" cy="226" r="6" fill="#A5B4FC" />
        <circle cx="398" cy="52" r="5" fill="#5EEAD4" />

        {/* trajectory with strobe dots */}
        <path
          d="M30 360 C 140 350, 210 250, 330 232 S 470 250, 500 300"
          fill="none"
          stroke="#F5B301"
          strokeWidth="3"
          strokeDasharray="0.5 14"
          strokeLinecap="round"
          opacity="0.9"
        />
        <circle cx="40" cy="359" r="8" fill="#F5B301" />
        <path d="M486 286 l16 12 -18 6" fill="none" stroke="#F5B301" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* sound / fluid wave */}
        <path
          d="M24 120 Q 54 92, 84 120 T 144 120 T 204 120"
          fill="none"
          stroke="#22C3D6"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M24 150 Q 54 128, 84 150 T 144 150 T 204 150"
          fill="none"
          stroke="#22C3D6"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* heat particles */}
        <g fill="#FB923C">
          <circle cx="96" cy="268" r="5" opacity="0.9" />
          <circle cx="128" cy="240" r="3.6" opacity="0.6" />
          <circle cx="72" cy="232" r="3" opacity="0.5" />
          <circle cx="150" cy="286" r="4.2" opacity="0.75" />
          <circle cx="112" cy="306" r="2.6" opacity="0.4" />
        </g>

        {/* vector arrow */}
        <g stroke="#E879F9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
          <path d="M330 330 h74" />
          <path d="M392 320 l14 10 -14 10" />
        </g>
      </svg>

      <span className="hero-chip hero-chip--a">
        السرعة = المسافة ÷ الزمن
      </span>
      <span className="hero-chip hero-chip--b">دافعة أرخميدس</span>
      <span className="hero-chip hero-chip--c">
        الذرّة: نواة وإلكترونات
      </span>
    </div>
  )
}

const PHILOSOPHY = [
  { icon: Sparkles, title: 'اكتشف', text: 'سؤال يثير فضولك من قلب حياتك اليومية' },
  { icon: Eye, title: 'استكشف', text: 'لاحظ الظاهرة وتأمّلها قبل أيّ شرح' },
  { icon: FlaskConical, title: 'جرّب', text: 'تحكّم في التجربة بنفسك داخل المختبر' },
  { icon: Lightbulb, title: 'افهم', text: 'ابنِ المفهوم خطوة بخطوة وتحقق من فهمك' },
  { icon: MousePointerClick, title: 'طبّق', text: 'وظّف ما تعلّمته في مواقف حقيقية' },
  { icon: Trophy, title: 'أتقن', text: 'اختبر نفسك واجمع الشارات ونقاط الخبرة' },
]

export function HomePage() {
  const { state, getLesson, completedCount } = useProgress()
  const level = levelForXp(state.xp)
  const nextEntry =
    ALL_ENTRIES.find((e) => getLesson(e.id).status === 'in-progress') ??
    ALL_ENTRIES.find((e) => getLesson(e.id).status !== 'completed') ??
    ALL_ENTRIES[0]
  const started = state.xp > 0 || completedCount > 0

  return (
    <>
      {/* ————————————————— HERO ————————————————— */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="hero__kicker">
              <Rocket size={17} aria-hidden="true" />
              منصّة الفيزياء والكيمياء التفاعلية — الصف السابع
            </p>
            <h1 className="hero__title">
              ادخل مختبرك العلمي،
              <span className="hero__title-accent"> واكتشف كيف يعمل الكون</span>
            </h1>
            <p className="hero__lead">
              هنا لا تقرأ عن الحركة والقوى والذرّات فحسب — بل تُحرّك وتقيس وتجرّب بيديك.
              أربعة عوالم علمية بانتظار فضولك: الحركة، والضغط، والحرارة، والمادة والطاقة.
            </p>
            <div className="hero__ctas">
              <LinkButton to="/curriculum" variant="gold" size="lg">
                ابدأ رحلتك العلمية
                <ArrowLeft size={20} aria-hidden="true" />
              </LinkButton>
              <LinkButton to="/lab" variant="on-dark" size="lg">
                <FlaskConical size={20} aria-hidden="true" />
                جرّب المختبر التفاعلي
              </LinkButton>
            </div>
            <dl className="hero__stats">
              <div>
                <dt>وحدات علمية</dt>
                <dd className="num">{UNITS.length}</dd>
              </div>
              <div>
                <dt>درساً</dt>
                <dd className="num">{TOTAL_LESSONS}</dd>
              </div>
              <div>
                <dt>مشاريع تطبيقية</dt>
                <dd className="num">{TOTAL_PROJECTS}</dd>
              </div>
              <div>
                <dt>مراحل في كل درس</dt>
                <dd className="num">7</dd>
              </div>
            </dl>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* ————————————————— CONTINUE / NEXT LESSON ————————————————— */}
      <section className="section section--tight">
        <div className="container">
          <div className="continue-card">
            <div className="continue-card__main">
              <p className="continue-card__kicker">
                {started ? 'تابع من حيث توقفت' : 'نقطة الانطلاق المقترحة'}
              </p>
              <h2 className="continue-card__title">
                {nextEntry.kind === 'project' ? 'مشروع: ' : `الدرس ${nextEntry.order}: `}
                {nextEntry.title}
              </h2>
              <p className="continue-card__teaser">{nextEntry.teaser}</p>
              <div className="continue-card__actions">
                <LinkButton to={`/lesson/${nextEntry.slug}`}>
                  <PlayCircle size={19} aria-hidden="true" />
                  {started ? 'تابِع التعلّم' : 'افتح الدرس الأول'}
                </LinkButton>
                <LinkButton to="/dashboard" variant="secondary">
                  لوحة تعلّمي
                </LinkButton>
              </div>
            </div>
            <div className="continue-card__side">
              <div className="mini-stat">
                <span className="mini-stat__label">مستواك الحالي</span>
                <strong>
                  المستوى <span className="num">{level.level}</span> — {level.title}
                </strong>
                <ProgressBar ratio={level.ratio} label="تقدّمك نحو المستوى التالي" size="sm" />
                <span className="mini-stat__hint">
                  <span className="num">{state.xp}</span> نقطة خبرة
                </span>
              </div>
              <div className="mini-stat">
                <span className="mini-stat__label">تقدّمك في المنهج</span>
                <strong>
                  أكملت <span className="num">{completedCount}</span> من{' '}
                  <span className="num">{ALL_ENTRIES.length}</span>
                </strong>
                <ProgressBar
                  ratio={ALL_ENTRIES.length ? completedCount / ALL_ENTRIES.length : 0}
                  label="نسبة إكمال المنهج"
                  size="sm"
                />
                <span className="mini-stat__hint">
                  {started
                    ? 'تُحفظ إنجازاتك تلقائياً على هذا الجهاز'
                    : 'أكمل مراحل الدروس لتظهر إنجازاتك هنا'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ————————————————— UNITS ————————————————— */}
      <section className="section">
        <div className="container">
          <SectionHeading
            kicker="خريطة رحلتك"
            title="أربعة عوالم علمية بانتظارك"
            lead="لكلّ وحدة عالمها الخاص وأسئلتها الكبرى. اختر وحدة وابدأ الاستكشاف — دروسها مرتبة كما في كتابك المدرسي تماماً."
          />
          <div className="units-grid">
            {UNITS.map((u) => (
              <UnitCard key={u.id} unit={u} />
            ))}
          </div>
        </div>
      </section>

      {/* ————————————————— PHILOSOPHY ————————————————— */}
      <section className="section section--tinted">
        <div className="container">
          <SectionHeading
            kicker="أسلوب التعلّم"
            title="كيف ستتعلّم هنا؟"
            lead="لا حفظ جافّاً ولا صفحات مملّة. كلّ درس رحلة من ستّ محطات تبدأ بالفضول وتنتهي بالإتقان:"
            align="center"
          />
          <ol className="philosophy-grid">
            {PHILOSOPHY.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="philosophy-card">
                <span className="philosophy-card__num num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="philosophy-card__icon">
                  <Icon size={26} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ————————————————— LAB TEASER ————————————————— */}
      <section className="section lab-teaser">
        <div className="container lab-teaser__inner">
          <div className="lab-teaser__copy">
            <p className="lab-teaser__kicker">
              <FlaskConical size={17} aria-hidden="true" /> المختبر التفاعلي
            </p>
            <h2 className="lab-teaser__title">مختبر افتراضي… بأيديك أنت</h2>
            <p className="lab-teaser__lead">
              في مختبر «الحركة والسكون» تقود سيارتين، تبدّل نقطة مراقبتك بين الأرض وسيارة متحركة،
              وتتنبّأ بالمواضع قبل حدوثها — لتكتشف بنفسك لماذا تُعدّ الحركة مفهوماً نسبياً.
            </p>
            <ul className="lab-teaser__features">
              <li>
                <SlidersHorizontal size={19} aria-hidden="true" />
                منزلقات تحكّم فورية بالسرعات مع قياسات حيّة
              </li>
              <li>
                <Eye size={19} aria-hidden="true" />
                بدّل المرجع وشاهد المشهد بعيني مراقب آخر
              </li>
              <li>
                <Crosshair size={19} aria-hidden="true" />
                تحدّي تنبّؤ: أين ستكون السيارة بعد ثوانٍ؟
              </li>
              <li>
                <Target size={19} aria-hidden="true" />
                مهام مختبرية تمنحك نقاط خبرة وشارات حقيقية
              </li>
            </ul>
            <LinkButton to="/lab" variant="gold" size="lg">
              ادخل المختبر الآن
              <ArrowLeft size={20} aria-hidden="true" />
            </LinkButton>
          </div>
          <div className="lab-teaser__panel" aria-hidden="true">
            <div className="fake-gauge">
              <span className="fake-gauge__label">سرعة السيارة الحمراء</span>
              <span className="fake-gauge__value">
                <span className="num">12</span> م/ث
              </span>
              <div className="fake-gauge__track">
                <div className="fake-gauge__fill" style={{ width: '60%' }} />
              </div>
            </div>
            <div className="fake-gauge">
              <span className="fake-gauge__label">سرعة السيارة الزرقاء (المرجع)</span>
              <span className="fake-gauge__value">
                <span className="num">12</span> م/ث
              </span>
              <div className="fake-gauge__track">
                <div className="fake-gauge__fill fake-gauge__fill--blue" style={{ width: '60%' }} />
              </div>
            </div>
            <p className="fake-gauge__insight">
              بسرعتين متساويتين… تبدو كلّ سيارة <strong>ساكنة</strong> بالنسبة إلى الأخرى!
            </p>
            <Link to="/lab" className="fake-gauge__link" tabIndex={-1}>
              جرّبها بنفسك ←
            </Link>
          </div>
        </div>
      </section>

      {/* ————————————————— CONTENT LEGEND ————————————————— */}
      <section className="section section--tight">
        <div className="container">
          <div className="legend-card">
            <h2 className="legend-card__title">شفافية المحتوى: ماذا تعني هذه الوسوم؟</h2>
            <div className="legend-card__grid">
              <div className="legend-item">
                <SourceBadge status="textbook-verified" />
                <p>شروح وأنشطة طُوبقت مع صفحات الكتاب المدرسي الرسمي واعتُمدت.</p>
              </div>
              <div className="legend-item">
                <SourceBadge status="demo-supplementary" />
                <p>
                  موادّ إضافية سليمة علمياً أُعدّت للتوضيح والتدريب، ولم تُطابَق بعدُ مع الكتاب —
                  كالدرس الأول حالياً.
                </p>
              </div>
              <div className="legend-item">
                <SourceBadge status="pending" />
                <p>درس موجود في المنهج باسمه ورقم صفحته، وينتظر إضافة محتواه من الكتاب.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
