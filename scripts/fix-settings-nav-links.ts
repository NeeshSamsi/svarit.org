#!/usr/bin/env node
/**
 * Repairs the `settings` singleton's navigation links.
 *
 * The nav links in Prismic are bare in-page anchors (`#about`, `#initiatives`, `#contact`).
 * Those only resolve on the home page; on `/artists` or an event page they scroll nowhere.
 * This script:
 *
 *   - rewrites each bare section anchor to a root-relative one: `#about` -> `/#about`,
 *     `#initiatives` -> `/#initiatives`, `#contact` -> `/#contact`. Every other property on
 *     the link entry (its text, key, target) is preserved.
 *   - inserts a new link, "Artists" -> `/artists`, immediately AFTER the Initiatives link.
 *   - leaves every other settings field byte-for-byte untouched. The user hand-edited
 *     `donationLink` and `footer.contact`; this never rewrites them.
 *
 * It is idempotent. A second run finds the anchors already root-relative and an Artists link
 * already present, and does nothing.
 *
 *   node --experimental-strip-types scripts/fix-settings-nav-links.ts
 *       Dry run. Reads settings, prints the before/after, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/fix-settings-nav-links.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes the one settings
 *       update through the Migration API, then reads it back.
 *
 * It NEVER publishes. The update lands in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards may still show the old links; that is
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
// The transform (pure, covered by scripts/fix-settings-nav-links.test.ts)
// -----------------------------------------------------------------------------------------

export type NavLink = Record<string, unknown> & {
  url?: unknown
  text?: unknown
}

/** Bare in-page anchors and what each becomes. */
export const SECTION_LINK_REWRITES: Record<string, string> = {
  '#about': '/#about',
  '#initiatives': '/#initiatives',
  '#contact': '/#contact',
}

/** The new link, dropped in right after Initiatives. */
export const ARTISTS_LINK: NavLink = {
  link_type: 'Web',
  url: '/artists',
  text: 'Artists',
}

/** The Initiatives anchor, before or after the rewrite, so the insert point is found either way. */
const INITIATIVES_URLS = new Set(['#initiatives', '/#initiatives'])

const linkUrl = (link: NavLink): string =>
  typeof link.url === 'string' ? link.url : ''

const linkText = (link: NavLink): string =>
  typeof link.text === 'string' ? link.text : ''

export type NavPlan = {
  links: NavLink[]
  changes: string[]
}

/**
 * Given the current nav links, returns the repaired list and a human-readable list of the
 * changes made. An empty `changes` array means the links are already correct.
 *
 * Throws if there is no Initiatives link to anchor the new Artists link against, rather than
 * guessing where it should go.
 */
export function planNavLinks(links: NavLink[]): NavPlan {
  const changes: string[] = []

  // 1. Root-relative the bare section anchors. Spread preserves key/target/text.
  let next: NavLink[] = links.map((link) => {
    const rewrite = SECTION_LINK_REWRITES[linkUrl(link)]
    if (!rewrite) return link
    changes.push(`rewrite  "${linkText(link)}"  ${linkUrl(link)} -> ${rewrite}`)
    return { ...link, url: rewrite }
  })

  // 2. Add the Artists link after Initiatives, unless one already points at /artists.
  const alreadyHasArtists = next.some(
    (link) => linkUrl(link).replace(/\/$/, '') === '/artists'
  )

  if (!alreadyHasArtists) {
    const initiativesIndex = next.findIndex((link) =>
      INITIATIVES_URLS.has(linkUrl(link))
    )
    if (initiativesIndex === -1) {
      throw new Error(
        'No Initiatives nav link found (looked for "#initiatives" or "/#initiatives"). ' +
          'Cannot decide where the Artists link goes. Aborting rather than guessing.'
      )
    }
    next = [
      ...next.slice(0, initiativesIndex + 1),
      { ...ARTISTS_LINK },
      ...next.slice(initiativesIndex + 1),
    ]
    changes.push(
      `insert   "Artists"  -> /artists  (immediately after "${linkText(
        next[initiativesIndex]
      )}")`
    )
  }

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
        'scripts/fix-settings-nav-links.ts --commit'
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
  const { links: after, changes } = planNavLinks(before)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (settings ${settings.id}, locale ${settings.lang}).`
  )
  console.log('')
  printLinks('current', before)
  console.log('')
  printLinks('after', after)
  console.log('')

  if (changes.length === 0) {
    console.log('Nav links are already correct. Nothing to do.')
    return
  }

  console.log('Changes:')
  for (const change of changes) console.log(`  ${change}`)
  console.log('')
  console.log(
    'Every other settings field (logo, donationLink, socials, footer) is left exactly as it ' +
      'is in Prismic.'
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
  const matches =
    JSON.stringify(readLinks.map((l) => linkUrl(l))) ===
    JSON.stringify(after.map((l) => linkUrl(l)))

  printLinks('read back', readLinks)
  console.log('')
  if (matches) {
    console.log(
      'Read-back matches the plan. The update is live on the master ref.'
    )
  } else {
    console.log(
      'Read-back still shows the old links. That is expected if the update landed in the ' +
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
