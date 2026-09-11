/**
 * Tests for turning on the signup form on page/initiatives' timeline slice.
 *
 * The things that must hold: `show_signup` flips to true, blank `signup_heading` /
 * `signup_cta_label` fall back to the exact copy `EventListTimeline.tsx` itself uses, a
 * non-blank value already there is left untouched, every other primary field and every
 * other slice survive unchanged, a second run over an already-enabled zone is a no-op, and a
 * zone with no timeline slice is refused rather than guessed at.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentPageSlices,
  findTimelineSliceIndex,
  planEnableSignup,
  SIGNUP_CTA_LABEL_DEFAULT,
  SIGNUP_HEADING_DEFAULT,
  type Slice,
} from './enable-initiatives-signup.ts'

/** The /initiatives timeline slice as it exists today: show_signup false, both texts blank. */
const timelineSlice = (overrides: Record<string, unknown> = {}): Slice => ({
  slice_type: 'event_list',
  variation: 'timeline',
  items: [],
  primary: {
    heading: '',
    subheading: 'Upcoming',
    source: 'Upcoming',
    initiatives: [],
    show_signup: false,
    signup_heading: '',
    signup_cta_label: '',
    ...overrides,
  },
})

const heroSlice: Slice = {
  slice_type: 'hero',
  variation: 'page_header',
  primary: { title: 'Every concert, festival and workshop since 2001' },
}

const tabsSlice: Slice = {
  slice_type: 'event_list',
  variation: 'default',
  primary: { heading: 'Past Initiatives', timeframe: 'Past', limit: true },
}

describe('planEnableSignup', () => {
  it('turns show_signup on and fills both blank signup fields with the component defaults', () => {
    const { slices, changes } = planEnableSignup([
      heroSlice,
      timelineSlice(),
      tabsSlice,
    ])

    const timeline = slices[1].primary as Record<string, unknown>
    assert.equal(timeline.show_signup, true)
    assert.equal(timeline.signup_heading, SIGNUP_HEADING_DEFAULT)
    assert.equal(timeline.signup_cta_label, SIGNUP_CTA_LABEL_DEFAULT)
    assert.equal(changes.length, 3)
  })

  it('leaves a non-blank signup_heading or signup_cta_label untouched', () => {
    const { slices, changes } = planEnableSignup([
      timelineSlice({
        signup_heading: 'Join the Celebration',
        signup_cta_label: 'Get updates',
      }),
    ])

    const timeline = slices[0].primary as Record<string, unknown>
    assert.equal(timeline.signup_heading, 'Join the Celebration')
    assert.equal(timeline.signup_cta_label, 'Get updates')
    assert.deepEqual(changes, ['show_signup: false -> true'])
  })

  it('leaves the hero slice, the tabs slice, and every other timeline field untouched', () => {
    const { slices } = planEnableSignup([heroSlice, timelineSlice(), tabsSlice])

    assert.deepEqual(slices[0], heroSlice)
    assert.deepEqual(slices[2], tabsSlice)
    const timeline = slices[1].primary as Record<string, unknown>
    assert.equal(timeline.subheading, 'Upcoming')
    assert.equal(timeline.source, 'Upcoming')
    assert.deepEqual(timeline.initiatives, [])
  })

  it('does not mutate the input', () => {
    const input = [timelineSlice()]
    planEnableSignup(input)
    assert.equal(
      (input[0].primary as Record<string, unknown>).show_signup,
      false
    )
  })

  it('is idempotent: a second run over the already-enabled zone is a no-op', () => {
    const enabled = timelineSlice({
      show_signup: true,
      signup_heading: SIGNUP_HEADING_DEFAULT,
      signup_cta_label: SIGNUP_CTA_LABEL_DEFAULT,
    })

    const { slices, changes } = planEnableSignup([enabled])

    assert.deepEqual(changes, [])
    assert.deepEqual(slices, [enabled])
  })

  it('is a no-op against a zone wearing the extra keys the query API adds', () => {
    const enabled = {
      id: 'slice-0',
      slice_label: null,
      version: 'sktwi1xtmkfgx8626',
      ...timelineSlice({
        show_signup: true,
        signup_heading: SIGNUP_HEADING_DEFAULT,
        signup_cta_label: SIGNUP_CTA_LABEL_DEFAULT,
      }),
    }

    assert.deepEqual(planEnableSignup([enabled]).changes, [])
  })

  it('throws when the zone has no timeline slice', () => {
    assert.throws(
      () => planEnableSignup([heroSlice, tabsSlice]),
      /no event_list\/timeline slice/
    )
  })
})

describe('findTimelineSliceIndex', () => {
  it('finds the timeline slice among others', () => {
    assert.equal(
      findTimelineSliceIndex([heroSlice, timelineSlice(), tabsSlice]),
      1
    )
  })

  it('returns -1 when there is none', () => {
    assert.equal(findTimelineSliceIndex([heroSlice, tabsSlice]), -1)
  })
})

describe('currentPageSlices', () => {
  it('reads the slice zone off a fetched page document', () => {
    const slices = [heroSlice, timelineSlice(), tabsSlice]
    assert.deepEqual(currentPageSlices({ slices }), slices)
  })

  it('tolerates a missing or malformed slice zone', () => {
    assert.deepEqual(currentPageSlices({}), [])
    assert.deepEqual(currentPageSlices({ slices: null }), [])
  })
})
