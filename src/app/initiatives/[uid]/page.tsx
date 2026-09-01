import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import EventHero from '@/components/events/EventHero'
import EventArtists from '@/components/events/EventArtists'
import StaggerReveal from '@/components/animation/StaggerReveal'
import { EVENT_HERO_INTRO_END } from '@/lib/intro'

type Props = {
  params: Promise<{ uid: string }>
}

export default async function EventPage({ params }: Props) {
  const { uid } = await params
  const client = createClient()
  const event = await client.getByUID('event', uid).catch(() => notFound())

  // `event.artists` is a group of content relationships. Prismic only returns
  // the ids here, so the linked artists are fetched in one extra query and put
  // back in the order the editor arranged them in.
  const artistIds = event.data.artists.flatMap((item) =>
    prismic.isFilled.contentRelationship(item.artist) ? [item.artist.id] : []
  )

  const artistDocs = artistIds.length
    ? await client.getAllByIDs<prismic.Content.ArtistDocument>(artistIds)
    : []

  const artists = artistIds
    .map((id) => artistDocs.find((doc) => doc.id === id))
    .filter((doc) => doc !== undefined)

  return (
    <article className="col-span-full grid grid-cols-subgrid gap-y-12 pt-36 md:pt-44">
      <EventHero event={event} />

      <StaggerReveal
        className="col-span-full grid grid-cols-subgrid gap-y-12"
        introEnd={EVENT_HERO_INTRO_END}
      >
        <SliceZone slices={event.data.slices} components={components} />
      </StaggerReveal>

      {artists.length > 0 && <EventArtists artists={artists} />}
    </article>
  )
}

const warnEmpty = (reason: string) =>
  console.warn(
    `\n[build] WARNING /initiatives/[uid]: ${reason} Prerendering no event pages. Have the custom types been pushed to Prismic?\n`
  )

// The route resolver references custom types that may not exist in Prismic
// yet. Until the migration has been pushed, querying them 404s. Rather than
// failing the build, prerender nothing and say so loudly: an empty index is
// almost always a mistake, not an intentional state.
export async function generateStaticParams() {
  const client = createClient()
  const events = await client.getAllByType('event').catch((error: unknown) => {
    warnEmpty(`the event query failed (${error}).`)

    return null
  })

  if (events?.length === 0) {
    warnEmpty(`Prismic returned 0 event documents.`)
  }

  return (events ?? []).map((event) => ({ uid: event.uid }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params
  const client = createClient()
  const event = await client.getByUID('event', uid).catch(() => null)

  if (!event) return {}

  const title = event.data.meta_title || event.data.title || undefined
  const description =
    event.data.meta_description ||
    prismic.asText(event.data.description) ||
    undefined
  const image =
    prismic.asImageSrc(event.data.meta_image) ||
    prismic.asImageSrc(event.data.hero_image) ||
    undefined

  return {
    title,
    description,
    alternates: { canonical: `/initiatives/${uid}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/initiatives/${uid}`,
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
