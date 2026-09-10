/** Splits a full name into Bento's `first_name` / `last_name` fields. */
export function splitName(name: string): {
  first_name: string
  last_name: string
} {
  const words = name.trim().split(/\s+/).filter(Boolean)

  return {
    first_name: words[0] ?? '',
    last_name: words.slice(1).join(' '),
  }
}
