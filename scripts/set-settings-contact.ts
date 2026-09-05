#!/usr/bin/env node
/**
 * Seeds the eight `settings` Contact fields (Task 231): `email`, `phone`,
 * `phone_e164`, and the five `address_*` fields.
 *
 * Contact details used to exist only as combined text (`footer.contact`,
 * `footer.address`) and, separately, hardcoded again in `src/app/layout.tsx`'s
 * NGO JSON-LD. Splitting them into their own Settings fields lets every
 * consumer (the footer, the JSON-LD, and the privacy policy page to come) read
 * one source instead of parsing or duplicating it. See customtypes/settings.
 *
 * Only the eight Contact fields are touched. Every other field on the
 * singleton (logo, donationLink, socials, nav, footer) is carried through
 * byte-for-byte:
 *
 *   nextData = { ...settingsData, ...changedFields }
 *
 * It is idempotent. A run that finds all eight already set writes nothing and
 * says so.
 *
 *   node --experimental-strip-types scripts/set-settings-contact.ts
 *       Dry run. Reads settings, prints the before/after table, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/set-settings-contact.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the
 *       one settings update through the Migration API, then reads it back.
 *
 * It NEVER publishes. The update lands in the repository's unpublished
 * migration release, for a human to review and publish in the Prismic
 * dashboard. Because /api/v2 does not expose an unpublished release as a ref,
 * the read-back afterwards may still show the old values; that is reported as
 * "not yet visible", not as a failure.
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
// The transform (pure, covered by scripts/set-settings-contact.test.ts)
// -----------------------------------------------------------------------------------------

/** The eight Contact fields and the value each should carry. */
export const DESIRED_CONTACT: Record<string, string> = {
  email: 'team@svarit.org',
  phone: '+91 99307 59942',
  phone_e164: '+91-99307-59942',
  address_street: 'Anandashram, 22 Pandita Ramabai Rd, Gamdevi',
  address_locality: 'Mumbai',
  address_region: 'Maharashtra',
  address_postal_code: '400007',
  address_country: 'IN',
}

/** Pulls one Contact field out of a fetched settings document. */
export function currentContactField(
  settingsData: Record<string, unknown>,
  field: string
): string {
  const value = settingsData[field]
  return typeof value === 'string' ? value : ''
}

export type ContactPlan = {
  /** Only the fields that need writing. */
  values: Record<string, string>
  changes: string[]
}

/**
 * Given the settings document's current field values, returns the fields that
 * need writing and a human-readable list of the changes. An empty `changes`
 * array means every field already matches and nothing should be written.
 */
export function planContactFields(
  current: Record<string, string>,
  desired: Record<string, string> = DESIRED_CONTACT
): ContactPlan {
  const values: Record<string, string> = {}
  const changes: string[] = []

  for (const [field, value] of Object.entries(desired)) {
    if (current[field] === value) continue
    values[field] = value
    changes.push(
      `${field}  ${JSON.stringify(current[field] || null)} -> ${JSON.stringify(value)}`
    )
  }

  return { values, changes }
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

function printTable(current: Record<string, string>) {
  for (const field of Object.keys(DESIRED_CONTACT)) {
    const now = current[field] || null
    const next = DESIRED_CONTACT[field]
    console.log(
      `  ${field.padEnd(20)} ${JSON.stringify(now).padEnd(46)} -> ${JSON.stringify(next)}`
    )
  }
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/set-settings-contact.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  let settings: PrismicDocument
  try {
    settings = await client.getSingle('settings')
  } catch (error) {
    throw new Error(
      `Could not read the settings document (${describeError(error)}). It must exist and be ` +
        'published before its Contact fields can be set. If this is a fresh field, push the ' +
        '"Contact" tab on the settings custom type to Prismic first.'
    )
  }

  const settingsData = (settings.data ?? {}) as Record<string, unknown>
  const current: Record<string, string> = {}
  for (const field of Object.keys(DESIRED_CONTACT)) {
    current[field] = currentContactField(settingsData, field)
  }

  const { values, changes } = planContactFields(current)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (settings ${settings.id}, locale ${settings.lang}).`
  )
  console.log('')
  printTable(current)
  console.log('')

  if (changes.length === 0) {
    console.log('All eight Contact fields already match. Nothing to do.')
    return
  }

  console.log('Changes:')
  for (const change of changes) console.log(`  ${change}`)
  console.log('')
  console.log(
    'Every other field on the document (logo, donationLink, socials, nav, footer) is left ' +
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
  // The Migration API's PUT only carries title, uid, tags and data. Handing it the whole
  // fetched document forwards a null root uid for a singleton, which the API rejects. Send
  // the minimum and cast, exactly as scripts/fix-settings-nav-links.ts does.
  const update = {
    id: settings.id,
    type: 'settings',
    lang: settings.lang,
    data: { ...settingsData, ...values },
  }
  migration.updateDocument(
    update as unknown as Parameters<Migration['updateDocument']>[0],
    'Site Settings'
  )

  console.log('Writing the settings Contact fields through the Migration API.')
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
      'publishes it. Review and publish in the Prismic dashboard (Releases -> the ' +
      'migration release -> Publish).'
  )
  console.log('')

  // --- read back -----------------------------------------------------------------------
  console.log('Reading the settings document back.')
  const readBack = await client.getSingle('settings')
  const readData = (readBack.data ?? {}) as Record<string, unknown>
  let allMatch = true
  for (const field of Object.keys(values)) {
    const value = currentContactField(readData, field)
    const matches = value === values[field]
    allMatch &&= matches
    console.log(
      `  ${field.padEnd(20)} read back: ${JSON.stringify(value || null)}  ${
        matches ? 'OK' : 'not yet visible'
      }`
    )
  }
  console.log('')
  if (allMatch) {
    console.log(
      'Read-back matches the plan. The update is live on the master ref.'
    )
  } else {
    console.log(
      'Read-back still shows an old value for at least one field. That is expected if the ' +
        'update landed in the unpublished migration release: /api/v2 does not expose it as a ' +
        'ref, so this script cannot see it until a human publishes the release. It is neither ' +
        'confirmed written nor confirmed failed from here. Check the release in the Prismic ' +
        'dashboard.'
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
