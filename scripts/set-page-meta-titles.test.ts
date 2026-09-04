/**
 * Tests for the meta_title transform.
 *
 * The things that must hold: a differing title is reported as a change, an already-correct
 * title is a no-op, a missing meta_title is treated as empty, and the desired value is
 * always what gets returned.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentMetaTitle,
  planMetaTitle,
  DESIRED_META_TITLES,
} from './set-page-meta-titles.ts'

describe('planMetaTitle', () => {
  it('reports a change when the current title differs', () => {
    const { title, changes } = planMetaTitle(
      'Artists',
      'Artists Hosted by Svarit'
    )
    assert.equal(title, 'Artists Hosted by Svarit')
    assert.equal(changes.length, 1)
    assert.match(changes[0], /"Artists" -> "Artists Hosted by Svarit"/)
  })

  it('is a no-op when the title already matches', () => {
    const { changes } = planMetaTitle(
      'Initiatives by Svarit',
      'Initiatives by Svarit'
    )
    assert.deepEqual(changes, [])
  })

  it('treats an empty current title as null in the change line', () => {
    const { changes } = planMetaTitle('', 'Initiatives by Svarit')
    assert.match(changes[0], /null -> "Initiatives by Svarit"/)
  })

  it('always returns the desired value', () => {
    assert.equal(planMetaTitle('anything', 'Desired').title, 'Desired')
    assert.equal(planMetaTitle('Desired', 'Desired').title, 'Desired')
  })
})

describe('currentMetaTitle', () => {
  it('reads a string meta_title', () => {
    assert.equal(
      currentMetaTitle({ meta_title: 'Events and Workshops' }),
      'Events and Workshops'
    )
  })

  it('returns an empty string when meta_title is missing or not a string', () => {
    assert.equal(currentMetaTitle({}), '')
    assert.equal(currentMetaTitle({ meta_title: null }), '')
  })
})

describe('DESIRED_META_TITLES', () => {
  it('sets exactly the two index pages', () => {
    assert.deepEqual(DESIRED_META_TITLES, [
      { uid: 'initiatives', title: 'Initiatives by Svarit' },
      { uid: 'artists', title: 'Artists Hosted by Svarit' },
    ])
  })
})
