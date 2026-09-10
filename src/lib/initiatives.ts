import type { EventDocument } from '../../prismicio-types'

export type Timeframe = 'All' | 'Upcoming' | 'Past'

const CATEGORIES = ['Event', 'Workshop', 'Scholarship'] as const

/**
 * Today as YYYY-MM-DD in local time, matching the plain-string format
 * `start_date` is stored in. `new Date(dateString)` parses a date-only string
 * as UTC midnight, which can land on the wrong side of "today" depending on
 * the server's offset; comparing the strings directly avoids that.
 */
export function todayISODate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * `Upcoming` keeps events dated today or later, `Past` keeps everything
 * before today; an event with no `start_date` matches neither. Any other
 * value, including null, behaves as `All`: slice instances saved before the
 * field existed read null rather than the model's `All` default.
 */
export function filterByTimeframe(
  events: EventDocument[],
  timeframe: string | null | undefined
): EventDocument[] {
  if (timeframe !== 'Upcoming' && timeframe !== 'Past') return events

  const today = todayISODate()
  return events.filter((event) => {
    const date = event.data.start_date
    if (typeof date !== 'string' || !date) return false
    return timeframe === 'Upcoming' ? date >= today : date < today
  })
}

/** null or 'All' keeps every event; anything else matches `data.category` exactly. */
export function filterByCategory(
  events: EventDocument[],
  category: string | null | undefined
): EventDocument[] {
  if (!category || category === 'All') return events
  return events.filter((event) => event.data.category === category)
}

/**
 * Sorted by `start_date` as a plain string, never `Date` arithmetic. An event
 * with no start date sorts as the oldest, matching how the pre-existing
 * `new Date(x ?? 0)` treated it.
 */
export function sortByDate(
  events: EventDocument[],
  direction: 'asc' | 'desc'
): EventDocument[] {
  return [...events].sort((a, b) => {
    const aDate = a.data.start_date ?? ''
    const bDate = b.data.start_date ?? ''
    return direction === 'asc'
      ? aDate.localeCompare(bDate)
      : bDate.localeCompare(aDate)
  })
}

/**
 * Which of the three categories have at least one event in the given
 * timeframe, in the fixed order Event, Workshop, Scholarship. A category with
 * zero matches (e.g. Scholarship before any scholarship has happened) is
 * left out entirely, rather than rendered as an empty tab.
 */
export function categoriesWithEvents(
  events: EventDocument[],
  timeframe: string | null | undefined
): (typeof CATEGORIES)[number][] {
  const inTimeframe = filterByTimeframe(events, timeframe)
  return CATEGORIES.filter((category) =>
    inTimeframe.some((event) => event.data.category === category)
  )
}
