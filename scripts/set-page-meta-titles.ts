#!/usr/bin/env node
/**
 * Sets the `meta_title` on the `page` documents with uids `initiatives` and `artists`.
 *
 * The user wants these two index pages titled:
 *
 *   page/initiatives  ->  "Initiatives by Svarit"
 *   page/artists      ->  "Artists Hosted by Svarit"
 *
 * `src/app/*` treats a Prismic `meta_title` as the whole `<title>`, so the layout's title
 * template does NOT append the brand name a second time. Only `meta_title` is touched on
 * each document. Every other field (meta_description, meta_image, slices, uid, anything
 * else) is carried through byte-for-byte:
 *
 *   nextData = { ...pageData, meta_title: desired }
 *
 * It is idempotent. A run that finds both titles already set writes nothing and says so.
 *
 *   node --experimental-strip-types scripts/set-page-meta-titles.ts
 *       Dry run. Reads both pages, prints the before/after, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/set-page-meta-titles.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the two page
 *       updates through the Migration API, then reads them back.
 *
 * It NEVER publishes. The updates land in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards may still show the old titles; that
 * is reported as "not yet visible", not as a failure.
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
// The transform (pure, covered by scripts/set-page-meta-titles.test.ts)
// -----------------------------------------------------------------------------------------

/** The `page` uid and the `meta_title` it should carry. Order is the run order. */
export const DESIRED_META_TITLES: Array<{ uid: string; title: string }> = [
  { uid: 'initiatives', title: 'Initiatives by Svarit' },
  { uid: 'artists', title: 'Artists Hosted by Svarit' },
]

/** Pulls the `meta_title` out of a fetched page document, tolerating a missing field. */
export function currentMetaTitle(pageData: Record<string, unknown>): string {
  return typeof pageData.meta_title === 'string' ? pageData.meta_title : ''
}

export type MetaTitlePlan = {
  title: string
  changes: string[]
}

/**
 * Given a page's current `meta_title` and the value it should carry, returns the value to
 * write and a human-readable list of the change. An empty `changes` array means the title is
 * already correct and nothing should be written for this document.
 */
export function planMetaTitle(current: string, desired: string): MetaTitlePlan {
  if (current === desired) return { title: desired, changes: [] }

  return {
    title: desired,
    changes: [
      `meta_title  ${JSON.stringify(current || null)} -> ${JSON.stringify(desired)}`,
    ],
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

type PagePlan = {
  uid: string
  doc: PrismicDocument
  data: Record<string, unknown>
  desired: string
  plan: MetaTitlePlan
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/set-page-meta-titles.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  const pages: PagePlan[] = []
  for (const { uid, title } of DESIRED_META_TITLES) {
    let doc: PrismicDocument
    try {
      doc = await client.getByUID('page', uid)
    } catch (error) {
      throw new Error(
        `Could not read the page document with uid "${uid}" (${describeError(error)}). It ` +
          'must exist and be published before its meta_title can be set.'
      )
    }
    const data = (doc.data ?? {}) as Record<string, unknown>
    pages.push({
      uid,
      doc,
      data,
      desired: title,
      plan: planMetaTitle(currentMetaTitle(data), title),
    })
  }

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (locale ${pages[0].doc.lang}).`
  )
  console.log('')
  for (const { uid, doc, data, desired } of pages) {
    console.log(
      `  page/${uid} (${doc.id})  current meta_title: ${JSON.stringify(
        currentMetaTitle(data) || null
      )}  ->  ${JSON.stringify(desired)}`
    )
  }
  console.log('')

  const toWrite = pages.filter((page) => page.plan.changes.length > 0)

  if (toWrite.length === 0) {
    console.log('Both meta titles are already set. Nothing to do.')
    return
  }

  console.log('Changes:')
  for (const page of toWrite) {
    for (const change of page.plan.changes) {
      console.log(`  page/${page.uid}  ${change}`)
    }
  }
  console.log('')
  console.log(
    'Every other field on both documents (meta_description, meta_image, slices, uid) is left ' +
      'exactly as it is in Prismic.'
  )

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
  for (const page of toWrite) {
    // The Migration API's PUT only carries title, uid, tags and data. `page` is repeatable,
    // so the uid belongs at the document root, never in data. Send the minimum and cast,
    // exactly as scripts/lib/plan.ts and scripts/update-initiatives-page.ts do.
    const update = {
      id: page.doc.id,
      uid: page.uid,
      type: 'page',
      lang: page.doc.lang,
      data: { ...page.data, meta_title: page.plan.title },
    }
    migration.updateDocument(
      update as unknown as Parameters<Migration['updateDocument']>[0],
      page.desired
    )
  }

  console.log('Writing the page meta_title updates through the Migration API.')
  await asWriteClient(client).migrate(migration, {
    reporter: (event) => {
      if (event.type === 'documents:updated') {
        console.log(`  updated ${event.data.updated} document(s)`)
      }
    },
  })
  console.log('')
  console.log(
    'The updates are in the repository migration release, unpublished. This script never ' +
      'publishes them. Review and publish in the Prismic dashboard (Releases -> the ' +
      'migration release -> Publish).'
  )
  console.log('')

  // --- read back -----------------------------------------------------------------------
  console.log('Reading the page documents back.')
  let allMatch = true
  for (const page of toWrite) {
    const readBack = await client.getByUID('page', page.uid)
    const value = currentMetaTitle(
      (readBack.data ?? {}) as Record<string, unknown>
    )
    const matches = value === page.desired
    allMatch &&= matches
    console.log(
      `  page/${page.uid}  read back: ${JSON.stringify(value || null)}  ${
        matches ? 'OK' : 'not yet visible'
      }`
    )
  }
  console.log('')
  if (allMatch) {
    console.log(
      'Read-back matches the plan. The updates are live on the master ref.'
    )
  } else {
    console.log(
      'Read-back still shows an old title. That is expected if the update landed in the ' +
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
