import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import { ogImageFields } from '@/lib/og'
import { SITE_DESCRIPTION } from '@/lib/site'
import { titleFromSlug, filledOrFallback } from '@/lib/metadata'

const UID = 'initiatives'

// This page's Upcoming timeline and Past tabs filter events by today's date,
// not only by Prismic content, so the on-demand tag revalidation the Prismic
// webhook triggers cannot alone move an event from Upcoming to Past once its
// date arrives. Hourly, not daily, so the transition lands within an hour of
// midnight rather than up to a day late.
export const revalidate = 3600

export default async function InitiativesPage() {
  const client = createClient()
  const page = await client.getByUID('page', UID).catch(() => notFound())

  return (
    <div className="col-span-full grid grid-cols-subgrid gap-y-18 pt-36 md:pt-44">
      <SliceZone slices={page.data.slices} components={components} />
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const client = createClient()
  const page = await client.getByUID('page', UID).catch(() => null)

  const title = filledOrFallback(page?.data.meta_title, titleFromSlug(UID))
  const description = filledOrFallback(
    page?.data.meta_description,
    SITE_DESCRIPTION
  )

  // This index page has no generated card, so: meta_image -> /og/home.jpg. Set
  // on both openGraph and twitter, or the shallow merge drops the fallback.
  const og = ogImageFields({
    metaImage: prismic.asImageSrc(page?.data.meta_image),
  })

  return {
    title,
    description,
    alternates: { canonical: `/${UID}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/${UID}`,
      ...og.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...og.twitter,
    },
  }
}
