import { AlertTriangle, BookOpenText, HelpCircle, Lightbulb, Sigma } from 'lucide-react'
import type { ContentBlock } from '@/types/content'
import './ContentBlocks.css'

const CALLOUT_ICON = {
  idea: Lightbulb,
  question: HelpCircle,
  example: BookOpenText,
  warning: AlertTriangle,
} as const

function Block({ block }: { block: ContentBlock }) {
  switch (block.kind) {
    case 'heading':
      return <h3 className="cb-heading">{block.text}</h3>

    case 'text':
      return <p className="cb-text">{block.text}</p>

    case 'definition':
      return (
        <div className="cb-definition">
          <span className="cb-definition__term">{block.term}</span>
          <p>{block.text}</p>
        </div>
      )

    case 'callout': {
      const Icon = CALLOUT_ICON[block.variant]
      return (
        <aside className={`cb-callout cb-callout--${block.variant}`}>
          <span className="cb-callout__icon">
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            {block.title && <p className="cb-callout__title">{block.title}</p>}
            <p>{block.text}</p>
          </div>
        </aside>
      )
    }

    case 'formula':
      return (
        <figure className="cb-formula">
          <span className="cb-formula__icon">
            <Sigma size={20} aria-hidden="true" />
          </span>
          <div className="cb-formula__body">
            <p className="cb-formula__expr">{block.formula}</p>
            {block.caption && <figcaption className="cb-formula__caption">{block.caption}</figcaption>}
            {block.symbols && (
              <ul className="cb-formula__symbols">
                {block.symbols.map((s) => (
                  <li key={s.symbol}>
                    <strong>{s.symbol}</strong> {s.meaning}
                    {s.unit && <span className="cb-formula__unit"> — {s.unit}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </figure>
      )

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul'
      return (
        <ListTag className={`cb-list${block.ordered ? ' cb-list--ordered' : ''}`}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ListTag>
      )
    }

    case 'compare':
      return (
        <div className="cb-compare" role="table" aria-label={`مقارنة بين ${block.leftTitle} و ${block.rightTitle}`}>
          <div className="cb-compare__row cb-compare__row--head" role="row">
            <span role="columnheader">وجه المقارنة</span>
            <span role="columnheader">{block.leftTitle}</span>
            <span role="columnheader">{block.rightTitle}</span>
          </div>
          {block.rows.map((row) => (
            <div key={row.label} className="cb-compare__row" role="row">
              <span className="cb-compare__label" role="rowheader">
                {row.label}
              </span>
              <span role="cell">{row.left}</span>
              <span role="cell">{row.right}</span>
            </div>
          ))}
        </div>
      )

    case 'steps':
      return (
        <ol className="cb-steps">
          {block.steps.map((step, i) => (
            <li key={step.title} className="cb-step">
              <span className="cb-step__num num" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <p className="cb-step__title">{step.title}</p>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )
  }
}

/** Renders a sequence of typed lesson content blocks. */
export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="content-blocks">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}
