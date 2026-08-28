import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'

const UID = 'artists'

export default async function ArtistsPage() {
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
  const image = prismic.asImageSrc(page.data.meta_image) || undefined

  return {
    title,
    description,
    alternates: { canonical: `/${UID}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/${UID}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}
