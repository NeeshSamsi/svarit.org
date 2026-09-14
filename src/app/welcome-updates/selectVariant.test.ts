import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { selectVariant, hasCta } from './selectVariant.ts'
import type { WelcomeUpdatesDocumentDataVariantsItem } from '../../../prismicio-types'

const filledLink: WelcomeUpdatesDocumentDataVariantsItem['cta_link'] = {
  link_type: 'Document',
  id: 'abc123',
  type: 'page',
  tags: [],
  lang: 'en-us',
  uid: 'initiatives',
  url: '/initiatives',
}

function makeVariant(
  overrides: Partial<WelcomeUpdatesDocumentDataVariantsItem>
): WelcomeUpdatesDocumentDataVariantsItem {
  return {
    source: null,
    title: null,
    body: [],
    cta_label: null,
    cta_link: { link_type: 'Any' },
    ...overrides,
  } as unknown as WelcomeUpdatesDocumentDataVariantsItem
}

describe('selectVariant', () => {
  it('an exact source match wins', () => {
    const centenary = makeVariant({ source: 'centenary', title: 'Centenary' })
    const initiatives = makeVariant({
      source: 'initiatives',
      title: 'Initiatives',
    })
    assert.equal(
      selectVariant([centenary, initiatives], 'centenary'),
      centenary
    )
  })

  it('matching is case-insensitive and ignores surrounding whitespace', () => {
    const centenary = makeVariant({ source: 'Centenary', title: 'Centenary' })
    assert.equal(selectVariant([centenary], '  CENTENARY  '), centenary)
  })

  it('an unknown source falls back to the empty-source variant', () => {
    const centenary = makeVariant({ source: 'centenary', title: 'Centenary' })
    const empty = makeVariant({ source: '', title: 'Default' })
    assert.equal(selectVariant([centenary, empty], 'unknown-source'), empty)
  })

  it('a missing ?source= falls back to the empty-source variant', () => {
    const centenary = makeVariant({ source: 'centenary', title: 'Centenary' })
    const empty = makeVariant({ source: null, title: 'Default' })
    assert.equal(selectVariant([centenary, empty], undefined), empty)
    assert.equal(selectVariant([centenary, empty], null), empty)
  })

  it('with no empty-source variant, it falls back to the first', () => {
    const centenary = makeVariant({ source: 'centenary', title: 'Centenary' })
    const initiatives = makeVariant({
      source: 'initiatives',
      title: 'Initiatives',
    })
    assert.equal(
      selectVariant([centenary, initiatives], 'unknown-source'),
      centenary
    )
    assert.equal(selectVariant([centenary, initiatives], undefined), centenary)
  })

  it('an empty variants array returns nothing, so the route can 404', () => {
    assert.equal(selectVariant([], 'centenary'), undefined)
  })
})

describe('hasCta', () => {
  it('a label and a filled link renders a CTA', () => {
    const variant = makeVariant({
      cta_label: 'Explore our initiatives',
      cta_link: filledLink,
    })
    assert.equal(hasCta(variant), true)
  })

  it('a label but no link renders no CTA', () => {
    const variant = makeVariant({ cta_label: 'Explore our initiatives' })
    assert.equal(hasCta(variant), false)
  })

  it('a link but no label renders no CTA', () => {
    const variant = makeVariant({ cta_link: filledLink })
    assert.equal(hasCta(variant), false)
  })

  it('neither a label nor a link renders no CTA', () => {
    const variant = makeVariant({})
    assert.equal(hasCta(variant), false)
  })

  it('a whitespace-only label renders no CTA', () => {
    const variant = makeVariant({ cta_label: '   ', cta_link: filledLink })
    assert.equal(hasCta(variant), false)
  })
})
