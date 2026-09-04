import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Open Graph and Twitter card image resolution, shared by every route that
 * builds its own `openGraph` object.
 *
 * Next merges metadata shallowly: the moment a route sets `openGraph`, it
 * replaces the layout's wholesale, and an `images: undefined` deletes the
 * `/og/home.jpg` fallback rather than inheriting it. So every route has to set
 * `images` (and re-state `siteName` / `locale`) explicitly. `src/app/page.tsx`
 * documents the same trap for the home page.
 *
 * Precedence for the image itself:
 *
 *   1. the document's own `meta_image` from Prismic,
 *   2. the card generated for this uid by `scripts/generate-og-images.ts`,
 *   3. `/og/home.jpg`, the site-wide fallback.
 *
 * Step 2 is a real file check. The generated cards are a committed build
 * artifact, not produced on Vercel, so a uid whose card has not been generated
 * yet (a brand new document, or before the script has ever run) falls through
 * to the site fallback instead of pointing a share preview at a 404.
 */

export const OG_FALLBACK = '/og/home.jpg'

/** The `public/og/generated/<kind>/` folder a route's cards live in. */
export type OgGeneratedKind = 'artists' | 'initiatives'

type OgImageInput = {
  /** `prismic.asImageSrc(doc.data.meta_image)`, or null / undefined. */
  metaImage?: string | null
  /** Which generated-card folder to look in. Omit for routes that have none. */
  kind?: OgGeneratedKind
  /** The document uid, used to find its generated card. */
  uid?: string
}

/** Resolves the single image URL for a page's share card. */
export function resolveOgImage({ metaImage, kind, uid }: OgImageInput): string {
  if (metaImage) return metaImage

  if (kind && uid) {
    const generated = `/og/generated/${kind}/${uid}.jpg`
    if (existsSync(join(process.cwd(), 'public', generated))) return generated
  }

  return OG_FALLBACK
}

/**
 * The `openGraph` and `twitter` fields that carry the share image, plus the
 * `siteName` / `locale` these routes otherwise lose to the shallow merge.
 * Spread into each route's own `openGraph` / `twitter` objects.
 */
export function ogImageFields(input: OgImageInput) {
  const url = resolveOgImage(input)

  return {
    openGraph: { siteName: 'Svarit', locale: 'en_IN', images: [{ url }] },
    twitter: { images: [url] },
  }
}
