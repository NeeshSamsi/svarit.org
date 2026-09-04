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
import { SITE_URL } from '@/lib/site'
import { ogImageFields } from '@/lib/og'

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

  // Every one of these events has already happened. The schema carries the real
  // past dates and nothing else: no `eventStatus`, no default that a crawler
  // could read as "still to come".
  const performers = artists
    .map((artist) => artist.data.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ '@type': 'Person', name }))

  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.data.title || undefined,
    description: prismic.asText(event.data.description) || undefined,
    startDate: event.data.start_date || undefined,
    endDate: event.data.end_date || undefined,
    location: event.data.venue
      ? { '@type': 'Place', name: event.data.venue }
      : undefined,
    performer: performers.length ? performers : undefined,
    organizer: { '@type': 'NGO', '@id': `${SITE_URL}/#organization` },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Initiatives',
        item: `${SITE_URL}/initiatives`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: event.data.title || 'Event',
        item: `${SITE_URL}/initiatives/${uid}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
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
    </>
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
  // meta_image -> generated card for this uid -> /og/home.jpg. Set on both
  // openGraph and twitter, or the shallow merge drops the layout fallback.
  const og = ogImageFields({
    metaImage: prismic.asImageSrc(event.data.meta_image),
    kind: 'initiatives',
    uid,
  })

  return {
    title,
    description,
    alternates: { canonical: `/initiatives/${uid}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/initiatives/${uid}`,
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
