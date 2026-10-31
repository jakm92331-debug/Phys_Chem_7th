import { Link } from 'react-router-dom'
import { GraduationCap, Info } from 'lucide-react'
import { LogoMark } from '@/components/icons'
import { UNITS } from '@/data/curriculum'
import './Footer.css'

const JOURNEY = ['اكتشف', 'استكشف', 'جرّب', 'افهم', 'طبّق', 'أتقن']

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <div className="brand brand--footer">
            <LogoMark size={48} />
            <span className="brand__text">
              <span className="brand__name brand__name--light">أفق العلوم</span>
              <span className="brand__sub brand__sub--light">الفيزياء والكيمياء · الصف السابع</span>
            </span>
          </div>
          <p className="site-footer__tagline">
            منصّة تعلّم تفاعلية تحوّل مفاهيم العلوم إلى تجارب حيّة تستكشفها بنفسك.
          </p>
          <ol className="journey" aria-label="رحلة التعلّم في المنصة">
            {JOURNEY.map((step, i) => (
              <li key={step} className="journey__step">
                <span>{step}</span>
                {i < JOURNEY.length - 1 && (
                  <span className="journey__arrow" aria-hidden="true">
                    ←
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <nav className="site-footer__col" aria-label="روابط المنصة">
          <h3 className="site-footer__title">المنصّة</h3>
          <Link to="/">الرئيسية</Link>
          <Link to="/curriculum">المنهج الدراسي</Link>
          <Link to="/lab">المختبر التفاعلي</Link>
          <Link to="/dashboard">لوحة تعلّمي</Link>
          <Link to="/teacher" className="site-footer__teacher">
            <GraduationCap size={16} aria-hidden="true" /> منطقة المعلّم
          </Link>
        </nav>

        <nav className="site-footer__col" aria-label="وحدات المنهج">
          <h3 className="site-footer__title">وحدات المنهج</h3>
          {UNITS.map((u) => (
            <Link key={u.id} to={`/curriculum#${u.id}`}>
              الوحدة {u.order}: {u.title}
            </Link>
          ))}
        </nav>

        <div className="site-footer__col site-footer__note">
          <h3 className="site-footer__title">
            <Info size={16} aria-hidden="true" /> ملاحظة حول المحتوى
          </h3>
          <p>
            بنية المنهج (عناوين الدروس وأرقام الصفحات) منقولة بدقّة من فهرس الكتاب المدرسي.
            أما الشروح والأنشطة فهي موادّ توضيحية إضافية سليمة علمياً، وتُوسم بوضوح إلى أن
            تُطابَق مع صفحات الكتاب الرسمي.
          </p>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container site-footer__bottom-inner">
          <p>أفق العلوم — بيئة تعلّم تفاعلية للصف السابع</p>
          <p>صُنعت لتثير الفضول، لا لتستبدل الكتاب المدرسي</p>
        </div>
      </div>
    </footer>
  )
}
