/**
 * The canonical origin for every absolute URL the site emits: route metadata,
 * Open Graph tags, the sitemap, robots and JSON-LD.
 *
 * `svarit.org` 308-redirects to `www.svarit.org` (the Vercel default), so
 * declaring the apex here would make every canonical point at a URL that
 * immediately redirects. Keep the host on www and let the redirect only ever
 * catch stragglers.
 */
export const SITE_URL = 'https://www.svarit.org'

/**
 * The site-wide title and description from `src/app/layout.tsx`'s `metadata`
 * export. Shared here so a route's title/description fallback (when its own
 * Prismic meta fields are empty) can reuse the exact same copy rather than a
 * second hardcoded copy that could drift from the layout's.
 */
export const SITE_TITLE =
  'Svarit — Honouring Legacy, Shaping the Future of Indian Music'
export const SITE_DESCRIPTION =
  'Founded in 2001, Svarit carries a rich musical legacy into the future — nurturing Indian music through concerts, festivals, education and community.'
