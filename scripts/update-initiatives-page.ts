#!/usr/bin/env node
/**
 * Rebuilds the slice zone of the `page` document with uid `initiatives`.
 *
 * The /initiatives index today carries a single `event_list` grid slice, still holding a
 * stale `page_size: 12` field that was dropped from the model in commit f5ecbb9. This script
 * replaces the whole slice zone with, in order:
 *
 *   1. a `hero` slice, `page_header` variation, with the page title and a one-paragraph lead;
 *   2. an `event_list` grid slice for "Events"   (category "Event",   limit on);
 *   3. an `event_list` grid slice for "Workshops" (category "Workshop", limit on).
 *
 * Every other field on the document (meta_title, meta_description, uid, anything else) is
 * carried through byte-for-byte. Only `slices` is touched, and `page_size` is not carried
 * forward.
 *
 * It is idempotent. A second run that finds the slice zone already in this shape writes
 * nothing and says so.
 *
 *   node --experimental-strip-types scripts/update-initiatives-page.ts
 *       Dry run. Reads page/initiatives, prints the before/after of the slice zone, writes
 *       nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/update-initiatives-page.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the one page
 *       update through the Migration API, then reads it back.
 *
 * It NEVER publishes. The update lands in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards may still show the old slices; that
 * is reported as "not yet visible", not as a failure.
 *
 * HARD PREREQUISITE for a --commit run: the `event_list` slice's `grid` variation model must
 * carry the `limit` boolean, and that model must be pushed to Prismic with Slice Machine
 * first. The Migration API silently drops values for fields the type does not know, so a
 * commit run before the push writes the two grid slices without their `limit` and the field
 * will not stick.
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
import { paragraph, slice } from './lib/transform.ts'

// -----------------------------------------------------------------------------------------
// The transform (pure, covered by scripts/update-initiatives-page.test.ts)
// -----------------------------------------------------------------------------------------

export type Slice = Record<string, unknown> & {
  slice_type?: unknown
  variation?: unknown
  primary?: unknown
}

export const INITIATIVES_HERO_TITLE =
  'Every concert, festival and workshop since 2001'

export const INITIATIVES_HERO_DESCRIPTION =
  'Svarit has presented Indian music across concert halls, festivals and classrooms ' +
  'since 2001, from intimate baithaks to full festival stages.'

/**
 * The slice zone the /initiatives page should have, built fresh on every call so callers
 * never share mutable objects. `limit: true` is written against the grid model that another
 * change adds; see the prerequisite note at the top of the file.
 */
export function desiredInitiativesSlices(): Slice[] {
  return [
    slice(
      'hero',
      {
        title: INITIATIVES_HERO_TITLE,
        description: [paragraph(INITIATIVES_HERO_DESCRIPTION)],
      },
      'page_header'
    ),
    slice(
      'event_list',
      { heading: 'Events', subheading: '', category: 'Event', limit: true },
      'grid'
    ),
    slice(
      'event_list',
      {
        heading: 'Workshops',
        subheading: '',
        category: 'Workshop',
        limit: true,
      },
      'grid'
    ),
  ]
}

/** Pulls the slice zone out of a fetched page document. */
export function currentPageSlices(pageData: Record<string, unknown>): Slice[] {
  return Array.isArray(pageData.slices) ? (pageData.slices as Slice[]) : []
}

const sliceType = (entry: Slice): string =>
  typeof entry.slice_type === 'string' ? entry.slice_type : ''

const sliceVariation = (entry: Slice): string =>
  typeof entry.variation === 'string' ? entry.variation : 'default'

/**
 * Canonical form for comparison: only the fields we own (slice_type, variation, primary),
 * with empty text values dropped so an absent key and an empty string compare equal. The
 * query API adds `id`, `version` and `slice_label` to every fetched slice; those are ignored.
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

/** True when a slice carries the `page_size` field removed from the model in f5ecbb9. */
const carriesPageSize = (entry: Slice): boolean =>
  !!entry.primary &&
  typeof entry.primary === 'object' &&
  'page_size' in (entry.primary as Record<string, unknown>)

export type SlicePlan = {
  slices: Slice[]
  changes: string[]
}

/**
 * Given the /initiatives page's current slice zone, returns the zone it should have and a
 * human-readable list of what changed. An empty `changes` array means it is already correct
 * and nothing should be written.
 */
export function planInitiativesPageSlices(current: Slice[]): SlicePlan {
  const desired = desiredInitiativesSlices()

  if (canonicalSlices(current) === canonicalSlices(desired)) {
    return { slices: desired, changes: [] }
  }

  const changes: string[] = [
    `rewrite slice zone: ${current.length} slice(s) -> ${desired.length} ` +
      '(hero/page_header, event_list/grid "Events", event_list/grid "Workshops")',
  ]
  if (current.some(carriesPageSize)) {
    changes.push(
      'drop stale field page_size (removed from the model in f5ecbb9, replaced by the ' +
        'limit boolean)'
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
  if (sliceType(entry) === 'event_list') {
    const bits = [
      `heading=${JSON.stringify(String(primary.heading ?? ''))}`,
      `category=${JSON.stringify(String(primary.category ?? ''))}`,
    ]
    if ('limit' in primary) bits.push(`limit=${String(primary.limit)}`)
    if ('page_size' in primary)
      bits.push(`page_size=${String(primary.page_size)}`)
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
        'scripts/update-initiatives-page.ts --commit'
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
  const { slices: after, changes } = planInitiativesPageSlices(before)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (page/initiatives ${page.id}, locale ${page.lang}).`
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
      'as it is in Prismic.'
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
