/**
 * The couple of Prismic endpoints `@prismicio/client` does not expose publicly.
 *
 * Both use the same auth the write client uses internally: a `repository` header plus a
 * bearer write token.
 */

import type { ExistingAsset } from './assets.ts'

const ASSET_API = 'https://asset-api.prismic.io'

function headers(repositoryName: string, writeToken: string) {
  return { repository: repositoryName, authorization: `Bearer ${writeToken}` }
}

/**
 * Lists every asset in the media library, paginated.
 *
 * Used to reference an image that is already uploaded rather than uploading a second copy of
 * it. Returns an empty list rather than throwing, because failing to reuse an asset only
 * costs a duplicate upload and must never block a migration.
 */
export async function listAssets(
  repositoryName: string,
  writeToken: string
): Promise<ExistingAsset[]> {
  const assets: ExistingAsset[] = []
  let cursor: string | undefined

  try {
    do {
      const url = new URL('/assets', ASSET_API)
      url.searchParams.set('limit', '100')
      if (cursor) url.searchParams.set('cursor', cursor)

      const response = await fetch(url, {
        headers: headers(repositoryName, writeToken),
      })
      if (!response.ok) return assets

      const body = (await response.json()) as {
        items?: ExistingAsset[]
        cursor?: string
      }

      const items = body.items ?? []
      assets.push(...items)

      // The API keeps returning a cursor on the last page, so stop on a short page.
      cursor = items.length === 100 ? body.cursor : undefined
    } while (cursor)
  } catch {
    return assets
  }

  return assets
}
