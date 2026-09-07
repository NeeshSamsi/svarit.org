/** Prismic client construction shared by the migration and backup scripts. */

import { readFile } from 'node:fs/promises'
import {
  createClient,
  createWriteClient,
  type Client,
  type WriteClient,
} from '@prismicio/client'
import { CONFIG_PATH } from './paths.ts'

export async function resolveRepositoryName(): Promise<string> {
  const config: { repositoryName: string } = JSON.parse(
    await readFile(CONFIG_PATH, 'utf8')
  )
  return process.env.NEXT_PUBLIC_PRISMIC_ENVIRONMENT || config.repositoryName
}

/**
 * A write client when a write token is available, a plain read client otherwise, so that
 * dry runs and backups still work without credentials on a public repository.
 */
export function clientFor(repositoryName: string, writeToken?: string): Client {
  return writeToken
    ? createWriteClient(repositoryName, { writeToken })
    : createClient(repositoryName)
}

export function asWriteClient(client: Client): WriteClient {
  return client as WriteClient
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
