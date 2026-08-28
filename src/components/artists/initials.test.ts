import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { artistInitials } from './initials.ts'

describe('artistInitials', () => {
  it('returns a single initial for a mononym', () => {
    assert.equal(artistInitials('Kesarbai'), 'K')
  })

  it('returns first and last initials for a two-word name', () => {
    assert.equal(artistInitials('Ravi Shankar'), 'RS')
  })

  it('skips the middle words for a three-or-more-word name', () => {
    assert.equal(artistInitials('Ali Akbar Khan'), 'AK')
    assert.equal(artistInitials('Pandit Dinkar Kaikini Ji'), 'PJ')
  })

  it('uppercases lowercase input', () => {
    assert.equal(artistInitials('zakir hussain'), 'ZH')
  })

  it('collapses extra and surrounding whitespace', () => {
    assert.equal(artistInitials('  Nikhil   Banerjee  '), 'NB')
  })

  it('returns an empty string for an empty or whitespace-only name', () => {
    assert.equal(artistInitials(''), '')
    assert.equal(artistInitials('   '), '')
    assert.equal(artistInitials('\t\n'), '')
  })

  it('returns an empty string for null or undefined', () => {
    assert.equal(artistInitials(null), '')
    assert.equal(artistInitials(undefined), '')
  })

  it('handles non-ASCII names', () => {
    assert.equal(artistInitials('Zoë Keating'), 'ZK')
    assert.equal(artistInitials('रवि शंकर'), 'रश')
    assert.equal(artistInitials('İlkay Şener'), 'İŞ')
  })
})
