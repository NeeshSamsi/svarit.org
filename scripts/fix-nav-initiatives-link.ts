#!/usr/bin/env node
/**
 * Repoints the `settings` singleton's Initiatives nav link at the new /initiatives page.
 *
 * The /events index is becoming /initiatives. The nav's Initiatives entry still points at the
 * home-page section anchor (`/#initiatives`), which now scrolls nowhere useful. This script
 * rewrites that one link's `url` to `/initiatives` and leaves everything else alone:
 *
 *   - the Initiatives entry keeps its text, key, link_type and target; only `url` changes.
 *   - every other nav link is untouched.
 *   - every other settings field is untouched. The user hand-edited `donationLink` and
 *     `footer.contact`; this never rewrites them.
 *
 * The link is matched by its `url` being `/#initiatives`, falling back to a unique link whose
 * text is "Initiatives". It is never matched by array position.
 *
 * It is idempotent. A second run finds a link already pointing at `/initiatives` and does
 * nothing.
 *
 *   node --experimental-strip-types scripts/fix-nav-initiatives-link.ts
 *       Dry run. Reads settings, prints the before/after, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/fix-nav-initiatives-link.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the one settings
 *       update through the Migration API, then reads it back.
 *
 * It NEVER publishes. The update lands in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards may still show the old url; that is
 * reported as "not yet visible", not as a failure.
 */

import { pathToFileURL } from 'node:url'
import {
  createMigration,
  type Migration,
  type PrismicDocument,
} from '@prismicio/client'
import { runBackup } from './lib/backup.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { normaliseGroup } from './lib/transform.ts'

// -----------------------------------------------------------------------------------------
// The transform (pure, covered by scripts/fix-nav-initiatives-link.test.ts)
// -----------------------------------------------------------------------------------------

export type NavLink = Record<string, unknown> & {
  url?: unknown
  text?: unknown
}

/** Where the Initiatives link points today, and where it should point instead. */
export const OLD_INITIATIVES_URL = '/#initiatives'
export const NEW_INITIATIVES_URL = '/initiatives'

const linkUrl = (link: NavLink): string =>
  typeof link.url === 'string' ? link.url : ''

const linkText = (link: NavLink): string =>
  typeof link.text === 'string' ? link.text : ''

export type NavPlan = {
  links: NavLink[]
  changes: string[]
}

/**
 * Given the current nav links, returns the list with the Initiatives link repointed at
 * `/initiatives` and a human-readable list of the changes made. An empty `changes` array
 * means the link already points there.
 *
 * The link is found by its `url` being `/#initiatives`; if no link has that url, a single
 * link whose text is "Initiatives" is used instead. Throws rather than guessing when neither
 * finds exactly one link, or when the text match is ambiguous.
 */
export function planInitiativesLink(links: NavLink[]): NavPlan {
  const changes: string[] = []

  // Already done? A link pointing at the new url means an earlier run (or a human) fixed it.
  if (links.some((link) => linkUrl(link) === NEW_INITIATIVES_URL)) {
    return { links, changes }
  }

  // Prefer an exact url match. Spread preserves key/target/text/link_type.
  let index = links.findIndex((link) => linkUrl(link) === OLD_INITIATIVES_URL)

  // Fall back to the link labelled "Initiatives", but only if there is exactly one.
  if (index === -1) {
    const byText = links.flatMap((link, i) =>
      linkText(link).trim() === 'Initiatives' ? [i] : []
    )
    if (byText.length > 1) {
      throw new Error(
        `Found ${byText.length} nav links with text "Initiatives" and none with url ` +
          `"${OLD_INITIATIVES_URL}". Cannot tell which one to repoint. Aborting rather than ` +
          'guessing.'
      )
    }
    if (byText.length === 1) index = byText[0]
  }

  if (index === -1) {
    throw new Error(
      `No Initiatives nav link found (looked for url "${OLD_INITIATIVES_URL}" or a single ` +
        'link with text "Initiatives"). Aborting rather than guessing.'
    )
  }

  const target = links[index]
  const next = links.map((link, i) =>
    i === index ? { ...link, url: NEW_INITIATIVES_URL } : link
  )
  changes.push(
    `repoint  "${linkText(target)}"  ${linkUrl(target)} -> ${NEW_INITIATIVES_URL}`
  )

  return { links: next, changes }
}

/** Pulls the nav links out of a fetched settings document, tolerating both group shapes. */
export function currentNavLinks(
  settingsData: Record<string, unknown>
): NavLink[] {
  const nav = normaliseGroup(settingsData.nav)
  return Array.isArray(nav.links) ? (nav.links as NavLink[]) : []
}

// -----------------------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const known = ['--commit']
  const unknown = argv.filter((arg) => !known.includes(arg))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. ` +
        `Supported: --commit`
    )
  }
  return { commit: argv.includes('--commit') }
}

function printLinks(label: string, links: NavLink[]) {
  console.log(`  ${label}:`)
  if (links.length === 0) {
    console.log('    (none)')
    return
  }
  for (const link of links) {
    const target = link.target ? `  target=${String(link.target)}` : ''
    console.log(
      `    ${linkText(link) || '(no text)'}  ->  ${linkUrl(link)}${target}`
    )
  }
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/fix-nav-initiatives-link.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  let settings: PrismicDocument
  try {
    settings = await client.getSingle('settings')
  } catch (error) {
    throw new Error(
      `Could not read the settings document (${describeError(error)}). It must exist and be ` +
        'published before its nav links can be repaired.'
    )
  }

  const settingsData = (settings.data ?? {}) as Record<string, unknown>
  const before = currentNavLinks(settingsData)
  const { links: after, changes } = planInitiativesLink(before)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (settings ${settings.id}, locale ${settings.lang}).`
  )
  console.log('')
  printLinks('current', before)
  console.log('')
  printLinks('after', after)
  console.log('')

  if (changes.length === 0) {
    console.log(
      'The Initiatives link already points at /initiatives. Nothing to do.'
    )
    return
  }

  console.log('Changes:')
  for (const change of changes) console.log(`  ${change}`)
  console.log('')
  console.log(
    'Every other nav link, and every other settings field (logo, donationLink, socials, ' +
      'footer), is left exactly as it is in Prismic.'
  )

  // The payload: the whole existing data object, with only nav.links replaced.
  const nextData: Record<string, unknown> = {
    ...settingsData,
    nav: [{ ...normaliseGroup(settingsData.nav), links: after }],
  }

  if (!commit) {
    console.log('')
    console.log('Nothing was written. Re-run with --commit to apply.')
    return
  }

  // --- commit ---------------------------------------------------------------------------
  console.log('')
  console.log('Backing up the whole repository before writing anything.')
  let backup
  try {
    backup = await runBackup(client, repositoryName, (message) =>
      console.log(message)
    )
  } catch (error) {
    throw new Error(
      `Backup failed, so nothing was written: ${describeError(error)}`
    )
  }
  console.log(`Backed up ${backup.documentCount} documents to ${backup.file}`)
  console.log('')

  // Typed as the library's base Migration so the updateDocument cast below stays loose,
  // exactly as scripts/lib/plan.ts does it.
  const migration: Migration = createMigration()
  // The Migration API's PUT only carries title, uid, tags and data. Handing it the whole
  // fetched document forwards a null root uid for a singleton, which the API rejects. Send
  // the minimum and cast, exactly as scripts/lib/plan.ts does for the footer merge.
  const update = {
    id: settings.id,
    type: 'settings',
    lang: settings.lang,
    data: nextData,
  }
  migration.updateDocument(
    update as unknown as Parameters<Migration['updateDocument']>[0],
    'Site Settings'
  )

  console.log('Writing the settings update through the Migration API.')
  await asWriteClient(client).migrate(migration, {
    reporter: (event) => {
      if (event.type === 'documents:updated') {
        console.log(`  updated ${event.data.updated} document(s)`)
      }
    },
  })
  console.log('')
  console.log(
    'The update is in the repository migration release, unpublished. This script never ' +
      'publishes it. Review and publish it in the Prismic dashboard (Releases -> the ' +
      'migration release -> Publish).'
  )
  console.log('')

  // --- read back -----------------------------------------------------------------------
  console.log('Reading the settings document back.')
  const readBack = await client.getSingle('settings')
  const readLinks = currentNavLinks(
    (readBack.data ?? {}) as Record<string, unknown>
  )
  const matches = readLinks.some(
    (link) => linkUrl(link) === NEW_INITIATIVES_URL
  )

  printLinks('read back', readLinks)
  console.log('')
  if (matches) {
    console.log(
      'Read-back matches the plan. The update is live on the master ref.'
    )
  } else {
    console.log(
      'Read-back still shows the old url. That is expected if the update landed in the ' +
        'unpublished migration release: /api/v2 does not expose it as a ref, so this script ' +
        'cannot see it until a human publishes the release. It is neither confirmed written ' +
        'nor confirmed failed from here. Check the release in the Prismic dashboard.'
    )
  }
  console.log('')
  console.log(`Backup: ${backup.file}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
