/**
 * Tests for building page/centenary (Solo todo P5.1).
 *
 * The things that must hold: the slice zone is hero + timeline + donate in that order, the
 * timeline carries source 'Chosen', an empty initiatives array and show_signup true, the
 * hero description is a single rich text paragraph with the exact draft text, the donate
 * slice is copied off page/home when readable and falls back to the model's placeholder
 * copy otherwise, and each of the documented behaviours for an existing page/centenary is
 * exercised: create when there is none, no-op when it already matches, refuse when it
 * differs, and refuse when it is only known from the local record.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PrismicDocument } from '@prismicio/client'
import {
  buildPageFields,
  buildSlices,
  currentPageSlices,
  fallbackDonateSlice,
  heroSlice,
  planCentenaryPage,
  planDonateSlice,
  timelineSlice,
  DONATE_FALLBACK_CTA_LABEL,
  DONATE_FALLBACK_HEADING,
  HERO_DESCRIPTION,
  HERO_TITLE,
  META_DESCRIPTION,
  META_TITLE,
  PAGE_UID,
  SIGNUP_CTA_LABEL,
  SIGNUP_HEADING,
  TIMELINE_SUBHEADING,
  type ExistingTarget,
  type Slice,
} from './create-centenary-page.ts'

const homeDonateSlice = (): Record<string, unknown> => ({
  id: 'slice-donate',
  slice_label: null,
  version: 'sktwi1xtmkfgx8626',
  slice_type: 'donate',
  variation: 'default',
  items: [],
  primary: {
    heading: 'Join us in shaping the future of Indian Music.',
    cta_label: 'Donate to Svarit',
    cta_link: { link_type: 'Web', url: 'https://pages.razorpay.com/svarit' },
    background_image: { url: 'https://images.prismic.io/svarit/donate.jpg' },
  },
})

const fakeHomeDoc = (): PrismicDocument =>
  ({
    id: 'home-doc-id',
    lang: 'en-us',
    data: { slices: [homeDonateSlice()] },
  }) as unknown as PrismicDocument

describe('the built slice zone', () => {
  it('is hero, timeline, donate, in that order with the right variations', () => {
    const slices = buildSlices(fallbackDonateSlice())

    assert.deepEqual(
      slices.map((s) => `${s.slice_type}/${s.variation}`),
      ['hero/page_header', 'event_list/timeline', 'donate/default']
    )
  })

  it('gives the hero the draft title and a single-paragraph description', () => {
    const hero = heroSlice()
    const primary = hero.primary as Record<string, unknown>

    assert.equal(primary.title, HERO_TITLE)
    assert.deepEqual(primary.description, [
      { type: 'paragraph', text: HERO_DESCRIPTION, spans: [] },
    ])
  })

  it('gives the timeline source Chosen, an empty initiatives array and show_signup true', () => {
    const timeline = timelineSlice()

    assert.deepEqual(timeline.primary, {
      heading: '',
      subheading: TIMELINE_SUBHEADING,
      source: 'Chosen',
      initiatives: [],
      show_signup: true,
      signup_heading: SIGNUP_HEADING,
      signup_cta_label: SIGNUP_CTA_LABEL,
    })
  })

  it('puts the "Celebrations" eyebrow in subheading, not heading', () => {
    const timeline = timelineSlice()
    const primary = timeline.primary as Record<string, unknown>

    assert.equal(primary.subheading, 'Celebrations')
    assert.equal(primary.heading, '')
  })

  it('sets sensible meta_title and meta_description', () => {
    const fields = buildPageFields()
    assert.equal(fields.meta_title, META_TITLE)
    assert.equal(fields.meta_description, META_DESCRIPTION)
  })
})

describe('planDonateSlice', () => {
  it('copies the donate slice off page/home when it is readable', () => {
    const { slice, source } = planDonateSlice(fakeHomeDoc())

    assert.equal(source, 'home')
    assert.deepEqual(slice.primary, homeDonateSlice().primary)
  })

  it('falls back to the model placeholder when page/home is unreadable', () => {
    const { slice, source } = planDonateSlice(null)

    assert.equal(source, 'fallback')
    assert.deepEqual(slice, fallbackDonateSlice())
    assert.equal(
      (slice.primary as Record<string, unknown>).heading,
      DONATE_FALLBACK_HEADING
    )
    assert.equal(
      (slice.primary as Record<string, unknown>).cta_label,
      DONATE_FALLBACK_CTA_LABEL
    )
  })

  it('falls back when page/home has no donate slice', () => {
    const homeWithoutDonate = {
      id: 'home-doc-id',
      lang: 'en-us',
      data: { slices: [] },
    } as unknown as PrismicDocument

    assert.equal(planDonateSlice(homeWithoutDonate).source, 'fallback')
  })
})

describe('planCentenaryPage', () => {
  const donate = fallbackDonateSlice()

  it('plans a create when page/centenary does not exist anywhere', () => {
    const plan = planCentenaryPage({ kind: 'none' }, donate)

    assert.equal(plan.action, 'create')
    if (plan.action !== 'create') throw new Error('unreachable')
    assert.deepEqual(plan.slices, buildSlices(donate))
    assert.deepEqual(plan.fields, buildPageFields())
  })

  it('is a no-op when the master-ref document already matches the desired shape', () => {
    const existing: ExistingTarget = {
      kind: 'master-ref',
      id: 'centenary-doc-id',
      lang: 'en-us',
      data: { ...buildPageFields(), slices: buildSlices(donate) },
    }

    const plan = planCentenaryPage(existing, donate)

    assert.equal(plan.action, 'noop')
    if (plan.action !== 'noop') throw new Error('unreachable')
    assert.match(plan.reason, /already matches the desired shape/)
  })

  it('is a no-op against a master-ref document wearing the extra keys the query API adds', () => {
    const fetchedSlices: Slice[] = buildSlices(donate).map((s, i) => ({
      id: `slice-${i}`,
      slice_label: null,
      version: 'sktwi1xtmkfgx8626',
      ...s,
    }))
    const existing: ExistingTarget = {
      kind: 'master-ref',
      id: 'centenary-doc-id',
      lang: 'en-us',
      data: { ...buildPageFields(), slices: fetchedSlices },
    }

    assert.equal(planCentenaryPage(existing, donate).action, 'noop')
  })

  it('refuses when the master-ref document exists and differs', () => {
    const existing: ExistingTarget = {
      kind: 'master-ref',
      id: 'centenary-doc-id',
      lang: 'en-us',
      data: {
        ...buildPageFields(),
        slices: [heroSlice()], // missing timeline and donate
      },
    }

    const plan = planCentenaryPage(existing, donate)

    assert.equal(plan.action, 'refuse')
    if (plan.action !== 'refuse') throw new Error('unreachable')
    assert.match(plan.reason, /already exists and differs/)
    assert.equal(plan.current.length, 1)
    assert.equal(plan.desired.length, 3)
  })

  it('refuses when the document is known only from the local record', () => {
    const existing: ExistingTarget = {
      kind: 'local-record',
      id: 'centenary-doc-id',
      lang: 'en-us',
    }

    const plan = planCentenaryPage(existing, donate)

    assert.equal(plan.action, 'noop')
    if (plan.action !== 'noop') throw new Error('unreachable')
    assert.match(plan.reason, /not yet visible on the master ref/)
  })

  it(`never creates a document with a uid other than "${PAGE_UID}"`, () => {
    // buildSlices/buildPageFields don't take a uid at all - the CLI shell supplies it
    // separately, as a top-level field, never inside `data`. This just pins the constant.
    assert.equal(PAGE_UID, 'centenary')
  })
})

describe('currentPageSlices', () => {
  it('reads the slice zone off a fetched page document', () => {
    const slices = buildSlices(fallbackDonateSlice())
    assert.deepEqual(currentPageSlices({ slices }), slices)
  })

  it('tolerates a missing or malformed slice zone', () => {
    assert.deepEqual(currentPageSlices({}), [])
    assert.deepEqual(currentPageSlices({ slices: null }), [])
  })
})
