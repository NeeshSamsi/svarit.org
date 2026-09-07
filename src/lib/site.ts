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
