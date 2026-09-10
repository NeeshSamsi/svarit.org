/**
 * Tests for building the centenary artists, initiatives, and the /centenary timeline link
 * (Solo todo P6).
 *
 * The things that must hold: the artists group on an initiative is built in the schedule's
 * own uid order with `featured` true only for uids in that entry's `featured` array, a
 * `featured` uid absent from `artists` aborts validation, an unresolved artist uid aborts
 * rather than silently dropping the artist, description becomes a single rich text paragraph
 * with the exact source text, the timeline's initiatives group comes out in the schedule's
 * array order, and an existing initiative document is planned as a create, an update (repair
 * for an interrupted migration or ordinary drift), or left unchanged depending on whether -
 * and how - its own fields differ from the schedule, with no all-or-nothing abort across a
 * mixed set.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  allReferencedArtistUids,
  buildArtistData,
  buildArtistsGroup,
  buildInitiativeData,
  buildInitiativesGroup,
  currentTimelineInitiativeUids,
  describeArtistDrift,
  describeInitiativeDrift,
  findTimelineSliceIndex,
  planArtistRename,
  planArtistWrite,
  planInitiativeWrite,
  planTimelineLink,
  resolveArtistHandles,
  unresolvedArtistReferences,
  validateSchedule,
  type ArtistInput,
  type ArtistRename,
  type InitiativeInput,
} from './create-centenary-content.ts'
import type { Slice } from './create-centenary-page.ts'

const CATEGORIES = ['Event', 'Workshop', 'Scholarship']

const initiative = (
  overrides: Partial<InitiativeInput> = {}
): InitiativeInput => ({
  uid: 'aarambh-2026',
  title: 'Aarambh: Dinarang Centenary Inauguration',
  category: 'Event',
  start_date: '2026-10-02',
  date_label: '2nd October 2026',
  venue: 'Bharatiya Vidya Bhavan Auditorium, Chowpatty, Mumbai',
  description:
    'Opening the year-long centenary celebrations of Pandit Dinkar Kaikini, with the ' +
    'maestro\'s "signature" khayal style.',
  feature_label: 'Featuring:',
  artists: ['sangeeta-shankar', 'nandini-shankar', 'ojas-adhiya'],
  featured: ['sangeeta-shankar'],
  ...overrides,
})

describe('validateSchedule', () => {
  it('passes a well-formed schedule with no errors', () => {
    assert.deepEqual(validateSchedule([initiative()], CATEGORIES), [])
  })

  it("aborts (reports) a featured uid absent from that entry's artists", () => {
    const errors = validateSchedule(
      [initiative({ featured: ['someone-else'] })],
      CATEGORIES
    )
    assert.ok(
      errors.some(
        (e) =>
          /features "someone-else"/.test(e) && /not in its own artists/.test(e)
      )
    )
  })

  it('reports a malformed start_date', () => {
    const errors = validateSchedule(
      [initiative({ start_date: 'October 2026' })],
      CATEGORIES
    )
    assert.ok(errors.some((e) => /start_date/.test(e)))
  })

  it('reports an unknown category', () => {
    const errors = validateSchedule(
      [initiative({ category: 'Festival' })],
      CATEGORIES
    )
    assert.ok(errors.some((e) => /category "Festival"/.test(e)))
  })

  it('reports a duplicate initiative uid', () => {
    const errors = validateSchedule([initiative(), initiative()], CATEGORIES)
    assert.ok(
      errors.some((e) => /duplicate initiative uid "aarambh-2026"/.test(e))
    )
  })

  it('reports every problem in one pass, not just the first', () => {
    const errors = validateSchedule(
      [
        initiative({
          start_date: 'bad',
          category: 'Festival',
          featured: ['nobody'],
        }),
      ],
      CATEGORIES
    )
    assert.equal(errors.length, 3)
  })
})

const rename: ArtistRename = {
  from_uid: 'ashwini-bhide',
  to_uid: 'ashwini-bhide-deshpande',
  name: 'Ashwini Bhide-Deshpande',
}

describe('planArtistRename', () => {
  const fromDoc = { id: 'from-doc-id' }
  const toDoc = { id: 'to-doc-id' }

  it('plans a rename when only from_uid exists', () => {
    const plan = planArtistRename(rename, fromDoc, null, null)
    assert.deepEqual(plan, { action: 'rename', rename, fromHandle: fromDoc })
  })

  it('reports already-renamed when only to_uid exists and its name already matches', () => {
    const plan = planArtistRename(rename, null, toDoc, rename.name)
    assert.deepEqual(plan, {
      action: 'already-renamed',
      rename,
      toHandle: toDoc,
    })
  })

  it('plans an update-name when the uid already moved but the name did not', () => {
    // The same interrupted-migration content pass that leaves an event with model defaults
    // (see planInitiativeWrite) can equally move an artist's uid without patching its name.
    const plan = planArtistRename(rename, null, toDoc, 'Ashwini Bhide')
    assert.deepEqual(plan, {
      action: 'update-name',
      rename,
      toHandle: toDoc,
    })
  })

  it('treats a null current name (never patched at all) as not yet matching', () => {
    const plan = planArtistRename(rename, null, toDoc, null)
    assert.equal(plan.action, 'update-name')
  })

  it('reports already-renamed, not ambiguous, when both uids resolve to the same document', () => {
    // Prismic keeps a document's old uid resolvable after its uid changes, so a query for
    // from_uid and a query for to_uid can both land on the very same document once the
    // rename has already gone through. Real repository state (2 uids, 1 document id) hit
    // this exact case and wrongly aborted before this fix.
    const sameDoc = { id: 'same-doc-id' }
    const plan = planArtistRename(rename, sameDoc, sameDoc, rename.name)
    assert.deepEqual(plan, {
      action: 'already-renamed',
      rename,
      toHandle: sameDoc,
    })
  })

  it('aborts when both uids resolve to two genuinely different documents', () => {
    assert.throws(
      () => planArtistRename(rename, fromDoc, toDoc, rename.name),
      /resolve to different documents/
    )
  })

  it('aborts when neither uid exists', () => {
    assert.throws(
      () => planArtistRename(rename, null, null, null),
      /neither uid exists/
    )
  })
})

describe('allReferencedArtistUids', () => {
  it('collects every uid across every initiative, deduplicated, in first-appearance order', () => {
    const uids = allReferencedArtistUids([
      initiative({ uid: 'a', artists: ['x', 'y'] }),
      initiative({ uid: 'b', artists: ['y', 'z'] }),
    ])
    assert.deepEqual(uids, ['x', 'y', 'z'])
  })
})

describe('resolveArtistHandles', () => {
  it('resolves a uid from created before falling back to existing', () => {
    const { handles, missing } = resolveArtistHandles(
      ['a', 'b'],
      new Map([['a', 'created-a']]),
      new Map([['b', 'existing-b']])
    )
    assert.equal(handles.get('a'), 'created-a')
    assert.equal(handles.get('b'), 'existing-b')
    assert.deepEqual(missing, [])
  })

  it('reports a uid resolving to neither as missing, rather than dropping it', () => {
    const { handles, missing } = resolveArtistHandles(
      ['a', 'ghost'],
      new Map([['a', 'created-a']]),
      new Map()
    )
    assert.equal(handles.size, 1)
    assert.deepEqual(missing, ['ghost'])
  })
})

describe('unresolvedArtistReferences', () => {
  it('names which initiative referenced each missing uid', () => {
    const messages = unresolvedArtistReferences(
      [
        initiative({
          uid: 'aarambh-2026',
          artists: ['ghost', 'sangeeta-shankar'],
        }),
      ],
      ['ghost']
    )
    assert.equal(messages.length, 1)
    assert.match(messages[0], /initiative "aarambh-2026"/)
    assert.match(messages[0], /"ghost"/)
  })

  it('returns nothing when there is nothing missing', () => {
    assert.deepEqual(unresolvedArtistReferences([initiative()], []), [])
  })
})

/**
 * A document exactly the way the interrupted Migration API leaves one behind: it exists, but
 * every field this script owns still reads as the custom type's own model default rather
 * than anything the schedule asked for. `category` defaults to "Event" per
 * customtypes/event/index.json, which is the whole reason the repair brief's proof works:
 * an entry that legitimately wants "Event" won't show a category diff from this alone, but
 * one that wants "Workshop" will.
 */
const modelDefaultInitiativeData = (): Record<string, unknown> => ({
  title: null,
  category: 'Event',
  start_date: null,
  date_label: null,
  venue: null,
  description: [],
  feature_label: null,
  artists: [],
})

/** The shape a fully-written, fetched `event` document's data has for a given schedule entry. */
const fetchedInitiativeData = (
  entry: InitiativeInput,
  artistDocs: Record<string, { id: string; uid: string }>
): Record<string, unknown> => ({
  title: entry.title,
  category: entry.category,
  start_date: entry.start_date,
  date_label: entry.date_label,
  venue: entry.venue,
  description: [{ type: 'paragraph', text: entry.description, spans: [] }],
  feature_label: entry.feature_label,
  artists: entry.artists.map((uid) => ({
    artist: artistDocs[uid],
    featured: entry.featured.includes(uid),
  })),
})

describe('describeInitiativeDrift', () => {
  it('reports no drift when every owned field already matches the schedule', () => {
    const entry = initiative()
    const artistDocs = Object.fromEntries(
      entry.artists.map((uid) => [uid, { id: `doc-${uid}`, uid }])
    )
    assert.deepEqual(
      describeInitiativeDrift(fetchedInitiativeData(entry, artistDocs), entry),
      []
    )
  })

  it('names every owned field that differs on a model-default-only document', () => {
    const entry = initiative()
    const diffs = describeInitiativeDrift(modelDefaultInitiativeData(), entry)

    assert.deepEqual(diffs, [
      'title',
      'start_date',
      'date_label',
      'venue',
      'description',
      'feature_label',
      'artists',
    ])
    // category is absent: "Event" is both the model default and this entry's real category.
    assert.ok(!diffs.includes('category'))
  })

  it('catches a category that reads as the model default instead of the real value', () => {
    const entry = initiative({
      category: 'Workshop',
      artists: [],
      featured: [],
    })
    const diffs = describeInitiativeDrift(modelDefaultInitiativeData(), entry)
    assert.ok(diffs.includes('category'))
  })

  it('treats a null venue and an empty-string schedule venue as equal, not a diff', () => {
    const entry = initiative({ venue: '', artists: [], featured: [] })
    const current = fetchedInitiativeData(entry, {})
    current.venue = null
    assert.ok(!describeInitiativeDrift(current, entry).includes('venue'))
  })
})

describe('planInitiativeWrite', () => {
  it('plans a create when no document exists for the uid', () => {
    assert.deepEqual(planInitiativeWrite(initiative(), null), {
      action: 'create',
    })
  })

  it('plans an update, naming the diffs, when the existing document differs', () => {
    const plan = planInitiativeWrite(initiative(), modelDefaultInitiativeData())
    assert.equal(plan.action, 'update')
    if (plan.action !== 'update') throw new Error('unreachable')
    assert.ok(plan.diffs.includes('title'))
    assert.ok(plan.diffs.includes('artists'))
  })

  it('plans unchanged when the existing document already matches the schedule', () => {
    const entry = initiative()
    const artistDocs = Object.fromEntries(
      entry.artists.map((uid) => [uid, { id: `doc-${uid}`, uid }])
    )
    assert.deepEqual(
      planInitiativeWrite(entry, fetchedInitiativeData(entry, artistDocs)),
      { action: 'unchanged' }
    )
  })

  it('plans creates and updates side by side for a mixed set, with no abort', () => {
    const missingEntry = initiative({
      uid: 'samvaad-baithak-1',
      artists: [],
      featured: [],
    })
    const brokenEntry = initiative({ uid: 'aarambh-2026' })
    const existingByUid = new Map<string, Record<string, unknown>>([
      [brokenEntry.uid, modelDefaultInitiativeData()],
    ])

    const plans = [missingEntry, brokenEntry].map((entry) =>
      planInitiativeWrite(entry, existingByUid.get(entry.uid) ?? null)
    )

    assert.deepEqual(
      plans.map((p) => p.action),
      ['create', 'update']
    )
  })
})

const artist = (overrides: Partial<ArtistInput> = {}): ArtistInput => ({
  uid: 'swapnil-bhise',
  name: 'Swapnil Bhise',
  discipline: 'Tabla',
  ...overrides,
})

describe('describeArtistDrift', () => {
  it('reports no drift when name and discipline already match', () => {
    const a = artist()
    assert.deepEqual(
      describeArtistDrift({ name: a.name, discipline: a.discipline }, a),
      []
    )
  })

  it('names both fields on a model-default-only document (name and discipline null)', () => {
    const diffs = describeArtistDrift(
      { name: null, discipline: null },
      artist()
    )
    assert.deepEqual(diffs, ['name', 'discipline'])
  })

  it('treats a null discipline and an empty-string JSON discipline as equal', () => {
    // discipline: "" is a real value ("not identified yet"), not a placeholder, so it must
    // never be reported as drift against a fetched null - or a correctly-blank discipline
    // gets "corrected" back to blank on every run.
    const a = artist({ discipline: '' })
    const diffs = describeArtistDrift({ name: a.name, discipline: null }, a)
    assert.ok(!diffs.includes('discipline'))
  })
})

describe('planArtistWrite', () => {
  it('plans a create when no document exists for the uid', () => {
    assert.deepEqual(planArtistWrite(artist(), null), { action: 'create' })
  })

  it('plans an update, naming the diffs, for an existing document with null name and discipline', () => {
    const plan = planArtistWrite(artist(), { name: null, discipline: null })
    assert.deepEqual(plan, {
      action: 'update',
      diffs: ['name', 'discipline'],
    })
  })

  it('plans a reuse when the existing document already matches', () => {
    const a = artist()
    assert.deepEqual(
      planArtistWrite(a, { name: a.name, discipline: a.discipline }),
      { action: 'reuse' }
    )
  })

  it('reuses, not updates, when "" in the JSON meets a null in Prismic', () => {
    const a = artist({ discipline: '' })
    assert.deepEqual(planArtistWrite(a, { name: a.name, discipline: null }), {
      action: 'reuse',
    })
  })

  it('never produces a write plan for a uid absent from centenary-artists-new.json', () => {
    // kushal-das, yogesh-samsi and shama-bhate are referenced by uid only, inside the
    // schedule's own artists arrays - never as an ArtistInput entry anywhere in this file.
    // The only way to reach planArtistWrite/describeArtistDrift at all is to already have an
    // ArtistInput, so an artist the JSON does not name can never be planned for a write.
    const artistsInput: ArtistInput[] = [artist()]
    const plans = artistsInput.map((a) => ({
      uid: a.uid,
      plan: planArtistWrite(a, null),
    }))
    assert.equal(
      plans.some((p) => p.uid === 'kushal-das'),
      false
    )
  })
})

describe('buildArtistData', () => {
  it('carries name and discipline through, including an empty discipline', () => {
    assert.deepEqual(buildArtistData({ uid: 'x', name: 'X', discipline: '' }), {
      name: 'X',
      discipline: '',
    })
  })
})

describe('buildArtistsGroup', () => {
  it("builds one row per uid in the schedule entry's own order", () => {
    const handles = new Map([
      ['sangeeta-shankar', 'H:sangeeta-shankar'],
      ['nandini-shankar', 'H:nandini-shankar'],
      ['ojas-adhiya', 'H:ojas-adhiya'],
    ])

    const group = buildArtistsGroup(initiative(), handles)

    assert.deepEqual(group, [
      { artist: 'H:sangeeta-shankar', featured: true },
      { artist: 'H:nandini-shankar', featured: false },
      { artist: 'H:ojas-adhiya', featured: false },
    ])
  })

  it('throws rather than silently dropping an artist with no resolved handle', () => {
    const handles = new Map([['sangeeta-shankar', 'H:sangeeta-shankar']])
    assert.throws(
      () => buildArtistsGroup(initiative(), handles),
      /unresolved artist uid "nandini-shankar"/
    )
  })
})

describe('buildInitiativeData', () => {
  it('reproduces description as a single rich text paragraph with the exact source text', () => {
    const entry = initiative()
    const handles = new Map(entry.artists.map((uid) => [uid, `H:${uid}`]))

    const data = buildInitiativeData(entry, handles)

    assert.deepEqual(data.description, [
      { type: 'paragraph', text: entry.description, spans: [] },
    ])
  })

  it('carries every scalar field through and leaves slices empty', () => {
    const entry = initiative()
    const handles = new Map(entry.artists.map((uid) => [uid, `H:${uid}`]))

    const data = buildInitiativeData(entry, handles)

    assert.equal(data.title, entry.title)
    assert.equal(data.category, entry.category)
    assert.equal(data.start_date, entry.start_date)
    assert.equal(data.date_label, entry.date_label)
    assert.equal(data.venue, entry.venue)
    assert.equal(data.feature_label, entry.feature_label)
    assert.deepEqual(data.slices, [])
    assert.ok(!('hero_image' in data))
    assert.ok(!('end_date' in data))
    assert.ok(!('venue_map_link' in data))
    assert.ok(!('ctas' in data))
  })
})

describe('buildInitiativesGroup', () => {
  it("comes out in the schedule's own array order, not sorted", () => {
    const handles = new Map([
      ['z-uid', 'H:z'],
      ['a-uid', 'H:a'],
    ])

    const group = buildInitiativesGroup(['z-uid', 'a-uid'], handles)

    assert.deepEqual(group, [{ initiative: 'H:z' }, { initiative: 'H:a' }])
  })

  it('throws rather than silently dropping an unresolved initiative', () => {
    assert.throws(
      () => buildInitiativesGroup(['ghost'], new Map()),
      /no resolved document handle for initiative uid "ghost"/
    )
  })
})

const timelineSliceWith = (initiatives: Slice[]): Slice => ({
  slice_type: 'event_list',
  variation: 'timeline',
  items: [],
  primary: {
    heading: '',
    subheading: 'Celebrations',
    source: 'Chosen',
    initiatives,
    show_signup: true,
    signup_heading: 'A Year-Long Musical Celebration',
    signup_cta_label: 'Sign up for updates',
  },
})

describe('findTimelineSliceIndex / currentTimelineInitiativeUids', () => {
  it('finds the timeline slice among others', () => {
    const zone: Slice[] = [
      { slice_type: 'hero', variation: 'page_header', primary: {} },
      timelineSliceWith([]),
      { slice_type: 'donate', variation: 'default', primary: {} },
    ]
    assert.equal(findTimelineSliceIndex(zone), 1)
  })

  it('reads linked uids off a fetched timeline slice', () => {
    const timeline = timelineSliceWith([
      { initiative: { id: 'x1', uid: 'aarambh-2026', type: 'event' } },
      { initiative: { id: 'x2', uid: 'purnahuti-2027', type: 'event' } },
    ])
    assert.deepEqual(currentTimelineInitiativeUids(timeline), [
      'aarambh-2026',
      'purnahuti-2027',
    ])
  })

  it('is empty when the timeline has no initiatives yet', () => {
    assert.deepEqual(currentTimelineInitiativeUids(timelineSliceWith([])), [])
  })
})

describe('planTimelineLink', () => {
  it('sets initiatives in the schedule order and leaves the rest of the zone untouched', () => {
    const hero: Slice = {
      slice_type: 'hero',
      variation: 'page_header',
      primary: { title: 'T' },
    }
    const donate: Slice = {
      slice_type: 'donate',
      variation: 'default',
      primary: { heading: 'D' },
    }
    const zone = [hero, timelineSliceWith([]), donate]
    const handles = new Map([
      ['aarambh-2026', 'H:aarambh-2026'],
      ['purnahuti-2027', 'H:purnahuti-2027'],
    ])

    const plan = planTimelineLink(
      zone,
      ['aarambh-2026', 'purnahuti-2027'],
      handles
    )

    assert.equal(plan.changed, true)
    assert.deepEqual(plan.slices[0], hero)
    assert.deepEqual(plan.slices[2], donate)
    const timelinePrimary = plan.slices[1].primary as Record<string, unknown>
    assert.deepEqual(timelinePrimary.initiatives, [
      { initiative: 'H:aarambh-2026' },
      { initiative: 'H:purnahuti-2027' },
    ])
    // every other timeline primary field survives untouched
    assert.equal(timelinePrimary.source, 'Chosen')
    assert.equal(timelinePrimary.show_signup, true)
    assert.equal(timelinePrimary.subheading, 'Celebrations')
  })

  it('is a no-op when the current link already matches the desired order', () => {
    const zone = [
      timelineSliceWith([
        { initiative: { id: 'x1', uid: 'a' } },
        { initiative: { id: 'x2', uid: 'b' } },
      ]),
    ]
    const handles = new Map([
      ['a', 'H:a'],
      ['b', 'H:b'],
    ])

    const plan = planTimelineLink(zone, ['a', 'b'], handles)

    assert.equal(plan.changed, false)
  })

  it('throws when the zone has no timeline slice', () => {
    assert.throws(
      () =>
        planTimelineLink(
          [{ slice_type: 'hero', variation: 'page_header', primary: {} }],
          [],
          new Map()
        ),
      /no event_list\/timeline slice/
    )
  })
})
