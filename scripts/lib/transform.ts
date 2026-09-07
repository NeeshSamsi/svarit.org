/**
 * Pure mapping helpers shared by the migration scripts.
 *
 * Everything here is deterministic and free of I/O so it can be covered by
 * `scripts/transform.test.ts`.
 */

import type { RTParagraphNode } from '@prismicio/client'
import type { ContentEvent } from './content.ts'

/** Longest uid Prismic is comfortable with here. Keeps generated slugs readable. */
const MAX_UID_LENGTH = 60

/** Turns a title or name into a Prismic uid. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201c\u201d]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_UID_LENGTH)
    .replace(/-+$/g, '')
}

/**
 * Returns a uid unique within `taken`, suffixing -2, -3 and so on when titles collide.
 * Mutates `taken` so repeated calls keep de-duplicating against earlier results.
 */
export function uniqueUid(base: string, taken: Set<string>): string {
  let uid = base
  let suffix = 2
  while (taken.has(uid)) {
    uid = `${base}-${suffix}`
    suffix += 1
  }
  taken.add(uid)
  return uid
}

/** Convenience wrapper: slugify a title and de-duplicate it in one step. */
export function uidFor(title: string, taken: Set<string>): string {
  return uniqueUid(slugify(title), taken)
}

export function paragraph(text: string): RTParagraphNode {
  return { type: 'paragraph', text, spans: [] }
}

/** Plain strings to a Prismic rich text value. Empty strings are dropped. */
export function richText(...texts: string[]): RTParagraphNode[] {
  return texts.filter((text) => text.trim().length > 0).map(paragraph)
}

export function webLink(url: string) {
  return { link_type: 'Web' as const, url }
}

/** Builds a shared slice in the shape the Migration API expects. */
export function slice(
  sliceType: string,
  primary: Record<string, unknown>,
  variation = 'default'
) {
  return { slice_type: sliceType, variation, items: [], primary }
}

/** Maps a content.json event's date object onto the `event` type's date fields. */
export function eventDates(entry: ContentEvent): {
  start_date: string
  date_label: string
} {
  return { start_date: entry.date.date, date_label: entry.date.label }
}

/** Prismic returns non-repeatable groups as an array of one. Tolerate a bare object too. */
export function normaliseGroup(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? {}
  if (value && typeof value === 'object')
    return value as Record<string, unknown>
  return {}
}

export function isFilledRichText(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

export function isFilledText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export type SettingsMergeResult = {
  data: Record<string, unknown>
  notes: string[]
}

export type SettingsOverrides = {
  copyright: string
  credits: string
  /** Forced over whatever is in Prismic. See `contact` handling below. */
  contact: string
  /** Forced over whatever is in Prismic. See `donationLink` handling below. */
  donationUrl: string
}

/**
 * Merges the footer copy from content.json into the settings document already in Prismic.
 *
 * The default is conservative: fields that already have content are left alone. Two fields
 * are deliberate exceptions, both decided by the user, because the values sitting in Prismic
 * are stale rather than newer:
 *
 * - `footer.contact` is forced to content.json's value. Prismic still holds the old
 *   svarittrust1@gmail.com address, replaced by team@svarit.org in commit 0ccadaa.
 * - `donationLink` is forced to the pages.razorpay.com URL, which is the one the live Donate
 *   button uses. Prismic still holds the older rzp.io short link.
 *
 * The v1 `volunteers` group is stripped, because contract v2 replaces it with the standalone
 * `volunteer` custom type.
 */
export function mergeSettings(
  remoteData: Record<string, unknown>,
  overrides: SettingsOverrides
): SettingsMergeResult {
  const notes: string[] = []
  const nextData: Record<string, unknown> = { ...remoteData }

  if (
    Array.isArray(remoteData.volunteers) &&
    remoteData.volunteers.length > 0
  ) {
    notes.push(
      `settings.volunteers held ${remoteData.volunteers.length} entries from the v1 schema. ` +
        'They were dropped from the settings document because volunteers are now their own ' +
        'custom type. The migration creates volunteer documents separately.'
    )
  }
  delete nextData.volunteers

  // --- donationLink, forced -----------------------------------------------------------
  // A repeatable Link field. Replace only the url on each entry so the link text, target
  // and key survive.
  const remoteDonation = Array.isArray(remoteData.donationLink)
    ? (remoteData.donationLink as Record<string, unknown>[])
    : []

  if (remoteDonation.length > 0) {
    const stale = remoteDonation
      .map((entry) => entry.url)
      .filter((url) => url !== overrides.donationUrl)

    if (stale.length > 0) {
      notes.push(
        `settings.donationLink was force-updated to ${overrides.donationUrl}, replacing ` +
          `${stale.join(', ')}. This overwrites existing content on purpose.`
      )
    }

    nextData.donationLink = remoteDonation.map((entry) => ({
      ...entry,
      url: overrides.donationUrl,
    }))
  } else {
    nextData.donationLink = [
      { link_type: 'Web', url: overrides.donationUrl, target: '_blank' },
    ]
    notes.push(
      `settings.donationLink was empty and was set to ${overrides.donationUrl}.`
    )
  }

  // --- footer --------------------------------------------------------------------------
  const remoteFooter = normaliseGroup(remoteData.footer)
  const nextFooter: Record<string, unknown> = { ...remoteFooter }

  // contact, forced.
  if (
    isFilledText(remoteFooter.contact) &&
    remoteFooter.contact !== overrides.contact
  ) {
    notes.push(
      `settings.footer.contact was force-updated to "${overrides.contact}", replacing ` +
        `"${remoteFooter.contact}". This overwrites existing content on purpose.`
    )
  }
  nextFooter.contact = overrides.contact

  // copyright and credits, conservative.
  if (isFilledText(remoteFooter.copyright)) {
    notes.push(
      'settings.footer.copyright already has content in Prismic and was left alone.'
    )
  } else {
    nextFooter.copyright = overrides.copyright
  }

  if (isFilledRichText(remoteFooter.credits)) {
    notes.push(
      'settings.footer.credits already has content in Prismic and was left alone.'
    )
  } else {
    nextFooter.credits = richText(overrides.credits)
  }

  // Write the group back in the shape the API handed it over in.
  nextData.footer = Array.isArray(remoteData.footer) ? [nextFooter] : nextFooter

  return { data: nextData, notes }
}
