import { isFilled } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import type { EventDocument } from '../../../prismicio-types'

/**
 * The card markup shared by both EventList variations. `linked` turns the whole
 * card into a link to the event page, which the grid variation uses. The tabbed
 * home variation renders it unlinked, exactly as the current site does.
 */
export default function EventCard({
  event,
  linked = false,
}: {
  event: EventDocument
  linked?: boolean
}) {
  const className =
    'initiative-card col-span-full flex flex-col gap-4 sm:col-span-6 lg:col-span-4'

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
        <span className="font-body text-base font-light text-foreground">
          {event.data.date_label}
        </span>
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
      <PrismicNextLink document={event} className={className}>
        {content}
      </PrismicNextLink>
    )
  }

  return <div className={className}>{content}</div>
}
