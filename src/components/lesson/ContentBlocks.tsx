import { AlertTriangle, BookOpenText, HelpCircle, Lightbulb, Sigma } from 'lucide-react'
import type { BlockOrigin, ContentBlock } from '@/types/content'
import { RichText, Tex } from '@/components/math/Math'
import { mathToPlainText } from '@/lib/tex'
import './ContentBlocks.css'

const CALLOUT_ICON = {
  idea: Lightbulb,
  question: HelpCircle,
  example: BookOpenText,
  warning: AlertTriangle,
} as const

/**
 * The provenance tag. Only blocks explicitly marked `{ kind: 'textbook' }`
 * carry it: it states the book page the content was carried over from.
 * Everything else in a lesson is platform enrichment and never claims to be
 * from the book (see docs/CONTENT_STANDARDS.md).
 */
function OriginTag({ origin }: { origin: BlockOrigin }) {
  if (origin.kind !== 'textbook') return null
  return (
    <span className="cb-origin" role="note">
      <BookOpenText size={12} aria-hidden="true" /> من الكتاب · صفحة{' '}
      <span className="num">{origin.page}</span>
    </span>
  )
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.kind) {
    case 'heading':
      return (
        <h3 className="cb-heading">
          <RichText text={block.text} />
        </h3>
      )

    case 'text':
      return (
        <p className="cb-text">
          <RichText text={block.text} />
          {block.origin && <OriginTag origin={block.origin} />}
        </p>
      )

    case 'definition':
      return (
        <div className="cb-definition">
          <span className="cb-definition__term">
            <RichText text={block.term} inlineOnly />
          </span>
          <p>
            <RichText text={block.text} />
          </p>
          {block.origin && <OriginTag origin={block.origin} />}
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
            {block.title && (
              <p className="cb-callout__title">
                <RichText text={block.title} inlineOnly />
              </p>
            )}
            <p>
              <RichText text={block.text} />
            </p>
            {block.origin && <OriginTag origin={block.origin} />}
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
            {/* The law itself is always KaTeX — never plain text. */}
            <Tex tex={block.tex} display className="cb-formula__expr" />
            {block.caption && (
              <figcaption className="cb-formula__caption">
                <RichText text={block.caption} />
              </figcaption>
            )}
            {block.symbols && (
              <ul className="cb-formula__symbols">
                {block.symbols.map((s) => (
                  <li key={s.symbol}>
                    <strong>
                      <Tex tex={s.symbol} />
                    </strong>{' '}
                    <RichText text={s.meaning} inlineOnly />
                    {s.unit && (
                      <span className="cb-formula__unit unit" dir="ltr">
                        {' '}
                        — {s.unit}
                      </span>
                    )}
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
        <>
          <ListTag className={`cb-list${block.ordered ? ' cb-list--ordered' : ''}`}>
            {block.items.map((item, i) => (
              <li key={i}>
                <RichText text={item} />
              </li>
            ))}
          </ListTag>
          {block.origin && <OriginTag origin={block.origin} />}
        </>
      )
    }

    case 'compare':
      return (
        <>
          <div
            className="cb-compare"
            role="table"
            aria-label={`مقارنة بين ${mathToPlainText(block.leftTitle)} و ${mathToPlainText(block.rightTitle)}`}
          >
            <div className="cb-compare__row cb-compare__row--head" role="row">
              <span role="columnheader">وجه المقارنة</span>
              <span role="columnheader">
                <RichText text={block.leftTitle} inlineOnly />
              </span>
              <span role="columnheader">
                <RichText text={block.rightTitle} inlineOnly />
              </span>
            </div>
            {block.rows.map((row) => (
              <div key={row.label} className="cb-compare__row" role="row">
                <span className="cb-compare__label" role="rowheader">
                  <RichText text={row.label} inlineOnly />
                </span>
                <span role="cell">
                  <RichText text={row.left} inlineOnly />
                </span>
                <span role="cell">
                  <RichText text={row.right} inlineOnly />
                </span>
              </div>
            ))}
          </div>
          {block.origin && <OriginTag origin={block.origin} />}
        </>
      )

    case 'steps':
      return (
        <>
          <ol className="cb-steps">
            {block.steps.map((step, i) => (
              <li key={step.title} className="cb-step">
                <span className="cb-step__num num" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <p className="cb-step__title">
                    <RichText text={step.title} inlineOnly />
                  </p>
                  <p>
                    <RichText text={step.text} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {block.origin && <OriginTag origin={block.origin} />}
        </>
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
