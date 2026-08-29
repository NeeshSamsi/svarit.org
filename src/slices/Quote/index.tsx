import { isFilled, type Content } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import { PrismicRichText, type SliceComponentProps } from '@prismicio/react'

export type QuoteProps = SliceComponentProps<Content.QuoteSlice>

export default function Quote({ slice }: QuoteProps) {
  const hasParagraph = isFilled.richText(slice.primary.paragraph)
  // A migrated Rich Text -> Text field comes back as [] and passes isFilled.keyText,
  // so guard attribution with a plain string check.
  const attribution =
    typeof slice.primary.attribution === 'string'
      ? slice.primary.attribution.trim()
      : ''

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="col-span-full grid grid-cols-subgrid gap-x-6 gap-y-6"
    >
      {/* With no supporting paragraph the quote widens to six columns rather
          than sitting in a cramped three-column ribbon. */}
      <figure
        className={`col-span-full flex flex-col gap-3 ${
          hasParagraph ? 'lg:col-span-3' : 'lg:col-span-6'
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <span aria-hidden className="h-1 w-full rounded-full bg-brand" />
          <blockquote>
            <PrismicRichText
              field={slice.primary.quote}
              components={{
                paragraph: ({ children }) => (
                  <p className="font-body text-2xl leading-snug font-medium text-foreground">
                    {children}
                  </p>
                ),
                hyperlink: ({ children, node }) => (
                  <PrismicNextLink
                    field={node.data}
                    className="underline hover:font-normal"
                  >
                    {children}
                  </PrismicNextLink>
                ),
              }}
            />
          </blockquote>
        </div>
        {attribution && (
          <figcaption className="font-body text-base font-light text-foreground/70">
            {`- ${attribution}`}
          </figcaption>
        )}
      </figure>

      {hasParagraph && (
        <div className="col-span-full lg:col-span-6 lg:col-start-4">
          <PrismicRichText
            field={slice.primary.paragraph}
            components={{
              paragraph: ({ children }) => (
                <p className="font-body text-xl leading-relaxed font-light text-foreground">
                  {children}
                </p>
              ),
              hyperlink: ({ children, node }) => (
                <PrismicNextLink
                  field={node.data}
                  className="underline hover:font-normal"
                >
                  {children}
                </PrismicNextLink>
              ),
            }}
          />
        </div>
      )}
    </section>
  )
}
