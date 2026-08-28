import { isFilled, type Content } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { InstagramIcon, YouTubeIcon } from '@/components/ui/social-icons'
import { artistInitials } from './initials'

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
  const { name, photo, bio, instagram, youtube } = artist.data
  const hasSocials = isFilled.link(instagram) || isFilled.link(youtube)

  return (
    <article className={`relative flex flex-col gap-4 ${className}`}>
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-[32px] bg-muted">
        {isFilled.image(photo) ? (
          <PrismicNextImage
            field={photo}
            fallbackAlt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-display text-5xl font-medium text-foreground/40"
          >
            {artistInitials(name)}
          </span>
        )}

        {hasSocials && (
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            {isFilled.link(instagram) && (
              <PrismicNextLink
                field={instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name ? `${name} on Instagram` : 'Instagram'}
                className="flex rounded-[12px] bg-[#fffaf0] p-1.5 text-foreground transition-opacity hover:opacity-70"
              >
                <InstagramIcon className="size-6" />
              </PrismicNextLink>
            )}
            {isFilled.link(youtube) && (
              <PrismicNextLink
                field={youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name ? `${name} on YouTube` : 'YouTube'}
                className="flex rounded-[12px] bg-[#fffaf0] p-1.5 text-foreground transition-opacity hover:opacity-70"
              >
                <YouTubeIcon className="size-6" />
              </PrismicNextLink>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
          <PrismicNextLink
            document={artist}
            className="after:absolute after:inset-0"
          >
            {name}
          </PrismicNextLink>
        </h3>
        {isFilled.keyText(bio) && (
          <p className="font-body text-xl font-light text-foreground">{bio}</p>
        )}
      </div>

      <div className="h-px w-full bg-foreground" />
    </article>
  )
}
