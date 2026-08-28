import type { Content } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import type { SliceComponentProps } from '@prismicio/react'
import SectionTitle from '@/components/ui/SectionTitle'
import { getAllArtists } from '@/lib/queries'

export type ArtistListProps = SliceComponentProps<Content.ArtistListSlice>

export default async function ArtistList({ slice }: ArtistListProps) {
  const artists = await getAllArtists()

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Artists"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div className="col-span-full">
        <SectionTitle
          eyebrow={slice.primary.subheading ?? undefined}
          title={slice.primary.heading ?? ''}
        />
      </div>
      {artists.map((artist) => (
        <PrismicNextLink
          key={artist.id}
          document={artist}
          className="col-span-full flex flex-col gap-4 sm:col-span-6 lg:col-span-4"
        >
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-muted">
            <PrismicNextImage
              field={artist.data.photo}
              fallbackAlt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
              {artist.data.name}
            </h3>
            {artist.data.discipline && (
              <span className="font-body text-base font-light text-foreground">
                {artist.data.discipline}
              </span>
            )}
          </div>
          <div className="h-px w-full bg-foreground" />
        </PrismicNextLink>
      ))}
    </section>
  )
}
