import type { Content } from '@prismicio/client'
import type { SliceComponentProps } from '@prismicio/react'
import { getAllEvents } from '@/lib/queries'
import EventListTabs from './EventListTabs'
import EventListGrid from './EventListGrid'

export type EventListProps = SliceComponentProps<Content.EventListSlice>

/**
 * Fetches the events server side, then hands them to the client component that
 * owns the tabs, the pagination and the GSAP animations.
 */
export default async function EventList({ slice }: EventListProps) {
  const events = await getAllEvents()

  if (slice.variation === 'grid') {
    return <EventListGrid slice={slice} events={events} />
  }

  return <EventListTabs slice={slice} events={events} />
}
