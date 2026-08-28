/**
 * Reads documents back from Prismic after a write and asserts their fields actually landed.
 *
 * This exists because the Migration API accepted 68 documents, returned 201 for every one of
 * them, and created every single one EMPTY. A write that reports success is not evidence that
 * anything was written. Only a read-back is.
 */

import type { Client, PrismicDocument } from '@prismicio/client'

export type FieldCheck = {
  field: string
  filled: boolean
}

export type DocumentCheck = {
  type: string
  uid?: string
  found: boolean
  /** Set when the document could not be read at all. */
  unreadable?: string
  fields: FieldCheck[]
  data?: Record<string, unknown>
}

/** True when a returned field value carries content rather than being an empty placeholder. */
export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return false
    // An empty image or link field comes back as {} or as a link_type with nothing else.
    if (entries.length === 1 && entries[0][0] === 'link_type') return false
    return entries.some(([, item]) => isFilled(item))
  }
  return false
}

/** Which data keys a document of this type must come back with. */
export function expectedFields(type: string): string[] {
  switch (type) {
    case 'volunteer':
      return ['name', 'photo']
    case 'artist':
      return ['name']
    case 'event':
      return ['title', 'category', 'start_date', 'date_label', 'description']
    case 'page':
      return ['slices', 'meta_title', 'meta_description']
    case 'settings':
      return ['footer', 'donationLink']
    default:
      return []
  }
}

export function checkDocument(
  type: string,
  uid: string | undefined,
  doc: PrismicDocument | null
): DocumentCheck {
  if (!doc) {
    return {
      type,
      uid,
      found: false,
      unreadable:
        'not readable on any ref the repository exposes. A document sitting in an ' +
        'unpublished Prismic migration release is invisible to the query API until that ' +
        'release is published.',
      fields: [],
    }
  }

  const data = (doc.data ?? {}) as Record<string, unknown>

  return {
    type,
    uid,
    found: true,
    fields: expectedFields(type).map((field) => ({
      field,
      filled: isFilled(data[field]),
    })),
    data,
  }
}

/** Reads one document back, trying every ref the repository exposes. */
export async function readBack(
  client: Client,
  type: string,
  uid?: string
): Promise<PrismicDocument | null> {
  let refs: { ref: string }[] = []
  try {
    refs = await client.getRefs()
  } catch {
    refs = []
  }

  const attempts: (string | undefined)[] = [
    undefined,
    ...refs.map((ref) => ref.ref),
  ]

  for (const ref of attempts) {
    try {
      const params = ref ? { ref } : {}
      const doc = uid
        ? await client.getByUID(type, uid, params)
        : await client.getSingle(type, params)
      if (doc) return doc as PrismicDocument
    } catch {
      // Try the next ref.
    }
  }

  return null
}

export function isPassing(check: DocumentCheck): boolean {
  return check.found && check.fields.every((field) => field.filled)
}

/** Renders a check as terminal output. */
export function formatCheck(check: DocumentCheck): string[] {
  const label = check.uid ? `${check.type}/${check.uid}` : check.type
  const lines: string[] = []

  if (!check.found) {
    lines.push(`  FAIL  ${label}  ${check.unreadable}`)
    return lines
  }

  const empty = check.fields.filter((field) => !field.filled)
  if (empty.length === 0) {
    lines.push(
      `  ok    ${label}  ${check.fields.map((f) => f.field).join(', ')} all populated`
    )
  } else {
    lines.push(
      `  FAIL  ${label}  empty fields: ${empty.map((f) => f.field).join(', ')}`
    )
  }

  return lines
}
