import { isFilled } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import CategoryBadge from '@/components/events/CategoryBadge'
import type { EventDocument } from '../../../prismicio-types'

/**
 * The card markup shared by both EventList variations. `linked` turns the whole
 * card into a link to the event page; both the grid and the tabbed home
 * variation pass it so every event card is clickable.
 *
 * `badge` puts the event's category to the left of the date in the meta row,
 * mirroring the event page header. The Features section on the artist page uses
 * it; the EventList variations leave it off and render no badge, exactly as they
 * do today. `className` is appended so a caller can add its own grid placement
 * or an animation hook class.
 */
export default function EventCard({
  event,
  linked = false,
  badge = false,
  className = '',
}: {
  event: EventDocument
  linked?: boolean
  badge?: boolean
  className?: string
}) {
  const cardClassName =
    `initiative-card col-span-full flex flex-col gap-4 sm:col-span-6 lg:col-span-4 ${className}`.trim()

  const content = (
    <>
      {isFilled.image(event.data.hero_image) && (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl">
          <PrismicNextImage
            field={event.data.hero_image}
            fallbackAlt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {badge && (
            <CategoryBadge category={event.data.category} size="compact" />
          )}
          <span className="font-body text-base font-light text-foreground">
            {event.data.date_label}
          </span>
        </div>
        <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
          {event.data.title}
        </h3>
        <PrismicRichText
          field={event.data.description}
          components={{
            paragraph: ({ children }) => (
              <p className="font-body text-xl font-light text-foreground">
                {children}
              </p>
            ),
          }}
        />
      </div>
      <div className="h-px w-full bg-foreground" />
    </>
  )

  if (linked) {
    return (
      <PrismicNextLink document={event} className={cardClassName}>
        {content}
      </PrismicNextLink>
    )
  }

  return <div className={cardClassName}>{content}</div>
}
