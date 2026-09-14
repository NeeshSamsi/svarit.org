import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  titleFromSlug,
  artistTitle,
  initiativeTitle,
  metaDescription,
  filledOrFallback,
} from './metadata.ts'

describe('titleFromSlug', () => {
  it('a multi-word slug capitalises every word and appends the suffix', () => {
    assert.equal(titleFromSlug('welcome-updates'), 'Welcome Updates | Svarit')
  })

  it('a single-word slug works', () => {
    assert.equal(titleFromSlug('centenary'), 'Centenary | Svarit')
  })
})

describe('artistTitle', () => {
  it('produces the documented shape', () => {
    assert.equal(
      artistTitle('Ashwini Bhide-Deshpande'),
      'Ashwini Bhide-Deshpande at Svarit'
    )
  })
})

describe('initiativeTitle', () => {
  it('produces the documented shape', () => {
    assert.equal(
      initiativeTitle('Aarambh: Dinarang Centenary Inauguration'),
      'Aarambh: Dinarang Centenary Inauguration by Svarit'
    )
  })
})

describe('metaDescription', () => {
  it('truncates at a word boundary, never mid-word', () => {
    const text =
      'This description is deliberately long enough that it must be cut down to a shorter length before it can be used as a meta description, well past the usual limit.'
    const result = metaDescription(text, 60)

    assert.match(result, /\.\.\.$/)
    const withoutEllipsis = result.slice(0, -3)
    assert.ok(withoutEllipsis.length <= 60)
    assert.equal(text.startsWith(withoutEllipsis), true)
    // The character in the source text right after the cut must be a space,
    // confirming the cut lands exactly on a word boundary, not mid-word.
    assert.equal(text[withoutEllipsis.length], ' ')
  })

  it('text under the limit is returned unchanged with no ellipsis', () => {
    const text = 'A short description.'
    assert.equal(metaDescription(text, 155), text)
  })

  it('newlines and runs of whitespace collapse to single spaces', () => {
    const text = 'Line one.\n\nLine   two.\tLine three.'
    assert.equal(metaDescription(text, 155), 'Line one. Line two. Line three.')
  })
})

describe('filledOrFallback', () => {
  it('an empty or whitespace-only Prismic value falls through to the fallback', () => {
    assert.equal(filledOrFallback('', 'fallback'), 'fallback')
    assert.equal(filledOrFallback('   ', 'fallback'), 'fallback')
    assert.equal(filledOrFallback(null, 'fallback'), 'fallback')
    assert.equal(filledOrFallback(undefined, 'fallback'), 'fallback')
  })

  it('a filled Prismic value wins and gets nothing appended', () => {
    assert.equal(filledOrFallback('Custom Title', 'fallback'), 'Custom Title')
  })
})
