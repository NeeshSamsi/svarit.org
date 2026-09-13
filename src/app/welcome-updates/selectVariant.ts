import type { Content } from '@prismicio/client'

type Variant = Content.WelcomeUpdatesDocumentDataVariantsItem

/**
 * Picks the variant matching `?source=`, trimmed and compared
 * case-insensitively. Falls back to the variant whose `source` is empty, then
 * to the first variant, then to nothing (so the route can 404). Pure and
 * network-free so it can be unit tested directly.
 */
export function selectVariant(
  variants: Variant[],
  source: string | null | undefined
): Variant | undefined {
  if (variants.length === 0) return undefined

  const normalized =
    typeof source === 'string' ? source.trim().toLowerCase() : ''

  if (normalized) {
    const exact = variants.find(
      (variant) =>
        typeof variant.source === 'string' &&
        variant.source.trim().toLowerCase() === normalized
    )
    if (exact) return exact
  }

  const empty = variants.find(
    (variant) => !(typeof variant.source === 'string' && variant.source.trim())
  )
  if (empty) return empty

  return variants[0]
}
