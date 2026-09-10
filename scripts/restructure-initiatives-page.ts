#!/usr/bin/env node
/**
 * Rebuilds the slice zone of the `page` document with uid `initiatives` (Solo todo P4.5).
 *
 * The /initiatives index today carries, in order: a `hero` (`page_header`) slice, an
 * `event_list` `grid` slice for "Events" (category "Event", limit on), and a second
 * `event_list` `grid` slice for "Workshops" (category "Workshop", limit on) - the shape
 * `update-initiatives-page.ts` put in place. This script replaces the two grid slices with:
 *
 *   2. an `event_list` `timeline` slice, source "Upcoming", show_signup FALSE (the signup
 *      form belongs to /centenary, not this index), heading "Upcoming Initiatives";
 *   3. an `event_list` `default` (Tabs) slice, timeframe "Past", limit on, heading
 *      "Past Initiatives".
 *
 * The heading copy is a placeholder pending the user's real copy; say so in any report of a
 * run. Every other field on the document (meta_title, meta_description, uid, anything else)
 * is carried through byte-for-byte, and so is the hero slice itself: it is taken verbatim
 * from whatever is already on the document and never re-authored here, unlike
 * `update-initiatives-page.ts`, which writes its own hero copy.
 *
 * ===========================================================================================
 * HARD PREREQUISITE for a --commit run: the `event_list` slice's `timeline` variation and its
 * `timeframe` field (added to the `default` and `grid` variations) must be pushed to Prismic
 * with the Prismic CLI (`pnpm prismic:push`) first. The Migration API silently drops values
 * for fields, and whole variations, the live type does not know about rather than rejecting
 * the write - that is exactly how the privacy policy stranded a half-empty draft twice. As of
 * this writing the models are committed locally (ff752b7) but NOT pushed, because the Prismic
 * CLI login has expired. A --commit run before the push will "succeed" and silently write a
 * timeline slice with no source, no show_signup, and a tabs slice with no timeframe.
 *
 * This script cannot check the live custom type for the `timeline` variation itself: that
 * lives in the Custom Types API, which needs a separate Custom Types API token this script
 * has no access to (the content read/write token in PRISMIC_WRITE_TOKEN does not cover it).
 * So there is no cheap, reliable guard here - confirm the push in the Prismic dashboard
 * (Custom Types -> page's slices -> Event List should list Timeline) before running
 * --commit.
 * ===========================================================================================
 *
 *   node --experimental-strip-types scripts/restructure-initiatives-page.ts
 *       Dry run. Reads page/initiatives, prints the before/after of the slice zone, writes
 *       nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/restructure-initiatives-page.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the one page
 *       update through the Migration API, then reads it back.
 *
 * It is idempotent. A second run that finds the slice zone already in this shape writes
 * nothing and says so. It never publishes: the update lands in the repository's unpublished
 * migration release, for a human to review and publish in the Prismic dashboard. Because
 * /api/v2 does not expose an unpublished release as a ref, the read-back afterwards may still
 * show the old slices; that is reported as "not yet visible", not as a failure.
 */

import { pathToFileURL } from 'node:url'
import {
  createMigration,
  type Migration,
  type PrismicDocument,
} from '@prismicio/client'
import { runBackup } from './lib/backup.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { slice } from './lib/transform.ts'

// -----------------------------------------------------------------------------------------
// The transform (pure, covered by scripts/restructure-initiatives-page.test.ts)
// -----------------------------------------------------------------------------------------

export type Slice = Record<string, unknown> & {
  slice_type?: unknown
  variation?: unknown
  primary?: unknown
}

/** Placeholder copy pending the user's real headings; flagged in every report. */
export const UPCOMING_HEADING = 'Upcoming Initiatives'
export const PAST_HEADING = 'Past Initiatives'

const sliceType = (entry: Slice): string =>
  typeof entry.slice_type === 'string' ? entry.slice_type : ''

const sliceVariation = (entry: Slice): string =>
  typeof entry.variation === 'string' ? entry.variation : 'default'

const isHero = (entry: Slice): boolean =>
  sliceType(entry) === 'hero' && sliceVariation(entry) === 'page_header'

/** The `event_list` / `timeline` slice for the "Upcoming" section. */
export function upcomingTimelineSlice(): Slice {
  return slice(
    'event_list',
    {
      heading: UPCOMING_HEADING,
      subheading: '',
      source: 'Upcoming',
      initiatives: [],
      show_signup: false,
      signup_heading: '',
      signup_cta_label: '',
    },
    'timeline'
  )
}

/** The `event_list` / `default` (Tabs) slice for the "Past" archive. */
export function pastTabsSlice(): Slice {
  return slice(
    'event_list',
    {
      heading: PAST_HEADING,
      subheading: '',
      timeframe: 'Past',
      limit: true,
    },
    'default'
  )
}

/** Pulls the slice zone out of a fetched page document. */
export function currentPageSlices(pageData: Record<string, unknown>): Slice[] {
  return Array.isArray(pageData.slices) ? (pageData.slices as Slice[]) : []
}

/**
 * Canonical form for comparison: only the fields this script owns (slice_type, variation,
 * primary), with empty text values dropped so an absent key and an empty string compare
 * equal. The query API adds `id`, `items`, `version` and `slice_label` to every fetched
 * slice; those are ignored here, exactly as `update-initiatives-page.ts` does it.
 */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const inner = (value as Record<string, unknown>)[key]
      if (inner === '' || inner === null || inner === undefined) continue
      out[key] = canonicalValue(inner)
    }
    return out
  }
  return value
}

function canonicalSlices(slices: Slice[]): string {
  return JSON.stringify(
    slices.map((entry) => ({
      slice_type: sliceType(entry),
      variation: sliceVariation(entry),
      primary: canonicalValue(entry.primary ?? {}),
    }))
  )
}

export type SlicePlan = {
  slices: Slice[]
  changes: string[]
}

/**
 * Given the /initiatives page's current slice zone, returns the zone it should have and a
 * human-readable list of what changed. An empty `changes` array means it is already correct
 * and nothing should be written.
 *
 * Behaviour on an unexpected zone, both decided here since the brief only asked that this be
 * predictable:
 *
 * - No `hero`/`page_header` slice at all: throws. The hero is preserved byte-for-byte, never
 *   re-authored, so there is nothing safe to build the new zone from; guessing at hero copy
 *   here would be exactly the kind of re-authoring this script exists to avoid.
 * - More than one hero slice: the first is kept, the rest are dropped, and that is reported
 *   as a change.
 * - Any non-hero slice that is not already the two `event_list` slices this script owns
 *   (extra slices left over from a partial migration, or anything else): dropped and
 *   reported, exactly like the two grid slices from the live shape. The output zone is
 *   always exactly hero + timeline + tabs, in that order, never a superset.
 */
export function planInitiativesRestructure(current: Slice[]): SlicePlan {
  const heroSlices = current.filter(isHero)
  if (heroSlices.length === 0) {
    throw new Error(
      'No hero/page_header slice found in the current slice zone of page/initiatives. The ' +
        'hero must be preserved byte-for-byte, not re-authored, so this script has nothing ' +
        'safe to carry forward. Fix the document by hand in Prismic (or restore it from a ' +
        'backup) so a hero slice exists, then re-run.'
    )
  }
  const [hero, ...extraHeroes] = heroSlices
  const nonHero = current.filter((entry) => !isHero(entry))

  const timeline = upcomingTimelineSlice()
  const tabs = pastTabsSlice()
  const desired: Slice[] = [hero, timeline, tabs]

  if (canonicalSlices(current) === canonicalSlices(desired)) {
    return { slices: desired, changes: [] }
  }

  // Only the non-hero slices that are not already the timeline/tabs slices this script
  // owns are "dropped" - one already carrying the right shape is being kept as-is, not
  // rewritten, even though the overall zone still needs a write (a reordering, or a
  // change elsewhere in the zone).
  const desiredNonHeroCanon = new Set(
    [timeline, tabs].map((entry) => canonicalSlices([entry]))
  )
  const extraSlices = nonHero.filter(
    (entry) => !desiredNonHeroCanon.has(canonicalSlices([entry]))
  )

  const changes: string[] = [
    `rewrite slice zone: ${current.length} slice(s) -> ${desired.length} ` +
      '(hero preserved, event_list/timeline "Upcoming", event_list/default "Past")',
  ]
  if (extraHeroes.length > 0) {
    changes.push(
      `found ${heroSlices.length} hero/page_header slices; kept the first, dropped ` +
        `${extraHeroes.length} extra`
    )
  }
  if (extraSlices.length > 0) {
    changes.push(
      `dropped ${extraSlices.length} non-hero slice(s): ` +
        extraSlices
          .map((entry) => `${sliceType(entry)}/${sliceVariation(entry)}`)
          .join(', ')
    )
  }

  return { slices: desired, changes }
}

// -----------------------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------------------

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

function describeSlice(entry: Slice): string {
  const primary = (entry.primary ?? {}) as Record<string, unknown>
  const head = `${sliceType(entry)}/${sliceVariation(entry)}`

  if (sliceType(entry) === 'hero') {
    return `${head}  title=${JSON.stringify(String(primary.title ?? ''))}`
  }
  if (
    sliceType(entry) === 'event_list' &&
    sliceVariation(entry) === 'timeline'
  ) {
    return (
      `${head}  heading=${JSON.stringify(String(primary.heading ?? ''))}  ` +
      `source=${JSON.stringify(String(primary.source ?? ''))}  ` +
      `show_signup=${String(primary.show_signup)}`
    )
  }
  if (sliceType(entry) === 'event_list') {
    const bits = [
      `heading=${JSON.stringify(String(primary.heading ?? ''))}`,
      `timeframe=${JSON.stringify(String(primary.timeframe ?? ''))}`,
    ]
    if ('limit' in primary) bits.push(`limit=${String(primary.limit)}`)
    if ('category' in primary)
      bits.push(`category=${JSON.stringify(String(primary.category))}`)
    return `${head}  ${bits.join('  ')}`
  }
  return head
}

function printSlices(label: string, slices: Slice[]) {
  console.log(`  ${label}:`)
  if (slices.length === 0) {
    console.log('    (none)')
    return
  }
  for (const entry of slices) console.log(`    ${describeSlice(entry)}`)
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/restructure-initiatives-page.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  let page: PrismicDocument
  try {
    page = await client.getByUID('page', 'initiatives')
  } catch (error) {
    throw new Error(
      `Could not read the page document with uid "initiatives" (${describeError(error)}). It ` +
        'must exist and be published before its slice zone can be rebuilt.'
    )
  }

  const pageData = (page.data ?? {}) as Record<string, unknown>
  const before = currentPageSlices(pageData)
  const { slices: after, changes } = planInitiativesRestructure(before)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (page/initiatives ${page.id}, locale ${page.lang}).`
  )
  console.log('')
  console.log(
    '  Reminder: the timeline variation and the timeframe field must be pushed to Prismic ' +
      '(pnpm prismic:push) before this can safely --commit. See the file header.'
  )
  console.log('')
  printSlices('current', before)
  console.log('')
  printSlices('after', after)
  console.log('')

  if (changes.length === 0) {
    console.log('Slice zone is already correct. Nothing to do.')
    return
  }

  console.log('Changes:')
  for (const change of changes) console.log(`  ${change}`)
  console.log('')
  console.log(
    'Every other field on the document (meta_title, meta_description, uid) is left exactly ' +
      'as it is in Prismic. The heading copy above ("Upcoming Initiatives" / "Past ' +
      'Initiatives") is a placeholder for the user to confirm, not final copy.'
  )

  // The payload: the whole existing data object, with only slices replaced.
  const nextData: Record<string, unknown> = { ...pageData, slices: after }

  if (!commit) {
    console.log('')
    console.log('Nothing was written. Re-run with --commit to apply.')
    return
  }

  // --- commit ---------------------------------------------------------------------------
  console.log('')
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

  // Typed as the library's base Migration so the updateDocument cast below stays loose,
  // exactly as scripts/lib/plan.ts does it.
  const migration: Migration = createMigration()
  // The Migration API's PUT only carries title, uid, tags and data. `page` is repeatable, so
  // the uid belongs at the document root, never in data. Send the minimum and cast, exactly
  // as scripts/lib/plan.ts does.
  const update = {
    id: page.id,
    uid: 'initiatives',
    type: 'page',
    lang: page.lang,
    data: nextData,
  }
  migration.updateDocument(
    update as unknown as Parameters<Migration['updateDocument']>[0],
    'Initiatives'
  )

  console.log('Writing the page/initiatives update through the Migration API.')
  await asWriteClient(client).migrate(migration, {
    reporter: (event) => {
      if (event.type === 'documents:updated') {
        console.log(`  updated ${event.data.updated} document(s)`)
      }
    },
  })
  console.log('')
  console.log(
    'The update is in the repository migration release, unpublished. This script never ' +
      'publishes it. Review and publish it in the Prismic dashboard (Releases -> the ' +
      'migration release -> Publish).'
  )
  console.log('')

  // --- read back -----------------------------------------------------------------------
  console.log('Reading the page/initiatives document back.')
  const readBack = await client.getByUID('page', 'initiatives')
  const readSlices = currentPageSlices(
    (readBack.data ?? {}) as Record<string, unknown>
  )
  const matches = canonicalSlices(readSlices) === canonicalSlices(after)

  printSlices('read back', readSlices)
  console.log('')
  if (matches) {
    console.log(
      'Read-back matches the plan. The update is live on the master ref.'
    )
  } else {
    console.log(
      'Read-back still shows the old slices. That is expected if the update landed in the ' +
        'unpublished migration release: /api/v2 does not expose it as a ref, so this script ' +
        'cannot see it until a human publishes the release. It is neither confirmed written ' +
        'nor confirmed failed from here. Check the release in the Prismic dashboard.'
    )
  }
  console.log('')
  console.log(`Backup: ${backup.file}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
