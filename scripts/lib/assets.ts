/**
 * Registers local files from `public/` as Prismic media library assets.
 *
 * Two paths:
 *
 * - A file already in the media library, matched by filename, is referenced directly as a
 *   filled image field. Nothing is uploaded. This is what keeps a repair run from adding a
 *   second copy of all 20 assets every time it runs.
 * - Anything else is registered with `migration.createAsset()` and uploaded by `migrate()`.
 *   That call deduplicates on the value passed as `file`, so the same `File` instance has to
 *   be reused for a given path or the same image would upload twice within one run.
 */

import { readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import {
  PrismicMigrationAsset,
  type FilledImageFieldImage,
  type Migration,
} from '@prismicio/client'
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

/** The subset of a Prismic Asset API item this needs. */
export type ExistingAsset = {
  id: string
  url: string
  filename: string
  width?: number
  height?: number
  alt?: string | null
  kind?: string
}

/**
 * Either a new asset awaiting upload, or a filled image field pointing at one already in the
 * media library. Both are accepted wherever a document image field is built.
 */
export type ImageRef = PrismicMigrationAsset | FilledImageFieldImage

function imageFieldFor(
  asset: ExistingAsset,
  alt?: string
): FilledImageFieldImage {
  return {
    id: asset.id,
    url: asset.url,
    dimensions: { width: asset.width ?? 0, height: asset.height ?? 0 },
    edit: { x: 0, y: 0, zoom: 1, background: 'transparent' },
    alt: alt ?? asset.alt ?? null,
    copyright: null,
  }
}

/** Builds a link to media field from whichever kind of reference it is handed. */
export function mediaLink(ref: ImageRef) {
  return ref instanceof PrismicMigrationAsset
    ? { link_type: 'Media' as const, id: ref }
    : { link_type: 'Media' as const, id: ref.id }
}

export class AssetRegistry {
  #migration: Migration
  #files = new Map<string, File>()
  #paths = new Map<PrismicMigrationAsset, string>()
  #existing: Map<string, ExistingAsset>
  #reused = new Set<string>()

  constructor(migration: Migration, existing: ExistingAsset[] = []) {
    this.#migration = migration
    this.#existing = new Map(existing.map((asset) => [asset.filename, asset]))
  }

  /** Registers a file under `public/`, addressed the way content.json does: "/assets/...". */
  async add(publicPath: string, alt?: string): Promise<ImageRef> {
    const absolute = join(ROOT, 'public', publicPath.replace(/^\//, ''))
    const filename = basename(absolute)

    const alreadyThere = this.#existing.get(filename)
    if (alreadyThere) {
      this.#reused.add(publicPath)
      return imageFieldFor(alreadyThere, alt)
    }

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

  /** Files that will be uploaded. */
  get size(): number {
    return this.#files.size
  }

  /** Files already in the media library that were referenced instead of re-uploaded. */
  get reusedCount(): number {
    return this.#reused.size
  }
}
