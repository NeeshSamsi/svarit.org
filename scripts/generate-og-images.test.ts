/**
 * Tests for the OG card plan and markup.
 *
 * The things that must hold: a document with its own meta_image is skipped, a
 * document with no name / title is skipped, the monogram matches the site
 * helper, the served path matches src/lib/og.ts, and the markup links the real
 * Typekit kit, inlines the passed logo, carries no text wordmark, and escapes
 * the label.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  cardHtml,
  generatedWebPath,
  planCards,
  TYPEKIT_CSS,
  type SourceDoc,
} from './generate-og-images.ts'

const LOGO = '<svg id="test-logo"><path d="M0 0h1v1z"/></svg>'

describe('planCards', () => {
  const docs: SourceDoc[] = [
    {
      uid: 'zakir-hussain',
      label: 'Zakir Hussain',
      kicker: 'Artist',
      hasMetaImage: false,
    },
    { uid: 'has-art', label: 'Has Art', kicker: 'Artist', hasMetaImage: true },
    { uid: 'no-name', label: '  ', kicker: 'Artist', hasMetaImage: false },
    { uid: 'null-name', label: null, kicker: 'Artist', hasMetaImage: false },
  ]

  it('renders a card only for documents with a label and no meta_image', () => {
    const { cards } = planCards('artists', docs)
    assert.deepEqual(
      cards.map((c) => c.uid),
      ['zakir-hussain']
    )
  })

  it('skips meta_image and empty-label documents with a reason', () => {
    const { skipped } = planCards('artists', docs)
    assert.deepEqual(skipped, [
      { uid: 'has-art', reason: 'has its own meta_image' },
      { uid: 'no-name', reason: 'no name or title' },
      { uid: 'null-name', reason: 'no name or title' },
    ])
  })

  it('gives an artist card a monogram from the same helper the site uses', () => {
    const { cards } = planCards('artists', [
      {
        uid: 'zakir-hussain',
        label: 'Zakir Hussain',
        kicker: 'Artist',
        hasMetaImage: false,
      },
    ])
    assert.equal(cards[0].kind, 'artists')
    assert.equal(cards[0].monogram, 'ZH')
    assert.equal(cards[0].kicker, 'Artist')
  })

  it('gives an event card no monogram, just the title and its kicker', () => {
    const { cards } = planCards('initiatives', [
      {
        uid: 'dinarang-smriti-2020',
        label: 'Dinarang Smriti 2020',
        kicker: 'Workshop',
        hasMetaImage: false,
      },
    ])
    assert.equal(cards[0].kind, 'initiatives')
    assert.equal(cards[0].monogram, undefined)
    assert.equal(cards[0].label, 'Dinarang Smriti 2020')
    assert.equal(cards[0].kicker, 'Workshop')
  })

  it('trims a padded label', () => {
    const { cards } = planCards('artists', [
      {
        uid: 'x',
        label: '  Ravi Shankar  ',
        kicker: 'Artist',
        hasMetaImage: false,
      },
    ])
    assert.equal(cards[0].label, 'Ravi Shankar')
  })
})

describe('generatedWebPath', () => {
  it('matches the path resolveOgImage looks for', () => {
    assert.equal(
      generatedWebPath('artists', 'zakir-hussain'),
      '/og/generated/artists/zakir-hussain.jpg'
    )
    assert.equal(
      generatedWebPath('initiatives', 'dinarang-smriti-2020'),
      '/og/generated/initiatives/dinarang-smriti-2020.jpg'
    )
  })
})

describe('cardHtml', () => {
  const artistCard = {
    label: 'Zakir Hussain',
    kicker: 'Artist',
    monogram: 'ZH',
  }

  it('links the real Typekit kit and both families', () => {
    const html = cardHtml(artistCard, LOGO)
    assert.ok(html.includes(TYPEKIT_CSS))
    assert.ok(html.includes("'fields-display'"))
    assert.ok(html.includes("'proxima-nova'"))
  })

  it('inlines the passed logo and carries no SVARIT text wordmark', () => {
    const html = cardHtml(artistCard, LOGO)
    assert.ok(html.includes(LOGO))
    assert.ok(!/SVARIT/i.test(html.replace(LOGO, '')))
    assert.ok(!html.includes('class="wordmark"'))
  })

  it('sets the 1200x630 frame and shows kicker, label and monogram', () => {
    const html = cardHtml(artistCard, LOGO)
    assert.ok(html.includes('width:1200px;height:630px'))
    assert.ok(html.includes('>Artist<'))
    assert.ok(html.includes('>Zakir Hussain<'))
    assert.ok(html.includes('>ZH<'))
  })

  it('drops the monogram element on an event card', () => {
    const html = cardHtml(
      { label: 'Dinarang Smriti 2020', kicker: 'Workshop' },
      LOGO
    )
    assert.ok(!html.includes('class="monogram"'))
    assert.ok(html.includes('>Dinarang Smriti 2020<'))
    assert.ok(html.includes('>Workshop<'))
  })

  it('escapes a label with markup characters', () => {
    const html = cardHtml(
      { label: 'A & B <script>', kicker: 'Artist', monogram: 'AB' },
      LOGO
    )
    assert.ok(html.includes('A &amp; B &lt;script&gt;'))
    assert.ok(!html.includes('<script>'))
  })
})
