import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  BookOpenCheck,
  Database,
  FileEdit,
  HelpCircle,
  KeyRound,
  LibraryBig,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { ALL_ENTRIES, getUnitForEntry } from '@/data/curriculum'
import { hasLessonContent } from '@/data/lessons'
import { PageHeader } from '@/components/layout/PageHeader'
import { ActionButton, SourceBadge } from '@/components/ui/ui'
import { RichText } from '@/components/math/Math'
import type { TeacherSolutionSet } from '@/types/content'
import './TeacherPage.css'

/* ------------------------------------------------------------------ */
/* API client                                                          */
/* ------------------------------------------------------------------ */

type BackendState = 'checking' | 'available' | 'unavailable'

/** Asks the server whether the authenticated backend exists on this host. */
async function checkBackend(): Promise<BackendState> {
  try {
    const res = await fetch('/api/teacher/session', { headers: { Accept: 'application/json' } })
    if (!res.ok) return 'unavailable'
    const data = await res.json()
    return typeof data?.authenticated === 'boolean' ? 'available' : 'unavailable'
  } catch {
    // static host without the API (e.g. GitHub Pages) — fetch rejects or 404s
    return 'unavailable'
  }
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init?.headers ?? {}) },
  })
  const data = await res.json().catch(() => null)
  return { res, data }
}

/* ------------------------------------------------------------------ */
/* Status gate: backend presence + session                              */
/* ------------------------------------------------------------------ */

function TeacherGate() {
  const [backend, setBackend] = useState<BackendState>('checking')
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkBackend().then((state) => {
      if (cancelled) return
      setBackend(state)
      if (state === 'available') {
        // ask the server directly whether we already hold a session
        fetch('/api/teacher/session', { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((data) => !cancelled && setAuthenticated(data?.authenticated === true))
          .catch(() => !cancelled && setAuthenticated(false))
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (backend === 'checking') {
    return (
      <div className="teacher-card teacher-state" role="status">
        <p>جارٍ التحقّق من توفّر خادم المصادقة…</p>
      </div>
    )
  }

  if (backend === 'unavailable') {
    return (
      <div className="teacher-card teacher-state teacher-state--unavailable" role="note">
        <ShieldAlert size={26} aria-hidden="true" />
        <h2>خادم المصادقة غير متوفّر على هذا المضيف</h2>
        <p>
          هذه الصفحة تُنشر حالياً على استضافة ثابتة (GitHub Pages) لا توفّر مصادقة من جهة
          الخادم. منطقة المعلّم مجهّزة بالكامل — واجهة وواجهة بيانات ونقطة وصول محمية — ولكنها
          <strong> لا تعمل إلا عندما يُشغَّل الخادم الخلفي</strong> المصاحب لهذا المشروع على
          مضيف يدعم Node.js.
        </p>
        <p>
          لا تحتوي واجهة الطالب على أيّ بيانات معلّم، ولا توجد حلول مدمجة في الحزمة المرسلة إلى
          المتصفح. للاطلاع على طريقة النشر وتمكين المصادقة الحقيقية، اقرأ{' '}
          <a
            href="https://github.com/jakm92331-debug/Phys_Chem_7th/blob/main/docs/TEACHER_AUTH.md"
            target="_blank"
            rel="noreferrer"
          >
            وثيقة نشر منطقة المعلّم
          </a>
          .
        </p>
        <p className="teacher-state__hint">
          ⚠️ هذه المنطقة ليست محمية على المضيف الثابت، ولا يجب اعتبارها كذلك.
        </p>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <TeacherLogin
        onSuccess={() => {
          setAuthenticated(true)
        }}
      />
    )
  }

  return <TeacherDashboard onLogout={() => setAuthenticated(false)} />
}

/* ------------------------------------------------------------------ */
/* Login                                                                */
/* ------------------------------------------------------------------ */

function TeacherLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { res, data } = await apiFetch('/api/teacher/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      if (res.status === 200 && data?.ok) {
        onSuccess()
      } else if (res.status === 429) {
        setError('حاولت مرات كثيرة — انتظر بضع دقائق قبل المحاولة مجدداً.')
      } else if (res.status === 401) {
        setError('كلمة المرور غير صحيحة.')
      } else {
        setError('حدث خطأ أثناء المصادقة — حاول مجدداً.')
      }
    } catch {
      setError('لا يمكن الوصول إلى خادم المصادقة.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="teacher-login-wrap">
      <form className="teacher-card teacher-login" onSubmit={submit}>
        <span className="teacher-login__icon">
          <KeyRound size={26} aria-hidden="true" />
        </span>
        <h2>دخول المعلّم</h2>
        <p className="teacher-login__lead">
          هذه المنطقة محمية بمصادقة حقيقية من جهة الخادم. البيانات التي تُعرض هنا (حلول
          الدروس) لا تصل إلى أي زائر قبل تسجيل الدخول.
        </p>
        <label className="teacher-login__field" htmlFor="teacher-password">
          كلمة المرور
          <input
            id="teacher-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="أدخل كلمة المرور"
          />
        </label>
        {error && (
          <p className="teacher-login__error" role="alert">
            <ShieldAlert size={17} aria-hidden="true" /> {error}
          </p>
        )}
        <ActionButton type="submit" size="lg" disabled={busy || password.length === 0}>
          <Lock size={17} aria-hidden="true" />
          {busy ? 'جارٍ المصادقة…' : 'دخول'}
        </ActionButton>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

function TeacherDashboard({ onLogout }: { onLogout: () => void }) {
  const [sets, setSets] = useState<TeacherSolutionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { res, data } = await apiFetch('/api/teacher/solutions')
      if (res.status === 401) {
        onLogout()
        return
      }
      if (!res.ok || !data?.ok) {
        setError('تعذّر تحميل بيانات المعلّم.')
        return
      }
      setSets(Array.isArray(data.solutions) ? data.solutions : [])
    } catch {
      setError('تعذّر الاتصال بخادم المعلّم.')
    } finally {
      setLoading(false)
    }
  }, [onLogout])

  useEffect(() => {
    load()
  }, [load])

  const byEntry = new Map(sets.map((s) => [s.entryId, s]))

  return (
    <>
      <div className="teacher-dash-head">
        <div>
          <h2 className="teacher-title">مستودع حلول المعلّم</h2>
          <p className="teacher-lead">
            <ShieldCheck size={17} aria-hidden="true" />
            اتصال سليم بخادم المصادقة. الحلول المعروضة هنا محفوظة على الخادم ولم تكن يوماً جزءاً
            من حزمة الطالب.
          </p>
        </div>
        <div className="teacher-dash-actions">
          <ActionButton variant="ghost" onClick={load}>
            <Database size={16} aria-hidden="true" /> تحديث
          </ActionButton>
          <ActionButton variant="secondary" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" /> تسجيل الخروج
          </ActionButton>
        </div>
      </div>

      {loading && <p className="teacher-loading" role="status">جارٍ تحميل بيانات الحلول…</p>}
      {error && (
        <p className="teacher-login__error" role="alert">
          <ShieldAlert size={17} aria-hidden="true" /> {error}
        </p>
      )}

      <div className="teacher-dash">
        <div className="teacher-dash__list">
          <h3 className="teacher-dash__list-title">دروس الكتاب</h3>
          <ul className="teacher-entries">
            {ALL_ENTRIES.map((entry) => {
              const set = byEntry.get(entry.id)
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`teacher-entry${selectedId === entry.id ? ' is-active' : ''}`}
                    aria-pressed={selectedId === entry.id}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <span className="teacher-entry__main">
                      <span className="num teacher-entry__order">{entry.order}</span>
                      <span>
                        <RichText text={entry.title} inlineOnly />
                        <span className="teacher-entry__unit">
                          · {getUnitForEntry(entry).title}
                        </span>
                      </span>
                    </span>
                    <span className="teacher-entry__side">
                      <span className="num">صفحة {entry.page}</span>
                      {set ? (
                        <SourceBadge status={set.status} />
                      ) : (
                        <span className="teacher-entry__empty">لا حلول بعد</span>
                      )}
                      {set && set.solutions.length > 0 && (
                        <span className="num teacher-entry__count">
                          {set.solutions.length} سؤالاً
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="teacher-dash__detail">
          {selectedId ? (
            <SolutionSetView set={byEntry.get(selectedId) ?? null} entryId={selectedId} />
          ) : (
            <div className="teacher-card teacher-state">
              <LibraryBig size={26} aria-hidden="true" />
              <h2>اختر درساً لعرض حلولهما</h2>
              <p>
                كل درس في المنهج يمكن أن يحوي جميع أسئلة الكتاب وتمارينهُ ومسائله مع الإجابة
                الصحيحة وخطوات الحل والقوانين المستعملة وسبب اختيار الطريقة والتعويضات والوحدات
                ورقم الصفحة. لا توجد حلول فعلية حالياً — لا توجد صفحات كتاب معتمدة بعد.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Solution set detail                                                  */
/* ------------------------------------------------------------------ */

function SolutionSetView({ set, entryId }: { set: TeacherSolutionSet | null; entryId: string }) {
  if (!set) {
    const entry = ALL_ENTRIES.find((e) => e.id === entryId)
    return (
      <div className="teacher-card teacher-state">
        <BookOpenCheck size={26} aria-hidden="true" />
        <h2>لا توجد حلول لهذا الدرس بعد</h2>
        <p>
          الدرس{' '}
          {entry ? <RichText text={entry.title} inlineOnly /> : entryId}
          {' '}
          لا يحتوي حالياً على أي حلول معلّم. تُضاف الحلول فقط بعد مراجعة صفحات الكتاب
          المعتمدة، ولا تُملأ تجارباً أو حلولاً وهمية.
        </p>
        {entry && (
          <p className="teacher-state__hint">
            صفحة الكتاب: <span className="num">{entry.page}</span> ·{' '}
            {hasLessonContent(entry.id) ? 'محتوى تعليمي متوفر (توضيحي)' : 'محتوى تعليمي غير متوفر بعد'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="teacher-solution">
      <header className="teacher-solution__head">
        <h3>
          <RichText text={set.entryTitle} />
        </h3>
        <div className="teacher-solution__meta">
          <SourceBadge status={set.status} />
          <span className="num">صفحة ابتدائية: {set.pageStart}</span>
          {set.pages.length > 0 && <span className="num">صفحات: {set.pages.join('، ')}</span>}
          <span className="num">{set.solutions.length} حلًا</span>
        </div>
      </header>

      {set.solutions.length === 0 ? (
        <p className="teacher-solution__empty">
          هذا الدرس مُسجَّل في مستودع الحلول بلا أسئلة بعد. بنية كل حل جاهزة: السؤال، الإجابة
          الصحيحة، خطوات الحل، القوانين المستعملة، سبب اختيار الطريقة، التعويضات والوحدات،
          ورقم صفحة السؤال في الكتاب.
        </p>
      ) : (
        <ol className="teacher-solutions">
          {set.solutions.map((sol) => (
            <li key={sol.id} className="teacher-solution-item">
              <details>
                <summary>
                  <span className="num teacher-solution-item__page">ص {sol.pageRef}</span>
                  <span className="teacher-solution-item__type">{sol.type}</span>
                  <RichText text={sol.prompt} inlineOnly />
                </summary>
                <div className="teacher-solution-item__body">
                  <p>
                    <strong>الإجابة:</strong> <RichText text={sol.answer} inlineOnly />
                  </p>
                  {sol.steps.length > 0 && (
                    <>
                      <p><strong>خطوات الحل:</strong></p>
                      <ol className="teacher-solution-item__steps">
                      {sol.steps.map((step, i) => (
                        <li key={i}>
                          <RichText text={step} />
                        </li>
                      ))}
                      </ol>
                    </>
                  )}
                  {sol.lawsUsed.length > 0 && (
                    <p>
                      <strong>القوانين المستعملة:</strong>{' '}
                      {sol.lawsUsed.map((law, i) => (
                        <span key={i}>
                          <RichText text={law} inlineOnly />
                          {i < sol.lawsUsed.length - 1 ? '، ' : ''}
                        </span>
                      ))}
                    </p>
                  )}
                  <p>
                    <strong>سبب اختيار الطريقة:</strong>{' '}
                    <RichText text={sol.methodReasoning} />
                  </p>
                  <p>
                    <strong>التعويضات والوحدات:</strong>{' '}
                    <RichText text={sol.substitutions} />
                  </p>
                  <p className="teacher-solution-item__ref">
                    مصدر السؤال: صفحة <span className="num">{sol.pageRef}</span> في الكتاب المدرسي
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Capabilities overview (kept honest)                                  */
/* ------------------------------------------------------------------ */

const CAPABILITIES: { icon: LucideIcon; title: string; text: string; status: string }[] = [
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
    status: 'تقدّم محلي لكل جهاز — بدون حسابات طلاب بعد',
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
    title: 'مستودع حلول المعلّم',
    text: 'بنية جاهزة لكل سؤال في الكتاب: الإجابة، خطوات الحل، القوانين، سبب الطريقة، التعويضات والوحدات، ورقم الصفحة — مستضافة على الخادم المصادق فقط.',
    status: 'بنية جاهزة — الحلول الفعلية تنتظر صفحات الكتاب المعتمدة',
  },
]

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export function TeacherPage() {
  return (
    <>
      <PageHeader
        kicker="منطقة المعلّم"
        title="حلول الدروس والتمارين والمسائل"
        lead="هنا تُحفظ حلول جميع أسئلة الكتاب لكل درس، مع خطوات الحل الكاملة والقوانين المستعملة وسبب اختيار كل طريقة. الوصول محمي بمصادقة حقيقية من جهة الخادم — لا تصل أي بيانات معلّم إلى الطالب قبل تسجيل الدخول."
      />

      <div className="container teacher-body">
        <TeacherGate />

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
      </div>
    </>
  )
}
