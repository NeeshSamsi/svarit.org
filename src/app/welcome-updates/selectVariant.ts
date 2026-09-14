import { isFilled, type Content } from '@prismicio/client'

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

/**
 * Whether a variant has a complete CTA to render: a non-empty label AND a
 * filled link. Guarded with a plain string check, not `isFilled`, because a
 * migrated Text field can read back as `[]` and still pass `isFilled.keyText`.
 */
export function hasCta(variant: Variant): boolean {
  const hasLabel =
    typeof variant.cta_label === 'string' && variant.cta_label.trim() !== ''

  return hasLabel && isFilled.contentRelationship(variant.cta_link)
}
