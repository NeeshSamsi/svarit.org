import Link from 'next/link'
import * as prismic from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import CategoryBadge from './CategoryBadge'

interface EventCardProps {
  event: prismic.Content.EventDocument
  className?: string
}

export default function EventCard({ event, className = '' }: EventCardProps) {
  const { title, category, date_label, venue, hero_image } = event.data

  return (
    <Link
      href={`/events/${event.uid}`}
      className={`group flex flex-col gap-4 ${className}`}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-muted">
        <PrismicNextImage
          field={hero_image}
          fill
          fallbackAlt=""
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryBadge category={category} />
          {date_label && (
            <span className="font-body text-base font-light text-foreground">
              {date_label}
            </span>
          )}
        </div>
        <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
          {title}
        </h3>
        {venue && (
          <p className="font-body text-xl font-light text-foreground">
            {venue}
          </p>
        )}
      </div>
      <div className="h-px w-full bg-foreground" />
    </Link>
  )
}
