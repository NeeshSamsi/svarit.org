import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import { ogImageFields } from '@/lib/og'

const UID = 'initiatives'

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

  if (!page) return {}

  const title = page.data.meta_title || undefined
  const description = page.data.meta_description || undefined

  // This index page has no generated card, so: meta_image -> /og/home.jpg. Set
  // on both openGraph and twitter, or the shallow merge drops the fallback.
  const og = ogImageFields({
    metaImage: prismic.asImageSrc(page.data.meta_image),
  })

  return {
    // A Prismic meta_title is the whole title, not a segment. Passing the bare
    // string would let the layout's title template append the brand name a
    // second time to a value that already carries it. With no meta_title, leave
    // this undefined so the layout default and template still apply.
    title: title ? { absolute: title } : undefined,
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
