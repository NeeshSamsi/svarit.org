import { cache } from 'react'
import * as prismic from '@prismicio/client'
import { createClient } from '@/prismicio'
import type {
  ArtistDocument,
  EventDocument,
  SettingsDocument,
  VolunteerDocument,
} from '../../prismicio-types'

/**
 * Shared Prismic queries.
 *
 * Slices fetch their own data instead of reading a SliceZone `context`, so any
 * slice works on any page. Every query is wrapped in React `cache()`, which
 * dedupes it across a single render pass: several slices calling
 * `getAllEvents()` on one page produce one request, not several.
 *
 * Each query degrades to `null` or `[]` rather than throwing when Prismic has
 * no such document or custom type yet. The migration script has not necessarily
 * run, and the site still has to build. Only Prismic API errors are swallowed,
 * so genuine programming errors still surface.
 */

const fallback = <T>(label: string, value: T, error: unknown): T => {
  if (error instanceof prismic.PrismicError) {
    console.warn(`[queries] ${label} found nothing in Prismic, using fallback.`)

    return value
  }

  throw error
}

export const getSettings = cache(async (): Promise<SettingsDocument | null> => {
  try {
    return await createClient().getSingle('settings')
  } catch (error) {
    return fallback('getSettings', null, error)
  }
})

export const getAllEvents = cache(async (): Promise<EventDocument[]> => {
  try {
    return await createClient().getAllByType('event', {
      orderings: [{ field: 'my.event.start_date', direction: 'desc' }],
    })
  } catch (error) {
    return fallback('getAllEvents', [], error)
  }
})

export const getAllArtists = cache(async (): Promise<ArtistDocument[]> => {
  try {
    return await createClient().getAllByType('artist', {
      orderings: [{ field: 'my.artist.name' }],
    })
  } catch (error) {
    return fallback('getAllArtists', [], error)
  }
})

export const getAllVolunteers = cache(
  async (): Promise<VolunteerDocument[]> => {
    try {
      return await createClient().getAllByType('volunteer', {
        orderings: [{ field: 'my.volunteer.name' }],
      })
    } catch (error) {
      return fallback('getAllVolunteers', [], error)
    }
  }
)
