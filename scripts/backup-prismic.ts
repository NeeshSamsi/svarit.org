#!/usr/bin/env node
/**
 * Dumps every document in the Prismic repository to `backups/prismic-<timestamp>.json`.
 *
 * Read access is enough. PRISMIC_WRITE_TOKEN is used when it is set, so the backup also
 * sees content that is not publicly readable.
 *
 *   pnpm backup
 */

import { runBackup } from './lib/backup.ts'
import {
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'

async function main() {
  const repositoryName = await resolveRepositoryName()
  const client = clientFor(repositoryName, process.env.PRISMIC_WRITE_TOKEN)

  console.log(`Backing up "${repositoryName}".`)

  const result = await runBackup(client, repositoryName, (message) =>
    console.log(message)
  )

  console.log('')
  console.log(`Backed up ${result.documentCount} documents.`)
  console.log(`  ${result.file}`)
  console.log(`  ${result.latestFile} (pointer to the newest backup)`)
}

try {
  await main()
} catch (error) {
  console.error('')
  console.error(`Backup failed: ${describeError(error)}`)
  process.exitCode = 1
}
