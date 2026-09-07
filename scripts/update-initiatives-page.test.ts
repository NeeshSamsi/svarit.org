/**
 * Tests for the /initiatives slice-zone rebuild transform.
 *
 * The things that must hold: the zone becomes hero + two grid slices in order, the grid
 * slices carry the right category and `limit`, the stale `page_size` is reported and gone,
 * and a second run over an already-correct zone (including one dressed in the extra keys the
 * query API adds) is a no-op.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentPageSlices,
  desiredInitiativesSlices,
  planInitiativesPageSlices,
  INITIATIVES_HERO_TITLE,
  INITIATIVES_HERO_DESCRIPTION,
  type Slice,
} from './update-initiatives-page.ts'

/** The slice zone the page carries today: one grid slice with the removed `page_size`. */
const currentZone = (): Slice[] => [
  {
    slice_type: 'event_list',
    variation: 'grid',
    items: [],
    primary: {
      heading: 'Everything Svarit Has Presented Since 2001',
      subheading: 'Events and Workshops',
      category: 'All',
      page_size: 12,
    },
  },
]

describe('planInitiativesPageSlices', () => {
  it('rebuilds the zone as hero + Events grid + Workshops grid, in order', () => {
    const { slices } = planInitiativesPageSlices(currentZone())

    assert.deepEqual(
      slices.map((s) => `${s.slice_type}/${s.variation}`),
      ['hero/page_header', 'event_list/grid', 'event_list/grid']
    )
  })

  it('gives the hero the title and a single-paragraph description', () => {
    const [hero] = planInitiativesPageSlices(currentZone()).slices
    const primary = hero.primary as Record<string, unknown>

    assert.equal(primary.title, INITIATIVES_HERO_TITLE)
    assert.deepEqual(primary.description, [
      { type: 'paragraph', text: INITIATIVES_HERO_DESCRIPTION, spans: [] },
    ])
  })

  it('sets category, empty subheading and limit on the two grid slices', () => {
    const [, events, workshops] =
      planInitiativesPageSlices(currentZone()).slices

    assert.deepEqual(events.primary, {
      heading: 'Events',
      subheading: '',
      category: 'Event',
      limit: true,
    })
    assert.deepEqual(workshops.primary, {
      heading: 'Workshops',
      subheading: '',
      category: 'Workshop',
      limit: true,
    })
  })

  it('reports the rewrite and the dropped page_size', () => {
    const { changes } = planInitiativesPageSlices(currentZone())

    assert.equal(changes.length, 2)
    assert.match(changes[0], /rewrite slice zone: 1 slice\(s\) -> 3/)
    assert.match(changes[1], /page_size/)
  })

  it('does not report a page_size drop when the current zone never carried one', () => {
    const { changes } = planInitiativesPageSlices([
      { slice_type: 'about', variation: 'default', primary: {} },
    ])

    assert.equal(changes.length, 1)
    assert.match(changes[0], /rewrite slice zone/)
  })

  it('does not mutate the input', () => {
    const input = currentZone()
    planInitiativesPageSlices(input)
    assert.equal(input.length, 1)
    assert.equal((input[0].primary as Record<string, unknown>).page_size, 12)
  })

  it('is idempotent: a second run over the desired zone is a no-op', () => {
    const { slices, changes } = planInitiativesPageSlices(
      desiredInitiativesSlices()
    )

    assert.deepEqual(changes, [])
    assert.deepEqual(slices, desiredInitiativesSlices())
  })

  it('is a no-op against a zone wearing the extra keys the query API adds', () => {
    const fetched: Slice[] = desiredInitiativesSlices().map((s, i) => ({
      id: `slice-${i}`,
      slice_label: null,
      version: 'sktwi1xtmkfgx8626',
      ...s,
    }))
    // The query API also omits an empty text field rather than returning "".
    for (const s of fetched) {
      const primary = s.primary as Record<string, unknown>
      if (primary.subheading === '') delete primary.subheading
    }

    assert.deepEqual(planInitiativesPageSlices(fetched).changes, [])
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
