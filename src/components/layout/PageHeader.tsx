import type { ReactNode } from 'react'
import './PageHeader.css'

/** Consistent dark page header band used by inner pages. */
export function PageHeader({
  kicker,
  title,
  lead,
  children,
}: {
  kicker?: string
  title: string
  lead?: string
  children?: ReactNode
}) {
  return (
    <section className="page-header">
      <div className="container page-header__inner">
        <div className="page-header__copy">
          {kicker && <p className="page-header__kicker">{kicker}</p>}
          <h1 className="page-header__title">{title}</h1>
          {lead && <p className="page-header__lead">{lead}</p>}
        </div>
        {children && <div className="page-header__side">{children}</div>}
      </div>
    </section>
  )
}
