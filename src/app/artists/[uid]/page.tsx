import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import * as prismic from '@prismicio/client'
import { SliceZone } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { components } from '@/slices'
import ArtistHero from '@/components/artists/ArtistHero'
import ArtistFeatures from '@/components/artists/ArtistFeatures'
import StaggerReveal from '@/components/animation/StaggerReveal'
import { artistBioText } from '@/components/artists/bio'
import { ARTIST_HERO_INTRO_END } from '@/lib/intro'
import { SITE_URL } from '@/lib/site'
import { ogImageFields } from '@/lib/og'

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

  // The donate block is the same one the home page uses; read it rather than
  // invent values so a single edit keeps every page in step.
  const home = await client.getByUID('page', 'home').catch(() => null)
  const donateSlice = home?.data.slices.find(
    (slice) => slice.slice_type === 'donate'
  )

  const featuresTitle =
    artist.data.features_title ||
    (artist.data.name ? `${artist.data.name} at Svarit` : 'At Svarit')
  const featuresEyebrow = artist.data.features_eyebrow || 'Appearances'

  // No `Person` schema here on purpose: these documents carry only a name, so
  // the object would be all but empty. The breadcrumb is the one useful piece
  // of structured data the page can stand behind today.
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Artists',
        item: `${SITE_URL}/artists`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: artist.data.name || 'Artist',
        item: `${SITE_URL}/artists/${uid}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <article className="col-span-full grid grid-cols-subgrid gap-y-18 pt-36 md:pt-44">
        <ArtistHero artist={artist} />

        {artist.data.slices.length > 0 && (
          <StaggerReveal
            className="col-span-full grid grid-cols-subgrid gap-y-12"
            introEnd={ARTIST_HERO_INTRO_END}
          >
            <SliceZone slices={artist.data.slices} components={components} />
          </StaggerReveal>
        )}

        {events.length > 0 && (
          <ArtistFeatures
            eyebrow={featuresEyebrow}
            title={featuresTitle}
            events={events}
          />
        )}

        {donateSlice && (
          <SliceZone slices={[donateSlice]} components={components} />
        )}
      </article>
    </>
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
    artist.data.meta_description || artistBioText(artist.data.bio) || undefined
  // meta_image -> generated card for this uid -> /og/home.jpg. Set on both
  // openGraph and twitter, or the shallow merge drops the layout fallback.
  const og = ogImageFields({
    metaImage: prismic.asImageSrc(artist.data.meta_image),
    kind: 'artists',
    uid,
  })

  return {
    title,
    description,
    alternates: { canonical: `/artists/${uid}` },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: `/artists/${uid}`,
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
