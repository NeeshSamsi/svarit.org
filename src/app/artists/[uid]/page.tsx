import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { PrismicRichText, SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import EventCard from '@/components/events/EventCard'
import SectionTitle from '@/components/ui/SectionTitle'

type Props = {
  params: Promise<{ uid: string }>
}

export default async function ArtistPage({ params }: Props) {
  const { uid } = await params
  const client = createClient()
  const artist = await client.getByUID('artist', uid).catch(() => notFound())

  // The artist -> event link is derived, not stored. Events own the
  // relationship, so this is the reverse query across their `artists` group.
  const events = await client.getAllByType('event', {
    filters: [prismic.filter.at('my.event.artists.artist', artist.id)],
    orderings: [{ field: 'my.event.start_date', direction: 'desc' }],
  })

  const links = artist.data.links.filter((item) =>
    prismic.isFilled.link(item.link)
  )

  return (
    <article className="col-span-full grid grid-cols-subgrid gap-y-12 pt-36 md:pt-44">
      <header className="col-span-full grid grid-cols-subgrid gap-y-6">
        {prismic.isFilled.image(artist.data.photo) && (
          <div className="relative col-span-full aspect-4/5 overflow-hidden rounded-3xl bg-muted sm:col-span-5 lg:col-span-4">
            <PrismicNextImage
              field={artist.data.photo}
              fill
              fallbackAlt=""
              priority
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="col-span-full flex flex-col gap-4 sm:col-span-7 lg:col-span-8">
          {artist.data.discipline && (
            <span className="font-body text-base font-light text-foreground">
              {artist.data.discipline}
            </span>
          )}
          <h1 className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
            {artist.data.name}
          </h1>

          {prismic.isFilled.richText(artist.data.bio) && (
            <div className="flex flex-col gap-4 font-body text-xl font-light text-foreground [&_a]:underline [&_strong]:font-medium">
              <PrismicRichText field={artist.data.bio} />
            </div>
          )}

          {links.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-3">
              {links.map((item, index) => (
                <li key={index}>
                  <PrismicNextLink
                    field={item.link}
                    className="inline-flex items-center rounded-full border border-foreground bg-muted px-4 py-2 font-body text-base font-medium text-foreground transition-opacity hover:opacity-60"
                  >
                    {item.label || 'Visit'}
                  </PrismicNextLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="col-span-full grid grid-cols-subgrid gap-y-12">
        <SliceZone slices={artist.data.slices} components={components} />
      </div>

      {events.length > 0 && (
        <section
          aria-label="Appearances"
          className="col-span-full grid grid-cols-subgrid gap-y-6"
        >
          <SectionTitle
            eyebrow="Appearances"
            title={`${artist.data.name} at Svarit`}
            className="col-span-full md:col-span-8"
          />
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              className="col-span-full sm:col-span-6 lg:col-span-4"
            />
          ))}
        </section>
      )}
    </article>
  )
}

const warnEmpty = (reason: string) =>
  console.warn(
    `\n[build] WARNING /artists/[uid]: ${reason} Prerendering no artist pages. Have the custom types been pushed to Prismic?\n`
  )

// The route resolver references custom types that may not exist in Prismic
// yet. Until the migration has been pushed, querying them 404s. Rather than
// failing the build, prerender nothing and say so loudly: an empty index is
// almost always a mistake, not an intentional state.
export async function generateStaticParams() {
  const client = createClient()
  const artists = await client
    .getAllByType('artist')
    .catch((error: unknown) => {
      warnEmpty(`the artist query failed (${error}).`)

      return null
    })

  if (artists?.length === 0) {
    warnEmpty(`Prismic returned 0 artist documents.`)
  }

  return (artists ?? []).map((artist) => ({ uid: artist.uid }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params
  const client = createClient()
  const artist = await client.getByUID('artist', uid).catch(() => null)

  if (!artist) return {}

  const title = artist.data.meta_title || artist.data.name || undefined
  const description =
    artist.data.meta_description || prismic.asText(artist.data.bio) || undefined
  const image =
    prismic.asImageSrc(artist.data.meta_image) ||
    prismic.asImageSrc(artist.data.photo) ||
    undefined

  return {
    title,
    description,
    alternates: { canonical: `/artists/${uid}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/artists/${uid}`,
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
