import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  eventDates,
  mergeSettings,
  normaliseGroup,
  paragraph,
  richText,
  slice,
  slugify,
  uidFor,
  uniqueUid,
  webLink,
} from './lib/transform.ts'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    assert.equal(slugify('Dinarang Smriti 2014'), 'dinarang-smriti-2014')
  })

  it('strips curly quotes rather than turning them into separators', () => {
    assert.equal(
      slugify('“Dinarang” Film Screening'),
      'dinarang-film-screening'
    )
  })

  it('drops parentheses and collapses the gap', () => {
    assert.equal(slugify('Sujan Smriti (Pune)'), 'sujan-smriti-pune')
  })

  it('folds diacritics instead of dropping the letter', () => {
    assert.equal(slugify('Samvāda'), 'samvada')
  })

  it('spells out ampersands', () => {
    assert.equal(slugify('Rajan & Sajan Mishra'), 'rajan-and-sajan-mishra')
  })

  it('never leaves a leading or trailing hyphen', () => {
    assert.equal(slugify('  ...Riyaaz Shibir!  '), 'riyaaz-shibir')
  })

  it('truncates long titles without leaving a trailing hyphen', () => {
    const uid = slugify(
      'An Evening with Vidwan Umayalpuram K Sivaraman and Many Other Distinguished Guests'
    )
    assert.ok(uid.length <= 60)
    assert.ok(!uid.endsWith('-'))
    assert.equal(
      uid,
      'an-evening-with-vidwan-umayalpuram-k-sivaraman-and-many-othe'
    )
  })
})

describe('uid de-duplication', () => {
  it('returns the base uid when nothing has claimed it', () => {
    const taken = new Set<string>()
    assert.equal(uniqueUid('dinarang', taken), 'dinarang')
  })

  it('suffixes colliding titles in order', () => {
    const taken = new Set<string>()
    assert.equal(uidFor('Dinarang', taken), 'dinarang')
    assert.equal(uidFor('Dinarang', taken), 'dinarang-2')
    assert.equal(uidFor('Dinarang', taken), 'dinarang-3')
  })

  it('treats titles that slugify identically as collisions', () => {
    const taken = new Set<string>()
    assert.equal(uidFor('Chatur Smriti', taken), 'chatur-smriti')
    assert.equal(uidFor('Chatur  Smriti!', taken), 'chatur-smriti-2')
  })

  it('does not collide with a uid already present in Prismic', () => {
    const taken = new Set(['swaramrit'])
    assert.equal(uidFor('Swaramrit', taken), 'swaramrit-2')
  })

  it('records every uid it hands out', () => {
    const taken = new Set<string>()
    uidFor('Dinarang', taken)
    uidFor('Dinarang', taken)
    assert.deepEqual([...taken].sort(), ['dinarang', 'dinarang-2'])
  })
})

describe('rich text conversion', () => {
  it('builds a single paragraph node', () => {
    assert.deepEqual(paragraph('Hello'), {
      type: 'paragraph',
      text: 'Hello',
      spans: [],
    })
  })

  it('turns each string into its own paragraph', () => {
    assert.deepEqual(richText('One', 'Two'), [
      { type: 'paragraph', text: 'One', spans: [] },
      { type: 'paragraph', text: 'Two', spans: [] },
    ])
  })

  it('drops empty and whitespace-only strings', () => {
    assert.deepEqual(richText('', '   ', 'Kept'), [
      { type: 'paragraph', text: 'Kept', spans: [] },
    ])
  })

  it('returns an empty value when there is nothing to convert', () => {
    assert.deepEqual(richText(), [])
  })

  it('leaves the text untouched, including quotes and punctuation', () => {
    const text =
      'A 2-day festival featuring "Dinarang", concluding with a Santoor solo.'
    assert.equal(richText(text)[0].text, text)
  })
})

describe('date mapping', () => {
  it('maps date.date to start_date and date.label to date_label', () => {
    const entry = {
      date: { date: '2002-11-07', label: '7th & 8th November 2002' },
      title: 'Swaramrit',
      description: 'A 2-day festival.',
    }
    assert.deepEqual(eventDates(entry), {
      start_date: '2002-11-07',
      date_label: '7th & 8th November 2002',
    })
  })

  it('keeps the ISO date as a plain string, which is what a Prismic Date field wants', () => {
    const entry = {
      date: { date: '2026-05-16', label: '16th & 17th May 2026' },
      title: 'Riyaaz Shibir',
      description: 'A 2-day residential shibir.',
    }
    assert.equal(eventDates(entry).start_date, '2026-05-16')
    assert.match(eventDates(entry).start_date, /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('slice payloads', () => {
  it('defaults to the default variation', () => {
    assert.deepEqual(slice('hero', { title: 'Hi' }), {
      slice_type: 'hero',
      variation: 'default',
      items: [],
      primary: { title: 'Hi' },
    })
  })

  it('carries an explicit variation, which event_list needs for its grid', () => {
    assert.equal(
      slice('event_list', { page_size: 12 }, 'grid').variation,
      'grid'
    )
  })
})

describe('webLink', () => {
  it('builds a Web link field', () => {
    assert.deepEqual(webLink('https://svarit.org'), {
      link_type: 'Web',
      url: 'https://svarit.org',
    })
  })
})

describe('normaliseGroup', () => {
  it('unwraps the single-element array the API returns for non-repeatable groups', () => {
    assert.deepEqual(normaliseGroup([{ contact: 'a' }]), { contact: 'a' })
  })

  it('accepts a bare object', () => {
    assert.deepEqual(normaliseGroup({ contact: 'a' }), { contact: 'a' })
  })

  it('returns an empty object for an empty or missing group', () => {
    assert.deepEqual(normaliseGroup([]), {})
    assert.deepEqual(normaliseGroup(undefined), {})
    assert.deepEqual(normaliseGroup(null), {})
  })
})

describe('settings merge', () => {
  const overrides = {
    copyright: '© 2026 Svarit.',
    credits: 'Made by Neesh Samsi',
    contact: 'team@svarit.org | +91 9930759942',
    donationUrl: 'https://pages.razorpay.com/svarit',
  }

  it('fills empty footer fields from content.json', () => {
    const { data } = mergeSettings(
      { footer: [{ contact: 'team@svarit.org', address: 'Mumbai' }] },
      overrides
    )
    const merged = normaliseGroup(data.footer)
    assert.equal(merged.copyright, '© 2026 Svarit.')
    assert.deepEqual(merged.credits, [
      { type: 'paragraph', text: 'Made by Neesh Samsi', spans: [] },
    ])
  })

  it('never clobbers copyright or credits that already have content in Prismic', () => {
    const { data, notes } = mergeSettings(
      {
        footer: [
          {
            contact: overrides.contact,
            copyright: '© 2025 Svarit Trust.',
            credits: [
              { type: 'paragraph', text: 'Existing credit', spans: [] },
            ],
          },
        ],
      },
      overrides
    )
    const merged = normaliseGroup(data.footer)
    assert.equal(merged.copyright, '© 2025 Svarit Trust.')
    assert.deepEqual(merged.credits, [
      { type: 'paragraph', text: 'Existing credit', spans: [] },
    ])
    assert.ok(notes.some((note) => note.includes('footer.copyright')))
    assert.ok(notes.some((note) => note.includes('footer.credits')))
  })

  it('treats a whitespace-only remote value as empty', () => {
    const { data } = mergeSettings(
      { footer: [{ copyright: '   ' }] },
      overrides
    )
    assert.equal(normaliseGroup(data.footer).copyright, '© 2026 Svarit.')
  })

  it('preserves the settings fields it has no business touching', () => {
    const remote = {
      logo: { url: 'https://images.prismic.io/svarit/logo.svg', id: 'abc' },
      socials: [
        {
          instagram: {
            link_type: 'Web',
            url: 'https://instagram.com/svaritorg',
          },
        },
      ],
      nav: [{ links: [{ link_type: 'Web', url: '#about', text: 'About Us' }] }],
      footer: [{ contact: overrides.contact, address: 'Mumbai' }],
    }
    const { data } = mergeSettings(remote, overrides)
    assert.deepEqual(data.logo, remote.logo)
    assert.deepEqual(data.socials, remote.socials)
    assert.deepEqual(data.nav, remote.nav)
    assert.equal(normaliseGroup(data.footer).address, 'Mumbai')
  })

  it('does not mutate the document it was handed', () => {
    const remote = {
      donationLink: [{ link_type: 'Web', url: 'https://rzp.io/l/svarit' }],
      footer: [{ contact: 'svarittrust1@gmail.com' }],
    }
    const snapshot = structuredClone(remote)
    mergeSettings(remote, overrides)
    assert.deepEqual(remote, snapshot)
  })

  it('writes the footer group back in the shape it arrived in', () => {
    const asArray = mergeSettings({ footer: [{ contact: 'a' }] }, overrides)
    assert.ok(Array.isArray(asArray.data.footer))

    const asObject = mergeSettings({ footer: { contact: 'a' } }, overrides)
    assert.ok(!Array.isArray(asObject.data.footer))
  })

  it('drops the v1 volunteers group, which is now its own custom type', () => {
    const { data, notes } = mergeSettings(
      { volunteers: [{ name: 'Utpal' }], footer: [{ contact: 'a' }] },
      overrides
    )
    assert.equal('volunteers' in data, false)
    assert.ok(notes.some((note) => note.includes('settings.volunteers')))
  })

  it('copes with a settings document that has no footer group at all', () => {
    const { data } = mergeSettings({}, overrides)
    assert.equal(normaliseGroup(data.footer).copyright, '© 2026 Svarit.')
  })
})

describe('settings merge, the two forced overwrites', () => {
  const overrides = {
    copyright: '© 2026 Svarit.',
    credits: 'Made by Neesh Samsi',
    contact: 'team@svarit.org | +91 9930759942',
    donationUrl: 'https://pages.razorpay.com/svarit',
  }

  it('forces footer.contact over the stale address in Prismic', () => {
    const { data, notes } = mergeSettings(
      { footer: [{ contact: 'svarittrust1@gmail.com | +91 9930759942' }] },
      overrides
    )
    assert.equal(normaliseGroup(data.footer).contact, overrides.contact)
    assert.ok(
      notes.some(
        (note) =>
          note.includes('footer.contact') && note.includes('force-updated')
      )
    )
  })

  it('does not report a forced contact update when the value already matches', () => {
    const { notes } = mergeSettings(
      { footer: [{ contact: overrides.contact }] },
      overrides
    )
    assert.equal(
      notes.some((note) => note.includes('footer.contact')),
      false
    )
  })

  it('sets footer.contact even when the remote field is empty', () => {
    const { data } = mergeSettings(
      { footer: [{ address: 'Mumbai' }] },
      overrides
    )
    assert.equal(normaliseGroup(data.footer).contact, overrides.contact)
  })

  it('forces donationLink over the stale rzp.io short link', () => {
    const { data, notes } = mergeSettings(
      { donationLink: [{ link_type: 'Web', url: 'https://rzp.io/l/svarit' }] },
      overrides
    )
    assert.deepEqual(data.donationLink, [
      { link_type: 'Web', url: overrides.donationUrl },
    ])
    assert.ok(
      notes.some(
        (note) =>
          note.includes('donationLink') && note.includes('force-updated')
      )
    )
  })

  it('keeps the link text, target and key while swapping the url', () => {
    const { data } = mergeSettings(
      {
        donationLink: [
          {
            link_type: 'Web',
            key: 'c4e79a78',
            url: 'https://rzp.io/l/svarit',
            target: '_blank',
            text: 'Join the mission',
          },
        ],
      },
      overrides
    )
    assert.deepEqual(data.donationLink, [
      {
        link_type: 'Web',
        key: 'c4e79a78',
        url: overrides.donationUrl,
        target: '_blank',
        text: 'Join the mission',
      },
    ])
  })

  it('rewrites every entry of a repeatable donationLink', () => {
    const { data } = mergeSettings(
      {
        donationLink: [
          { link_type: 'Web', url: 'https://rzp.io/l/svarit', text: 'One' },
          { link_type: 'Web', url: 'https://example.com/old', text: 'Two' },
        ],
      },
      overrides
    )
    const urls = (data.donationLink as { url: string }[]).map((l) => l.url)
    assert.deepEqual(urls, [overrides.donationUrl, overrides.donationUrl])
  })

  it('does not report a forced donation update when the url already matches', () => {
    const { notes } = mergeSettings(
      { donationLink: [{ link_type: 'Web', url: overrides.donationUrl }] },
      overrides
    )
    assert.equal(
      notes.some((note) => note.includes('donationLink')),
      false
    )
  })

  it('creates a donationLink when the field is empty', () => {
    const { data, notes } = mergeSettings({}, overrides)
    assert.deepEqual(data.donationLink, [
      { link_type: 'Web', url: overrides.donationUrl, target: '_blank' },
    ])
    assert.ok(notes.some((note) => note.includes('was empty')))
  })
})
