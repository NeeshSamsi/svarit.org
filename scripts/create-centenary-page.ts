#!/usr/bin/env node
/**
 * Creates the `page` document with uid `centenary` (Solo todo P5.1): the Dinkar Kaikini
 * centenary landing page. Slice zone, in order:
 *
 *   1. `hero` (`page_header`)     - title and a one-paragraph biographical lead, both DRAFT
 *                                   copy pending the user's sign-off (see below).
 *   2. `event_list` (`timeline`)  - source "Chosen", an EMPTY `initiatives` group, and
 *                                   `show_signup: true`. The eyebrow text "Celebrations" is
 *                                   the model's own placeholder for `subheading`, not
 *                                   `heading`: `EventListTimeline.tsx` passes
 *                                   `eyebrow={slice.primary.subheading}` and
 *                                   `title={slice.primary.heading}` to `SectionTitle`, so
 *                                   the eyebrow role belongs to `subheading`. `heading` is
 *                                   left empty; nothing in the brief gave this section a
 *                                   bigger title.
 *   3. `donate` (`default`)       - copied verbatim off the published `page/home` document,
 *                                   exactly how `page/artists` gets its trailing donate
 *                                   slice (`scripts/lib/plan.ts`'s `donateSliceFrom`).
 *                                   Never rebuilt from scratch: keeping every donate slice
 *                                   on the site identical is the point of copying. Falls
 *                                   back to the `donate` slice model's own placeholder text
 *                                   only when `page/home` cannot be read, and a run in that
 *                                   state refuses to `--commit` (see below).
 *
 * DRAFT COPY: the hero title, the hero description (a one-paragraph biography of Pandit
 * Dinkar Kaikini), and meta_title/meta_description are all draft, reproduced from the brief
 * for the user to review before publishing - the biographical sentence especially. Every
 * dry run prints a line calling this out.
 *
 * WHY `source: 'Chosen'`, NOT `'Upcoming'`: `'Upcoming'` would auto-fill the timeline with
 * every not-yet-past event, sweeping in any future non-centenary event alongside the twelve
 * centenary documents. Those twelve get linked into `initiatives` explicitly in a later
 * phase. Consequence: until that phase runs, this page's timeline renders EMPTY, so
 * page/centenary should stay unpublished in the migration release until then.
 *
 * ===========================================================================================
 * PREREQUISITE, satisfied as of this session: the `event_list` slice's `timeline` variation
 * is pushed to Prismic. It is recorded here anyway because the Migration API silently drops
 * values for fields, and whole variations, the live type does not know about, rather than
 * rejecting the write - the exact way the privacy policy stranded a half-empty draft twice.
 * Anyone changing the `timeline` (or `hero`/`page_header`, or `donate`) model after this must
 * push with the Prismic CLI (`pnpm prismic:push`) before running `--commit` again.
 * ===========================================================================================
 *
 *   node --experimental-strip-types scripts/create-centenary-page.ts
 *       Dry run. Reads page/home for the donate slice and (if it exists) page/centenary,
 *       prints the plan, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/create-centenary-page.ts --commit
 *       Backs up the whole repository first (aborts if that fails), creates page/centenary
 *       through the Migration API, then reads it back.
 *
 * IDEMPOTENCY. The uid must be free: the live `page` uids as of this writing are `home`,
 * `initiatives`, `artists`, `privacy-policy`. If `page/centenary` already exists, this never
 * creates a duplicate, and it never overwrites it either - refusing is the safer default
 * chosen here over updating in place, since a hand-edit made directly in Prismic (or a
 * deliberate change to the draft copy above) should be reconciled by a human, not silently
 * clobbered by a re-run of this script:
 *
 *   - not found anywhere               -> plan a create.
 *   - found on the master ref, matches the desired shape exactly -> no-op, nothing to write.
 *   - found on the master ref, differs -> REFUSE. The current and desired shapes are both
 *     printed so a human can reconcile them; nothing is written.
 *   - known only from a prior run's local record (see below), not yet visible on the master
 *     ref -> REFUSE. Its contents cannot be read back at all (the Migration API is write
 *     only), so there is nothing safe to compare against; nothing is written.
 *
 * The same problem `create-privacy-policy.ts` documents at length applies here: the query
 * API only ever sees the master ref, so it cannot tell a create from a repeat run once a
 * prior write is sitting in an unpublished release. This script keeps the same kind of local
 * record, at `backups/centenary-page-doc.json` (already gitignored, local machine state,
 * never committed), written right after a successful create.
 *
 * It NEVER publishes. The write lands in the repository's unpublished migration release, for
 * a human to review and publish in the Prismic dashboard. Because /api/v2 does not expose an
 * unpublished release as a ref, the read-back afterwards will not see it; that is reported as
 * "not yet visible", not as a failure.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  createMigration,
  type Migration,
  type PrismicDocument,
} from '@prismicio/client'
import { runBackup } from './lib/backup.ts'
import { DONATE_URL, donateSliceFrom } from './lib/plan.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { paragraph, slice, webLink } from './lib/transform.ts'

// -----------------------------------------------------------------------------------------
// The content (pure, covered by scripts/create-centenary-page.test.ts)
// -----------------------------------------------------------------------------------------

export const PAGE_UID = 'centenary'

export const HERO_TITLE = 'Dinarang Centenary Celebrations 2026 - 2027'
export const HERO_DESCRIPTION =
  'Pandit Dinkar Kaikini was a vocalist, composer and teacher whose work shaped ' +
  'generations of Indian musicians. From 2 October 2026 to 2 October 2027, Svarit marks ' +
  'his centenary with an inaugural festival, four baithaks, four workshops and two ' +
  'scholarships.'

export const TIMELINE_SUBHEADING = 'Celebrations'
export const SIGNUP_HEADING = 'A Year-Long Musical Celebration'
export const SIGNUP_CTA_LABEL = 'Sign up for updates'

export const META_TITLE = 'Dinarang Centenary Celebrations | Svarit'
export const META_DESCRIPTION =
  'Svarit marks the centenary of Pandit Dinkar Kaikini from 2 October 2026 to 2 October ' +
  '2027 with an inaugural festival, baithaks, workshops and scholarships.'

/** The `donate` slice model's own placeholder copy, used only when page/home is unreadable. */
export const DONATE_FALLBACK_HEADING =
  'Join us in shaping the future of Indian Music.'
export const DONATE_FALLBACK_CTA_LABEL = 'Donate to Svarit'

export type Slice = Record<string, unknown> & {
  slice_type?: unknown
  variation?: unknown
  primary?: unknown
}

export function heroSlice(): Slice {
  return slice(
    'hero',
    { title: HERO_TITLE, description: [paragraph(HERO_DESCRIPTION)] },
    'page_header'
  )
}

export function timelineSlice(): Slice {
  return slice(
    'event_list',
    {
      heading: '',
      subheading: TIMELINE_SUBHEADING,
      source: 'Chosen',
      initiatives: [],
      show_signup: true,
      signup_heading: SIGNUP_HEADING,
      signup_cta_label: SIGNUP_CTA_LABEL,
    },
    'timeline'
  )
}

/** Only reached when `page/home` cannot be read; see the file header. */
export function fallbackDonateSlice(): Slice {
  return slice(
    'donate',
    {
      heading: DONATE_FALLBACK_HEADING,
      cta_label: DONATE_FALLBACK_CTA_LABEL,
      cta_link: webLink(DONATE_URL),
      background_image: {},
    },
    'default'
  )
}

export type DonatePlan = { slice: Slice; source: 'home' | 'fallback' }

/** Copies the donate slice off `page/home`, or falls back to the model's placeholder copy. */
export function planDonateSlice(
  remoteHome: PrismicDocument | null
): DonatePlan {
  const fromHome = donateSliceFrom(remoteHome)
  return fromHome
    ? { slice: fromHome as Slice, source: 'home' }
    : { slice: fallbackDonateSlice(), source: 'fallback' }
}

/** The full slice zone: hero, timeline, then the donate slice this run resolved. */
export function buildSlices(donate: Slice): Slice[] {
  return [heroSlice(), timelineSlice(), donate]
}

/** The document's non-slice fields. */
export function buildPageFields(): Record<string, unknown> {
  return { meta_title: META_TITLE, meta_description: META_DESCRIPTION }
}

/** Pulls the slice zone out of a fetched page document. */
export function currentPageSlices(pageData: Record<string, unknown>): Slice[] {
  return Array.isArray(pageData.slices) ? (pageData.slices as Slice[]) : []
}

const sliceType = (entry: Slice): string =>
  typeof entry.slice_type === 'string' ? entry.slice_type : ''

const sliceVariation = (entry: Slice): string =>
  typeof entry.variation === 'string' ? entry.variation : 'default'

/**
 * Canonical form for comparison: only the fields this script owns (slice_type, variation,
 * primary), with empty text values dropped so an absent key and an empty string compare
 * equal. The query API adds `id`, `items`, `version` and `slice_label` to every fetched
 * slice; those are ignored here, exactly as `update-initiatives-page.ts` does it.
 */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const inner = (value as Record<string, unknown>)[key]
      if (inner === '' || inner === null || inner === undefined) continue
      out[key] = canonicalValue(inner)
    }
    return out
  }
  return value
}

function canonicalSlices(slices: Slice[]): string {
  return JSON.stringify(
    slices.map((entry) => ({
      slice_type: sliceType(entry),
      variation: sliceVariation(entry),
      primary: canonicalValue(entry.primary ?? {}),
    }))
  )
}

// -----------------------------------------------------------------------------------------
// Idempotency: what to do about an existing page/centenary (pure, testable)
// -----------------------------------------------------------------------------------------

export type ExistingTarget =
  | { kind: 'none' }
  | {
      kind: 'master-ref'
      id: string
      lang: string
      data: Record<string, unknown>
    }
  | { kind: 'local-record'; id: string; lang: string }

export type PagePlan =
  | { action: 'create'; slices: Slice[]; fields: Record<string, unknown> }
  | { action: 'noop'; reason: string }
  | {
      action: 'refuse'
      reason: string
      current: Slice[]
      desired: Slice[]
    }

/**
 * Decides what this run should do about page/centenary. See the file header for why an
 * existing document that differs is refused rather than overwritten, and why a document
 * known only via the local record is refused rather than guessed at.
 */
export function planCentenaryPage(
  existing: ExistingTarget,
  donate: Slice
): PagePlan {
  const slices = buildSlices(donate)
  const fields = buildPageFields()

  if (existing.kind === 'none') {
    return { action: 'create', slices, fields }
  }

  if (existing.kind === 'local-record') {
    return {
      action: 'noop',
      reason:
        `page/${PAGE_UID} was already created as ${existing.id} in a previous run and is ` +
        'not yet visible on the master ref, so it is still sitting in an unpublished ' +
        'migration release. Its contents cannot be read back to compare (the Migration API ' +
        'is write only), so this refuses to write again rather than risk a duplicate or an ' +
        'unwanted overwrite. Publish or discard that release in the Prismic dashboard, then ' +
        're-run.',
    }
  }

  // master-ref
  const currentSlices = currentPageSlices(existing.data)
  const currentMetaTitle =
    typeof existing.data.meta_title === 'string' ? existing.data.meta_title : ''
  const currentMetaDescription =
    typeof existing.data.meta_description === 'string'
      ? existing.data.meta_description
      : ''

  const matches =
    canonicalSlices(currentSlices) === canonicalSlices(slices) &&
    currentMetaTitle === fields.meta_title &&
    currentMetaDescription === fields.meta_description

  if (matches) {
    return {
      action: 'noop',
      reason: `page/${PAGE_UID} (${existing.id}) already matches the desired shape. Nothing to do.`,
    }
  }

  return {
    action: 'refuse',
    reason:
      `page/${PAGE_UID} (${existing.id}) already exists and differs from the desired shape. ` +
      'Refusing to overwrite an existing document: reconcile the difference by hand in ' +
      'Prismic (or delete the document there) and re-run.',
    current: currentSlices,
    desired: slices,
  }
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

/**
 * Where this script remembers page/centenary's real id between runs, the same way
 * `create-privacy-policy.ts` remembers its page. `backups/` is already gitignored: local
 * machine state, never committed, never shared between machines.
 */
const STATE_PATH = fileURLToPath(
  new URL('../backups/centenary-page-doc.json', import.meta.url)
)

async function readKnownDoc(): Promise<{ id: string; lang: string } | null> {
  try {
    const parsed = JSON.parse(await readFile(STATE_PATH, 'utf8')) as Partial<
      Record<'id' | 'lang', unknown>
    >
    if (typeof parsed.id === 'string' && typeof parsed.lang === 'string') {
      return { id: parsed.id, lang: parsed.lang }
    }
    return null
  } catch {
    return null
  }
}

async function writeKnownDoc(doc: { id: string; lang: string }): Promise<void> {
  await mkdir(dirname(STATE_PATH), { recursive: true })
  await writeFile(
    STATE_PATH,
    `${JSON.stringify(
      {
        uid: PAGE_UID,
        type: 'page',
        ...doc,
        recordedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  )
}

function describeSlice(entry: Slice): string {
  const primary = (entry.primary ?? {}) as Record<string, unknown>
  const head = `${sliceType(entry)}/${sliceVariation(entry)}`

  if (sliceType(entry) === 'hero') {
    return `${head}  title=${JSON.stringify(String(primary.title ?? ''))}`
  }
  if (sliceType(entry) === 'event_list') {
    return (
      `${head}  heading=${JSON.stringify(String(primary.heading ?? ''))}  ` +
      `subheading=${JSON.stringify(String(primary.subheading ?? ''))}  ` +
      `source=${JSON.stringify(String(primary.source ?? ''))}  ` +
      `show_signup=${String(primary.show_signup)}`
    )
  }
  if (sliceType(entry) === 'donate') {
    return `${head}  heading=${JSON.stringify(String(primary.heading ?? ''))}  cta_label=${JSON.stringify(String(primary.cta_label ?? ''))}`
  }
  return head
}

function printSlices(label: string, slices: Slice[]) {
  console.log(`  ${label}:`)
  if (slices.length === 0) {
    console.log('    (none)')
    return
  }
  for (const entry of slices) console.log(`    ${describeSlice(entry)}`)
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/create-centenary-page.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  const existingPageDoc = await client
    .getByUID('page', PAGE_UID)
    .catch(() => null)
  const knownDoc = await readKnownDoc()
  const existing: ExistingTarget = existingPageDoc
    ? {
        kind: 'master-ref',
        id: existingPageDoc.id,
        lang: existingPageDoc.lang,
        data: (existingPageDoc.data ?? {}) as Record<string, unknown>,
      }
    : knownDoc
      ? { kind: 'local-record', id: knownDoc.id, lang: knownDoc.lang }
      : { kind: 'none' }

  const remoteHome = await client.getByUID('page', 'home').catch(() => null)
  const { slice: donate, source: donateSource } = planDonateSlice(remoteHome)
  const lang = remoteHome?.lang ?? existingPageDoc?.lang ?? 'en-us'

  const plan = planCentenaryPage(existing, donate)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (page/${PAGE_UID}, locale ${lang}).`
  )
  console.log('')
  console.log(
    '  DRAFT COPY: the hero title, the hero biography paragraph, and meta_title/' +
      "meta_description below are all draft, pending the user's sign-off - the " +
      'biographical sentence especially.'
  )
  console.log(
    donateSource === 'home'
      ? `  Donate slice copied from the published page/home document (${remoteHome!.id}).`
      : '  Donate slice could NOT be copied from page/home (unreadable, or it carries no ' +
          "donate slice). Using the donate model's own placeholder copy instead; a " +
          '--commit run refuses to write it.'
  )
  console.log('')

  if (plan.action !== 'create') {
    if (plan.action === 'refuse') {
      console.log(plan.reason)
      console.log('')
      printSlices('current (in Prismic)', plan.current)
      console.log('')
      printSlices('desired (this script)', plan.desired)
      console.log('')
      throw new Error(plan.reason)
    }
    console.log(plan.reason)
    return
  }

  printSlices('plan', plan.slices)
  console.log('')
  console.log(`  meta_title: ${JSON.stringify(plan.fields.meta_title)}`)
  console.log(
    `  meta_description: ${JSON.stringify(plan.fields.meta_description)}`
  )
  console.log('')
  console.log(
    `page/${PAGE_UID} does not exist yet (no master-ref match, no local record). Would create it.`
  )

  if (!commit) {
    console.log('')
    console.log('Nothing was written. Re-run with --commit to apply.')
    return
  }

  // --- commit ---------------------------------------------------------------------------
  if (donateSource === 'fallback') {
    throw new Error(
      `page/${PAGE_UID} cannot be written: its donate slice is copied from the published ` +
        'page/home document, which is not readable or carries no donate slice. Publish ' +
        'page/home, or make it readable, then re-run --commit.'
    )
  }

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

  const migration: Migration = createMigration()
  const pageData = { ...plan.fields, slices: plan.slices }
  const pageDoc = migration.createDocument(
    {
      type: 'page',
      uid: PAGE_UID,
      lang,
      data: pageData,
    } as unknown as Parameters<Migration['createDocument']>[0],
    HERO_TITLE
  )

  console.log(`Writing page/${PAGE_UID} through the Migration API.`)
  await asWriteClient(client).migrate(migration, {
    reporter: (event) => {
      if (event.type === 'documents:created') {
        console.log(`  created ${event.data.created} document(s)`)
      }
    },
  })
  console.log('')
  console.log(
    'The write is in the repository migration release, unpublished. This script never ' +
      'publishes it. Review and publish it in the Prismic dashboard (Releases -> the ' +
      'migration release -> Publish). Its timeline will render EMPTY until the centenary ' +
      'events are linked into `initiatives` in a later phase - keep it unpublished until then.'
  )
  console.log('')

  const writtenId =
    typeof pageDoc.document.id === 'string' ? pageDoc.document.id : null
  if (writtenId) {
    await writeKnownDoc({ id: writtenId, lang })
    console.log(`Recorded page/${PAGE_UID} as ${writtenId} for future runs.`)
    console.log('')
  }

  // --- read back -----------------------------------------------------------------------
  console.log('Reading the page document back.')
  const readBack = await client.getByUID('page', PAGE_UID).catch(() => null)
  if (readBack) {
    const slices = currentPageSlices(
      (readBack.data ?? {}) as Record<string, unknown>
    )
    console.log(
      `  page/${PAGE_UID}  read back with ${slices.length} slice(s)  ` +
        (slices.length === plan.slices.length ? 'OK' : 'not yet visible')
    )
  } else {
    console.log(
      `  page/${PAGE_UID}  not readable yet. That is expected if the write landed in the ` +
        'unpublished migration release: /api/v2 does not expose it as a ref, so this script ' +
        'cannot see it until a human publishes the release.'
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
