/** Filesystem locations shared by the migration scripts. */

import { fileURLToPath } from 'node:url'

export const ROOT = fileURLToPath(new URL('../..', import.meta.url))

export const CONTENT_PATH = new URL(
  '../../src/data/content.json',
  import.meta.url
)
export const CONFIG_PATH = new URL('../../prismic.config.json', import.meta.url)
export const DRAFT_PATH = new URL('../artists.draft.json', import.meta.url)
export const PREVIEW_PATH = new URL(
  '../migration-preview.json',
  import.meta.url
)
export const BACKUP_DIR = new URL('../../backups/', import.meta.url)
export const LATEST_BACKUP_PATH = new URL(
  '../../backups/latest.json',
  import.meta.url
)

/** Renders a path relative to the repository root, for readable log output. */
export function relativePath(target: URL | string): string {
  const absolute = typeof target === 'string' ? target : fileURLToPath(target)
  return absolute.replace(ROOT, '')
}
