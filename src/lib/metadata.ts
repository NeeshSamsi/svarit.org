/**
 * Title and description fallbacks for routes whose Prismic meta fields are
 * still empty. Prismic always wins: a filled `meta_title` or
 * `meta_description` is used verbatim, with nothing appended. These helpers
 * only cover the gap while an editor's fallback is pending, so precision
 * here matters far less than in a permanently authored value.
 */

/**
 * `'welcome-updates'` -> `'Welcome Updates | Svarit'`. Splits on hyphens,
 * capitalises the first letter of each word, joins with spaces, appends
 * ` | Svarit`.
 *
 * Deliberately no exceptions map: a slug like `faq` becoming `Faq` is fine,
 * because this is only a fallback and a real `meta_title` overrides it. Do
 * not add per-slug special cases here for that reason.
 */
export function titleFromSlug(slug: string): string {
  const words = slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))

  return `${words.join(' ')} | Svarit`
}

export function artistTitle(name: string): string {
  return `${name} at Svarit`
}

export function initiativeTitle(title: string): string {
  return `${title} by Svarit`
}

/**
 * Collapses whitespace and newlines to single spaces, then truncates at a
 * word boundary, never mid-word, appending an ellipsis only when the text
 * actually got cut. If the text fits within `max` already, it is returned
 * unchanged.
 */
export function metaDescription(text: string, max = 155): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()

  if (collapsed.length <= max) return collapsed

  const boundary = collapsed.lastIndexOf(' ', max)

  if (boundary <= 0) {
    // No word boundary within the limit: a single word longer than `max`.
    // Cut at the next boundary instead of breaking mid-word, even though
    // that runs a little past `max`.
    const next = collapsed.indexOf(' ', max)

    return next === -1 ? collapsed : `${collapsed.slice(0, next)}...`
  }

  return `${collapsed.slice(0, boundary)}...`
}

/**
 * `value` if it is a filled string, else `fallback`. Guarded with a plain
 * string check, not `isFilled`, because a migrated Text field reads back as
 * `[]` and still passes `isFilled.keyText`. Returns `value` verbatim when
 * filled, not trimmed: Prismic wins outright, with nothing appended or
 * altered.
 */
export function filledOrFallback(
  value: string | null | undefined,
  fallback: string
): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}
