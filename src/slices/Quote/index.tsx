import type { Content } from '@prismicio/client'
import { PrismicRichText, type SliceComponentProps } from '@prismicio/react'

export type QuoteProps = SliceComponentProps<Content.QuoteSlice>

export default function Quote({ slice }: QuoteProps) {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="col-span-full lg:col-span-8 lg:col-start-3"
    >
      <blockquote className="flex flex-col gap-4 rounded-3xl bg-muted p-6">
        <PrismicRichText
          field={slice.primary.quote}
          components={{
            paragraph: ({ children }) => (
              <p className="font-display text-2xl leading-tight font-medium text-foreground md:text-3xl">
                {children}
              </p>
            ),
          }}
        />
        {slice.primary.attribution && (
          <cite className="font-body text-base font-light text-foreground not-italic">
            {slice.primary.attribution}
          </cite>
        )}
      </blockquote>
    </section>
  )
}
