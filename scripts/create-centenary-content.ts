#!/usr/bin/env node
/**
 * Creates the centenary artist and initiative documents, and links the initiatives into
 * page/centenary's timeline (Solo todo P6). Reads two hand-authored input files:
 *
 *   scripts/centenary-artists-new.json    a rename, plus 12 artist documents to create
 *   scripts/centenary-schedule.json       8 initiatives, in the /centenary timeline's order
 *
 * ONE SCRIPT, ONE MIGRATION, on purpose. Documents sitting in an unpublished Prismic
 * migration release are not exposed as a ref by /api/v2, so a second script could not look
 * the artists or initiatives up afterwards in order to link them. `migration.createDocument()`
 * (and `updateDocument()`) return a handle that other documents in the SAME migration can
 * reference directly - the same trick `create-privacy-policy.ts` uses to link its new page
 * into `settings.footer_links` (see the comment on `buildFooterLinkEntry` there). This script
 * chains four stages through one `Migration` object so the handles stay valid:
 *
 *   1. rename     - `centenary-artists-new.json`'s `rename` array retitles an EXISTING
 *                   artist document: `ashwini-bhide` becomes `ashwini-bhide-deshpande`, with
 *                   the corrected name. Runs BEFORE artist creation, since the schedule
 *                   references the new uid. This is an `updateDocument()`, not a create:
 *                   content relationships store document ids, not uids, so the one event
 *                   already linking her (if any existed) would keep its link regardless;
 *                   here it matters because the schedule's own artist arrays use the new uid
 *                   from the start. Every other field on that document is carried through
 *                   byte-for-byte, only `uid` (its own root field, never inside `data`) and
 *                   `name` change. Idempotent: if `ashwini-bhide-deshpande` already exists
 *                   and `ashwini-bhide` does not, the rename already happened; reuse it.
 *   2. artists    - create the 12 new artist documents (skip and reuse any that already
 *                   exist - none should, but a partial earlier run is exactly the failure
 *                   this guards against).
 *   3. initiatives - create, or REPAIR, the 8 event documents. Each entry's `artists` group
 *                    is built from the schedule's uid order, `featured` set from the
 *                    schedule's `featured` array, and its artist references resolved to a
 *                    stage 1 rename, a stage 2 creation, or an EXISTING artist document
 *                    (`kushal-das`, `yogesh-samsi` and `shama-bhate` are in neither file and
 *                    must already exist in Prismic). "Repair" is not hypothetical: see the
 *                    interruption note below.
 *   4. link        - update page/centenary's `event_list`/`timeline` slice, setting
 *                    `primary.initiatives` to one row per initiative in the schedule's order.
 *                    Every other field on that document, including the timeline slice's own
 *                    other primary fields, is carried through byte-for-byte.
 *
 * INTERRUPTION. The Migration API creates a document, THEN patches its content in a second
 * pass. An interrupted --commit run can land between those two passes, leaving a document
 * that exists (and may already be published) but carries only its custom type's model
 * defaults - empty text and date fields, a Select field showing its `default_value` rather
 * than the schedule's actual category. This script detects that and repairs it: stage 3
 * compares every EXISTING initiative's own fields (never fields it does not own) against the
 * schedule and issues an `updateDocument()` wherever they differ, using the exact same
 * payload a fresh `createDocument()` would have sent. A run must still not be interrupted -
 * this only makes the aftermath recoverable by re-running, not something to rely on.
 *
 * The page currently sits in the unpublished migration release `create-centenary-page.ts`'s
 * own --commit wrote, so it will likely NOT be readable through /api/v2 yet. When that is the
 * case this reconstructs the page's shape from `create-centenary-page.ts`'s own builder
 * functions (imported directly - "you wrote it; same IO shell, reuse it") rather than
 * guessing, and says so plainly in the output rather than pretending to have read it. The
 * fallback still needs the document's real id to address it with `updateDocument()`:
 * `CENTENARY_PAGE_ID` below is the id that --commit run produced, named in this task's brief.
 * Once the page becomes readable (after that release, or a later one, is published) this
 * script prefers the real read every time.
 *
 * VALIDATION, run before anything is written, so the script is safe to re-run after the JSON
 * is hand-edited:
 *   - no duplicate initiative uid within the schedule
 *   - every `featured` uid is present in that same entry's `artists` (the guard against
 *     featuring someone who is not on the event) - ABORTS naming both if not
 *   - every `start_date` matches ^\d{4}-\d{2}-\d{2}$
 *   - every `category` is one of the options `customtypes/event/index.json` declares
 *   - each rename's `from_uid` and `to_uid` are not BOTH already in Prismic (ambiguous:
 *     which one is current?) and not BOTH missing (nothing to rename) - ABORTS either way
 *   - every artist uid referenced anywhere in the schedule resolves to a rename, a new
 *     artist, or an existing document - ABORTS naming the uid (and which initiative needed
 *     it) if not
 *
 * A schedule uid that already exists in Prismic is NOT a validation failure: it is planned
 * as an update (or, if it already matches, a no-op) rather than a create. See INTERRUPTION
 * above. A partial set - some of the 8 already there, some not - creates and repairs side by
 * side in the same run; there is nothing ambiguous left to refuse once each entry is judged
 * on its own, since `getByUID('event', uid)` is already scoped to the `event` type and so
 * cannot collide with a document of a different type.
 *
 * Dry run is the DEFAULT and writes nothing. It still performs real, read-only lookups
 * against Prismic (existing artists, existing initiatives, page/home for the reconstruction
 * fallback, page/centenary itself) so the printed plan reflects the real repository, exactly
 * like `create-centenary-page.ts`'s dry run does.
 *
 *   node --experimental-strip-types scripts/create-centenary-content.ts
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/create-centenary-content.ts --commit
 *       Backs up the whole repository first (aborts if that fails), then writes all four
 *       stages through one migration.
 *
 * It is idempotent as far as it can be: a re-run does not duplicate any document, and if the
 * rename, every artist, every initiative, and the timeline link are already in place, it says
 * so and writes nothing at all (no backup either - there is nothing to back up for).
 *
 * It NEVER publishes. The writes land in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards may still show the old state; that is
 * reported as "not yet visible", not as a failure.
 */

import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import {
  createMigration,
  type Migration,
  type PrismicDocument,
  type PrismicMigrationDocument,
} from '@prismicio/client'
import { runBackup } from './lib/backup.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { paragraph } from './lib/transform.ts'
import {
  buildPageFields,
  heroSlice,
  planDonateSlice,
  timelineSlice,
  type Slice,
} from './create-centenary-page.ts'

// -----------------------------------------------------------------------------------------
// Input file shapes and loading (IO, not covered by unit tests)
// -----------------------------------------------------------------------------------------

export type ArtistInput = { uid: string; name: string; discipline: string }
export type ArtistRename = { from_uid: string; to_uid: string; name: string }
export type InitiativeInput = {
  uid: string
  title: string
  category: string
  start_date: string
  date_label: string
  venue: string
  description: string
  feature_label: string
  artists: string[]
  featured: string[]
}

const ARTISTS_JSON_PATH = new URL(
  './centenary-artists-new.json',
  import.meta.url
)
const SCHEDULE_JSON_PATH = new URL('./centenary-schedule.json', import.meta.url)
const EVENT_TYPE_PATH = new URL(
  '../customtypes/event/index.json',
  import.meta.url
)

async function loadArtistsInput(): Promise<{
  artists: ArtistInput[]
  rename: ArtistRename[]
}> {
  const parsed = JSON.parse(await readFile(ARTISTS_JSON_PATH, 'utf8')) as {
    artists: ArtistInput[]
    rename?: ArtistRename[]
  }
  return { artists: parsed.artists, rename: parsed.rename ?? [] }
}

async function loadScheduleInput(): Promise<InitiativeInput[]> {
  const parsed = JSON.parse(await readFile(SCHEDULE_JSON_PATH, 'utf8')) as {
    initiatives: InitiativeInput[]
  }
  return parsed.initiatives
}

/** Reads the live-model category options straight off the custom type, not a hardcoded copy. */
async function loadEventCategoryOptions(): Promise<string[]> {
  const parsed = JSON.parse(await readFile(EVENT_TYPE_PATH, 'utf8')) as {
    json: { Main: { category: { config: { options: string[] } } } }
  }
  return parsed.json.Main.category.config.options
}

// -----------------------------------------------------------------------------------------
// Pure validation (covered by scripts/create-centenary-content.test.ts, no network)
// -----------------------------------------------------------------------------------------

const START_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * The schedule-only checks that need no knowledge of Prismic: duplicate uids, malformed
 * dates, unknown categories, and a `featured` uid that is not in its own `artists` array.
 * Returns every problem found, not just the first, so a single re-run surfaces the whole
 * list of edits still needed.
 */
export function validateSchedule(
  initiatives: InitiativeInput[],
  allowedCategories: readonly string[]
): string[] {
  const errors: string[] = []
  const seenUids = new Set<string>()

  for (const entry of initiatives) {
    if (seenUids.has(entry.uid)) {
      errors.push(`duplicate initiative uid "${entry.uid}"`)
    }
    seenUids.add(entry.uid)

    if (!START_DATE_PATTERN.test(entry.start_date)) {
      errors.push(
        `initiative "${entry.uid}" has start_date ${JSON.stringify(entry.start_date)}, ` +
          'which is not YYYY-MM-DD'
      )
    }

    if (!allowedCategories.includes(entry.category)) {
      errors.push(
        `initiative "${entry.uid}" has category ${JSON.stringify(entry.category)}, which ` +
          `is not one of: ${allowedCategories.join(', ')}`
      )
    }

    for (const featuredUid of entry.featured) {
      if (!entry.artists.includes(featuredUid)) {
        errors.push(
          `initiative "${entry.uid}" features "${featuredUid}", who is not in its own ` +
            'artists array'
        )
      }
    }
  }

  return errors
}

export type RenamePlan<T> =
  | { action: 'rename'; rename: ArtistRename; fromHandle: T }
  | { action: 'already-renamed'; rename: ArtistRename; toHandle: T }

/**
 * Decides what to do about one rename entry, given whatever `getByUID` found (or didn't) for
 * its `from_uid` and `to_uid`. Both absent means there is nothing to rename FROM - aborts,
 * naming the rename so a human can untangle it, since guessing would risk renaming the wrong
 * document or duplicating a name.
 *
 * Both present is NOT automatically ambiguous: Prismic keeps a document's old uid resolvable
 * after its uid changes, so `from_uid` and `to_uid` can both resolve to the very same
 * document once the rename has already gone through - that is success, reported the same way
 * as `to_uid` alone resolving. Only two DIFFERENT documents (different ids) under the two
 * uids is the genuinely ambiguous case this aborts on.
 */
export function planArtistRename<T extends { id: string }>(
  rename: ArtistRename,
  fromHandle: T | null,
  toHandle: T | null
): RenamePlan<T> {
  if (fromHandle && toHandle) {
    if (fromHandle.id !== toHandle.id) {
      throw new Error(
        `Cannot rename artist "${rename.from_uid}" to "${rename.to_uid}": both uids resolve ` +
          'to different documents already in Prismic. Resolve by hand (merge or delete one) ' +
          'before re-running.'
      )
    }
    // Same document under both uids: the rename already happened, and Prismic is still
    // honouring the old uid.
    return { action: 'already-renamed', rename, toHandle }
  }
  if (toHandle) {
    return { action: 'already-renamed', rename, toHandle }
  }
  if (!fromHandle) {
    throw new Error(
      `Cannot rename artist "${rename.from_uid}" to "${rename.to_uid}": neither uid exists ` +
        'in Prismic.'
    )
  }
  return { action: 'rename', rename, fromHandle }
}

/** Every artist uid referenced anywhere in the schedule, in first-appearance order. */
export function allReferencedArtistUids(
  initiatives: InitiativeInput[]
): string[] {
  const seen = new Set<string>()
  for (const entry of initiatives) {
    for (const uid of entry.artists) seen.add(uid)
  }
  return [...seen]
}

/**
 * Resolves every required artist uid to a handle: a stage 1 creation, or an existing
 * document (a reused new-artist uid, or a schedule-only uid like `ashwini-bhide` that was
 * never meant to be created). Anything left over is reported as missing rather than
 * silently dropped from a line-up.
 */
export function resolveArtistHandles<T>(
  requiredUids: string[],
  created: Map<string, T>,
  existing: Map<string, T>
): { handles: Map<string, T>; missing: string[] } {
  const handles = new Map<string, T>()
  const missing: string[] = []
  for (const uid of requiredUids) {
    const handle = created.get(uid) ?? existing.get(uid)
    if (handle) handles.set(uid, handle)
    else missing.push(uid)
  }
  return { handles, missing }
}

/** Every initiative uid whose referenced artists did not all resolve, and which uid failed. */
export function unresolvedArtistReferences(
  initiatives: InitiativeInput[],
  missing: string[]
): string[] {
  if (missing.length === 0) return []
  const missingSet = new Set(missing)
  const messages: string[] = []
  for (const entry of initiatives) {
    const bad = entry.artists.filter((uid) => missingSet.has(uid))
    for (const uid of bad) {
      messages.push(
        `initiative "${entry.uid}" references unknown artist uid "${uid}"`
      )
    }
  }
  return messages
}

/** Plain text out of a rich text array: joins each node's own `text`, ignoring formatting. */
function richTextPlainText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((node) =>
      node &&
      typeof node === 'object' &&
      typeof (node as Record<string, unknown>).text === 'string'
        ? ((node as Record<string, unknown>).text as string)
        : ''
    )
    .join('\n')
}

/** uid + featured pairs off a fetched `artists` group, in the order Prismic returned them. */
function currentArtistsSignature(
  value: unknown
): Array<{ uid: string; featured: boolean }> {
  const rows = Array.isArray(value) ? value : []
  return rows.map((row) => {
    const entry = (row ?? {}) as Record<string, unknown>
    const artist = (entry.artist ?? {}) as Record<string, unknown>
    return {
      uid: typeof artist.uid === 'string' ? artist.uid : '',
      featured: entry.featured === true,
    }
  })
}

const textField = (value: unknown): string =>
  typeof value === 'string' ? value : ''

/**
 * Names the fields this script owns that differ between a fetched `event` document's data and
 * the schedule entry it should match: title, category, start_date, date_label, venue,
 * description text, feature_label, and the artists group (uid order plus each row's featured
 * flag). Nothing else is inspected - fields the script does not own (hero_image, end_date,
 * venue_map_link, ctas, slices) are never compared, so a change an editor made there is never
 * reported as drift. `null` and an empty string compare equal, since an untouched Text/Date
 * field reads back as `null`, not the empty string a blank schedule value (like `venue: ''`)
 * carries.
 */
export function describeInitiativeDrift(
  current: Record<string, unknown>,
  entry: InitiativeInput
): string[] {
  const diffs: string[] = []

  if (textField(current.title) !== entry.title) diffs.push('title')
  if (textField(current.category) !== entry.category) diffs.push('category')
  if (textField(current.start_date) !== entry.start_date)
    diffs.push('start_date')
  if (textField(current.date_label) !== entry.date_label)
    diffs.push('date_label')
  if (textField(current.venue) !== entry.venue) diffs.push('venue')
  if (richTextPlainText(current.description) !== entry.description) {
    diffs.push('description')
  }
  if (textField(current.feature_label) !== entry.feature_label) {
    diffs.push('feature_label')
  }

  const desiredArtists = entry.artists.map((uid) => ({
    uid,
    featured: entry.featured.includes(uid),
  }))
  if (
    JSON.stringify(currentArtistsSignature(current.artists)) !==
    JSON.stringify(desiredArtists)
  ) {
    diffs.push('artists')
  }

  return diffs
}

export type InitiativeWritePlan =
  | { action: 'create' }
  | { action: 'update'; diffs: string[] }
  | { action: 'unchanged' }

/**
 * Decides whether one schedule entry needs creating, updating, or is already correct.
 * "Updating" covers two cases that look identical from here: the interrupted-migration
 * repair (the document exists but was never patched past the Migration API's create pass,
 * so it carries only model defaults) and an ordinary drift from a later schedule edit. Either
 * way the fix is the same: write `buildInitiativeData(entry, ...)` over it.
 */
export function planInitiativeWrite(
  entry: InitiativeInput,
  existingData: Record<string, unknown> | null
): InitiativeWritePlan {
  if (!existingData) return { action: 'create' }
  const diffs = describeInitiativeDrift(existingData, entry)
  return diffs.length === 0
    ? { action: 'unchanged' }
    : { action: 'update', diffs }
}

// -----------------------------------------------------------------------------------------
// Pure builders (covered by scripts/create-centenary-content.test.ts, no network)
// -----------------------------------------------------------------------------------------

/** The `artist` document's data payload. Everything not given is left for Prismic later. */
export function buildArtistData(artist: ArtistInput): Record<string, unknown> {
  return { name: artist.name, discipline: artist.discipline }
}

/**
 * One `event.artists` group, in the schedule entry's own uid order, `featured` true only for
 * uids in that entry's `featured` array. Generic over the handle type so it is testable with
 * plain uid strings and, at commit time, usable with real Prismic document handles.
 */
export function buildArtistsGroup<T>(
  entry: InitiativeInput,
  handles: Map<string, T>
): Array<{ artist: T; featured: boolean }> {
  const featured = new Set(entry.featured)
  return entry.artists.map((uid) => {
    const artist = handles.get(uid)
    if (artist === undefined) {
      throw new Error(
        `initiative "${entry.uid}" references unresolved artist uid "${uid}"`
      )
    }
    return { artist, featured: featured.has(uid) }
  })
}

/**
 * The `event` document's data payload. `description` is reproduced verbatim as a single rich
 * text paragraph - it is the user's own copy, not re-punctuated. `hero_image`, `end_date`,
 * `venue_map_link` and `ctas` are left out of the payload entirely, the same way an
 * omitted field is left empty elsewhere in these scripts.
 */
export function buildInitiativeData<T>(
  entry: InitiativeInput,
  handles: Map<string, T>
): Record<string, unknown> {
  return {
    title: entry.title,
    category: entry.category,
    start_date: entry.start_date,
    date_label: entry.date_label,
    venue: entry.venue,
    description: [paragraph(entry.description)],
    feature_label: entry.feature_label,
    artists: buildArtistsGroup(entry, handles),
    slices: [],
  }
}

/** One `timeline.initiatives` group row per schedule entry, in the schedule's own order. */
export function buildInitiativesGroup<T>(
  scheduleUids: string[],
  handles: Map<string, T>
): Array<{ initiative: T }> {
  return scheduleUids.map((uid) => {
    const initiative = handles.get(uid)
    if (initiative === undefined) {
      throw new Error(`no resolved document handle for initiative uid "${uid}"`)
    }
    return { initiative }
  })
}

const sliceType = (entry: Slice): string =>
  typeof entry.slice_type === 'string' ? entry.slice_type : ''
const sliceVariation = (entry: Slice): string =>
  typeof entry.variation === 'string' ? entry.variation : 'default'

/** Finds the event_list/timeline slice's index in a slice zone, or -1. */
export function findTimelineSliceIndex(slices: Slice[]): number {
  return slices.findIndex(
    (entry) =>
      sliceType(entry) === 'event_list' && sliceVariation(entry) === 'timeline'
  )
}

/**
 * Reads the uids of whatever is currently linked in a timeline slice's `initiatives` group.
 * A content relationship the query API returns carries the linked document's own `uid`
 * directly (it is part of the reference itself, not something `fetchLinks` is needed for),
 * so this works against a real fetched page without any extra query options.
 */
export function currentTimelineInitiativeUids(timeline: Slice): string[] {
  const primary = (timeline.primary ?? {}) as Record<string, unknown>
  const rows = Array.isArray(primary.initiatives)
    ? (primary.initiatives as Array<Record<string, unknown>>)
    : []
  return rows
    .map((row) => {
      const initiative = row.initiative as Record<string, unknown> | undefined
      return typeof initiative?.uid === 'string' ? initiative.uid : null
    })
    .filter((uid): uid is string => uid !== null)
}

export type TimelineLinkPlan = {
  slices: Slice[]
  changed: boolean
  currentUids: string[]
  desiredUids: string[]
}

/**
 * Replaces only `primary.initiatives` on the zone's timeline slice, leaving the hero slice,
 * the donate slice, and every other primary field on the timeline itself untouched. Throws
 * if the zone has no timeline slice at all - there is nothing safe to link into.
 */
export function planTimelineLink<T>(
  currentSlices: Slice[],
  scheduleUids: string[],
  handles: Map<string, T>
): TimelineLinkPlan {
  const idx = findTimelineSliceIndex(currentSlices)
  if (idx === -1) {
    throw new Error(
      'page/centenary has no event_list/timeline slice to link initiatives into.'
    )
  }

  const timeline = currentSlices[idx]
  const primary = (timeline.primary ?? {}) as Record<string, unknown>
  const currentUids = currentTimelineInitiativeUids(timeline)
  const nextInitiatives = buildInitiativesGroup(scheduleUids, handles)

  const changed = JSON.stringify(currentUids) !== JSON.stringify(scheduleUids)

  const nextSlices = currentSlices.map((entry, i) =>
    i === idx
      ? { ...timeline, primary: { ...primary, initiatives: nextInitiatives } }
      : entry
  )

  return { slices: nextSlices, changed, currentUids, desiredUids: scheduleUids }
}

// -----------------------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------------------

/**
 * The id `create-centenary-page.ts`'s own --commit run produced for page/centenary, named in
 * this task's brief. Used ONLY as a fallback for `updateDocument()` when the page is not yet
 * readable through `getByUID` (still sitting in that run's unpublished migration release).
 * A real read, whenever one succeeds, always wins over this constant.
 */
export const CENTENARY_PAGE_ID = 'aqKrnxEAAC0AfM7d'

function parseArgs(argv: string[]) {
  const known = ['--commit']
  const unknown = argv.filter((arg) => !known.includes(arg))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. ` +
        `Supported: --commit`
    )
  }
  return { commit: argv.includes('--commit') }
}

type Handle = PrismicDocument | PrismicMigrationDocument<PrismicDocument>

function summariseInitiative(
  entry: InitiativeInput,
  totalArtists: number,
  featuredCount: number
): string {
  const venue = entry.venue || '(no venue given)'
  return (
    `${entry.uid}: "${entry.title}" | ${entry.date_label} | ${entry.category} | ${venue} | ` +
    `${totalArtists} artist(s), ${featuredCount} featured`
  )
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/create-centenary-content.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  const [
    { artists: artistsInput, rename: renamesInput },
    scheduleInput,
    categoryOptions,
  ] = await Promise.all([
    loadArtistsInput(),
    loadScheduleInput(),
    loadEventCategoryOptions(),
  ])

  // --- pure validation, no IO -------------------------------------------------------------
  const scheduleErrors = validateSchedule(scheduleInput, categoryOptions)
  if (scheduleErrors.length > 0) {
    throw new Error(
      `Schedule validation failed:\n${scheduleErrors.map((e) => `  - ${e}`).join('\n')}`
    )
  }

  // --- stage 1: rename, real reads + pure decision ----------------------------------------
  // Typed as PrismicDocument, not the broader Handle union: a rename only ever deals with
  // documents read back from Prismic, never a pending migration.createDocument() handle.
  const renameChecks = await Promise.all(
    renamesInput.map(async (rename) => {
      const [fromDoc, toDoc] = await Promise.all([
        client.getByUID('artist', rename.from_uid).catch(() => null),
        client.getByUID('artist', rename.to_uid).catch(() => null),
      ])
      return {
        rename,
        plan: planArtistRename<PrismicDocument>(rename, fromDoc, toDoc),
      }
    })
  )

  // --- existing state, real reads -------------------------------------------------------
  const newArtistUids = new Set(artistsInput.map((a) => a.uid))
  const referencedUids = allReferencedArtistUids(scheduleInput)
  const renameTargetUids = new Set(renamesInput.map((r) => r.to_uid))
  const allRequiredArtistUids = [
    ...new Set([...newArtistUids, ...referencedUids]),
  ]
  // The rename targets are already resolved above (fromDoc/toDoc); no need to fetch them again.
  const existingFetchUids = allRequiredArtistUids.filter(
    (uid) => !renameTargetUids.has(uid)
  )

  const existingArtistEntries = await Promise.all(
    existingFetchUids.map(async (uid) => {
      const doc = await client.getByUID('artist', uid).catch(() => null)
      return [uid, doc] as const
    })
  )
  const existingArtists = new Map<string, Handle>(
    // These come from getByUID, so they are always real fetched documents, never a
    // migration handle - narrow to PrismicDocument, not the wider Handle union, or the
    // predicate isn't a narrowing at all and TS rejects it.
    existingArtistEntries.filter(
      (entry): entry is readonly [string, PrismicDocument] => entry[1] !== null
    )
  )

  const scheduleUids = scheduleInput.map((e) => e.uid)
  const existingInitiativeEntries = await Promise.all(
    scheduleUids.map(async (uid) => {
      const doc = await client.getByUID('event', uid).catch(() => null)
      return [uid, doc] as const
    })
  )
  // Typed as PrismicDocument, not Handle: these come from getByUID, and stage 3 below reads
  // .id/.lang/.data off them directly to build an updateDocument() call when repairing one.
  const existingInitiatives = new Map<string, PrismicDocument>(
    existingInitiativeEntries.filter(
      (entry): entry is readonly [string, PrismicDocument] => entry[1] !== null
    )
  )

  // A partial set (some of the 8 already exist, some do not) is an expected state to
  // REPAIR, not a reason to refuse: `planInitiativeWrite` below decides create/update/
  // unchanged per entry, so a create and an update can sit side by side in the same run.
  // Nothing here refuses on a uid collision, because `getByUID('event', uid)` is already
  // scoped to the `event` type - it cannot return a document of a different type, so there
  // is no "exists as something else" ambiguity left to detect from this fetch.
  const initiativePlans = scheduleInput.map((entry) => {
    const existingDoc = existingInitiatives.get(entry.uid)
    const existingData = existingDoc
      ? ((existingDoc.data ?? {}) as Record<string, unknown>)
      : null
    return { entry, plan: planInitiativeWrite(entry, existingData) }
  })

  // --- artist resolution, using boolean markers as placeholder "handles" for the dry-run
  // plan (only presence in the map matters here; real handles are built at commit time) -----
  const placeholderCreated = new Map<string, true>([
    ...artistsInput
      .filter((a) => !existingArtists.has(a.uid))
      .map((a): [string, true] => [a.uid, true]),
    ...renameChecks
      .filter(({ plan }) => plan.action === 'rename')
      .map(({ rename }): [string, true] => [rename.to_uid, true]),
  ])
  const placeholderExisting = new Map<string, true>([
    ...[...existingArtists.keys()].map((uid): [string, true] => [uid, true]),
    ...renameChecks
      .filter(({ plan }) => plan.action === 'already-renamed')
      .map(({ rename }): [string, true] => [rename.to_uid, true]),
  ])
  const { missing } = resolveArtistHandles(
    allRequiredArtistUids,
    placeholderCreated,
    placeholderExisting
  )
  if (missing.length > 0) {
    const detail = unresolvedArtistReferences(scheduleInput, missing)
    throw new Error(
      `Some artist uids referenced by the schedule do not exist in Prismic and are not in ` +
        `centenary-artists-new.json or its rename array: ${missing.join(', ')}\n` +
        detail.map((line) => `  - ${line}`).join('\n')
    )
  }

  // --- page/centenary and page/home, real reads ------------------------------------------
  const centenaryDoc = await client
    .getByUID('page', 'centenary')
    .catch(() => null)
  const remoteHome = await client.getByUID('page', 'home').catch(() => null)

  let baseSlices: Slice[]
  let baseFields: Record<string, unknown>
  let pageId: string
  let pageLang: string
  let reconstructed = false

  if (centenaryDoc) {
    const data = (centenaryDoc.data ?? {}) as Record<string, unknown>
    baseSlices = Array.isArray(data.slices) ? (data.slices as Slice[]) : []
    baseFields = { ...data }
    delete (baseFields as Record<string, unknown>).slices
    pageId = centenaryDoc.id
    pageLang = centenaryDoc.lang
  } else {
    reconstructed = true
    const { slice: donate } = planDonateSlice(remoteHome)
    baseSlices = [heroSlice(), timelineSlice(), donate]
    baseFields = buildPageFields()
    pageId = CENTENARY_PAGE_ID
    pageLang = remoteHome?.lang ?? 'en-us'
  }

  const timelinePlanPreview = planTimelineLink(
    baseSlices,
    scheduleUids,
    new Map(scheduleUids.map((uid) => [uid, uid]))
  )

  const artistsToCreate = artistsInput.filter(
    (a) => !existingArtists.has(a.uid)
  )
  const artistsToReuse = artistsInput.filter((a) => existingArtists.has(a.uid))
  const extraExistingUids = allRequiredArtistUids.filter(
    (uid) => !newArtistUids.has(uid) && !renameTargetUids.has(uid)
  )
  const renamesToApply = renameChecks.filter(
    ({ plan }) => plan.action === 'rename'
  )
  const initiativeWorkNeeded = initiativePlans.some(
    ({ plan }) => plan.action !== 'unchanged'
  )

  const hasWork =
    renamesToApply.length > 0 ||
    artistsToCreate.length > 0 ||
    initiativeWorkNeeded ||
    timelinePlanPreview.changed

  // --- print the plan ----------------------------------------------------------------------
  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (locale ${pageLang}).`
  )
  console.log('')
  console.log('Stage 1: rename')
  if (renameChecks.length === 0) {
    console.log('  (none)')
  }
  for (const { rename, plan } of renameChecks) {
    console.log(
      plan.action === 'rename'
        ? `  rename  ${rename.from_uid} -> ${rename.to_uid}  name=${JSON.stringify(rename.name)}`
        : `  already renamed  ${rename.to_uid}  (${rename.from_uid} no longer exists; nothing to do)`
    )
  }
  console.log('')

  console.log('Stage 2: artists')
  for (const artist of artistsToCreate) {
    console.log(
      `  create  ${artist.uid}  ${JSON.stringify(artist.name)}  discipline=${JSON.stringify(artist.discipline)}`
    )
  }
  for (const artist of artistsToReuse) {
    console.log(`  reuse   ${artist.uid}  (already exists in Prismic)`)
  }
  for (const uid of extraExistingUids) {
    console.log(
      `  link to existing artist  ${uid}  (not in centenary-artists-new.json)`
    )
  }
  console.log('')

  console.log('Stage 3: initiatives')
  for (const { entry, plan } of initiativePlans) {
    if (plan.action === 'create') {
      console.log(
        `  create     ${summariseInitiative(entry, entry.artists.length, entry.featured.length)}`
      )
    } else if (plan.action === 'update') {
      console.log(
        `  update     ${entry.uid} (exists but ${plan.diffs.join(', ')} differ)`
      )
    } else {
      console.log(`  unchanged  ${entry.uid} (already matches the schedule)`)
    }
  }
  console.log('')

  console.log('Stage 4: link into page/centenary')
  console.log(
    reconstructed
      ? `  page/centenary (${pageId}) could not be read back (still sitting in an ` +
          'unpublished migration release, most likely). Reconstructing its expected shape ' +
          "from create-centenary-page.ts's own builder functions rather than pretending to " +
          'have read it.'
      : `  page/centenary (${pageId}) read successfully.`
  )
  console.log(
    `  current initiatives: ${timelinePlanPreview.currentUids.join(', ') || '(none)'}`
  )
  console.log(
    `  desired initiatives: ${timelinePlanPreview.desiredUids.join(', ')}`
  )
  console.log(
    timelinePlanPreview.changed
      ? '  would update primary.initiatives on the timeline slice.'
      : '  timeline already links exactly these initiatives, in this order. Nothing to do.'
  )
  console.log('')

  if (!hasWork) {
    console.log(
      'Every rename, every artist, every initiative, and the timeline link are already in ' +
        'place. Nothing was written.'
    )
    return
  }

  if (!commit) {
    console.log('Nothing was written. Re-run with --commit to apply.')
    return
  }

  // --- commit --------------------------------------------------------------------------
  console.log('Backing up the whole repository before writing anything.')
  let backup
  try {
    backup = await runBackup(client, repositoryName, (message) =>
      console.log(message)
    )
  } catch (error) {
    throw new Error(
      `Backup failed, so nothing was written: ${describeError(error)}`
    )
  }
  console.log(`Backed up ${backup.documentCount} documents to ${backup.file}`)
  console.log('')

  const migration: Migration = createMigration()
  const lang = pageLang

  // Stage 1: rename. Runs before artist creation so the schedule's uid references, which
  // already use the new uid, resolve correctly.
  const renamedHandles = new Map<string, Handle>()
  for (const { rename, plan } of renameChecks) {
    if (plan.action === 'already-renamed') {
      renamedHandles.set(rename.to_uid, plan.toHandle)
      continue
    }
    const fromDoc = plan.fromHandle
    const handle = migration.updateDocument(
      {
        id: fromDoc.id,
        uid: rename.to_uid,
        type: 'artist',
        lang: fromDoc.lang,
        data: {
          ...((fromDoc.data ?? {}) as Record<string, unknown>),
          name: rename.name,
        },
      } as unknown as Parameters<Migration['updateDocument']>[0],
      rename.name
    )
    renamedHandles.set(rename.to_uid, handle as unknown as Handle)
  }

  // Stage 2: artists. Real handles this time, keyed the same way as the preview above.
  const createdArtistHandles = new Map<string, Handle>()
  for (const artist of artistsToCreate) {
    const handle = migration.createDocument(
      {
        type: 'artist',
        uid: artist.uid,
        lang,
        data: buildArtistData(artist),
      } as unknown as Parameters<Migration['createDocument']>[0],
      artist.name
    )
    createdArtistHandles.set(artist.uid, handle as unknown as Handle)
  }
  const artistHandles = new Map<string, Handle>([
    ...existingArtists,
    ...renamedHandles,
    ...createdArtistHandles,
  ])

  // Stage 3: initiatives. An 'update' repairs a document the Migration API's create pass
  // left behind with only model defaults (or one an editor's later change drifted from the
  // schedule); both branches write the exact same `buildInitiativeData` payload, so a create
  // and a repair are byte-identical apart from which migration call carries them.
  const initiativeHandles = new Map<string, Handle>()
  for (const { entry, plan } of initiativePlans) {
    if (plan.action === 'unchanged') {
      initiativeHandles.set(entry.uid, existingInitiatives.get(entry.uid)!)
      continue
    }

    const data = buildInitiativeData(entry, artistHandles)
    if (plan.action === 'create') {
      const handle = migration.createDocument(
        {
          type: 'event',
          uid: entry.uid,
          lang,
          data,
        } as unknown as Parameters<Migration['createDocument']>[0],
        entry.title
      )
      initiativeHandles.set(entry.uid, handle as unknown as Handle)
    } else {
      const existingDoc = existingInitiatives.get(entry.uid)!
      const handle = migration.updateDocument(
        {
          id: existingDoc.id,
          uid: entry.uid,
          type: 'event',
          lang: existingDoc.lang,
          data,
        } as unknown as Parameters<Migration['updateDocument']>[0],
        entry.title
      )
      initiativeHandles.set(entry.uid, handle as unknown as Handle)
    }
  }

  // Stage 4: link into page/centenary.
  if (timelinePlanPreview.changed) {
    const timelinePlan = planTimelineLink(
      baseSlices,
      scheduleUids,
      initiativeHandles
    )
    migration.updateDocument(
      {
        id: pageId,
        uid: 'centenary',
        type: 'page',
        lang,
        data: { ...baseFields, slices: timelinePlan.slices },
      } as unknown as Parameters<Migration['updateDocument']>[0],
      'Centenary'
    )
  }

  console.log(
    'Writing artists, initiatives and the page/centenary link through the Migration API.'
  )
  await asWriteClient(client).migrate(migration, {
    reporter: (event) => {
      if (event.type === 'documents:created') {
        console.log(`  created ${event.data.created} document(s)`)
      }
      if (event.type === 'documents:updated') {
        console.log(`  updated ${event.data.updated} document(s)`)
      }
    },
  })
  console.log('')
  console.log(
    'The writes are in the repository migration release, unpublished. This script never ' +
      'publishes them. Review and publish in the Prismic dashboard (Releases -> the ' +
      "migration release -> Publish). page/centenary's timeline will only render these " +
      'initiatives once that release is published.'
  )
  console.log('')
  console.log(`Backup: ${backup.file}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
