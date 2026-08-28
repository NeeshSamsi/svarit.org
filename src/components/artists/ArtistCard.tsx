import Link from 'next/link'
import * as prismic from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'

interface ArtistCardProps {
  artist: prismic.Content.ArtistDocument
  className?: string
}

export default function ArtistCard({
  artist,
  className = '',
}: ArtistCardProps) {
  const { name, photo, discipline } = artist.data

  return (
    <Link
      href={`/artists/${artist.uid}`}
      className={`group flex flex-col gap-4 ${className}`}
    >
      <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-muted">
        <PrismicNextImage
          field={photo}
          fill
          fallbackAlt=""
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
          {name}
        </h3>
        {discipline && (
          <span className="font-body text-base font-light text-foreground">
            {discipline}
          </span>
        )}
      </div>
      <div className="h-px w-full bg-foreground" />
    </Link>
  )
}
