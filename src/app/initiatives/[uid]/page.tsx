import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import { PrismicRichText, SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import ArtistCard from '@/components/artists/ArtistCard'
import CategoryBadge from '@/components/events/CategoryBadge'
import SectionTitle from '@/components/ui/SectionTitle'

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
      <header className="col-span-full grid grid-cols-subgrid gap-y-6">
        <div className="col-span-full flex flex-col gap-4 md:col-span-9">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryBadge category={event.data.category} />
            {event.data.date_label && (
              <span className="font-body text-base font-light text-foreground">
                {event.data.date_label}
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
            {event.data.title}
          </h1>
          {event.data.venue && (
            <p className="font-body text-xl font-light text-foreground">
              {event.data.venue}
            </p>
          )}
        </div>

        {prismic.isFilled.image(event.data.hero_image) && (
          <div className="relative col-span-full aspect-16/9 w-full overflow-hidden rounded-3xl bg-muted">
            <PrismicNextImage
              field={event.data.hero_image}
              fill
              fallbackAlt=""
              priority
              sizes="(min-width: 1032px) 1032px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {prismic.isFilled.richText(event.data.description) && (
          <div className="col-span-full flex flex-col gap-4 font-body text-xl font-light text-foreground md:col-span-9 [&_a]:underline [&_strong]:font-medium">
            <PrismicRichText field={event.data.description} />
          </div>
        )}
      </header>

      <div className="col-span-full grid grid-cols-subgrid gap-y-12">
        <SliceZone slices={event.data.slices} components={components} />
      </div>

      {artists.length > 0 && (
        <section
          aria-label="Artists"
          className="col-span-full grid grid-cols-subgrid gap-y-6"
        >
          <SectionTitle
            eyebrow="Featuring"
            title="Artists"
            className="col-span-full md:col-span-8"
          />
          {artists.map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              className="col-span-6 sm:col-span-4 lg:col-span-3"
            />
          ))}
        </section>
      )}
    </article>
  )
}

const warnEmpty = (reason: string) =>
  console.warn(
    `\n[build] WARNING /events/[uid]: ${reason} Prerendering no event pages. Have the custom types been pushed to Prismic?\n`
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
    alternates: { canonical: `/events/${uid}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/events/${uid}`,
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
