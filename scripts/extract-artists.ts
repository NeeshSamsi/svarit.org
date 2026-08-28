#!/usr/bin/env node
/**
 * Extracts candidate artist names out of the 24 event and workshop descriptions in
 * `src/data/content.json` and writes a reviewable draft to `scripts/artists.draft.json`.
 *
 * content.json has no artist records. Artist names only exist inside prose, so this is a
 * best-effort parse that a human has to correct before anything is written to Prismic.
 * Nothing here talks to Prismic.
 *
 *   pnpm extract:artists
 */

import { writeFile } from 'node:fs/promises'
import { buildDraft, collectMentions } from './lib/artists.ts'
import { allEventEntries, loadContent } from './lib/content.ts'
import { DRAFT_PATH, relativePath } from './lib/paths.ts'
import { describeError } from './lib/prismic.ts'

async function main() {
  const content = await loadContent()
  const events = allEventEntries(content).map(({ entry }) => entry)

  const mentions = collectMentions(events)
  const artists = buildDraft(mentions)

  const draft = {
    approved: false,
    generatedAt: new Date().toISOString(),
    source:
      'src/data/content.json (initiatives.events + initiatives.workshops)',
    instructions: [
      'These names were parsed out of event description prose. Nothing is authoritative.',
      'Fix names, merge duplicates, delete anything that is not a person, fill in disciplines.',
      'uid must be unique, lowercase, and hyphenated. Changing a name does not change its uid.',
      'The artist custom type has no honorific field, so honorific is kept here for reference only and is not migrated.',
      'Set "approved" to true once the list is correct, then run: pnpm migrate:preview --with-artists',
    ],
    eventsScanned: events.length,
    mentionsFound: mentions.length,
    artists,
  }

  await writeFile(DRAFT_PATH, `${JSON.stringify(draft, null, 2)}\n`, 'utf8')

  const needsReview = artists.filter((artist) => artist.review.length > 0)

  console.log(
    `Scanned ${events.length} descriptions, found ${mentions.length} mentions.`
  )
  console.log(
    `Wrote ${artists.length} candidate artists to ${relativePath(DRAFT_PATH)}`
  )
  console.log(`${needsReview.length} of them are flagged for review.`)
  console.log('')
  console.log('Review the file, correct it, then set "approved": true.')
}

try {
  await main()
} catch (error) {
  console.error('')
  console.error(describeError(error))
  process.exitCode = 1
}
