import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { umamiEventAttrs } from './analytics.ts'

describe('umamiEventAttrs', () => {
  it('builds a data-umami-event attribute per key, stringified', () => {
    assert.deepEqual(umamiEventAttrs('donate-click', { location: 'footer' }), {
      'data-umami-event': 'donate-click',
      'data-umami-event-location': 'footer',
    })
  })

  it('omits keys whose value is undefined', () => {
    assert.deepEqual(
      umamiEventAttrs('social-click', {
        platform: 'instagram',
        location: 'artist-card',
        artist: undefined,
      }),
      {
        'data-umami-event': 'social-click',
        'data-umami-event-platform': 'instagram',
        'data-umami-event-location': 'artist-card',
      }
    )
  })

  it('returns only the event name attribute for an empty data object', () => {
    assert.deepEqual(umamiEventAttrs('contact-submit', {}), {
      'data-umami-event': 'contact-submit',
    })
  })
})
