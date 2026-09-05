import { isFilled, type Content } from '@prismicio/client'
import { PrismicRichText, type SliceComponentProps } from '@prismicio/react'
import SectionTitle from '@/components/ui/SectionTitle'
import { getSettings } from '@/lib/queries'
import { richTextComponents } from '@/slices/RichText/components'
import AppendBlock from './AppendBlock'

export type LegalSectionProps = SliceComponentProps<Content.LegalSectionSlice>

/**
 * One section of a legal or policy page: a heading, rich text prose, and an
 * optional generated block after it. A fixed set of hardcoded sections would
 * need a developer for every privacy or terms edit, so this composes instead:
 * a privacy policy or a terms page is just several of these in a row.
 */
export default async function LegalSection({ slice }: LegalSectionProps) {
  const heading =
    typeof slice.primary.heading === 'string'
      ? slice.primary.heading.trim()
      : ''
  const hasContent = isFilled.richText(slice.primary.content)

  // Nothing to say, nothing to render, rather than a blank row in the grid.
  if (!heading && !hasContent) return null

  // Settings is a single cache()d request shared by every slice on the page,
  // so several legal_section instances appending contact details cost one
  // fetch. Skip it entirely when nothing here reads it.
  const settings =
    slice.primary.append_block === 'none' ? null : await getSettings()

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      {heading && (
        <SectionTitle
          title={heading}
          className="col-span-full lg:col-span-8 lg:col-start-2"
        />
      )}
      {hasContent && (
        <div className="col-span-full flex flex-col gap-4 lg:col-span-8 lg:col-start-2">
          <PrismicRichText
            field={slice.primary.content}
            components={richTextComponents}
          />
        </div>
      )}
      <AppendBlock
        variant={slice.primary.append_block}
        settings={settings}
        updatedAt={slice.primary.updated_at}
      />
    </section>
  )
}
