/**
 * Full-repository backup.
 *
 * Dumps every document in the Prismic repository to `backups/prismic-<timestamp>.json`
 * and updates `backups/latest.json` to point at it. A read token is enough, so this works
 * before any write credentials exist.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Client, PrismicDocument } from '@prismicio/client'
import { BACKUP_DIR, LATEST_BACKUP_PATH, relativePath } from './paths.ts'

/** Documents fetched per request. 100 is the Prismic maximum. */
const PAGE_SIZE = 100

export type BackupResult = {
  file: string
  latestFile: string
  documentCount: number
  ref: string
  generatedAt: string
}

/** ISO 8601 with the colons swapped out so the value is safe in a filename. */
export function backupTimestamp(date = new Date()): string {
  return date.toISOString().replace(/:/g, '-')
}

/**
 * Reads every document on the master ref, page by page, and writes it to disk.
 * Throws on any failure. Callers that gate writes on a successful backup must not swallow it.
 */
export async function runBackup(
  client: Client,
  repositoryName: string,
  log: (message: string) => void = () => {}
): Promise<BackupResult> {
  const masterRef = await client.getMasterRef()

  const documents: PrismicDocument[] = []
  let page = 1
  let totalPages = 1

  // An unfiltered query returns every document of every type, which is what a backup wants.
  do {
    const response = await client.get({
      ref: masterRef.ref,
      pageSize: PAGE_SIZE,
      page,
    })
    documents.push(...response.results)
    totalPages = response.total_pages
    log(
      `  fetched page ${page}/${totalPages} (${documents.length} documents so far)`
    )
    page += 1
  } while (page <= totalPages)

  const generatedAt = new Date().toISOString()
  const backupPath = new URL(
    `prismic-${backupTimestamp(new Date(generatedAt))}.json`,
    BACKUP_DIR
  )

  const payload = {
    repository: repositoryName,
    ref: masterRef.ref,
    refLabel: masterRef.label,
    generatedAt,
    documentCount: documents.length,
    documents,
  }

  await mkdir(fileURLToPath(BACKUP_DIR), { recursive: true })
  await writeFile(backupPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  const pointer = {
    file: relativePath(backupPath),
    repository: repositoryName,
    generatedAt,
    documentCount: documents.length,
    ref: masterRef.ref,
  }
  await writeFile(
    LATEST_BACKUP_PATH,
    `${JSON.stringify(pointer, null, 2)}\n`,
    'utf8'
  )

  return {
    file: relativePath(backupPath),
    latestFile: relativePath(LATEST_BACKUP_PATH),
    documentCount: documents.length,
    ref: masterRef.ref,
    generatedAt,
  }
}
