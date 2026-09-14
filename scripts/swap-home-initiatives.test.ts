/**
 * Tests for the home page event_list swap transform.
 *
 * The things that must hold: the heading and subheading survive verbatim, every other slice
 * keeps its order and content, the output slice is event_list/timeline with source Upcoming,
 * max_items 2, show_signup false and a more_link resolved to the given target, a second run
 * over an already-swapped zone is a no-op, and zero or multiple event_list slices aborts
 * rather than guessing.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentPageSlices,
  documentLink,
  eventListTimelineSlice,
  planSwap,
  type LinkTarget,
  type Slice,
} from './swap-home-initiatives.ts'

/** The resolved page/initiatives link target, as client.getByUID would return it. */
const initiativesTarget = (): LinkTarget => ({
  id: 'initiatives-doc-id',
  uid: 'initiatives',
})

/** The hero slice as it exists on the live home page, preserved byte-for-byte. */
const heroSlice = (): Slice => ({
  slice_type: 'hero',
  variation: 'default',
  items: [],
  primary: { title: 'Every concert, festival and workshop since 2001' },
})

const sponsorsSlice = (): Slice => ({
  slice_type: 'sponsors',
  variation: 'default',
  items: [{ logo: {} }],
  primary: { heading: 'Our Sponsors' },
})

const aboutSlice = (): Slice => ({
  slice_type: 'about',
  variation: 'default',
  items: [],
  primary: { heading: 'About Svarit' },
})

const donateSlice = (): Slice => ({
  slice_type: 'donate',
  variation: 'default',
  items: [],
  primary: { heading: 'Join us in shaping the future of Indian Music.' },
})

const contactSlice = (): Slice => ({
  slice_type: 'contact',
  variation: 'default',
  items: [],
  primary: { heading: 'Get in Touch' },
})

/** The live shape: the archive event_list/default slice among the other five. */
const liveEventListSlice = (): Slice => ({
  slice_type: 'event_list',
  variation: 'default',
  items: [],
  primary: {
    heading: 'Engaging Through More than 2 Decades of Keeping Tradition Alive',
    subheading: 'Our Initiatives',
    timeframe: null,
    limit: null,
  },
})

/** The full home page slice zone as it exists today. */
const currentZone = (): Slice[] => [
  heroSlice(),
  sponsorsSlice(),
  aboutSlice(),
  liveEventListSlice(),
  donateSlice(),
  contactSlice(),
]

describe('planSwap', () => {
  it('carries the heading and subheading across verbatim', () => {
    const { slices, heading, subheading } = planSwap(
      currentZone(),
      initiativesTarget()
    )

    assert.equal(
      heading,
      'Engaging Through More than 2 Decades of Keeping Tradition Alive'
    )
    assert.equal(subheading, 'Our Initiatives')
    const timeline = slices[3]
    assert.equal(
      (timeline.primary as Record<string, unknown>).heading,
      'Engaging Through More than 2 Decades of Keeping Tradition Alive'
    )
    assert.equal(
      (timeline.primary as Record<string, unknown>).subheading,
      'Our Initiatives'
    )
  })

  it('keeps every other slice in order and content, unchanged', () => {
    const { slices } = planSwap(currentZone(), initiativesTarget())

    assert.deepEqual(slices[0], heroSlice())
    assert.deepEqual(slices[1], sponsorsSlice())
    assert.deepEqual(slices[2], aboutSlice())
    assert.deepEqual(slices[4], donateSlice())
    assert.deepEqual(slices[5], contactSlice())
    assert.equal(slices.length, 6)
  })

  it('swaps the event_list slice to timeline with the target shape', () => {
    const { slices } = planSwap(currentZone(), initiativesTarget())
    const timeline = slices[3]

    assert.equal(timeline.slice_type, 'event_list')
    assert.equal(timeline.variation, 'timeline')
    assert.deepEqual(timeline.primary, {
      heading:
        'Engaging Through More than 2 Decades of Keeping Tradition Alive',
      subheading: 'Our Initiatives',
      source: 'Upcoming',
      initiatives: [],
      max_items: 2,
      more_label: 'Show more initiatives',
      more_link: documentLink(initiativesTarget()),
      show_signup: false,
      signup_heading: '',
      signup_cta_label: '',
      signup_event_type: '$opt.in',
    })
  })

  it('reports the change', () => {
    const { changes } = planSwap(currentZone(), initiativesTarget())

    assert.equal(changes.length, 1)
    assert.match(
      changes[0],
      /event_list slice at index 3: event_list\/default -> event_list\/timeline/
    )
  })

  it('does not mutate the input', () => {
    const input = currentZone()
    planSwap(input, initiativesTarget())
    assert.equal(input.length, 6)
    assert.deepEqual(input[3], liveEventListSlice())
  })

  it('is idempotent: a second run over the desired zone is a no-op', () => {
    const desired = [
      heroSlice(),
      sponsorsSlice(),
      aboutSlice(),
      eventListTimelineSlice(
        'Engaging Through More than 2 Decades of Keeping Tradition Alive',
        'Our Initiatives',
        initiativesTarget()
      ),
      donateSlice(),
      contactSlice(),
    ]

    const { slices, changes } = planSwap(desired, initiativesTarget())

    assert.deepEqual(changes, [])
    assert.deepEqual(slices, desired)
  })

  it('is a no-op against a zone wearing the flat resolved-link shape the query API returns', () => {
    const desired = [
      heroSlice(),
      sponsorsSlice(),
      aboutSlice(),
      eventListTimelineSlice(
        'Engaging Through More than 2 Decades of Keeping Tradition Alive',
        'Our Initiatives',
        initiativesTarget()
      ),
      donateSlice(),
      contactSlice(),
    ]
    const timeline = desired[3]
    const primary = timeline.primary as Record<string, unknown>
    // The query API returns a resolved Document link flat, with a string id and a uid
    // alongside it, not the { id: <target> } shape this script builds before a write.
    primary.more_link = {
      link_type: 'Document',
      id: 'initiatives-doc-id',
      type: 'page',
      tags: [],
      lang: 'en-us',
      uid: 'initiatives',
      url: '/initiatives',
    }
    // The query API also omits empty text fields rather than returning "".
    delete primary.signup_heading
    delete primary.signup_cta_label

    assert.deepEqual(planSwap(desired, initiativesTarget()).changes, [])
  })

  it('aborts when there is no event_list slice to swap', () => {
    const withoutEventList = [heroSlice(), sponsorsSlice(), donateSlice()]

    assert.throws(
      () => planSwap(withoutEventList, initiativesTarget()),
      /Expected exactly one event_list slice.*found 0/
    )
  })

  it('aborts when there is more than one event_list slice', () => {
    const withTwo = [
      heroSlice(),
      liveEventListSlice(),
      liveEventListSlice(),
      donateSlice(),
    ]

    assert.throws(
      () => planSwap(withTwo, initiativesTarget()),
      /Expected exactly one event_list slice.*found 2/
    )
  })
})

describe('currentPageSlices', () => {
  it('reads the slice zone off a fetched page document', () => {
    const data = { slices: currentZone(), meta_title: 'Home' }
    assert.deepEqual(currentPageSlices(data), currentZone())
  })

  it('tolerates a missing or malformed slice zone', () => {
    assert.deepEqual(currentPageSlices({}), [])
    assert.deepEqual(currentPageSlices({ slices: null }), [])
  })
})
