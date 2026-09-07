import { isFilled, type Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import { artistInitials } from './initials'

interface ArtistPhotoProps {
  artist: Content.ArtistDocument
  /** `sizes` for the fill image; varies with where the photo sits in the grid. */
  sizes: string
  priority?: boolean
  /** Container utilities: aspect ratio, rounding, column span. */
  className?: string
  /** Overlay content rendered on top of the image, e.g. the social chips. */
  children?: React.ReactNode
}

/**
 * The artist photo, or the artist's initials in `font-display` when there is no
 * photo. Most artist documents have no photo, so the placeholder has to look
 * deliberate rather than broken.
 */
export default function ArtistPhoto({
  artist,
  sizes,
  priority = false,
  className = '',
  children,
}: ArtistPhotoProps) {
  const { name, photo } = artist.data

  return (
    <div className={`relative w-full overflow-hidden bg-muted ${className}`}>
      {isFilled.image(photo) ? (
        <PrismicNextImage
          field={photo}
          fallbackAlt=""
          fill
          priority={priority}
          sizes={sizes}
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
      {children}
    </div>
  )
}
