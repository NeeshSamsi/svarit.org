import * as prismic from '@prismicio/client'
import type { Content } from '@prismicio/client'
import type { SliceComponentProps } from '@prismicio/react'
import { createClient } from '@/prismicio'
import { getAllEvents } from '@/lib/queries'
import EventListTabs from './EventListTabs'
import EventListGrid from './EventListGrid'
import EventListTimeline from './EventListTimeline'
import type { ArtistDocument, EventDocument } from '../../../prismicio-types'

export type EventListProps = SliceComponentProps<Content.EventListSlice>

/**
 * Today as YYYY-MM-DD in local time, matching the plain-string format
 * `start_date` is stored in. `new Date(dateString)` parses a date-only string
 * as UTC midnight, which can land on the wrong side of "today" depending on
 * the server's offset; comparing the strings directly avoids that.
 */
function todayISODate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The events for the timeline's `initiatives[]` group (source `Chosen`) or
 * every not-yet-past event (source `Upcoming`, also the fallback for a slice
 * saved before `source` existed, which reads null rather than the model's
 * `Upcoming` default). `getAllEvents()` sorts descending for the grid/tabs
 * variations, so the Upcoming branch re-sorts ascending, soonest first.
 */
async function resolveTimelineEvents(
  slice: Extract<Content.EventListSlice, { variation: 'timeline' }>
): Promise<EventDocument[]> {
  if (slice.primary.source === 'Chosen') {
    const ids = slice.primary.initiatives.flatMap((item) =>
      prismic.isFilled.contentRelationship(item.initiative)
        ? [item.initiative.id]
        : []
    )
    const docs = ids.length
      ? await createClient().getAllByIDs<EventDocument>(ids)
      : []

    return ids
      .map((id) => docs.find((doc) => doc.id === id))
      .filter((doc): doc is EventDocument => doc !== undefined)
  }

  const today = todayISODate()
  return (await getAllEvents())
    .filter(
      (event) =>
        typeof event.data.start_date === 'string' &&
        event.data.start_date >= today
    )
    .sort((a, b) =>
      (a.data.start_date ?? '').localeCompare(b.data.start_date ?? '')
    )
}

/**
 * Featured artists first (group order preserved among them), then the rest
 * (also in group order). `featured` lives on the event's `artists` group row.
 */
function resolveEventArtists(
  event: EventDocument,
  artistDocs: ArtistDocument[]
): ArtistDocument[] {
  const rows = event.data.artists
    .flatMap((item) =>
      prismic.isFilled.contentRelationship(item.artist)
        ? [{ featured: item.featured === true, id: item.artist.id }]
        : []
    )
    .map((row) => ({
      featured: row.featured,
      doc: artistDocs.find((doc) => doc.id === row.id),
    }))
    .filter(
      (row): row is { featured: boolean; doc: ArtistDocument } =>
        row.doc !== undefined
    )

  return [
    ...rows.filter((row) => row.featured),
    ...rows.filter((row) => !row.featured),
  ].map((row) => row.doc)
}

/**
 * Fetches the events server side, then hands them to the client component that
 * owns the tabs, the pagination and the GSAP animations.
 */
export default async function EventList({ slice }: EventListProps) {
  if (slice.variation === 'grid') {
    const events = await getAllEvents()
    return <EventListGrid slice={slice} events={events} />
  }

  if (slice.variation === 'default') {
    const events = await getAllEvents()
    return <EventListTabs slice={slice} events={events} />
  }

  const events = await resolveTimelineEvents(slice)

  // One batch fetch for every selected event's artists, not one query per
  // card: collect every filled artist id across all of them first, deduped.
  const artistIds = [
    ...new Set(
      events.flatMap((event) =>
        event.data.artists.flatMap((item) =>
          prismic.isFilled.contentRelationship(item.artist)
            ? [item.artist.id]
            : []
        )
      )
    ),
  ]
  const artistDocs = artistIds.length
    ? await createClient().getAllByIDs<ArtistDocument>(artistIds)
    : []

  const items = events.map((event) => ({
    event,
    artists: resolveEventArtists(event, artistDocs),
  }))

  return <EventListTimeline slice={slice} items={items} />
}
