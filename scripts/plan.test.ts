/**
 * Plan-level tests.
 *
 * These build a real migration in memory, with no network, and assert on the exact payloads
 * that would be sent to the Migration API. The bug these exist to prevent: a `uid` key inside
 * `data` makes the API discard the whole `data` object and return 201 anyway, so every
 * document is created as an empty shell and the run reports success.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMigration, type PrismicDocument } from '@prismicio/client'
import { AssetRegistry } from './lib/assets.ts'
import { loadContent } from './lib/content.ts'
import {
  buildPlan,
  emptyExisting,
  type ExistingContent,
  type Plan,
} from './lib/plan.ts'
import { isFilled } from './lib/verify.ts'
import { parseArgs } from './migrate-to-prismic.ts'

const content = await loadContent()

function settingsDoc(): PrismicDocument {
  return {
    id: 'settings-id',
    uid: null,
    url: null,
    type: 'settings',
    href: '',
    tags: [],
    first_publication_date: '2026-01-01T00:00:00+0000',
    last_publication_date: '2026-01-01T00:00:00+0000',
    slugs: [],
    linked_documents: [],
    lang: 'en-us',
    alternate_languages: [],
    data: { footer: [{ contact: 'old@example.com' }] },
  } as unknown as PrismicDocument
}

/** A minimal remote document, as the query API would return it. */
function remoteDoc(type: string, uid: string, id: string): PrismicDocument {
  return {
    id,
    uid,
    url: null,
    type,
    href: '',
    tags: [],
    first_publication_date: '2026-01-01T00:00:00+0000',
    last_publication_date: '2026-01-01T00:00:00+0000',
    slugs: [],
    linked_documents: [],
    lang: 'en-us',
    alternate_languages: [],
    data: {},
  } as unknown as PrismicDocument
}

function existingWith(
  entries: [string, string, string][] = []
): ExistingContent {
  const existing = emptyExisting()
  existing.reachable = true
  for (const [type, uid, id] of entries) {
    existing.byUid.get(type)!.set(uid, remoteDoc(type, uid, id))
    existing.foundIn.set(`${type}:${uid}`, 'Master')
  }
  return existing
}

async function plan(
  options: {
    existing?: ExistingContent
    skipExisting?: boolean
    remoteSettings?: PrismicDocument | null
    only?: ReadonlySet<string>
  } = {}
): Promise<Plan> {
  const migration = createMigration()
  return buildPlan({
    content,
    migration,
    assets: new AssetRegistry(migration),
    existing: options.existing ?? existingWith(),
    lang: 'en-us',
    artists: [
      {
        uid: 'ulhas-kashalkar',
        name: 'Ulhas Kashalkar',
        discipline: 'Hindustani Vocal',
        events: ['Swaramrit'],
      },
    ],
    remoteSettings:
      options.remoteSettings === undefined
        ? settingsDoc()
        : options.remoteSettings,
    skipExisting: options.skipExisting,
    only: options.only,
  })
}

describe('uid is never inside data', () => {
  it('holds for every document in a full plan', async () => {
    const { planned } = await plan()

    assert.ok(planned.length > 30, 'expected a full plan')
    for (const item of planned) {
      const data = item.doc.document.data as Record<string, unknown>
      assert.equal(
        'uid' in data,
        false,
        `${item.type}/${item.uid} put uid inside data`
      )
    }
  })

  it('holds for each of the four repeatable types individually', async () => {
    const { planned } = await plan()

    for (const type of ['volunteer', 'artist', 'event', 'page']) {
      const item = planned.find((entry) => entry.type === type)
      assert.ok(item, `no ${type} document in the plan`)
      assert.equal(
        'uid' in (item.doc.document.data as Record<string, unknown>),
        false,
        `${type} put uid inside data`
      )
    }
  })

  it('still puts the uid at the document root, where it belongs', async () => {
    const { planned } = await plan()

    for (const type of ['volunteer', 'artist', 'event', 'page']) {
      const item = planned.find((entry) => entry.type === type)!
      assert.equal(item.doc.document.uid, item.uid, `${type} lost its root uid`)
      assert.ok(item.uid, `${type} has no uid at all`)
    }
  })

  it('holds for the settings update, which has no uid at all', async () => {
    const { planned } = await plan()
    const settings = planned.find((entry) => entry.type === 'settings')!

    assert.equal('uid' in (settings.doc.document.data as object), false)
    assert.equal('uid' in settings.doc.document, false)
  })

  it('sends only id, type, lang and data for the settings update', async () => {
    const { planned } = await plan()
    const settings = planned.find((entry) => entry.type === 'settings')!

    assert.deepEqual(Object.keys(settings.doc.document).sort(), [
      'data',
      'id',
      'lang',
      'type',
    ])
    assert.equal(settings.doc.document.id, 'settings-id')
  })
})

describe('documents that already exist are repaired, not skipped', () => {
  it('updates rather than creates when the uid is already in Prismic', async () => {
    const { planned, skipped } = await plan({
      existing: existingWith([['page', 'home', 'apFyTxIAACcAawS8']]),
    })

    const home = planned.find(
      (entry) => entry.type === 'page' && entry.uid === 'home'
    )
    assert.ok(home, 'home was dropped from the plan entirely')
    assert.equal(home.action, 'update')
    assert.equal(skipped.length, 0)
  })

  it('targets the existing document id so it fills in rather than duplicating', async () => {
    const { planned } = await plan({
      existing: existingWith([['page', 'home', 'apFyTxIAACcAawS8']]),
    })
    const home = planned.find((entry) => entry.uid === 'home')!

    assert.equal(home.doc.document.id, 'apFyTxIAACcAawS8')
  })

  it('carries the full data payload on an update, not an empty one', async () => {
    const { planned } = await plan({
      existing: existingWith([['page', 'home', 'apFyTxIAACcAawS8']]),
    })
    const home = planned.find((entry) => entry.uid === 'home')!
    const data = home.doc.document.data as Record<string, unknown>

    assert.ok(Array.isArray(data.slices) && data.slices.length === 6)
    assert.ok(isFilled(data.meta_title))
    assert.equal('uid' in data, false)
  })

  it('repairs every type, not just pages', async () => {
    const { planned } = await plan({
      existing: existingWith([
        ['volunteer', 'utpal', 'v1'],
        ['event', 'swaramrit', 'e1'],
        ['artist', 'ulhas-kashalkar', 'a1'],
        ['page', 'events', 'p1'],
      ]),
    })

    for (const [type, uid] of [
      ['volunteer', 'utpal'],
      ['event', 'swaramrit'],
      ['artist', 'ulhas-kashalkar'],
      ['page', 'events'],
    ]) {
      const item = planned.find(
        (entry) => entry.type === type && entry.uid === uid
      )
      assert.equal(item?.action, 'update', `${type}/${uid} was not repaired`)
    }
  })

  it('still creates the documents that are genuinely absent', async () => {
    const { planned } = await plan({
      existing: existingWith([['page', 'home', 'apFyTxIAACcAawS8']]),
    })

    const events = planned.find((entry) => entry.uid === 'events')!
    assert.equal(events.action, 'create')
    assert.equal(events.doc.document.id, undefined)
  })

  it('converges on a second run rather than duplicating', async () => {
    const first = await plan()
    const created = first.planned
      .filter((entry) => entry.action === 'create' && entry.uid)
      .map((entry): [string, string, string] => [
        entry.type,
        entry.uid!,
        `id-${entry.uid}`,
      ])

    const second = await plan({ existing: existingWith(created) })

    assert.equal(
      second.planned.filter((entry) => entry.action === 'create').length,
      0,
      'a second run would create documents again'
    )
    assert.equal(
      second.planned.filter((entry) => entry.action === 'update').length,
      first.planned.length,
      'a second run should update everything the first run created'
    )
  })

  it('honours --skip-existing when the old behaviour is wanted', async () => {
    const { planned, skipped } = await plan({
      existing: existingWith([['page', 'home', 'apFyTxIAACcAawS8']]),
      skipExisting: true,
    })

    assert.equal(
      planned.some((entry) => entry.uid === 'home'),
      false
    )
    assert.equal(skipped.length, 1)
    assert.equal(skipped[0].uid, 'home')
  })
})

describe('probe plan', () => {
  it('contains exactly one document', async () => {
    const { planned } = await plan({
      only: new Set(['utpal']),
      remoteSettings: null,
    })

    assert.equal(planned.length, 1)
    assert.equal(planned[0].type, 'volunteer')
    assert.equal(planned[0].uid, 'utpal')
  })

  it('carries a real payload, so a read-back actually proves something', async () => {
    const { planned } = await plan({
      only: new Set(['utpal']),
      remoteSettings: null,
    })
    const data = planned[0].doc.document.data as Record<string, unknown>

    assert.equal(data.name, 'Utpal')
    assert.ok(isFilled(data.photo))
    assert.equal('uid' in data, false)
  })
})

describe('verify.isFilled', () => {
  it('rejects the shapes an empty Prismic document comes back as', () => {
    assert.equal(isFilled(null), false)
    assert.equal(isFilled(undefined), false)
    assert.equal(isFilled(''), false)
    assert.equal(isFilled('   '), false)
    assert.equal(isFilled([]), false)
    assert.equal(isFilled({}), false)
    assert.equal(isFilled({ link_type: 'Any' }), false)
  })

  it('accepts real content', () => {
    assert.equal(isFilled('Utpal'), true)
    assert.equal(isFilled(0), true)
    assert.equal(isFilled(false), true)
    assert.equal(isFilled([{ type: 'paragraph', text: 'x', spans: [] }]), true)
    assert.equal(isFilled({ url: 'https://example.com/a.webp' }), true)
  })

  it('catches the exact empty home document this bug produced', () => {
    const data = {
      slices: [],
      meta_title: null,
      meta_description: null,
      meta_image: {},
    }
    for (const field of Object.keys(data)) {
      assert.equal(
        isFilled(data[field as keyof typeof data]),
        false,
        `${field} should read as empty`
      )
    }
  })
})

describe('--only filter', () => {
  it('plans exactly one document when given one uid', async () => {
    const { planned } = await plan({ only: new Set(['home']) })

    assert.equal(planned.length, 1)
    assert.equal(planned[0].type, 'page')
    assert.equal(planned[0].uid, 'home')
  })

  it('leaves the settings singleton out unless it is named', async () => {
    const { planned } = await plan({ only: new Set(['home']) })
    assert.equal(
      planned.some((entry) => entry.type === 'settings'),
      false
    )
  })

  it('includes settings when it is named explicitly', async () => {
    const { planned } = await plan({ only: new Set(['settings']) })

    assert.equal(planned.length, 1)
    assert.equal(planned[0].type, 'settings')
  })

  it('is repeatable, taking the union of the uids', async () => {
    const { planned } = await plan({
      only: new Set(['home', 'events', 'utpal']),
    })

    assert.equal(planned.length, 3)
    assert.deepEqual(planned.map((entry) => entry.uid).sort(), [
      'events',
      'home',
      'utpal',
    ])
  })

  it('carries the full home payload, six slices and no data.uid', async () => {
    const { planned } = await plan({ only: new Set(['home']) })
    const data = planned[0].doc.document.data as Record<string, unknown>

    assert.equal('uid' in data, false)
    assert.ok(Array.isArray(data.slices))
    assert.equal((data.slices as unknown[]).length, 6)
    assert.deepEqual(
      (data.slices as { slice_type: string }[]).map((s) => s.slice_type),
      ['hero', 'sponsors', 'about', 'event_list', 'donate', 'contact']
    )
    assert.ok(isFilled(data.meta_title))
    assert.ok(isFilled(data.meta_description))
  })

  it('takes the create path when the uid is absent from Prismic', async () => {
    const { planned } = await plan({ only: new Set(['home']) })

    assert.equal(planned[0].action, 'create')
    assert.equal(planned[0].doc.document.uid, 'home')
    assert.equal(planned[0].doc.document.id, undefined)
  })

  it('still repairs in place when the uid is present', async () => {
    const { planned } = await plan({
      only: new Set(['home']),
      existing: existingWith([['page', 'home', 'apFyTxIAACcAawS8']]),
    })

    assert.equal(planned.length, 1)
    assert.equal(planned[0].action, 'update')
    assert.equal(planned[0].doc.document.id, 'apFyTxIAACcAawS8')
  })

  it('touches nothing else, which is the whole point', async () => {
    const unfiltered = await plan()
    const filtered = await plan({ only: new Set(['home']) })

    assert.ok(unfiltered.planned.length > 30)
    assert.equal(filtered.planned.length, 1)
    for (const type of ['volunteer', 'event', 'artist', 'settings']) {
      assert.equal(
        filtered.planned.some((entry) => entry.type === type),
        false,
        `${type} leaked into a --only home run`
      )
    }
  })

  it('registers no assets for documents it filtered out', async () => {
    const migration = createMigration()
    const assets = new AssetRegistry(migration)
    await buildPlan({
      content,
      migration,
      assets,
      existing: existingWith(),
      lang: 'en-us',
      artists: null,
      remoteSettings: null,
      only: new Set(['utpal']),
    })

    // Just the one volunteer photo, not the hero, sponsor and donate images.
    assert.equal(assets.size, 1)
  })

  it('produces an empty plan for a uid that does not exist', async () => {
    const { planned, skipped } = await plan({ only: new Set(['nope']) })

    assert.equal(planned.length, 0)
    assert.equal(skipped.length, 0)
  })

  it('plans everything when the filter is empty', async () => {
    const withEmpty = await plan({ only: new Set<string>() })
    const withNone = await plan()

    assert.equal(withEmpty.planned.length, withNone.planned.length)
    assert.ok(withEmpty.planned.length > 30)
  })
})

describe('--only argument parsing', () => {
  it('reads a repeated flag into a set', () => {
    const args = parseArgs(['--only', 'home', '--only', 'events'])
    assert.deepEqual([...args.only].sort(), ['events', 'home'])
  })

  it('accepts the --only=uid form', () => {
    assert.deepEqual([...parseArgs(['--only=home']).only], ['home'])
  })

  it('coexists with the other flags in any order', () => {
    const args = parseArgs(['--commit', '--only', 'home', '--with-artists'])
    assert.equal(args.commit, true)
    assert.equal(args.withArtists, true)
    assert.deepEqual([...args.only], ['home'])
  })

  it('defaults to an empty set, meaning the whole plan', () => {
    assert.equal(parseArgs([]).only.size, 0)
    assert.equal(parseArgs(['--commit']).only.size, 0)
  })

  it('rejects --only with no value', () => {
    assert.throws(() => parseArgs(['--only']), /--only needs a uid/)
    assert.throws(() => parseArgs(['--only', '--commit']), /--only needs a uid/)
    assert.throws(() => parseArgs(['--only=']), /--only needs a uid/)
  })

  it('does not mistake the --only value for an unknown flag', () => {
    assert.doesNotThrow(() => parseArgs(['--only', 'home']))
  })

  it('catches a bare uid passed without the flag', () => {
    assert.throws(() => parseArgs(['home']), /Did you mean --only home/)
  })

  it('still rejects genuinely unknown flags', () => {
    assert.throws(() => parseArgs(['--nope']), /Unknown option/)
  })
})
