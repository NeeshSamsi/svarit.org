#!/usr/bin/env node
/**
 * Turns on the signup form on page/initiatives' `event_list`/`timeline` slice.
 *
 * `restructure-initiatives-page.ts` set `show_signup: false` there deliberately: the signup
 * form was meant to live on /centenary, not the index. The user has since asked for the same
 * form on /initiatives too. This is a CONTENT change, not a code change:
 * `EventListTimeline.tsx` already renders the form whenever `show_signup` is true, so this
 * only flips that one field, and fills `signup_heading` / `signup_cta_label` with the exact
 * same fallback strings the component itself uses ('A Year-Long Musical Celebration' /
 * 'Sign up for updates') when either was left blank.
 *
 * Every other field on the document, and every other primary field on the timeline slice
 * itself (heading, subheading, source, initiatives), is carried through byte-for-byte. Only
 * `show_signup`, and `signup_heading` / `signup_cta_label` when they were empty, change.
 *
 *   node --experimental-strip-types scripts/enable-initiatives-signup.ts
 *       Dry run. Reads page/initiatives, prints the before/after of the timeline slice,
 *       writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/enable-initiatives-signup.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the one page
 *       update through the Migration API, then reads it back.
 *
 * It is idempotent. A second run that finds `show_signup` already true and both signup text
 * fields already filled writes nothing and says so.
 *
 * It NEVER publishes. The update lands in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards may still show the old value; that is
 * reported as "not yet visible", not as a failure.
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

// -----------------------------------------------------------------------------------------
// The transform (pure, covered by scripts/enable-initiatives-signup.test.ts)
// -----------------------------------------------------------------------------------------

export type Slice = Record<string, unknown> & {
  slice_type?: unknown
  variation?: unknown
  primary?: unknown
}

/** The same fallback copy `EventListTimeline.tsx` renders when these fields are blank. */
export const SIGNUP_HEADING_DEFAULT = 'A Year-Long Musical Celebration'
export const SIGNUP_CTA_LABEL_DEFAULT = 'Sign up for updates'

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

/** Pulls the slice zone out of a fetched page document. */
export function currentPageSlices(pageData: Record<string, unknown>): Slice[] {
  return Array.isArray(pageData.slices) ? (pageData.slices as Slice[]) : []
}

export type SignupPlan = {
  slices: Slice[]
  changes: string[]
}

/**
 * Given the /initiatives page's current slice zone, turns the timeline slice's signup form
 * on. Throws if there is no timeline slice at all - there is nothing safe to change. An
 * empty `changes` array means it is already correct and nothing should be written.
 */
export function planEnableSignup(current: Slice[]): SignupPlan {
  const idx = findTimelineSliceIndex(current)
  if (idx === -1) {
    throw new Error(
      'page/initiatives has no event_list/timeline slice to enable the signup form on.'
    )
  }

  const timeline = current[idx]
  const primary = (timeline.primary ?? {}) as Record<string, unknown>
  const changes: string[] = []

  if (primary.show_signup !== true) {
    changes.push(
      `show_signup: ${JSON.stringify(primary.show_signup ?? null)} -> true`
    )
  }

  const currentHeading =
    typeof primary.signup_heading === 'string' ? primary.signup_heading : ''
  const heading =
    currentHeading.trim() !== '' ? currentHeading : SIGNUP_HEADING_DEFAULT
  if (heading !== currentHeading) {
    changes.push(
      `signup_heading: ${JSON.stringify(currentHeading || null)} -> ${JSON.stringify(heading)}`
    )
  }

  const currentCtaLabel =
    typeof primary.signup_cta_label === 'string' ? primary.signup_cta_label : ''
  const ctaLabel =
    currentCtaLabel.trim() !== '' ? currentCtaLabel : SIGNUP_CTA_LABEL_DEFAULT
  if (ctaLabel !== currentCtaLabel) {
    changes.push(
      `signup_cta_label: ${JSON.stringify(currentCtaLabel || null)} -> ${JSON.stringify(ctaLabel)}`
    )
  }

  if (changes.length === 0) {
    return { slices: current, changes: [] }
  }

  const nextSlices = current.map((entry, i) =>
    i === idx
      ? {
          ...timeline,
          primary: {
            ...primary,
            show_signup: true,
            signup_heading: heading,
            signup_cta_label: ctaLabel,
          },
        }
      : entry
  )

  return { slices: nextSlices, changes }
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
    return (
      `${head}  show_signup=${String(primary.show_signup)}  ` +
      `signup_heading=${JSON.stringify(String(primary.signup_heading ?? ''))}  ` +
      `signup_cta_label=${JSON.stringify(String(primary.signup_cta_label ?? ''))}`
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
        'scripts/enable-initiatives-signup.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  let page: PrismicDocument
  try {
    page = await client.getByUID('page', 'initiatives')
  } catch (error) {
    throw new Error(
      `Could not read the page document with uid "initiatives" (${describeError(error)}). It ` +
        'must exist and be published before its signup field can be enabled.'
    )
  }

  const pageData = (page.data ?? {}) as Record<string, unknown>
  const before = currentPageSlices(pageData)
  const { slices: after, changes } = planEnableSignup(before)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (page/initiatives ${page.id}, locale ${page.lang}).`
  )
  console.log('')
  printSlices('current', before)
  console.log('')
  printSlices('after', after)
  console.log('')

  if (changes.length === 0) {
    console.log(
      'The timeline slice already has show_signup true and both signup text fields filled. ' +
        'Nothing to do.'
    )
    return
  }

  console.log('Changes:')
  for (const change of changes) console.log(`  ${change}`)
  console.log('')
  console.log(
    'Every other field on the document, and every other primary field on the timeline ' +
      'slice, is left exactly as it is in Prismic.'
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
  const readIdx = findTimelineSliceIndex(readSlices)
  const readPrimary =
    readIdx === -1
      ? {}
      : ((readSlices[readIdx].primary ?? {}) as Record<string, unknown>)
  const matches = readPrimary.show_signup === true

  printSlices('read back', readSlices)
  console.log('')
  if (matches) {
    console.log(
      'Read-back matches the plan. The update is live on the master ref.'
    )
  } else {
    console.log(
      'Read-back still shows the old value. That is expected if the update landed in the ' +
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
