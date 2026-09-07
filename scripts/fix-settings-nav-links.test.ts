/**
 * Tests for the nav-link repair transform.
 *
 * The things that must hold: bare anchors become root-relative, the Artists link lands
 * directly after Initiatives, existing link keys/text survive, and a second run is a no-op.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  currentNavLinks,
  planNavLinks,
  type NavLink,
} from './fix-settings-nav-links.ts'

const currentLinks = (): NavLink[] => [
  { link_type: 'Web', key: 'k-about', url: '#about', text: 'About Us' },
  { link_type: 'Web', key: 'k-init', url: '#initiatives', text: 'Initiatives' },
  { link_type: 'Web', key: 'k-contact', url: '#contact', text: 'Contact Us' },
  {
    link_type: 'Web',
    key: 'k-ext',
    url: 'https://dinkarkaikini.in',
    target: '_blank',
    text: 'Dinkar Kaikini',
  },
]

describe('planNavLinks', () => {
  it('rewrites the bare section anchors to root-relative, keeping text and key', () => {
    const { links } = planNavLinks(currentLinks())

    assert.deepEqual(
      links.map((l) => l.url),
      [
        '/#about',
        '/#initiatives',
        '/artists',
        '/#contact',
        'https://dinkarkaikini.in',
      ]
    )
    assert.equal(links[0].text, 'About Us')
    assert.equal(links[0].key, 'k-about')
    assert.equal(links[1].key, 'k-init')
  })

  it('inserts "Artists" -> /artists immediately after the Initiatives link', () => {
    const { links } = planNavLinks(currentLinks())
    const artistsIndex = links.findIndex((l) => l.url === '/artists')
    assert.equal(links[artistsIndex - 1].text, 'Initiatives')
    assert.equal(links[artistsIndex].text, 'Artists')
  })

  it('leaves the external link untouched', () => {
    const { links } = planNavLinks(currentLinks())
    const external = links.find((l) => l.url === 'https://dinkarkaikini.in')
    assert.deepEqual(external, {
      link_type: 'Web',
      key: 'k-ext',
      url: 'https://dinkarkaikini.in',
      target: '_blank',
      text: 'Dinkar Kaikini',
    })
  })

  it('does not mutate the input array', () => {
    const input = currentLinks()
    planNavLinks(input)
    assert.equal(input[0].url, '#about')
    assert.equal(input.length, 4)
  })

  it('is idempotent: a second run over already-fixed links is a no-op', () => {
    const once = planNavLinks(currentLinks())
    const twice = planNavLinks(once.links)
    assert.deepEqual(twice.changes, [])
    assert.deepEqual(twice.links, once.links)
  })

  it('does not add a second Artists link if one already points at /artists', () => {
    const withArtists: NavLink[] = [
      { link_type: 'Web', url: '/#initiatives', text: 'Initiatives' },
      { link_type: 'Web', url: '/artists', text: 'Artists' },
    ]
    const { links, changes } = planNavLinks(withArtists)
    assert.equal(links.filter((l) => l.url === '/artists').length, 1)
    assert.deepEqual(changes, [])
  })

  it('reports every change it makes', () => {
    const { changes } = planNavLinks(currentLinks())
    assert.equal(changes.length, 4) // 3 rewrites + 1 insert
  })

  it('throws rather than guessing when there is no Initiatives link', () => {
    const noInitiatives: NavLink[] = [
      { link_type: 'Web', url: '#about', text: 'About Us' },
      { link_type: 'Web', url: '#contact', text: 'Contact Us' },
    ]
    assert.throws(() => planNavLinks(noInitiatives), /No Initiatives nav link/)
  })
})

describe('currentNavLinks', () => {
  it('reads links from the array-of-one group shape the query API returns', () => {
    const data = { nav: [{ links: [{ url: '#about', text: 'About Us' }] }] }
    assert.deepEqual(currentNavLinks(data), [
      { url: '#about', text: 'About Us' },
    ])
  })

  it('tolerates a bare object group and a missing nav', () => {
    assert.deepEqual(currentNavLinks({ nav: { links: [{ url: '/x' }] } }), [
      { url: '/x' },
    ])
    assert.deepEqual(currentNavLinks({}), [])
  })
})
