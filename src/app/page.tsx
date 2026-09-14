import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { asImageSrc } from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from '@/lib/site'
import { filledOrFallback } from '@/lib/metadata'

/**
 * The home page is the `page` document with the uid `home`, routed to `/` by
 * the route resolver in `src/prismicio.ts`.
 */
const getHome = async () => {
  const client = createClient()

  // The Hero slice's banner can link to an `event` document. Content
  // relationship fields only carry an id by default, so `fetchLinks` brings
  // the linked event's title back in this same request rather than a second
  // round trip from the slice.
  return client
    .getByUID('page', 'home', { fetchLinks: ['event.title'] })
    .catch(() => null)
}

export async function generateMetadata(): Promise<Metadata> {
  // The layout no longer sets a site-wide canonical, so `/` needs its own. Seed
  // it here and return this object from every branch so no path drops it.
  const metadata: Metadata = { alternates: { canonical: '/' } }

  const page = await getHome()
  if (!page) return metadata

  const rawTitle = page.data.meta_title
  const rawDescription = page.data.meta_description
  const image = asImageSrc(page.data.meta_image)

  // An empty SEO tab leaves the static metadata in `src/app/layout.tsx` in
  // place. Next merges metadata shallowly, so openGraph and twitter have to be
  // rebuilt in full whenever the document overrides any part of them.
  if (!rawTitle && !rawDescription && !image) return metadata

  const title = filledOrFallback(rawTitle, SITE_TITLE)
  const description = filledOrFallback(rawDescription, SITE_DESCRIPTION)

  metadata.title = title
  metadata.description = description

  const social = { title, description, images: [image ?? '/og/home.jpg'] }
  metadata.openGraph = {
    type: 'website',
    siteName: 'Svarit',
    url: SITE_URL,
    locale: 'en_IN',
    ...social,
  }
  metadata.twitter = { card: 'summary_large_image', ...social }

  return metadata
}

export default async function Home() {
  const page = await getHome()
  if (!page) notFound()

  return <SliceZone slices={page.data.slices} components={components} />
}
