import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { selectVariant } from './selectVariant.ts'
import type { WelcomeUpdatesDocumentDataVariantsItem } from '../../../prismicio-types'

function makeVariant(
  overrides: Partial<WelcomeUpdatesDocumentDataVariantsItem>
): WelcomeUpdatesDocumentDataVariantsItem {
  return {
    source: null,
    title: null,
    body: [],
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
