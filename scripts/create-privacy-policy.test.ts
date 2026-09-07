/**
 * Tests for the privacy policy content transform.
 *
 * The things that must hold: fifteen sections in the right order with the
 * right append_block, headings free of the copy doc's own `N. ` reference
 * numbering, updated_at only on section 14, the bulleted section actually
 * built as list-item nodes, no append-only line typed into content by
 * mistake, the slice count, the footer link dedupe check, the create-vs-update
 * precedence that keeps a re-run idempotent even while the document stays
 * invisible to the master ref, and that a settings write never forwards the
 * footer fields dropped from the custom type.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildFooterLinkEntry,
  buildSlices,
  hasFooterLink,
  heroSlice,
  legalSectionSlice,
  resolveTarget,
  stripOrphanedFooterFields,
  withoutStaleFooterLink,
  FOOTER_LINK_TEXT,
  HERO_LEAD,
  HERO_TITLE,
  LEGAL_SECTIONS,
  PAGE_UID,
  type FooterLink,
  type FooterLinkTarget,
} from './create-privacy-policy.ts'

describe('LEGAL_SECTIONS', () => {
  it('has exactly fifteen sections', () => {
    assert.equal(LEGAL_SECTIONS.length, 15)
  })

  it('carries the headings in order, with no reference numbering', () => {
    assert.deepEqual(
      LEGAL_SECTIONS.map((s) => s.heading),
      [
        'Who we are and how to reach us',
        'What this policy covers',
        'Information we collect',
        'Cookies',
        'Why we collect it',
        'Who has access to your data',
        'Donations',
        'What the site does not do',
        'International transfers',
        'How long we keep it',
        'Your rights',
        'Children',
        'Security',
        'Changes to this policy',
        'Complaints',
      ]
    )
  })

  it('never carries the copy doc\'s own "N. " section numbering', () => {
    for (const section of LEGAL_SECTIONS) {
      assert.doesNotMatch(section.heading, /^\d+\.\s/)
    }
  })

  it('sets append_block only on "who we are", "changes" and "complaints"', () => {
    const byHeading = Object.fromEntries(
      LEGAL_SECTIONS.map((s) => [s.heading, s.append_block])
    )
    assert.equal(byHeading['Who we are and how to reach us'], 'contact_details')
    assert.equal(byHeading['Changes to this policy'], 'last_updated')
    assert.equal(byHeading['Complaints'], 'complaints_contact')

    const others = LEGAL_SECTIONS.filter(
      (s) =>
        ![
          'Who we are and how to reach us',
          'Changes to this policy',
          'Complaints',
        ].includes(s.heading)
    )
    assert.ok(others.every((s) => s.append_block === 'none'))
  })

  it('sets updated_at only on "Changes to this policy"', () => {
    for (const section of LEGAL_SECTIONS) {
      if (section.heading === 'Changes to this policy') {
        assert.equal(section.updated_at, '2026-09-03')
      } else {
        assert.equal(section.updated_at, undefined)
      }
    }
  })

  it('builds "What the site does not do" as four list-item nodes, nothing else', () => {
    const section = LEGAL_SECTIONS.find(
      (s) => s.heading === 'What the site does not do'
    )
    assert.ok(section)
    assert.equal(section.content.length, 4)
    assert.ok(section.content.every((node) => node.type === 'list-item'))
  })

  it('builds the sub-headings in "Information we collect" and "Who has access to your data" as heading3 nodes', () => {
    const infoSection = LEGAL_SECTIONS.find(
      (s) => s.heading === 'Information we collect'
    )
    const accessSection = LEGAL_SECTIONS.find(
      (s) => s.heading === 'Who has access to your data'
    )
    assert.ok(infoSection)
    assert.ok(accessSection)
    assert.deepEqual(
      infoSection.content
        .filter((n) => n.type === 'heading3')
        .map((n) => n.text),
      ['Information you give us', 'Information collected automatically']
    )
    assert.deepEqual(
      accessSection.content
        .filter((n) => n.type === 'heading3')
        .map((n) => n.text),
      ['Internal access', 'External service providers']
    )
  })

  it('never types the generated append lines into content', () => {
    const text = (section: (typeof LEGAL_SECTIONS)[number]) =>
      section.content.map((n) => n.text).join(' ')

    const whoWeAre = LEGAL_SECTIONS.find(
      (s) => s.heading === 'Who we are and how to reach us'
    )!
    assert.ok(!/team@svarit\.org/.test(text(whoWeAre)))
    assert.ok(!/Anandashram/.test(text(whoWeAre)))

    const changes = LEGAL_SECTIONS.find(
      (s) => s.heading === 'Changes to this policy'
    )!
    assert.ok(!/last updated/i.test(text(changes)))
    assert.ok(!/2026-09-03|3 September 2026/.test(text(changes)))

    const complaints = LEGAL_SECTIONS.find((s) => s.heading === 'Complaints')!
    assert.ok(!/team@svarit\.org/.test(text(complaints)))
  })
})

describe('heroSlice', () => {
  it('is the page_header variation with the title and a one-paragraph lead', () => {
    const hero = heroSlice()
    assert.equal(hero.slice_type, 'hero')
    assert.equal(hero.variation, 'page_header')
    assert.equal(hero.primary.title, HERO_TITLE)
    assert.deepEqual(hero.primary.description, [
      { type: 'paragraph', text: HERO_LEAD, spans: [] },
    ])
  })
})

describe('legalSectionSlice', () => {
  it('carries heading, content and append_block', () => {
    const built = legalSectionSlice(LEGAL_SECTIONS[1])
    assert.equal(built.slice_type, 'legal_section')
    assert.equal(built.variation, 'default')
    assert.equal(built.primary.heading, 'What this policy covers')
    assert.equal(built.primary.append_block, 'none')
    assert.equal('updated_at' in built.primary, false)
  })

  it('includes updated_at only for the section that sets it', () => {
    const built = legalSectionSlice(LEGAL_SECTIONS[13])
    assert.equal(built.primary.updated_at, '2026-09-03')
  })
})

describe('buildSlices', () => {
  it('is one hero followed by fifteen legal_section slices', () => {
    const slices = buildSlices()
    assert.equal(slices.length, 16)
    assert.equal(slices[0].slice_type, 'hero')
    assert.ok(slices.slice(1).every((s) => s.slice_type === 'legal_section'))
  })
})

describe('hasFooterLink', () => {
  it('is false for an empty list', () => {
    assert.equal(hasFooterLink([], PAGE_UID), false)
  })

  it('matches an existing document link by uid', () => {
    const links: FooterLink[] = [{ link_type: 'Document', uid: PAGE_UID }]
    assert.equal(hasFooterLink(links, PAGE_UID), true)
  })

  it('matches a raw web link pointing at the same path', () => {
    const links: FooterLink[] = [{ link_type: 'Web', url: `/${PAGE_UID}` }]
    assert.equal(hasFooterLink(links, PAGE_UID), true)
  })

  it('does not match an unrelated link', () => {
    const links: FooterLink[] = [{ link_type: 'Web', url: '/artists' }]
    assert.equal(hasFooterLink(links, PAGE_UID), false)
  })
})

describe('withoutStaleFooterLink', () => {
  it('drops a bare, identity-less entry matching the text', () => {
    const links: FooterLink[] = [
      { link_type: 'Document', key: 'stale-key', text: FOOTER_LINK_TEXT },
    ]
    assert.deepEqual(withoutStaleFooterLink(links, FOOTER_LINK_TEXT), [])
  })

  it('keeps an already-resolved document link with the same text', () => {
    const links: FooterLink[] = [
      { link_type: 'Document', uid: PAGE_UID, text: FOOTER_LINK_TEXT },
    ]
    assert.deepEqual(withoutStaleFooterLink(links, FOOTER_LINK_TEXT), links)
  })

  it('keeps a resolved web link with the same text', () => {
    const links: FooterLink[] = [
      { link_type: 'Web', url: `/${PAGE_UID}`, text: FOOTER_LINK_TEXT },
    ]
    assert.deepEqual(withoutStaleFooterLink(links, FOOTER_LINK_TEXT), links)
  })

  it('leaves links with a different text untouched, resolved or not', () => {
    const links: FooterLink[] = [
      { link_type: 'Document', key: 'stale-key', text: 'Contact' },
      { link_type: 'Web', url: '/artists', text: 'Artists' },
    ]
    assert.deepEqual(withoutStaleFooterLink(links, FOOTER_LINK_TEXT), links)
  })

  it('is a no-op on an empty list', () => {
    assert.deepEqual(withoutStaleFooterLink([], FOOTER_LINK_TEXT), [])
  })
})

describe('buildFooterLinkEntry', () => {
  it('carries the document handle as id, not a bare uid/type reference', () => {
    const target = { id: 'apsf5REAACwALIzO' } as unknown as FooterLinkTarget
    const entry = buildFooterLinkEntry(target, FOOTER_LINK_TEXT)
    assert.equal(entry.link_type, 'Document')
    assert.equal(entry.id, target)
    assert.equal(entry.text, FOOTER_LINK_TEXT)
  })

  it('never ships the old identity-less { link_type, type, uid } shape', () => {
    const target = { id: 'apsf5REAACwALIzO' } as unknown as FooterLinkTarget
    const entry = buildFooterLinkEntry(target, FOOTER_LINK_TEXT)
    assert.ok('id' in entry)
    assert.notEqual(entry.id, undefined)
    assert.equal('uid' in entry, false)
    assert.equal('type' in entry, false)
  })
})

describe('resolveTarget', () => {
  const masterRefDoc = { id: 'from-master', lang: 'en-us' }
  const localRecordDoc = { id: 'from-local-record', lang: 'en-us' }

  it('is a create when neither source has an answer', () => {
    assert.deepEqual(resolveTarget(null, null), {
      target: null,
      source: 'none',
    })
  })

  it('prefers the master ref when the document is visible there', () => {
    assert.deepEqual(resolveTarget(masterRefDoc, localRecordDoc), {
      target: masterRefDoc,
      source: 'master ref',
    })
  })

  it('falls back to the local record when the master ref has no answer', () => {
    assert.deepEqual(resolveTarget(null, localRecordDoc), {
      target: localRecordDoc,
      source: 'local record',
    })
  })

  it('never invents an id: a create is a create', () => {
    const { target } = resolveTarget(null, null)
    assert.equal(target, null)
  })
})

describe('stripOrphanedFooterFields', () => {
  it('drops contact and address from an array-of-one footer group', () => {
    const cleaned = stripOrphanedFooterFields({
      email: 'team@svarit.org',
      footer: [
        {
          contact: 'team@svarit.org | +91 9930759942',
          address: 'Anandashram, 22 Pandita Ramabai Rd, Gamdevi',
          copyright: '© 2026 Svarit. All rights reserved.',
        },
      ],
    })
    assert.deepEqual(cleaned.footer, [
      { copyright: '© 2026 Svarit. All rights reserved.' },
    ])
  })

  it('drops contact and address from a bare-object footer group', () => {
    const cleaned = stripOrphanedFooterFields({
      footer: { contact: 'stale', address: 'stale', copyright: 'kept' },
    })
    assert.deepEqual(cleaned.footer, { copyright: 'kept' })
  })

  it('leaves every other top-level field untouched', () => {
    const cleaned = stripOrphanedFooterFields({
      email: 'team@svarit.org',
      footer_links: [{ links: [] }],
      footer: [{ contact: 'stale', copyright: 'kept' }],
    })
    assert.equal(cleaned.email, 'team@svarit.org')
    assert.deepEqual(cleaned.footer_links, [{ links: [] }])
  })

  it('is a no-op when the footer group never had the orphaned fields', () => {
    const cleaned = stripOrphanedFooterFields({
      footer: [{ copyright: 'kept', credits: [] }],
    })
    assert.deepEqual(cleaned.footer, [{ copyright: 'kept', credits: [] }])
  })
})
