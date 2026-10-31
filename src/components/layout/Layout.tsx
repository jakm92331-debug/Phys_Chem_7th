import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { BadgeToast } from './BadgeToast'
import './Layout.css'

/** Scrolls to top on navigation — unless an in-page anchor was requested. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) return // the target page scrolls to its anchor itself
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        تخطَّ إلى المحتوى الرئيسي
      </a>
      <ScrollManager />
      <Header />
      <main id="main" className="app-main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <BadgeToast />
    </div>
  )
}
