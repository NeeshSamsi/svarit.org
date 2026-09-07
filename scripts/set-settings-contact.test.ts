/**
 * Tests for the settings Contact fields transform.
 *
 * The things that must hold: a differing field is reported as a change, a
 * field that already matches is a no-op, a missing field reads as empty, and
 * only fields that actually differ appear in `values` (so the write only ever
 * touches what changed).
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentContactField,
  planContactFields,
  DESIRED_CONTACT,
} from './set-settings-contact.ts'

describe('planContactFields', () => {
  it('reports a change for each field that differs', () => {
    const { values, changes } = planContactFields({ email: 'old@svarit.org' })
    assert.equal(values.email, 'team@svarit.org')
    assert.equal(changes.length, Object.keys(DESIRED_CONTACT).length)
    assert.match(changes[0], /"old@svarit\.org" -> "team@svarit\.org"/)
  })

  it('is a no-op when every field already matches', () => {
    const { values, changes } = planContactFields(DESIRED_CONTACT)
    assert.deepEqual(values, {})
    assert.deepEqual(changes, [])
  })

  it('treats a missing field as empty in the change line', () => {
    const { changes } = planContactFields({})
    assert.match(changes[0], /null -> "team@svarit\.org"/)
  })

  it('only includes fields that actually changed in `values`', () => {
    const current = { ...DESIRED_CONTACT, phone: '+91 9930759942' }
    const { values, changes } = planContactFields(current)
    assert.deepEqual(values, { phone: '+91 99307 59942' })
    assert.equal(changes.length, 1)
  })
})

describe('currentContactField', () => {
  it('reads a string field', () => {
    assert.equal(
      currentContactField({ email: 'team@svarit.org' }, 'email'),
      'team@svarit.org'
    )
  })

  it('returns an empty string when the field is missing or not a string', () => {
    assert.equal(currentContactField({}, 'email'), '')
    assert.equal(currentContactField({ email: null }, 'email'), '')
  })
})

describe('DESIRED_CONTACT', () => {
  it('carries exactly the eight Contact fields', () => {
    assert.deepEqual(Object.keys(DESIRED_CONTACT), [
      'email',
      'phone',
      'phone_e164',
      'address_street',
      'address_locality',
      'address_region',
      'address_postal_code',
      'address_country',
    ])
  })
})
