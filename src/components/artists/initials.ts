/**
 * The monogram shown in place of a missing artist photo. Takes the first letter
 * of the first and last words of the name: one initial for a mononym, two for
 * everything else. Returns an empty string when there is no usable name, and the
 * caller renders nothing rather than an empty box.
 */
export function artistInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''

  const firstChar = [...words[0]][0] ?? ''
  const lastChar =
    words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : ''

  return (firstChar + lastChar).toLocaleUpperCase()
}
