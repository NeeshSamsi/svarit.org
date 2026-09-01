/**
 * Tests for the Initiatives nav-link repoint transform.
 *
 * The things that must hold: the link matched by url `/#initiatives` gets url `/initiatives`
 * with its key/target/text kept, every other link is untouched, a second run is a no-op, the
 * text fallback only fires when unambiguous, and a missing link throws.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentNavLinks,
  planInitiativesLink,
  type NavLink,
} from './fix-nav-initiatives-link.ts'

const currentLinks = (): NavLink[] => [
  { link_type: 'Web', key: 'k-about', url: '/#about', text: 'About Us' },
  {
    link_type: 'Web',
    key: '3d3804a1-6cc4-42f6-9ca1-6b644ef40049',
    url: '/#initiatives',
    text: 'Initiatives',
  },
  { link_type: 'Web', key: 'k-artists', url: '/artists', text: 'Artists' },
  { link_type: 'Web', key: 'k-contact', url: '/#contact', text: 'Contact Us' },
]

describe('planInitiativesLink', () => {
  it('repoints the Initiatives link at /initiatives, keeping key/text/link_type', () => {
    const { links } = planInitiativesLink(currentLinks())

    assert.deepEqual(links[1], {
      link_type: 'Web',
      key: '3d3804a1-6cc4-42f6-9ca1-6b644ef40049',
      url: '/initiatives',
      text: 'Initiatives',
    })
  })

  it('preserves a target on the matched link', () => {
    const withTarget: NavLink[] = [
      {
        link_type: 'Web',
        key: 'k-i',
        url: '/#initiatives',
        text: 'Initiatives',
        target: '_blank',
      },
    ]
    const { links } = planInitiativesLink(withTarget)
    assert.equal(links[0].target, '_blank')
    assert.equal(links[0].url, '/initiatives')
  })

  it('leaves every other link untouched', () => {
    const { links } = planInitiativesLink(currentLinks())
    assert.deepEqual(
      links.map((l) => l.url),
      ['/#about', '/initiatives', '/artists', '/#contact']
    )
    assert.deepEqual(links[0], currentLinks()[0])
    assert.deepEqual(links[2], currentLinks()[2])
    assert.deepEqual(links[3], currentLinks()[3])
  })

  it('does not mutate the input array', () => {
    const input = currentLinks()
    planInitiativesLink(input)
    assert.equal(input[1].url, '/#initiatives')
  })

  it('is idempotent: a second run over already-fixed links is a no-op', () => {
    const once = planInitiativesLink(currentLinks())
    const twice = planInitiativesLink(once.links)
    assert.deepEqual(twice.changes, [])
    assert.deepEqual(twice.links, once.links)
  })

  it('reports the one change it makes', () => {
    const { changes } = planInitiativesLink(currentLinks())
    assert.equal(changes.length, 1)
    assert.match(changes[0], /\/#initiatives -> \/initiatives/)
  })

  it('falls back to a unique link with text "Initiatives" when no url matches', () => {
    const noUrlMatch: NavLink[] = [
      { link_type: 'Web', key: 'k-i', url: '/somewhere', text: 'Initiatives' },
      { link_type: 'Web', key: 'k-c', url: '/#contact', text: 'Contact Us' },
    ]
    const { links, changes } = planInitiativesLink(noUrlMatch)
    assert.equal(links[0].url, '/initiatives')
    assert.equal(changes.length, 1)
  })

  it('throws when the text fallback is ambiguous', () => {
    const twoInitiatives: NavLink[] = [
      { link_type: 'Web', url: '/a', text: 'Initiatives' },
      { link_type: 'Web', url: '/b', text: 'Initiatives' },
    ]
    assert.throws(
      () => planInitiativesLink(twoInitiatives),
      /Cannot tell which one/
    )
  })

  it('throws rather than guessing when there is no Initiatives link at all', () => {
    const none: NavLink[] = [
      { link_type: 'Web', url: '/#about', text: 'About Us' },
      { link_type: 'Web', url: '/#contact', text: 'Contact Us' },
    ]
    assert.throws(
      () => planInitiativesLink(none),
      /No Initiatives nav link found/
    )
  })

  it('is a no-op when a link already points at /initiatives, even with a stale sibling', () => {
    const mixed: NavLink[] = [
      { link_type: 'Web', url: '/initiatives', text: 'Initiatives' },
      { link_type: 'Web', url: '/#initiatives', text: 'Old Initiatives' },
    ]
    assert.deepEqual(planInitiativesLink(mixed).changes, [])
  })
})

describe('currentNavLinks', () => {
  it('reads links from the array-of-one group shape the query API returns', () => {
    const data = {
      nav: [{ links: [{ url: '/#initiatives', text: 'Initiatives' }] }],
    }
    assert.deepEqual(currentNavLinks(data), [
      { url: '/#initiatives', text: 'Initiatives' },
    ])
  })

  it('tolerates a bare object group and a missing nav', () => {
    assert.deepEqual(currentNavLinks({ nav: { links: [{ url: '/x' }] } }), [
      { url: '/x' },
    ])
    assert.deepEqual(currentNavLinks({}), [])
  })
})
