import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { splitName } from './splitName.ts'

describe('splitName', () => {
  it('treats a single word as the first name with no last name', () => {
    assert.deepEqual(splitName('Kesarbai'), {
      first_name: 'Kesarbai',
      last_name: '',
    })
  })

  it('splits a two-word name into first and last', () => {
    assert.deepEqual(splitName('Ravi Shankar'), {
      first_name: 'Ravi',
      last_name: 'Shankar',
    })
  })

  it('joins everything after the first word as the last name', () => {
    assert.deepEqual(splitName('Ali Akbar Khan'), {
      first_name: 'Ali',
      last_name: 'Akbar Khan',
    })
  })

  it('collapses extra and surrounding whitespace', () => {
    assert.deepEqual(splitName('  Ravi   Shankar  '), {
      first_name: 'Ravi',
      last_name: 'Shankar',
    })
  })

  it('returns empty names for an empty or whitespace-only string without throwing', () => {
    assert.deepEqual(splitName(''), { first_name: '', last_name: '' })
    assert.deepEqual(splitName('   '), { first_name: '', last_name: '' })
  })
})
