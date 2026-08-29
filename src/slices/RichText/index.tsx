import type { Content } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { PrismicRichText, type SliceComponentProps } from '@prismicio/react'

export type RichTextProps = SliceComponentProps<Content.RichTextSlice>

export default function RichText({ slice }: RichTextProps) {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="col-span-full flex flex-col gap-4 lg:col-span-8 lg:col-start-2"
    >
      <PrismicRichText
        field={slice.primary.content}
        components={{
          heading2: ({ children }) => (
            <h2 className="font-display text-3xl leading-tight font-medium text-foreground md:text-4xl">
              {children}
            </h2>
          ),
          heading3: ({ children }) => (
            <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
              {children}
            </h3>
          ),
          heading4: ({ children }) => (
            <h4 className="font-display text-xl leading-tight font-medium text-foreground">
              {children}
            </h4>
          ),
          paragraph: ({ children }) => (
            <p className="font-body text-xl leading-relaxed font-light text-foreground">
              {children}
            </p>
          ),
          preformatted: ({ children }) => (
            <pre className="overflow-x-auto rounded-3xl bg-muted p-6 font-body text-base text-foreground">
              {children}
            </pre>
          ),
          list: ({ children }) => (
            <ul className="flex list-disc flex-col gap-2 pl-6 font-body text-xl font-light text-foreground">
              {children}
            </ul>
          ),
          oList: ({ children }) => (
            <ol className="flex list-decimal flex-col gap-2 pl-6 font-body text-xl font-light text-foreground">
              {children}
            </ol>
          ),
          strong: ({ children }) => (
            <strong className="font-medium">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hyperlink: ({ children, node }) => (
            <PrismicNextLink
              field={node.data}
              className="underline hover:font-normal"
            >
              {children}
            </PrismicNextLink>
          ),
          image: ({ node }) => (
            <PrismicNextImage
              field={node}
              fallbackAlt=""
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="h-auto w-full rounded-3xl object-cover"
            />
          ),
        }}
      />
    </section>
  )
}
