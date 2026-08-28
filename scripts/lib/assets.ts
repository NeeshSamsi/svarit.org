/**
 * Registers local files from `public/` as Prismic media library assets.
 *
 * `migration.createAsset()` deduplicates on the value passed as `file`, so the same `File`
 * instance has to be reused for a given path or the same image would upload twice.
 */

import { readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { Migration, PrismicMigrationAsset } from '@prismicio/client'
import { ROOT } from './paths.ts'

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
}

export class AssetRegistry {
  #migration: Migration
  #files = new Map<string, File>()
  #paths = new Map<PrismicMigrationAsset, string>()

  constructor(migration: Migration) {
    this.#migration = migration
  }

  /** Registers a file under `public/`, addressed the way content.json does: "/assets/...". */
  async add(publicPath: string, alt?: string): Promise<PrismicMigrationAsset> {
    const absolute = join(ROOT, 'public', publicPath.replace(/^\//, ''))
    const filename = basename(absolute)

    let file = this.#files.get(absolute)
    if (!file) {
      let bytes: Uint8Array<ArrayBuffer>
      try {
        bytes = Uint8Array.from(await readFile(absolute))
      } catch {
        throw new Error(
          `Asset referenced by content.json is missing on disk: ${publicPath} (looked in ${absolute})`
        )
      }
      file = new File([bytes], filename, {
        type:
          MIME_TYPES[extname(absolute).toLowerCase()] ??
          'application/octet-stream',
      })
      this.#files.set(absolute, file)
    }

    const asset = this.#migration.createAsset(
      file,
      filename,
      alt ? { alt } : undefined
    )
    this.#paths.set(asset, publicPath)

    return asset
  }

  pathOf(asset: PrismicMigrationAsset): string | undefined {
    return this.#paths.get(asset)
  }

  get size(): number {
    return this.#files.size
  }
}
