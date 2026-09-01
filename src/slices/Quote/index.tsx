import { isFilled, type Content } from '@prismicio/client'
import { PrismicRichText, type SliceComponentProps } from '@prismicio/react'
import { richTextComponents } from '../RichText/components'

export type QuoteProps = SliceComponentProps<Content.QuoteSlice>

export default function Quote({ slice }: QuoteProps) {
  const hasParagraph = isFilled.richText(slice.primary.paragraph)
  // A migrated Rich Text -> Text field comes back as [] and passes
  // isFilled.keyText, so guard quote and attribution with a plain string check.
  const quote =
    typeof slice.primary.quote === 'string' ? slice.primary.quote.trim() : ''
  const attribution =
    typeof slice.primary.attribution === 'string'
      ? slice.primary.attribution.trim()
      : ''

  // A migrated quote reads empty until it is re-entered, so keep rendering as
  // long as the paragraph is filled rather than dropping it with the quote.
  if (!quote && !hasParagraph) return null

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="col-span-full grid grid-cols-subgrid gap-x-6 gap-y-6"
    >
      {quote && (
        <figure className="col-span-full flex flex-col gap-3 lg:col-span-3">
          <div className="flex flex-col gap-1.5">
            <span aria-hidden className="h-1 w-full rounded-full bg-brand" />
            <blockquote>
              <p className="font-body text-2xl leading-snug font-medium text-foreground">
                {quote}
              </p>
            </blockquote>
          </div>
          {attribution && (
            <figcaption className="font-body text-base font-light text-foreground/70">
              {`- ${attribution}`}
            </figcaption>
          )}
        </figure>
      )}

      {hasParagraph && (
        <div className="col-span-full flex flex-col gap-4 lg:col-span-6 lg:col-start-4">
          <PrismicRichText
            field={slice.primary.paragraph}
            components={richTextComponents}
          />
        </div>
      )}
    </section>
  )
}
