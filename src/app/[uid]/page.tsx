import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import { ogImageFields } from '@/lib/og'

/**
 * `page` documents with a dedicated route of their own. They must never be
 * reached through the catch-all: prerendering them here would collide with
 * `/`, `/initiatives` and `/artists`, and serving them here would publish the
 * same content at two URLs.
 */
const RESERVED_UIDS = ['home', 'initiatives', 'artists']

type Props = {
  params: Promise<{ uid: string }>
}

export default async function Page({ params }: Props) {
  const { uid } = await params

  if (RESERVED_UIDS.includes(uid)) notFound()

  const client = createClient()
  const page = await client.getByUID('page', uid).catch(() => notFound())

  return (
    <div className="col-span-full grid grid-cols-subgrid gap-y-18 pt-36 md:pt-44">
      <SliceZone slices={page.data.slices} components={components} />
    </div>
  )
}

const warnEmpty = (reason: string) =>
  console.warn(
    `\n[build] WARNING /[uid]: ${reason} Prerendering no generic pages. Have the custom types been pushed to Prismic?\n`
  )

// The route resolver references custom types that may not exist in Prismic
// yet. Until the migration has been pushed, querying them 404s. Rather than
// failing the build, prerender nothing and say so loudly: an empty index is
// almost always a mistake, not an intentional state.
export async function generateStaticParams() {
  const client = createClient()
  const pages = await client.getAllByType('page').catch((error: unknown) => {
    warnEmpty(`the page query failed (${error}).`)

    return null
  })

  if (pages?.length === 0) {
    warnEmpty('Prismic returned 0 page documents.')
  }

  return (pages ?? [])
    .filter((page) => !RESERVED_UIDS.includes(page.uid))
    .map((page) => ({ uid: page.uid }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params

  if (RESERVED_UIDS.includes(uid)) return {}

  const client = createClient()
  const page = await client.getByUID('page', uid).catch(() => null)

  if (!page) return {}

  const title = page.data.meta_title || undefined
  const description = page.data.meta_description || undefined

  // These generic pages have no generated card, so: meta_image -> /og/home.jpg.
  // Set on both openGraph and twitter, or the shallow merge drops the fallback.
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
    alternates: { canonical: `/${uid}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/${uid}`,
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
