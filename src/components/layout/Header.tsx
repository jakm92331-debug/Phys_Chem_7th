import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BookOpen, FlaskConical, Home, LayoutDashboard, Menu, X } from 'lucide-react'
import { LogoMark } from '@/components/icons'
import { XpPill } from '@/components/ui/ui'
import { levelForXp, useProgress } from '@/state/progress'
import './Header.css'

const NAV = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/curriculum', label: 'المنهج الدراسي', icon: BookOpen, end: false },
  { to: '/lab', label: 'المختبر التفاعلي', icon: FlaskConical, end: false },
  { to: '/dashboard', label: 'لوحة تعلّمي', icon: LayoutDashboard, end: false },
]

export function Header() {
  const { state } = useProgress()
  const [open, setOpen] = useState(false)
  const level = levelForXp(state.xp)

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="brand" aria-label="أفق العلوم — الصفحة الرئيسية">
          <LogoMark size={44} />
          <span className="brand__text">
            <span className="brand__name">أفق العلوم</span>
            <span className="brand__sub">الفيزياء والكيمياء · الصف السابع</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="التنقّل الرئيسي">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__meta">
          <span className="level-chip" title={`المستوى ${level.level}: ${level.title}`}>
            المستوى <span className="num">{level.level}</span>
          </span>
          <XpPill xp={state.xp} />
          <button
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="قائمة الهاتف">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `mobile-nav__link${isActive ? ' is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
