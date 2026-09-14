#!/usr/bin/env node
/**
 * Swaps the home page's `event_list` slice from the "Past" default/Tabs archive to the
 * `timeline` variation, so the home page shows what is coming rather than what has happened.
 *
 * FROM, live today: `event_list` / `default` (Tabs), heading "Engaging Through More than 2
 * Decades of Keeping Tradition Alive", subheading "Our Initiatives", no timeframe, no limit.
 *
 * TO: `event_list` / `timeline`, source "Upcoming" (resolves upcoming initiatives by date,
 * no hand-picked list), `max_items: 2`, `more_label: "Show more initiatives"`, `more_link`
 * pointing at `page/initiatives`, `show_signup: false` (the signup form belongs on
 * /centenary, not here).
 *
 * The heading and subheading are carried across from the existing slice byte for byte, never
 * re-authored here: they are the user's copy. They read as retrospective, written for an
 * archive section; now that this section shows what is coming, the user may want to revisit
 * them. Every dry run prints them and says so.
 *
 * Every other slice on the home page (hero, sponsors, about, donate, contact) is carried
 * through byte for byte, in the same position. Only the one `event_list` slice changes, and
 * it stays at the same index in the zone. Every non-slice field on the document is untouched.
 *
 * ===========================================================================================
 * PREREQUISITE, satisfied in this session: `max_items`, `more_label` and `more_link` on the
 * `event_list` slice's `timeline` variation must be pushed to Prismic (`pnpm prismic:push`)
 * before a --commit run. The Migration API silently drops values for fields the live type
 * does not know about rather than rejecting the write - a --commit run before the push would
 * "succeed" and write a timeline slice missing exactly the three fields that make this work.
 * ===========================================================================================
 *
 * RESOLVING more_link: this script looks up `page/initiatives` and uses its real id to build
 * the content relationship. If that document cannot be found, it ABORTS naming the uid rather
 * than writing a link that resolves to nothing - an unresolved relationship renders an empty
 * href, which is a silent failure.
 *
 *   node --experimental-strip-types scripts/swap-home-initiatives.ts
 *       Dry run. Reads page/home and page/initiatives, prints the before/after of the slice
 *       zone, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/swap-home-initiatives.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the one page
 *       update through the Migration API, then reads it back.
 *
 * It is idempotent. A second run that finds the slice already in the target shape writes
 * nothing and says so. It never publishes: the update lands in the repository's unpublished
 * migration release, for a human to review and publish in the Prismic dashboard. Because
 * /api/v2 does not expose an unpublished release as a ref, the read-back afterwards may still
 * show the old slice; that is reported as "not yet visible", not as a failure.
 *
 * If page/home has no `event_list` slice, or more than one, this does not guess: it reports
 * what was found and aborts.
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
// The transform (pure, covered by scripts/swap-home-initiatives.test.ts)
// -----------------------------------------------------------------------------------------

export type Slice = Record<string, unknown> & {
  slice_type?: unknown
  variation?: unknown
  primary?: unknown
}

/** A real document, or anything else carrying the same `id`/`uid` identity. */
export type LinkTarget = Record<string, unknown> & {
  id?: unknown
  uid?: unknown
}

const sliceType = (entry: Slice): string =>
  typeof entry.slice_type === 'string' ? entry.slice_type : ''

const sliceVariation = (entry: Slice): string =>
  typeof entry.variation === 'string' ? entry.variation : 'default'

const isEventList = (entry: Slice): boolean => sliceType(entry) === 'event_list'

/** A Prismic content-relationship (Link, select: document) field pointing at `document`. */
export function documentLink(document: LinkTarget) {
  return { link_type: 'Document' as const, id: document }
}

/** The `event_list` / `timeline` slice this script swaps the home page's archive slice for. */
export function eventListTimelineSlice(
  heading: string,
  subheading: string,
  moreLink: LinkTarget
): Slice {
  return slice(
    'event_list',
    {
      heading,
      subheading,
      source: 'Upcoming',
      initiatives: [],
      max_items: 2,
      more_label: 'Show more initiatives',
      more_link: documentLink(moreLink),
      show_signup: false,
      signup_heading: '',
      signup_cta_label: '',
      signup_event_type: '$opt.in',
    },
    'timeline'
  )
}

/** Pulls the slice zone out of a fetched page document. */
export function currentPageSlices(pageData: Record<string, unknown>): Slice[] {
  return Array.isArray(pageData.slices) ? (pageData.slices as Slice[]) : []
}

/**
 * The stable identity of a Document link field, for canonical comparison. Handles both this
 * script's own pre-write shape (`id` holding the whole target document, with a `.uid`) and
 * the flat shape the query API returns once a document link round-trips (`uid` alongside a
 * string `id`).
 */
function linkUidOf(value: Record<string, unknown>): string | null {
  if (typeof value.uid === 'string') return value.uid
  if (value.id && typeof value.id === 'object') {
    const inner = value.id as Record<string, unknown>
    if (typeof inner.uid === 'string') return inner.uid
  }
  return null
}

/**
 * Canonical form for comparison: only the fields this script owns (slice_type, variation,
 * primary), with empty text values dropped so an absent key and an empty string compare
 * equal, and a Document link field reduced to the uid it points at so a freshly built link
 * (carrying the whole target document) compares equal to the flat shape the query API
 * returns once it round-trips. The query API also adds `id`, `items`, `version` and
 * `slice_label` to every fetched slice; those are ignored here, exactly as
 * `restructure-initiatives-page.ts` does it.
 */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.link_type === 'Document') {
      return { link_type: 'Document', uid: linkUidOf(record) }
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      const inner = record[key]
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

export type SwapPlan = {
  slices: Slice[]
  changes: string[]
  heading: string
  subheading: string
}

/**
 * Given the home page's current slice zone and the resolved `page/initiatives` link target,
 * returns the zone it should have. An empty `changes` array means it is already correct and
 * nothing should be written.
 *
 * Throws when the zone does not carry exactly one `event_list` slice - there is nothing safe
 * to swap, so this reports what was found and aborts rather than guessing.
 */
export function planSwap(current: Slice[], moreLink: LinkTarget): SwapPlan {
  const eventListSlices = current.filter(isEventList)
  if (eventListSlices.length !== 1) {
    throw new Error(
      'Expected exactly one event_list slice in the slice zone of page/home, found ' +
        `${eventListSlices.length}. Aborting rather than guessing which one to swap.`
    )
  }

  const index = current.findIndex(isEventList)
  const existing = eventListSlices[0]
  const primary = (existing.primary ?? {}) as Record<string, unknown>
  const heading = typeof primary.heading === 'string' ? primary.heading : ''
  const subheading =
    typeof primary.subheading === 'string' ? primary.subheading : ''

  const desiredSlice = eventListTimelineSlice(heading, subheading, moreLink)
  const desired = current.map((entry, i) =>
    i === index ? desiredSlice : entry
  )

  if (canonicalSlices(current) === canonicalSlices(desired)) {
    return { slices: current, changes: [], heading, subheading }
  }

  return {
    slices: desired,
    changes: [
      `event_list slice at index ${index}: ${sliceType(existing)}/` +
        `${sliceVariation(existing)} -> event_list/timeline (source Upcoming, max_items 2, ` +
        'more_link -> page/initiatives, show_signup false)',
    ],
    heading,
    subheading,
  }
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

  if (
    sliceType(entry) === 'event_list' &&
    sliceVariation(entry) === 'timeline'
  ) {
    const moreLink = primary.more_link as Record<string, unknown> | undefined
    return (
      `${head}  heading=${JSON.stringify(String(primary.heading ?? ''))}  ` +
      `subheading=${JSON.stringify(String(primary.subheading ?? ''))}  ` +
      `source=${JSON.stringify(String(primary.source ?? ''))}  ` +
      `max_items=${String(primary.max_items)}  ` +
      `more_label=${JSON.stringify(String(primary.more_label ?? ''))}  ` +
      `more_link=${moreLink ? (linkUidOf(moreLink) ?? '(unresolved)') : '(none)'}  ` +
      `show_signup=${String(primary.show_signup)}`
    )
  }
  if (sliceType(entry) === 'event_list') {
    return (
      `${head}  heading=${JSON.stringify(String(primary.heading ?? ''))}  ` +
      `subheading=${JSON.stringify(String(primary.subheading ?? ''))}  ` +
      `timeframe=${JSON.stringify(String(primary.timeframe ?? ''))}  ` +
      `limit=${String(primary.limit)}`
    )
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
        'scripts/swap-home-initiatives.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  let home: PrismicDocument
  try {
    home = await client.getByUID('page', 'home')
  } catch (error) {
    throw new Error(
      `Could not read the page document with uid "home" (${describeError(error)}). It must ` +
        'exist and be published before its slice zone can be rebuilt.'
    )
  }

  let initiativesPage: PrismicDocument
  try {
    initiativesPage = await client.getByUID('page', 'initiatives')
  } catch (error) {
    throw new Error(
      'Could not resolve the page document with uid "initiatives" ' +
        `(${describeError(error)}). The more_link content relationship cannot be built ` +
        'without it. Aborting rather than writing a link that would resolve to nothing.'
    )
  }

  const pageData = (home.data ?? {}) as Record<string, unknown>
  const before = currentPageSlices(pageData)
  const {
    slices: after,
    changes,
    heading,
    subheading,
  } = planSwap(before, initiativesPage)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (page/home ${home.id}, locale ${home.lang}).`
  )
  console.log('')
  console.log(
    '  Reminder: max_items, more_label and more_link on the timeline variation must be ' +
      'pushed to Prismic (pnpm prismic:push) before this can safely --commit. See the file ' +
      'header.'
  )
  console.log('')
  console.log(`  heading:    ${JSON.stringify(heading)}`)
  console.log(`  subheading: ${JSON.stringify(subheading)}`)
  console.log(
    '  This copy is carried across unchanged, never re-authored here. It reads as ' +
      'retrospective, written for an archive section; now that this section shows what is ' +
      'coming rather than what has happened, the user may want to revisit it.'
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
    'Every other slice on the home page, and every non-slice field on the document, is left ' +
      'exactly as it is in Prismic.'
  )

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

  const migration: Migration = createMigration()
  const update = {
    id: home.id,
    uid: 'home',
    type: 'page',
    lang: home.lang,
    data: nextData,
  }
  migration.updateDocument(
    update as unknown as Parameters<Migration['updateDocument']>[0],
    'Home'
  )

  console.log('Writing the page/home update through the Migration API.')
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
  console.log('Reading the page/home document back.')
  const readBack = await client.getByUID('page', 'home')
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
      'Read-back still shows the old slice. That is expected if the update landed in the ' +
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
