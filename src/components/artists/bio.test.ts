import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { artistBioText } from './bio.ts'

describe('artistBioText', () => {
  it('returns a trimmed string when the bio has content', () => {
    assert.equal(artistBioText('  A short bio.  '), 'A short bio.')
  })

  it('returns an empty string for null', () => {
    assert.equal(artistBioText(null), '')
  })

  it('returns an empty string for whitespace only', () => {
    assert.equal(artistBioText('   \n'), '')
  })

  it('returns an empty string for the legacy empty rich-text array', () => {
    // Documents created before the Rich Text -> Text migration return `[]`.
    assert.equal(artistBioText([] as unknown as string), '')
    assert.equal(
      artistBioText([
        { type: 'paragraph', text: '', spans: [] },
      ] as unknown as string),
      ''
    )
  })
})
