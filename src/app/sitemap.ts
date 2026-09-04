import type { MetadataRoute } from 'next'
import { createClient } from '@/prismicio'
import { getAllArtists, getAllEvents } from '@/lib/queries'
import { SITE_URL } from '@/lib/site'

/**
 * `page` uids the route resolver in `src/prismicio.ts` sends somewhere other
 * than `/:uid`. Emitting `/home`, `/initiatives` or `/artists` as literal uids
 * would 404, so map them to their real routes instead.
 */
const RESERVED_PAGE_ROUTES: Record<string, string> = {
  home: '/',
  initiatives: '/initiatives',
  artists: '/artists',
}

const loc = (path: string) => (path === '/' ? SITE_URL : `${SITE_URL}${path}`)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Reuse the shared queries so the sitemap's ordering and Prismic error
  // fallbacks match what the routes themselves render. `page` has no shared
  // query, so fall back the same way: an empty list rather than a failed build.
  const [pages, events, artists] = await Promise.all([
    createClient()
      .getAllByType('page')
      .catch(() => []),
    getAllEvents(),
    getAllArtists(),
  ])

  return [
    ...pages.map((page) => ({
      url: loc(RESERVED_PAGE_ROUTES[page.uid] ?? `/${page.uid}`),
      lastModified: page.last_publication_date,
    })),
    ...events.map((event) => ({
      url: loc(`/initiatives/${event.uid}`),
      lastModified: event.last_publication_date,
    })),
    ...artists.map((artist) => ({
      url: loc(`/artists/${artist.uid}`),
      lastModified: artist.last_publication_date,
    })),
  ]
}
