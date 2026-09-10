import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  todayISODate,
  filterByTimeframe,
  filterByCategory,
  sortByDate,
  categoriesWithEvents,
} from './initiatives.ts'
import type { EventDocument } from '../../prismicio-types'

function makeEvent(overrides: {
  id: string
  category?: string
  start_date?: string | null
}): EventDocument {
  return {
    id: overrides.id,
    data: {
      category: overrides.category ?? 'Event',
      start_date: overrides.start_date ?? null,
    },
  } as unknown as EventDocument
}

describe('filterByTimeframe', () => {
  it('behaves as All for a null timeframe', () => {
    const events = [
      makeEvent({ id: 'past', start_date: '2020-01-01' }),
      makeEvent({ id: 'future', start_date: '2999-01-01' }),
    ]
    assert.deepEqual(filterByTimeframe(events, null), events)
  })

  it('falls back to All for an unknown timeframe string rather than returning []', () => {
    const events = [
      makeEvent({ id: 'past', start_date: '2020-01-01' }),
      makeEvent({ id: 'future', start_date: '2999-01-01' }),
    ]
    assert.equal(filterByTimeframe(events, 'Bogus').length, 2)
  })

  it('treats an event dated exactly today as Upcoming, not Past', () => {
    const today = makeEvent({ id: 'today', start_date: todayISODate() })

    assert.deepEqual(filterByTimeframe([today], 'Upcoming'), [today])
    assert.deepEqual(filterByTimeframe([today], 'Past'), [])
  })

  it('excludes an event with no start_date from both Upcoming and Past', () => {
    const noDate = makeEvent({ id: 'no-date', start_date: null })

    assert.deepEqual(filterByTimeframe([noDate], 'Upcoming'), [])
    assert.deepEqual(filterByTimeframe([noDate], 'Past'), [])
  })
})

describe('filterByCategory', () => {
  it('keeps everything for null or All', () => {
    const events = [
      makeEvent({ id: 'a', category: 'Event' }),
      makeEvent({ id: 'b', category: 'Workshop' }),
    ]
    assert.deepEqual(filterByCategory(events, null), events)
    assert.deepEqual(filterByCategory(events, 'All'), events)
  })

  it('matches data.category exactly', () => {
    const events = [
      makeEvent({ id: 'a', category: 'Event' }),
      makeEvent({ id: 'b', category: 'Workshop' }),
    ]
    assert.deepEqual(filterByCategory(events, 'Workshop'), [events[1]])
  })
})

describe('sortByDate', () => {
  const events = [
    makeEvent({ id: 'mid', start_date: '2021-06-01' }),
    makeEvent({ id: 'old', start_date: '2020-01-01' }),
    makeEvent({ id: 'new', start_date: '2022-01-01' }),
  ]

  it('Past sorts newest first (desc)', () => {
    assert.deepEqual(
      sortByDate(events, 'desc').map((e) => e.id),
      ['new', 'mid', 'old']
    )
  })

  it('Upcoming sorts soonest first (asc)', () => {
    assert.deepEqual(
      sortByDate(events, 'asc').map((e) => e.id),
      ['old', 'mid', 'new']
    )
  })
})

describe('categoriesWithEvents', () => {
  it('omits a category with zero matching events', () => {
    const events = [
      makeEvent({ id: 'a', category: 'Event' }),
      makeEvent({ id: 'b', category: 'Workshop' }),
    ]
    assert.deepEqual(categoriesWithEvents(events, 'All'), ['Event', 'Workshop'])
  })

  it('returns categories in the fixed Event, Workshop, Scholarship order', () => {
    const events = [
      makeEvent({ id: 'a', category: 'Scholarship' }),
      makeEvent({ id: 'b', category: 'Workshop' }),
      makeEvent({ id: 'c', category: 'Event' }),
    ]
    assert.deepEqual(categoriesWithEvents(events, 'All'), [
      'Event',
      'Workshop',
      'Scholarship',
    ])
  })

  it('respects the timeframe before checking category membership', () => {
    const events = [
      makeEvent({ id: 'a', category: 'Event', start_date: '2020-01-01' }),
      makeEvent({ id: 'b', category: 'Workshop', start_date: '2999-01-01' }),
    ]
    assert.deepEqual(categoriesWithEvents(events, 'Past'), ['Event'])
  })
})
