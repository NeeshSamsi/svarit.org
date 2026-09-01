import type { Content } from '@prismicio/client'
import { PrismicRichText, type SliceComponentProps } from '@prismicio/react'
import { richTextComponents } from './components'

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
        components={richTextComponents}
      />
    </section>
  )
}
