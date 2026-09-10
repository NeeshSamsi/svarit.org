/**
 * Tests for the /initiatives slice-zone restructure transform (Solo todo P4.5).
 *
 * The things that must hold: the existing hero slice survives untouched (including its exact
 * text), every non-slice field on the document is left alone, the output zone is hero +
 * timeline + tabs in that order with the right variations and fields, a second run over an
 * already-restructured zone is a no-op, and an unexpected zone (no hero, or extra slices) is
 * handled the way the file documents.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentPageSlices,
  pastTabsSlice,
  planInitiativesRestructure,
  upcomingTimelineSlice,
  PAST_HEADING,
  UPCOMING_HEADING,
  type Slice,
} from './restructure-initiatives-page.ts'

/** The hero slice as it exists on the live document today, preserved byte-for-byte. */
const existingHero = (): Slice => ({
  slice_type: 'hero',
  variation: 'page_header',
  items: [],
  primary: {
    title: 'Every concert, festival and workshop since 2001',
    description: [
      {
        type: 'paragraph',
        text: 'Svarit has presented Indian music across concert halls, festivals and classrooms since 2001.',
        spans: [],
      },
    ],
  },
})

/** The slice zone the page carries today: hero + two grid slices. */
const currentZone = (): Slice[] => [
  existingHero(),
  {
    slice_type: 'event_list',
    variation: 'grid',
    items: [],
    primary: {
      heading: 'Events',
      subheading: '',
      category: 'Event',
      limit: true,
    },
  },
  {
    slice_type: 'event_list',
    variation: 'grid',
    items: [],
    primary: {
      heading: 'Workshops',
      subheading: '',
      category: 'Workshop',
      limit: true,
    },
  },
]

describe('planInitiativesRestructure', () => {
  it('preserves the existing hero slice exactly, including its text', () => {
    const { slices } = planInitiativesRestructure(currentZone())
    assert.deepEqual(slices[0], existingHero())
  })

  it('rebuilds the zone as hero + timeline + tabs, in order', () => {
    const { slices } = planInitiativesRestructure(currentZone())

    assert.deepEqual(
      slices.map((s) => `${s.slice_type}/${s.variation}`),
      ['hero/page_header', 'event_list/timeline', 'event_list/default']
    )
  })

  it('gives the timeline slice the Upcoming heading, source and show_signup false', () => {
    const [, timeline] = planInitiativesRestructure(currentZone()).slices

    assert.deepEqual(timeline.primary, {
      heading: UPCOMING_HEADING,
      subheading: '',
      source: 'Upcoming',
      initiatives: [],
      show_signup: false,
      signup_heading: '',
      signup_cta_label: '',
    })
  })

  it('gives the tabs slice the Past heading, timeframe Past and limit true', () => {
    const [, , tabs] = planInitiativesRestructure(currentZone()).slices

    assert.deepEqual(tabs.primary, {
      heading: PAST_HEADING,
      subheading: '',
      timeframe: 'Past',
      limit: true,
    })
  })

  it('reports the rewrite and the dropped grid slices', () => {
    const { changes } = planInitiativesRestructure(currentZone())

    assert.equal(changes.length, 2)
    assert.match(changes[0], /rewrite slice zone: 3 slice\(s\) -> 3/)
    assert.match(
      changes[1],
      /dropped 2 non-hero slice\(s\): event_list\/grid, event_list\/grid/
    )
  })

  it('does not mutate the input', () => {
    const input = currentZone()
    planInitiativesRestructure(input)
    assert.equal(input.length, 3)
    assert.deepEqual(input[0], existingHero())
  })

  it('is idempotent: a second run over the desired zone is a no-op', () => {
    const desired = [existingHero(), upcomingTimelineSlice(), pastTabsSlice()]
    const { slices, changes } = planInitiativesRestructure(desired)

    assert.deepEqual(changes, [])
    assert.deepEqual(slices, desired)
  })

  it('is a no-op against a zone wearing the extra keys the query API adds', () => {
    const desired = [existingHero(), upcomingTimelineSlice(), pastTabsSlice()]
    const fetched: Slice[] = desired.map((s, i) => ({
      id: `slice-${i}`,
      slice_label: null,
      version: 'sktwi1xtmkfgx8626',
      ...s,
    }))
    // The query API also omits empty text fields rather than returning "".
    for (const s of fetched) {
      const primary = s.primary as Record<string, unknown>
      for (const key of ['subheading', 'signup_heading', 'signup_cta_label']) {
        if (primary[key] === '') delete primary[key]
      }
    }

    assert.deepEqual(planInitiativesRestructure(fetched).changes, [])
  })

  it('throws when there is no hero/page_header slice to preserve', () => {
    assert.throws(
      () =>
        planInitiativesRestructure([
          { slice_type: 'event_list', variation: 'grid', primary: {} },
        ]),
      /No hero\/page_header slice found/
    )
  })

  it('keeps the first hero and drops extras when more than one is present', () => {
    const duplicate = currentZone()
    duplicate.splice(1, 0, existingHero())

    const { slices, changes } = planInitiativesRestructure(duplicate)

    assert.deepEqual(slices[0], existingHero())
    assert.equal(slices.length, 3)
    assert.ok(changes.some((c) => /found 2 hero\/page_header slices/.test(c)))
  })

  it('drops an unrelated extra slice left over from a partial migration', () => {
    const withExtra = [
      existingHero(),
      upcomingTimelineSlice(),
      pastTabsSlice(),
      { slice_type: 'about', variation: 'default', primary: {} },
    ]

    const { slices, changes } = planInitiativesRestructure(withExtra)

    assert.deepEqual(
      slices.map((s) => `${s.slice_type}/${s.variation}`),
      ['hero/page_header', 'event_list/timeline', 'event_list/default']
    )
    assert.ok(
      changes.some((c) =>
        /dropped 1 non-hero slice\(s\): about\/default/.test(c)
      )
    )
  })
})

describe('currentPageSlices', () => {
  it('reads the slice zone off a fetched page document', () => {
    const data = { slices: currentZone(), meta_title: 'Events and Workshops' }
    assert.deepEqual(currentPageSlices(data), currentZone())
  })

  it('tolerates a missing or malformed slice zone', () => {
    assert.deepEqual(currentPageSlices({}), [])
    assert.deepEqual(currentPageSlices({ slices: null }), [])
  })
})
