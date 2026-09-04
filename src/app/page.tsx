import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { asImageSrc } from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import { SITE_URL } from '@/lib/site'

/**
 * The home page is the `page` document with the uid `home`, routed to `/` by
 * the route resolver in `src/prismicio.ts`.
 */
const getHome = async () => {
  const client = createClient()

  return client.getByUID('page', 'home').catch(() => null)
}

export async function generateMetadata(): Promise<Metadata> {
  // The layout no longer sets a site-wide canonical, so `/` needs its own. Seed
  // it here and return this object from every branch so no path drops it.
  const metadata: Metadata = { alternates: { canonical: '/' } }

  const page = await getHome()
  if (!page) return metadata

  const title = page.data.meta_title
  const description = page.data.meta_description
  const image = asImageSrc(page.data.meta_image)

  // An empty SEO tab leaves the static metadata in `src/app/layout.tsx` in
  // place. Next merges metadata shallowly, so openGraph and twitter have to be
  // rebuilt in full whenever the document overrides any part of them.
  if (!title && !description && !image) return metadata

  if (title) metadata.title = { absolute: title }
  if (description) metadata.description = description

  const social = {
    title: title ?? undefined,
    description: description ?? undefined,
    images: [image ?? '/og/home.jpg'],
  }
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
