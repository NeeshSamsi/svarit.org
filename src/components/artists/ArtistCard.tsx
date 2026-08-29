import { type Content } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import ArtistPhoto from './ArtistPhoto'
import ArtistSocials from './ArtistSocials'
import { artistBioText } from './bio'

interface ArtistCardProps {
  artist: Content.ArtistDocument
  className?: string
  /** First-row cards opt in to eager loading; the rest stay lazy. */
  priority?: boolean
}

/**
 * An artist tile: photo, name, short bio, separator. The name carries a
 * stretched link (`after:absolute after:inset-0`) so the whole card is the hit
 * area while the markup stays valid and the social icons remain their own
 * independent links and tab stops.
 */
export default function ArtistCard({
  artist,
  className = '',
  priority = false,
}: ArtistCardProps) {
  const { name, bio } = artist.data
  const bioText = artistBioText(bio)

  return (
    <article className={`relative flex flex-col gap-4 ${className}`}>
      <ArtistPhoto
        artist={artist}
        priority={priority}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-4/3 rounded-[32px]"
      >
        <ArtistSocials
          artist={artist}
          orientation="vertical"
          chipClassName="bg-[#fffaf0]"
          className="absolute top-4 right-4 z-10"
        />
      </ArtistPhoto>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
          <PrismicNextLink
            document={artist}
            className="after:absolute after:inset-0"
          >
            {name}
          </PrismicNextLink>
        </h3>
        {bioText && (
          <p className="font-body text-xl font-light text-foreground">
            {bioText}
          </p>
        )}
      </div>

      <div className="h-px w-full bg-foreground" />
    </article>
  )
}
