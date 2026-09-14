'use client'

import { useState } from 'react'
import { isFilled } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import ButtonLink from '@/components/ui/ButtonLink'
import { button } from '@/components/ui/button-variants'
import { initiativeCtas } from '@/lib/ctas'
import type { ArtistDocument, EventDocument } from '../../../prismicio-types'

/**
 * A richer timeline card: no hero image, a dot on the rail centred on the
 * title, and a collapsible row of featured artists. NOT a stretched link:
 * it carries its own Show more toggle and Learn more CTA, so an overlay
 * would fight both. The title is a plain heading, not a link.
 */
export default function InitiativeTimelineCard({
  event,
  artists,
  className = '',
}: {
  event: EventDocument
  artists: ArtistDocument[]
  className?: string
}) {
  const [collapsed, setCollapsed] = useState(true)

  // A migrated Text field reads back as [] and still passes isFilled.keyText,
  // so guard venue and feature_label with a plain string check.
  const venue =
    typeof event.data.venue === 'string' ? event.data.venue.trim() : ''
  const venueMapLink = isFilled.link(event.data.venue_map_link)
    ? event.data.venue_map_link
    : null
  const featureLabel =
    typeof event.data.feature_label === 'string' &&
    event.data.feature_label.trim()
      ? event.data.feature_label.trim()
      : 'Featuring:'

  const ctas = initiativeCtas(event)

  // Exactly one row collapsed: 2 tiles on mobile, 3 from lg. `max-lg:` and
  // `lg:` never target the same viewport, so there is no cascade-ordering
  // risk between them the way two competing `lg:` rules would have.
  const collapsedClasses = collapsed
    ? 'max-lg:[&>*:nth-child(n+3)]:hidden lg:[&>*:nth-child(n+4)]:hidden'
    : ''

  // The toggle only matters once artists overflow a row, and that threshold
  // is itself breakpoint-dependent: 3 fits one lg row but overflows mobile's
  // 2-wide row.
  const toggleVisibility =
    artists.length > 3
      ? 'inline-flex'
      : artists.length > 2
        ? 'inline-flex lg:hidden'
        : 'hidden'

  return (
    <article
      className={`relative flex flex-col gap-4 rounded-3xl bg-muted p-6 md:p-8 ${className}`.trim()}
    >
      <div className="flex flex-col gap-2">
        {/* `contents` at mobile promotes these spans into the parent flex
            column so `order` applies across them and the title; at md the
            wrapper becomes a flex row and `md:order-none` resets it. */}
        <div className="contents md:flex md:items-center md:gap-2">
          {/* shrink-0 + whitespace-nowrap: the date must never wrap, so any
              squeeze in this row falls entirely on the venue instead. */}
          <span className="order-1 shrink-0 font-body text-base font-light whitespace-nowrap text-foreground md:order-none">
            {event.data.date_label}
          </span>
          {venue && (
            <span aria-hidden="true" className="hidden shrink-0 md:inline">
              &bull;
            </span>
          )}
          {/* min-w-0: a flex item's default min-width is its content size,
              which would fight the date for space instead of wrapping. */}
          {venue && venueMapLink && (
            <PrismicNextLink
              field={venueMapLink}
              className="order-3 min-w-0 font-body text-base font-light text-foreground underline underline-offset-4 transition-opacity hover:opacity-60 md:order-none"
            >
              {venue}
            </PrismicNextLink>
          )}
          {venue && !venueMapLink && (
            <span className="order-3 min-w-0 font-body text-base font-light text-foreground md:order-none">
              {venue}
            </span>
          )}
        </div>
        <h3 className="relative order-2 font-display text-3xl leading-tight font-medium text-foreground md:order-none md:text-4xl">
          {event.data.title}
          {/* Lives inside the title, which is `relative`, so `top-1/2` centres
              the dot on the title box whether it wraps to one line or two. */}
          <span
            aria-hidden="true"
            className="timeline-dot absolute top-1/2 left-[calc(-1*var(--timeline-inset))] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-primary"
          />
        </h3>
      </div>
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
      {artists.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="font-display text-xl font-medium text-foreground">
            {featureLabel}
          </span>
          <div
            className={`grid grid-cols-2 gap-4 lg:grid-cols-3 ${collapsedClasses}`}
          >
            {artists.map((artist) => (
              <div key={artist.id} className="flex flex-col gap-2">
                {isFilled.image(artist.data.photo) && (
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl">
                    <PrismicNextImage
                      field={artist.data.photo}
                      fill
                      sizes="(min-width: 1024px) 18vw, (min-width: 768px) 25vw, 45vw"
                      className="object-cover"
                      fallbackAlt=""
                    />
                  </div>
                )}
                {/* Discipline and name read as one unit, so their own gap is
                    much tighter than the gap under the photo. */}
                <div className="flex flex-col gap-0.5">
                  <span className="font-body text-sm font-light text-foreground">
                    {artist.data.discipline}
                  </span>
                  <span className="font-display text-lg font-medium text-foreground">
                    {artist.data.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className={`w-fit cursor-pointer items-center gap-2 font-body text-base font-light text-foreground ${toggleVisibility}`}
          >
            {collapsed ? 'Show more artists' : 'Hide artists'}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={`size-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6l4 4 4-4"
              />
            </svg>
          </button>
        </div>
      )}
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
