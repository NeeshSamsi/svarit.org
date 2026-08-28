#!/usr/bin/env node
/**
 * Migrates `src/data/content.json` into Prismic using the Migration API. Contract v2.
 *
 * Creates three `page` documents (home, events, artists), one `event` document per entry in
 * initiatives.events and initiatives.workshops, one `volunteer` document per volunteer, and
 * merges the footer copy into the existing `settings` singleton. Every local image it
 * references is uploaded to the media library, or reused if it is already there.
 *
 * Dry run is the default. Nothing is written unless --commit is passed, --commit takes a full
 * repository backup first and aborts if that backup fails, and every write is read back
 * afterwards to prove the fields actually landed.
 *
 *   pnpm migrate:preview                   plan only, writes scripts/migration-preview.json
 *   pnpm migrate:preview --with-artists    same, including artists from artists.draft.json
 *   pnpm migrate:probe --commit            write ONE volunteer and read it straight back
 *   pnpm migrate:commit                    back up, write, verify
 *
 * Flags:
 *   --commit          actually write. Without it nothing leaves this machine.
 *   --with-artists    include artists from an approved artists.draft.json
 *   --only <uid>      restrict the run to this uid. Repeatable. Use "settings" for the
 *                     settings singleton, which has no uid of its own.
 *   --probe           plan and write exactly one document, then verify it
 *   --skip-existing   leave documents that already exist alone instead of repairing them
 *   --publish         publish the Prismic migration release after writing
 *
 * WHY --only EXISTS: documents in an unpublished Prismic migration release are invisible to
 * the query API, so this script cannot see them and a full re-run would create a duplicate of
 * every one. `--only <uid>` writes just the document that needs writing and leaves the rest
 * of the release untouched.
 *
 * The custom types must be pushed to the Prismic repository with Slice Machine BEFORE this
 * runs. Documents cannot be created for types that do not exist remotely. See scripts/README.md.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import {
  createMigration,
  type Client,
  type MigrateReporterEvents,
  type PrismicDocument,
} from '@prismicio/client'
import { AssetRegistry } from './lib/assets.ts'
import { runBackup } from './lib/backup.ts'
import { loadContent } from './lib/content.ts'
import { DRAFT_PATH, PREVIEW_PATH, relativePath } from './lib/paths.ts'
import {
  buildPlan,
  collectExisting,
  serialise,
  type DraftArtist,
  type PlannedDocument,
} from './lib/plan.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { listAssets } from './lib/prismic-rest.ts'
import {
  checkDocument,
  formatCheck,
  isPassing,
  readBack,
  type DocumentCheck,
} from './lib/verify.ts'

type ArtistsDraft = {
  approved?: boolean
  artists?: DraftArtist[]
}

/** Fallback when the repository's master locale cannot be read. */
const DEFAULT_LANG = 'en-us'

/** The single document --probe writes. The first volunteer in content.json. */
const PROBE_UID = 'utpal'

const warnings: string[] = []

// -----------------------------------------------------------------------------------------
// Arguments
// -----------------------------------------------------------------------------------------

const FLAGS = [
  '--commit',
  '--dry-run',
  '--with-artists',
  '--probe',
  '--skip-existing',
  '--publish',
]

export function parseArgs(argv: string[]) {
  const only = new Set<string>()
  const rest: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--only') {
      const value = argv[i + 1]
      if (!value || value.startsWith('-')) {
        throw new Error('--only needs a uid, for example: --only home')
      }
      only.add(value)
      i += 1
      continue
    }

    if (arg.startsWith('--only=')) {
      const value = arg.slice('--only='.length)
      if (!value)
        throw new Error('--only needs a uid, for example: --only home')
      only.add(value)
      continue
    }

    rest.push(arg)
  }

  const unknown = rest.filter(
    (arg) => arg.startsWith('-') && !FLAGS.includes(arg)
  )
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. ` +
        `Supported: ${FLAGS.join(', ')}, --only <uid>`
    )
  }

  const stray = rest.filter((arg) => !arg.startsWith('-'))
  if (stray.length > 0) {
    throw new Error(
      `Unexpected argument${stray.length > 1 ? 's' : ''}: ${stray.join(', ')}. ` +
        'Did you mean --only ' +
        stray[0] +
        '?'
    )
  }

  return {
    commit: rest.includes('--commit'),
    withArtists: rest.includes('--with-artists'),
    probe: rest.includes('--probe'),
    skipExisting: rest.includes('--skip-existing'),
    publish: rest.includes('--publish'),
    only,
  }
}

async function loadArtists(): Promise<DraftArtist[]> {
  let draft: ArtistsDraft
  try {
    draft = JSON.parse(await readFile(DRAFT_PATH, 'utf8'))
  } catch {
    throw new Error(
      `--with-artists was passed but ${relativePath(DRAFT_PATH)} does not exist. ` +
        'Run `pnpm extract:artists` first, review the draft, then set "approved": true.'
    )
  }

  if (draft.approved !== true) {
    throw new Error(
      `${relativePath(DRAFT_PATH)} is not approved. Review the candidate artists, correct ` +
        'them, then set the top-level "approved" field to true.'
    )
  }

  const artists = (draft.artists ?? []).filter((artist) => artist.name?.trim())
  if (artists.length === 0) {
    throw new Error(
      `${relativePath(DRAFT_PATH)} is approved but contains no artists.`
    )
  }

  return artists
}

function label(item: { type: string; uid?: string }): string {
  return item.uid ? `${item.type}/${item.uid}` : `${item.type} (singleton)`
}

function summarise(planned: PlannedDocument[], action: 'create' | 'update') {
  const counts: Record<string, number> = {}
  for (const item of planned) {
    if (item.action !== action) continue
    counts[item.type] = (counts[item.type] ?? 0) + 1
  }
  return counts
}

function describeCounts(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(
    ([type, count]) => `${count} ${type}`
  )
  return parts.length > 0 ? parts.join(', ') : 'none'
}

// -----------------------------------------------------------------------------------------
// Read-back verification
// -----------------------------------------------------------------------------------------

/** One document of every type in the plan, so verification covers every payload shape. */
function verificationSample(planned: PlannedDocument[]): PlannedDocument[] {
  const seen = new Set<string>()
  const sample: PlannedDocument[] = []
  for (const item of planned) {
    if (seen.has(item.type)) continue
    seen.add(item.type)
    sample.push(item)
  }
  return sample
}

async function verifyWritten(
  client: Client,
  sample: PlannedDocument[]
): Promise<DocumentCheck[]> {
  const checks: DocumentCheck[] = []
  for (const item of sample) {
    const doc = await readBack(client, item.type, item.uid)
    checks.push(checkDocument(item.type, item.uid, doc))
  }
  return checks
}

// -----------------------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------------------

async function main() {
  const { commit, withArtists, probe, skipExisting, publish, only } = parseArgs(
    process.argv.slice(2)
  )

  // --probe is just a preset filter: one volunteer, nothing else.
  const filter = probe ? new Set([PROBE_UID]) : only
  const filtering = filter.size > 0

  const content = await loadContent()
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written to Prismic.\n' +
        `Create a write token at https://${repositoryName}.prismic.io/settings/apps/ ` +
        '(Settings -> API & Security -> Write API), then run:\n' +
        '  PRISMIC_WRITE_TOKEN=... pnpm migrate:commit\n' +
        'See scripts/README.md.'
    )
  }

  const artists = withArtists && !probe ? await loadArtists() : null
  const client = clientFor(repositoryName, writeToken)

  let lang = DEFAULT_LANG
  try {
    const repository = await client.getRepository()
    lang = repository.languages[0].id
  } catch (error) {
    warnings.push(
      `Could not read the repository's master locale (${describeError(error)}). ` +
        `Falling back to "${DEFAULT_LANG}".`
    )
  }

  const existing = await collectExisting(client, (message) =>
    warnings.push(message)
  )

  let remoteSettings: PrismicDocument | null = null
  try {
    remoteSettings = await client.getSingle('settings')
  } catch (error) {
    if (commit && !probe) {
      throw new Error(
        `The existing settings document could not be read (${describeError(error)}). ` +
          'It must exist before its footer fields can be merged. Push the custom types with ' +
          'Slice Machine and publish a settings document first.'
      )
    }
    warnings.push(
      `Existing settings document not read (${describeError(error)}).`
    )
  }

  // Reference assets already in the media library rather than uploading a second copy.
  const existingAssets = writeToken
    ? await listAssets(repositoryName, writeToken)
    : []

  const migration = createMigration()
  const assets = new AssetRegistry(migration, existingAssets)
  const plan = await buildPlan({
    content,
    migration,
    assets,
    existing,
    lang,
    artists,
    remoteSettings,
    skipExisting,
    only: filter,
  })
  warnings.push(...plan.warnings)

  if (filtering && plan.planned.length === 0 && plan.skipped.length === 0) {
    throw new Error(
      `--only matched no documents: ${[...filter].map((uid) => `"${uid}"`).join(', ')}.\n` +
        'Check the uid. Run without --only to see every uid the plan produces, or use ' +
        '"settings" for the settings singleton.'
    )
  }

  const creates = summarise(plan.planned, 'create')
  const updates = summarise(plan.planned, 'update')
  const createCount = plan.planned.filter((i) => i.action === 'create').length
  const updateCount = plan.planned.filter((i) => i.action === 'update').length

  // ---------------------------------------------------------------------------------------
  // Dry run
  // ---------------------------------------------------------------------------------------
  if (!commit) {
    const preview = {
      mode: probe ? 'dry-run (probe)' : 'dry-run',
      generatedAt: new Date().toISOString(),
      repository: repositoryName,
      lang,
      withArtists,
      skipExisting,
      existingChecked: existing.reachable,
      summary: {
        toCreate: createCount,
        toCreateByType: creates,
        toUpdate: updateCount,
        toUpdateByType: updates,
        skipped: plan.skipped.length,
        assetsToUpload: assets.size,
        assetsReused: assets.reusedCount,
      },
      documents: plan.planned.map((item) => ({
        action: item.action,
        type: item.type,
        uid: item.uid ?? null,
        title: item.title,
        lang: item.doc.document.lang,
        data: serialise(item.doc.document.data, assets),
      })),
      skipped: plan.skipped,
      warnings,
    }

    await writeFile(
      PREVIEW_PATH,
      `${JSON.stringify(preview, null, 2)}\n`,
      'utf8'
    )

    console.log(
      `Dry run against "${repositoryName}" (locale ${lang}). Nothing was written.`
    )
    if (filtering) {
      console.log(
        `Filtered to --only ${[...filter].join(', ')}. Everything else is left alone.`
      )
    }
    console.log('')
    for (const item of plan.planned)
      console.log(`  ${item.action}  ${label(item)}`)
    for (const item of plan.skipped)
      console.log(`  skip    ${label(item)}  ${item.reason}`)
    console.log('')
    console.log(
      `Assets: ${assets.size} to upload, ${assets.reusedCount} reused. ` +
        `Documents: ${createCount} to create (${describeCounts(creates)}), ` +
        `${updateCount} to update (${describeCounts(updates)}), ${plan.skipped.length} skipped.`
    )
    if (warnings.length > 0) {
      console.log('')
      console.log('Warnings:')
      for (const warning of warnings) console.log(`  - ${warning}`)
    }
    console.log('')
    console.log(`Full plan written to ${relativePath(PREVIEW_PATH)}`)
    console.log('Re-run with --commit to write it to Prismic.')
    return
  }

  // ---------------------------------------------------------------------------------------
  // Commit
  // ---------------------------------------------------------------------------------------
  if (plan.planned.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const writeClient = asWriteClient(client)

  // No backup, no write. A failure here aborts before anything is touched.
  console.log('Backing up the repository before writing anything.')
  let backup
  try {
    backup = await runBackup(client, repositoryName, (message) =>
      console.log(message)
    )
  } catch (error) {
    throw new Error(
      `Backup failed, so the migration was aborted and nothing was written: ` +
        `${describeError(error)}`
    )
  }
  console.log(`Backed up ${backup.documentCount} documents to ${backup.file}`)
  console.log('')

  if (filtering) {
    console.log(
      `Filtered to --only ${[...filter].join(', ')}. No other document is touched.`
    )
    console.log('')
  }

  console.log(
    `Writing to "${repositoryName}" (locale ${lang}): ${assets.size} assets to upload, ` +
      `${assets.reusedCount} reused, ${createCount} documents to create, ` +
      `${updateCount} to update.`
  )
  console.log('')

  let assetsCreated = 0
  let documentsCreated = 0
  let documentsUpdated = 0

  const reporter = (event: MigrateReporterEvents) => {
    switch (event.type) {
      case 'assets:creating':
        console.log(
          `  asset   ${event.data.current}/${event.data.total}  ${event.data.asset.config.filename}`
        )
        break
      case 'assets:created':
        assetsCreated = event.data.created
        break
      case 'documents:creating':
        console.log(
          `  create  ${event.data.current}/${event.data.total}  ` +
            `${event.data.document.document.type}/${event.data.document.document.uid ?? '(singleton)'}`
        )
        break
      case 'documents:created':
        documentsCreated = event.data.created
        break
      case 'documents:updated':
        documentsUpdated = event.data.updated
        break
    }
  }

  try {
    await writeClient.migrate(migration, { reporter })
  } catch (error) {
    console.error('')
    console.error('Migration failed part way through.')
    console.error(`  assets created:    ${assetsCreated}`)
    console.error(`  documents created: ${documentsCreated}`)
    console.error('')

    if (/already exists/i.test(describeError(error))) {
      console.error(
        'A document with that uid already exists, but it was not found on any ref this ' +
          'script can query. That means it is sitting in the unpublished Prismic migration ' +
          'release, which /api/v2 does not expose as a ref. The Migration API is write only, ' +
          'so there is no way to read or repair those documents from here while they stay ' +
          'unpublished.'
      )
      console.error('')
      console.error(
        'Publish the migration release in the Prismic dashboard (Releases -> the migration ' +
          'release -> Publish), or re-run this with --publish. Once published, the documents ' +
          'become visible on the master ref and a normal run repairs them in place.'
      )
      console.error('')
    }

    console.error(
      `Anything already written sits in the repository migration release, unpublished. ` +
        `The pre-migration backup is at ${backup.file}.`
    )
    throw error
  }

  if (publish) {
    console.log('')
    console.log('Publishing the migration release.')
    const { totalItems } = await writeClient.publishMigrationRelease()
    console.log(`  published ${totalItems} items`)
  }

  // --- read back, always -------------------------------------------------------------------
  console.log('')
  console.log('Reading the written documents back to prove the fields landed.')

  const sample = verificationSample(plan.planned)
  let checks: DocumentCheck[] = []
  try {
    checks = await verifyWritten(client, sample)
  } catch (error) {
    console.error(`  could not verify: ${describeError(error)}`)
  }

  for (const check of checks) {
    for (const line of formatCheck(check)) console.log(line)
  }

  const failed = checks.filter((check) => !isPassing(check))

  console.log('')
  console.log('Done.')
  console.log(`  assets uploaded:   ${assetsCreated}`)
  console.log(`  assets reused:     ${assets.reusedCount}`)
  console.log(`  documents created: ${documentsCreated}`)
  console.log(`  documents updated: ${documentsUpdated}`)
  console.log(`  documents skipped: ${plan.skipped.length}`)
  console.log(`  backup:            ${backup.file}`)

  if (probe && checks[0]?.data) {
    console.log('')
    console.log(`Data returned by the API for ${label(sample[0])}:`)
    console.log(JSON.stringify(checks[0].data, null, 2))
  }

  if (failed.length > 0) {
    console.error('')
    console.error(
      `VERIFICATION FAILED for ${failed.length} of ${checks.length} sampled documents.`
    )
    console.error(
      'A write that reports success is not proof anything landed. Do not treat this run as ' +
        `complete. Pre-migration backup: ${backup.file}`
    )
    process.exitCode = 1
    return
  }

  console.log('')
  console.log(
    `Verified: ${checks.length} sampled documents came back with every mapped field populated.`
  )

  if (warnings.length > 0) {
    console.log('')
    console.log('Warnings:')
    for (const warning of warnings) console.log(`  - ${warning}`)
  }

  if (!publish) {
    console.log('')
    console.log(
      'New documents sit in the Prismic migration release, unpublished. Open Prismic, ' +
        'review the release, and publish it when it looks right.'
    )
  }
}

// Only run when invoked directly. `scripts/plan.test.ts` imports parseArgs from here, and a
// test run must not fire a migration as an import side effect.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  try {
    await main()
  } catch (error) {
    console.error('')
    console.error(describeError(error))
    process.exitCode = 1
  }
}
