import { isFilled } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import CategoryBadge from '@/components/events/CategoryBadge'
import ButtonLink from '@/components/ui/ButtonLink'
import { button } from '@/components/ui/button-variants'
import { initiativeCtas } from '@/lib/ctas'
import type { EventDocument } from '../../../prismicio-types'

/**
 * The minimal card shared by both EventList variations, the artist Features
 * section, and (later) the timeline. A filled `bg-muted` surface carrying an
 * optional category badge, the image, date, title, venue, description and a
 * full-width CTA row.
 *
 * `badge` puts the event's category above the image, mirroring the event page
 * header. The Features section on the artist page uses it; the EventList
 * variations leave it off, exactly as they do today. `className` is appended
 * so a caller can add its own grid placement or an animation hook class.
 */
export default function EventCard({
  event,
  badge = false,
  className = '',
}: {
  event: EventDocument
  badge?: boolean
  className?: string
}) {
  // A migrated Rich Text -> Text field reads back as [] and still passes
  // isFilled.keyText, so guard venue with a plain string check.
  const venue =
    typeof event.data.venue === 'string' ? event.data.venue.trim() : ''
  const venueMapLink = isFilled.link(event.data.venue_map_link)
    ? event.data.venue_map_link
    : null

  const ctas = initiativeCtas(event)

  return (
    <article
      className={`initiative-card relative col-span-full flex flex-col gap-4 rounded-3xl bg-muted p-4 sm:col-span-6 lg:col-span-4 ${className}`.trim()}
    >
      {badge && <CategoryBadge category={event.data.category} />}
      {isFilled.image(event.data.hero_image) && (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
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
          {/* The article is `relative` and this div is static, so the anchor's
              `::after` resolves its containing block to the article and
              stretches over the whole card, not just the h3. A button's own
              `overflow-hidden` would clip a stretched `::after` the same way,
              which is why the CTA can't carry this instead. */}
          <PrismicNextLink
            document={event}
            className='after:absolute after:inset-0 after:content-[""]'
          >
            {event.data.title}
          </PrismicNextLink>
        </h3>
        {venue && venueMapLink && (
          <PrismicNextLink
            field={venueMapLink}
            className="font-body text-base font-light text-foreground underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            {venue}
          </PrismicNextLink>
        )}
        {venue && !venueMapLink && (
          <span className="font-body text-base font-light text-foreground">
            {venue}
          </span>
        )}
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
      <div
        className={`flex gap-2 ${ctas.length === 2 ? 'flex-row' : 'flex-col'}`}
      >
        {ctas.map((cta, index) =>
          cta.field ? (
            <PrismicNextLink
              key={index}
              field={cta.field}
              className={button({
                variant: cta.variant,
                size: 'sm',
                className: 'w-full',
              })}
            >
              {cta.label}
            </PrismicNextLink>
          ) : (
            <ButtonLink
              key={index}
              href={cta.href ?? '#'}
              variant={cta.variant}
              size="sm"
              className="w-full"
            >
              {cta.label}
            </ButtonLink>
          )
        )}
      </div>
    </article>
  )
}
