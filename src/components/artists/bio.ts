import type { KeyTextField } from '@prismicio/client'

/**
 * The artist `bio` field was migrated from Rich Text to Text. Documents created
 * under the old model still return `[]` for it over the API, and
 * `isFilled.keyText([])` is `true`, so that guard lets an empty paragraph
 * through. Normalise to a trimmed string that is empty whenever there is nothing
 * real to render, and let the caller drop the element entirely.
 */
export function artistBioText(bio: KeyTextField): string {
  return typeof bio === 'string' ? bio.trim() : ''
}
