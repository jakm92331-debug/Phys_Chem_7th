import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Flame,
  History,
  Lock,
  PlayCircle,
  Sparkles,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { ALL_ENTRIES, UNITS, getUnitForEntry } from '@/data/curriculum'
import { BADGES } from '@/data/badges'
import { BADGE_ICONS, UNIT_ICONS } from '@/components/icons'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActionButton, LinkButton, ProgressBar, StatusChip } from '@/components/ui/ui'
import { levelForXp, useProgress } from '@/state/progress'
import './Dashboard.css'

const dateFmt = new Intl.DateTimeFormat('ar-u-nu-latn', {
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
})

export function DashboardPage() {
  const { state, getLesson, completedCount, inProgressCount, resetAll } = useProgress()
  const [confirmReset, setConfirmReset] = useState(false)
  const level = levelForXp(state.xp)

  const inProgress = ALL_ENTRIES.filter((e) => getLesson(e.id).status === 'in-progress')
  const nextEntry =
    inProgress[0] ?? ALL_ENTRIES.find((e) => getLesson(e.id).status !== 'completed')
  const earnedBadges = BADGES.filter((b) => state.badges.includes(b.id))

  return (
    <>
      <PageHeader
        kicker="لوحة تعلّمي"
        title="رحلتك العلمية في لمحة"
        lead="كلّ ما هنا حقيقي: يُبنى من تقدّمك الفعلي في الدروس والمختبر، ويُحفظ تلقائياً على هذا الجهاز."
      >
        <div className="dash-level-card">
          <span className="dash-level-card__label">مستواك الحالي</span>
          <strong>
            المستوى <span className="num">{level.level}</span> · {level.title}
          </strong>
          <ProgressBar ratio={level.ratio} label="تقدّمك نحو المستوى التالي" />
          <span className="dash-level-card__hint">
            <span className="num">{level.xpIntoLevel}</span> من{' '}
            <span className="num">{level.xpForLevel}</span> نقطة نحو المستوى{' '}
            <span className="num">{level.level + 1}</span>
          </span>
        </div>
      </PageHeader>

      <div className="container dash-body">
        {/* ——— Stats ——— */}
        <section className="dash-stats" aria-label="إحصائيات تعلّمك">
          <div className="stat-card">
            <span className="stat-card__icon stat-card__icon--gold">
              <Zap size={22} aria-hidden="true" />
            </span>
            <div>
              <strong className="num">{state.xp}</strong>
              <span>نقطة خبرة</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-card__icon stat-card__icon--green">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <div>
              <strong>
                <span className="num">{completedCount}</span> /{' '}
                <span className="num">{ALL_ENTRIES.length}</span>
              </strong>
              <span>دروس ومشاريع مكتملة</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-card__icon stat-card__icon--blue">
              <TrendingUp size={22} aria-hidden="true" />
            </span>
            <div>
              <strong className="num">{inProgressCount}</strong>
              <span>قيد التعلّم الآن</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-card__icon stat-card__icon--orange">
              <Flame size={22} aria-hidden="true" />
            </span>
            <div>
              <strong className="num">{state.streak.count}</strong>
              <span>
                {state.streak.count === 1 ? 'يوم تعلّم' : 'أيام تعلّم متتالية'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-card__icon stat-card__icon--violet">
              <Award size={22} aria-hidden="true" />
            </span>
            <div>
              <strong>
                <span className="num">{earnedBadges.length}</span> /{' '}
                <span className="num">{BADGES.length}</span>
              </strong>
              <span>شارات محقّقة</span>
            </div>
          </div>
        </section>

        <div className="dash-columns">
          <div className="dash-main">
            {/* ——— Next step ——— */}
            <section className="dash-card" aria-labelledby="dash-next-title">
              <h2 id="dash-next-title" className="dash-card__title">
                <PlayCircle size={21} aria-hidden="true" /> محطّتك التالية
              </h2>
              {nextEntry ? (
                <div className="next-lesson">
                  <div>
                    <p className="next-lesson__kicker">
                      {getUnitForEntry(nextEntry).title} · صفحة{' '}
                      <span className="num">{nextEntry.page}</span>
                    </p>
                    <h3>
                      {nextEntry.kind === 'project' ? 'مشروع: ' : `الدرس ${nextEntry.order}: `}
                      {nextEntry.title}
                    </h3>
                    <p>{nextEntry.teaser}</p>
                  </div>
                  <LinkButton to={`/lesson/${nextEntry.slug}`}>
                    {getLesson(nextEntry.id).status === 'in-progress' ? 'تابِع الدرس' : 'ابدأ الدرس'}
                    <ArrowLeft size={18} aria-hidden="true" />
                  </LinkButton>
                </div>
              ) : (
                <p className="dash-empty">
                  <Sparkles size={19} aria-hidden="true" /> أتممت كلّ ما هو متاح حالياً — عمل
                  استثنائي! راجع شاراتك بالأسفل.
                </p>
              )}

              {inProgress.length > 1 && (
                <>
                  <h3 className="dash-sub">دروس بدأتها ولم تُنهِها بعد</h3>
                  <ul className="dash-lesson-list">
                    {inProgress.slice(1).map((e) => (
                      <li key={e.id}>
                        <Link to={`/lesson/${e.slug}`}>
                          <span>
                            {e.kind === 'project' ? 'مشروع: ' : `الدرس ${e.order}: `}
                            {e.title}
                          </span>
                          <StatusChip status={getLesson(e.id).status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* ——— Unit progress ——— */}
            <section className="dash-card" aria-labelledby="dash-units-title">
              <h2 id="dash-units-title" className="dash-card__title">
                <TrendingUp size={21} aria-hidden="true" /> تقدّمك في الوحدات
              </h2>
              <ul className="dash-units">
                {UNITS.map((unit) => {
                  const Icon = UNIT_ICONS[unit.theme.icon]
                  const done = unit.entries.filter(
                    (e) => getLesson(e.id).status === 'completed',
                  ).length
                  return (
                    <li key={unit.id}>
                      <span
                        className="dash-units__icon"
                        style={{ background: `linear-gradient(135deg, ${unit.theme.primary}, ${unit.theme.secondary})` }}
                      >
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <span className="dash-units__info">
                        <strong>
                          الوحدة <span className="num">{unit.order}</span>: {unit.title}
                        </strong>
                        <ProgressBar
                          ratio={unit.entries.length ? done / unit.entries.length : 0}
                          color={unit.theme.primary}
                          label={`تقدّمك في وحدة ${unit.title}`}
                          size="sm"
                        />
                      </span>
                      <span className="dash-units__count">
                        <span className="num">{done}</span>/
                        <span className="num">{unit.entries.length}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* ——— Badges ——— */}
            <section className="dash-card" aria-labelledby="dash-badges-title">
              <h2 id="dash-badges-title" className="dash-card__title">
                <Award size={21} aria-hidden="true" /> شارات الإنجاز
              </h2>
              <div className="badges-grid">
                {BADGES.map((badge) => {
                  const earned = state.badges.includes(badge.id)
                  const Icon = BADGE_ICONS[badge.icon]
                  return (
                    <article key={badge.id} className={`badge-card${earned ? ' is-earned' : ''}`}>
                      <span className="badge-card__icon">
                        {earned ? (
                          <Icon size={26} aria-hidden="true" />
                        ) : (
                          <Lock size={22} aria-hidden="true" />
                        )}
                      </span>
                      <h3>{badge.title}</h3>
                      <p>{earned ? badge.description : badge.condition}</p>
                      <span className="badge-card__state">
                        {earned ? 'حقّقتها!' : 'لم تُفتح بعد'}
                      </span>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>

          {/* ——— Activity ——— */}
          <aside className="dash-card dash-activity" aria-labelledby="dash-activity-title">
            <h2 id="dash-activity-title" className="dash-card__title">
              <History size={21} aria-hidden="true" /> نشاطك الأخير
            </h2>
            {state.activity.length === 0 ? (
              <p className="dash-empty">
                لا نشاط مسجّلاً بعد. ابدأ درسك الأوّل وستظهر إنجازاتك هنا — خطوة بخطوة، كما تحدث
                فعلاً.
              </p>
            ) : (
              <ol className="activity-list">
                {state.activity.map((ev) => (
                  <li key={ev.id}>
                    <span className={`activity-dot activity-dot--${ev.kind}`} aria-hidden="true" />
                    <div>
                      <p>{ev.label}</p>
                      <time dateTime={ev.at}>{dateFmt.format(new Date(ev.at))}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="dash-reset">
              <h3>إعادة تعيين التقدّم</h3>
              <p>يمسح نقاط الخبرة والشارات وتقدّم الدروس المحفوظة على هذا الجهاز.</p>
              {confirmReset ? (
                <div className="dash-reset__confirm">
                  <ActionButton
                    variant="secondary"
                    onClick={() => {
                      resetAll()
                      setConfirmReset(false)
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" /> نعم، امسح كلّ شيء
                  </ActionButton>
                  <ActionButton variant="ghost" onClick={() => setConfirmReset(false)}>
                    إلغاء
                  </ActionButton>
                </div>
              ) : (
                <ActionButton variant="ghost" onClick={() => setConfirmReset(true)}>
                  <Trash2 size={16} aria-hidden="true" /> إعادة التعيين…
                </ActionButton>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
