import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import { richTextComponents } from '@/slices/RichText/components'
import { button } from '@/components/ui/button-variants'
import { getWelcomeUpdates } from '@/lib/queries'
import { SITE_DESCRIPTION } from '@/lib/site'
import { titleFromSlug, filledOrFallback } from '@/lib/metadata'
import { selectVariant, hasCta } from './selectVariant'

/**
 * The confirmation-link landing page for Bento's double opt-in emails. Not a
 * `page` document: a `variants` group on the shared `page` type would appear
 * on every page in the repository, and a `page` doc would also be served by
 * the `/[uid]` catch-all, needing a RESERVED_UIDS entry and a sitemap
 * mapping. Its own custom type avoids all of that, and keeps this
 * transactional page out of the sitemap for free, since the sitemap only
 * iterates `page` documents.
 *
 * Bento links here as `/welcome-updates?source=<name>` and its automation
 * also triggers on a `$click` matching that exact URL, so the query string is
 * load bearing: never change, normalise, or strip it.
 */

type Props = {
  searchParams: Promise<{ source?: string | string[] }>
}

// Reading searchParams makes this route dynamic, which is correct and
// intended here: the content genuinely depends on the query string. Do not
// make this static later.
export default async function WelcomeUpdatesPage({ searchParams }: Props) {
  const { source } = await searchParams
  const doc = await getWelcomeUpdates()
  if (!doc) notFound()

  const variant = selectVariant(
    doc.data.variants,
    Array.isArray(source) ? source[0] : source
  )
  if (!variant) notFound()

  const title =
    typeof variant.title === 'string' && variant.title.trim()
      ? variant.title
      : ''
  const ctaLabel =
    typeof variant.cta_label === 'string' ? variant.cta_label.trim() : ''

  return (
    <div className="col-span-full grid grid-cols-subgrid gap-y-18 pt-36 md:pt-44">
      <div className="col-span-full flex flex-col gap-6 lg:col-span-8 lg:col-start-2">
        <h1 className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
          {title}
        </h1>
        <PrismicRichText field={variant.body} components={richTextComponents} />
        {hasCta(variant) && (
          <div className="w-fit">
            <PrismicNextLink
              field={variant.cta_link}
              className={button({ variant: 'secondary', size: 'base' })}
            >
              {ctaLabel}
            </PrismicNextLink>
          </div>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getWelcomeUpdates()

  const title = filledOrFallback(
    doc?.data.meta_title,
    titleFromSlug('welcome-updates')
  )
  const description = filledOrFallback(
    doc?.data.meta_description,
    SITE_DESCRIPTION
  )

  // Reached only from an email and never linked from the site, so it should
  // not be indexed.
  return {
    title,
    description,
    robots: { index: false, follow: false },
  }
}
