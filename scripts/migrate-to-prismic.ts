#!/usr/bin/env node
/**
 * Migrates `src/data/content.json` into Prismic using the Migration API. Contract v2.
 *
 * Creates three `page` documents (home, events, artists), one `event` document per entry in
 * initiatives.events and initiatives.workshops, one `volunteer` document per volunteer, and
 * merges the footer copy into the existing `settings` singleton. Every local image it
 * references is uploaded to the media library first.
 *
 * Dry run is the default. Nothing is written unless --commit is passed, and --commit takes a
 * full repository backup first and aborts if that backup fails.
 *
 *   pnpm migrate:preview                  plan only, writes scripts/migration-preview.json
 *   pnpm migrate:preview --with-artists   same, including artists from artists.draft.json
 *   pnpm migrate:commit                   backs up, then writes to Prismic, then verifies
 *
 * The custom types must be pushed to the Prismic repository with Slice Machine BEFORE this
 * runs. Documents cannot be created for types that do not exist remotely. See scripts/README.md.
 */

import { readFile, writeFile } from 'node:fs/promises'
import {
  createMigration,
  PrismicMigrationAsset,
  PrismicMigrationDocument,
  type Client,
  type MigrateReporterEvents,
  type Migration,
  type PrismicDocument,
  type Ref,
} from '@prismicio/client'
import { AssetRegistry } from './lib/assets.ts'
import { runBackup } from './lib/backup.ts'
import { allEventEntries, loadContent, type Content } from './lib/content.ts'
import { DRAFT_PATH, PREVIEW_PATH, relativePath } from './lib/paths.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import {
  eventDates,
  mergeSettings,
  richText,
  slice,
  uidFor,
  webLink,
} from './lib/transform.ts'

// -----------------------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------------------

type DraftArtist = {
  uid: string
  name: string
  discipline?: string
  bio?: string
  events?: string[]
}

type ArtistsDraft = {
  approved?: boolean
  artists?: DraftArtist[]
}

type PlannedDocument = {
  action: 'create' | 'update'
  type: string
  uid?: string
  title: string
  doc: PrismicMigrationDocument
}

type SkippedDocument = {
  type: string
  uid?: string
  title: string
  reason: string
}

// -----------------------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------------------

/** Fallback when the repository's master locale cannot be read. */
const DEFAULT_LANG = 'en-us'

/** Repeatable types this migration creates, and therefore has to check for duplicates in. */
const REPEATABLE_TYPES = ['page', 'event', 'artist', 'volunteer'] as const

/**
 * The one donation URL, confirmed by the user. It is the URL the live Donate component uses.
 * content.json's nav and the settings.donationLink currently in Prismic both hold an older
 * short link, https://rzp.io/l/svarit, which this migration overwrites.
 */
const DONATE_URL = 'https://pages.razorpay.com/svarit'

/**
 * The hero CTA is not in content.json. content.json has `hero.cta: "Explore Initiatives"`,
 * but that string is not what the site renders. Hero.tsx renders "Learn more" pointing at
 * the about section, and the user confirmed the rendered version wins.
 */
const HERO_CTA_LABEL = 'Learn more'
const HERO_CTA_URL = '#about'

/** Not in content.json. This is the label the current Contact form button renders. */
const CONTACT_SUBMIT_LABEL = 'Send Message'

const warnings: string[] = []

// -----------------------------------------------------------------------------------------
// Existing content lookup, for idempotency
// -----------------------------------------------------------------------------------------

type ExistingContent = {
  /** type -> uid -> document. */
  byUid: Map<string, Map<string, PrismicDocument>>
  /** Where each hit was found, for the summary. */
  foundIn: Map<string, string>
  /** True when the repository could actually be queried. */
  reachable: boolean
}

function emptyExisting(): ExistingContent {
  return {
    byUid: new Map(REPEATABLE_TYPES.map((type) => [type, new Map()])),
    foundIn: new Map(),
    reachable: false,
  }
}

/**
 * Scans every ref, not just the master ref. Documents created by a previous run sit in an
 * unpublished migration release, so checking the master ref alone would happily duplicate them.
 */
async function collectExisting(client: Client): Promise<ExistingContent> {
  const existing = emptyExisting()

  let refs: Ref[]
  try {
    refs = await client.getRefs()
    existing.reachable = true
  } catch (error) {
    warnings.push(
      `Could not reach the Prismic repository to check for existing documents ` +
        `(${describeError(error)}). The plan below assumes the repository is empty.`
    )
    return existing
  }

  for (const ref of refs) {
    for (const type of REPEATABLE_TYPES) {
      try {
        const docs = await client.getAllByType(type, { ref: ref.ref })
        for (const doc of docs) {
          if (!doc.uid) continue
          existing.byUid.get(type)!.set(doc.uid, doc)
          if (!existing.foundIn.has(`${type}:${doc.uid}`)) {
            existing.foundIn.set(`${type}:${doc.uid}`, ref.label)
          }
        }
      } catch {
        // The type may not be pushed to the repository yet. Reported separately.
      }
    }
  }

  return existing
}

// -----------------------------------------------------------------------------------------
// Plan construction
// -----------------------------------------------------------------------------------------

type PlanInput = {
  content: Content
  migration: Migration
  assets: AssetRegistry
  existing: ExistingContent
  lang: string
  artists: DraftArtist[] | null
  remoteSettings: PrismicDocument | null
}

type Plan = {
  planned: PlannedDocument[]
  skipped: SkippedDocument[]
}

async function buildPlan(input: PlanInput): Promise<Plan> {
  const {
    content,
    migration,
    assets,
    existing,
    lang,
    artists,
    remoteSettings,
  } = input
  const planned: PlannedDocument[] = []
  const skipped: SkippedDocument[] = []

  const existingOf = (type: string) => existing.byUid.get(type)!
  const foundIn = (type: string, uid: string) =>
    existing.foundIn.get(`${type}:${uid}`) ?? 'an existing ref'

  // --- volunteers, their own repeatable type as of contract v2 ---------------------------
  const volunteerUids = new Set<string>()

  for (const volunteer of content.volunteers) {
    const uid = uidFor(volunteer.name, volunteerUids)

    if (existingOf('volunteer').has(uid)) {
      skipped.push({
        type: 'volunteer',
        uid,
        title: volunteer.name,
        reason: `uid already exists in Prismic (${foundIn('volunteer', uid)})`,
      })
      continue
    }

    const doc = migration.createDocument(
      {
        type: 'volunteer',
        uid,
        lang,
        data: {
          uid,
          name: volunteer.name,
          // The About and Volunteers slices render this with fallbackAlt="", so the alt
          // has to come from the asset itself.
          photo: await assets.add(
            volunteer.image,
            `${volunteer.name}, Svarit volunteer`
          ),
          // content.json carries no role for volunteers.
          role: '',
        },
      },
      volunteer.name
    )

    planned.push({
      action: 'create',
      type: 'volunteer',
      uid,
      title: volunteer.name,
      doc,
    })
  }

  // --- artists first, so events can point at the migration documents they create ---------
  const artistDocs = new Map<
    string,
    PrismicMigrationDocument | PrismicDocument
  >()

  if (artists) {
    const artistUids = new Set<string>()

    for (const artist of artists) {
      const uid = uidFor(artist.uid || artist.name, artistUids)
      const alreadyThere = existingOf('artist').get(uid)

      if (alreadyThere) {
        // Link events to the document already in Prismic rather than duplicating it.
        artistDocs.set(artist.name, alreadyThere)
        skipped.push({
          type: 'artist',
          uid,
          title: artist.name,
          reason: `uid already exists in Prismic (${foundIn('artist', uid)})`,
        })
        continue
      }

      const doc = migration.createDocument(
        {
          type: 'artist',
          uid,
          lang,
          data: {
            uid,
            name: artist.name,
            discipline: artist.discipline || '',
            bio: artist.bio ? richText(artist.bio) : [],
            links: [],
            slices: [],
          },
        },
        artist.name
      )

      artistDocs.set(artist.name, doc)
      planned.push({
        action: 'create',
        type: 'artist',
        uid,
        title: artist.name,
        doc,
      })
    }
  }

  // --- events ----------------------------------------------------------------------------
  const eventUids = new Set<string>()

  for (const { entry, category } of allEventEntries(content)) {
    const uid = uidFor(entry.title, eventUids)

    if (existingOf('event').has(uid)) {
      skipped.push({
        type: 'event',
        uid,
        title: entry.title,
        reason: `uid already exists in Prismic (${foundIn('event', uid)})`,
      })
      continue
    }

    // content.json has no images on any event. The mapping is here so that the moment one
    // is added, it migrates without a code change.
    const heroImage = entry.image
      ? await assets.add(entry.image, entry.title)
      : undefined

    const linkedArtists = artists
      ? artists
          .filter((artist) => artist.events?.includes(entry.title))
          .map((artist) => artistDocs.get(artist.name))
          .filter(Boolean)
          .map((artist) => ({ artist }))
      : []

    const doc = migration.createDocument(
      {
        type: 'event',
        uid,
        lang,
        data: {
          uid,
          title: entry.title,
          category,
          ...eventDates(entry),
          description: richText(entry.description),
          ...(heroImage ? { hero_image: heroImage } : {}),
          artists: linkedArtists,
          slices: [],
        },
      },
      entry.title
    )

    planned.push({
      action: 'create',
      type: 'event',
      uid,
      title: entry.title,
      doc,
    })
  }

  // --- page documents ---------------------------------------------------------------------
  const addPage = (
    uid: string,
    title: string,
    data: Record<string, unknown>
  ): void => {
    if (existingOf('page').has(uid)) {
      skipped.push({
        type: 'page',
        uid,
        title,
        reason: `uid already exists in Prismic (${foundIn('page', uid)})`,
      })
      return
    }

    const doc = migration.createDocument(
      { type: 'page', uid, lang, data: { uid, ...data } },
      title
    )
    planned.push({ action: 'create', type: 'page', uid, title, doc })
  }

  // page: home. The assets are only registered when the page is actually being created,
  // so a re-run does not re-upload them.
  if (existingOf('page').has('home')) {
    skipped.push({
      type: 'page',
      uid: 'home',
      title: 'Home',
      reason: `uid already exists in Prismic (${foundIn('page', 'home')})`,
    })
  } else {
    const heroImages = [
      await assets.add('/assets/hero/left.png'),
      await assets.add('/assets/hero/middle.png'),
    ]
    const heroVideo = await assets.add('/assets/hero/right.mp4')

    // Uploaded so it is available in the media library. The hero slice has no poster field,
    // so nothing references it yet.
    await assets.add('/assets/hero/right-poster.jpg', 'Hero video poster')

    // The Sponsors slice renders these with fallbackAlt="", so the alt has to come from
    // the asset itself or the logos ship with no alt text at all.
    const sponsorLogos = []
    for (const logo of content.sponsors.logos) {
      sponsorLogos.push({
        logo: await assets.add(logo.src, `${logo.alt} logo`),
        name: logo.alt,
      })
    }

    const donateBackground = await assets.add('/assets/donate/image.jpg')

    addPage('home', 'Home', {
      slices: [
        slice('hero', {
          title: content.hero.title,
          subtitle: richText(content.hero.subtitle),
          cta_label: HERO_CTA_LABEL,
          cta_link: webLink(HERO_CTA_URL),
          stats: content.hero.stats,
          images: heroImages.map((image) => ({ image })),
          video: { link_type: 'Media' as const, id: heroVideo },
        }),
        slice('sponsors', {
          heading: content.sponsors.heading,
          subheading: content.sponsors.subheading,
          logos: sponsorLogos,
        }),
        slice('about', {
          heading: content.about.heading,
          subheading: content.about.subheading,
          body: richText(...content.about.paragraphs),
          // About renders hero.stats, not a stat of its own.
          stats: content.hero.stats,
        }),
        slice('event_list', {
          heading: content.initiatives.heading,
          subheading: content.initiatives.subheading,
          page_size: 6,
        }),
        slice('donate', {
          heading: content.donate.heading,
          cta_label: content.donate.cta,
          cta_link: webLink(DONATE_URL),
          background_image: donateBackground,
        }),
        slice('contact', {
          heading: content.contact.heading,
          subheading: content.contact.subheading,
          description: richText(content.contact.description),
          name_label: content.contact.form.nameLabel,
          email_label: content.contact.form.emailLabel,
          message_label: content.contact.form.messageLabel,
          submit_label: CONTACT_SUBMIT_LABEL,
        }),
      ],
      meta_title:
        'Svarit: Honouring Legacy, Shaping the Future of Indian Music',
      meta_description:
        'Founded in 2001, Svarit carries a rich musical legacy into the future, nurturing Indian music through concerts, festivals, education and community.',
    })
  }

  // page: events, the flat index. content.json has no copy for a dedicated index page, so
  // this was drafted for the migration and approved by the user.
  addPage('events', 'Events', {
    slices: [
      slice(
        'event_list',
        {
          heading: 'Everything Svarit Has Presented Since 2001',
          subheading: 'Events and Workshops',
          category: 'All',
          page_size: 12,
        },
        'grid'
      ),
    ],
    meta_title: 'Events and Workshops',
    meta_description:
      'Every concert, festival and workshop Svarit has presented since 2001.',
  })

  // page: artists, the index.
  addPage('artists', 'Artists', {
    slices: [
      slice('artist_list', {
        heading: 'The Artists Who Have Shaped Svarit',
        subheading: 'Artists',
      }),
    ],
    meta_title: 'Artists',
    meta_description:
      'The musicians who have performed and taught at Svarit since 2001.',
  })

  // --- settings, merged into the existing document ----------------------------------------
  if (remoteSettings) {
    const { data, notes } = mergeSettings(
      (remoteSettings.data ?? {}) as Record<string, unknown>,
      {
        copyright: content.footer.copyright,
        credits: content.footer.credits,
        contact: content.footer.contact,
        donationUrl: DONATE_URL,
      }
    )
    warnings.push(...notes)

    const doc = migration.updateDocument(
      { ...remoteSettings, data },
      'Site Settings'
    )
    planned.push({
      action: 'update',
      type: 'settings',
      title: 'Site Settings',
      doc,
    })
  } else {
    warnings.push(
      'The existing settings document was not fetched, so the footer merge is not part of ' +
        'this plan. Run with network access to include it.'
    )
  }

  return { planned, skipped }
}

// -----------------------------------------------------------------------------------------
// Preview serialisation
// -----------------------------------------------------------------------------------------

function serialise(value: unknown, assets: AssetRegistry): unknown {
  if (value instanceof PrismicMigrationAsset) {
    return {
      __asset: value.config.filename,
      path: assets.pathOf(value) ?? String(value.config.filename),
      alt: value.config.alt ?? null,
    }
  }

  if (value instanceof PrismicMigrationDocument) {
    const doc = value.document
    return { __link: `${doc.type}:${doc.uid ?? '(singleton)'}` }
  }

  if (Array.isArray(value)) return value.map((item) => serialise(item, assets))

  if (value && typeof value === 'object') {
    // A document fetched from Prismic, used as a content relationship target.
    if ('id' in value && 'type' in value && 'first_publication_date' in value) {
      const doc = value as PrismicDocument
      return { __link: `${doc.type}:${doc.uid ?? doc.id}` }
    }

    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      result[key] = serialise(item, assets)
    }
    return result
  }

  return value
}

// -----------------------------------------------------------------------------------------
// Entry point
// -----------------------------------------------------------------------------------------

function parseArgs(argv: string[]) {
  const known = new Set(['--commit', '--dry-run', '--with-artists'])
  const unknown = argv.filter((arg) => arg.startsWith('-') && !known.has(arg))
  if (unknown.length > 0) {
    throw new Error(
      `Unknown option${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. ` +
        'Supported: --commit, --dry-run, --with-artists'
    )
  }

  return {
    commit: argv.includes('--commit'),
    withArtists: argv.includes('--with-artists'),
  }
}

async function loadArtists(): Promise<DraftArtist[]> {
  let draft: ArtistsDraft
  try {
    draft = JSON.parse(await readFile(DRAFT_PATH, 'utf8'))
  } catch {
    throw new Error(
      `--with-artists was passed but ${relativePath(DRAFT_PATH)} does not exist. ` +
        'Run `pnpm extract:artists` first, review the draft, then set "approved": true.'
    )
  }

  if (draft.approved !== true) {
    throw new Error(
      `${relativePath(DRAFT_PATH)} is not approved. Review the candidate artists, correct ` +
        'them, then set the top-level "approved" field to true.'
    )
  }

  const artists = (draft.artists ?? []).filter((artist) => artist.name?.trim())
  if (artists.length === 0) {
    throw new Error(
      `${relativePath(DRAFT_PATH)} is approved but contains no artists.`
    )
  }

  return artists
}

function summarise(planned: PlannedDocument[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of planned) {
    if (item.action !== 'create') continue
    counts[item.type] = (counts[item.type] ?? 0) + 1
  }
  return counts
}

function label(item: { type: string; uid?: string }): string {
  return item.uid ? `${item.type}/${item.uid}` : `${item.type} (singleton)`
}

/** Re-queries the repository and reports any gap between the plan and what actually landed. */
async function verifyAfterWrite(
  client: Client,
  planned: PlannedDocument[]
): Promise<{ found: number; missing: string[] }> {
  const after = await collectExisting(client)
  const missing: string[] = []
  let found = 0

  for (const item of planned) {
    if (item.action !== 'create' || !item.uid) continue
    if (after.byUid.get(item.type)?.has(item.uid)) {
      found += 1
    } else {
      missing.push(label(item))
    }
  }

  return { found, missing }
}

async function main() {
  const { commit, withArtists } = parseArgs(process.argv.slice(2))

  const content = await loadContent()
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written to Prismic.\n' +
        `Create a write token at https://${repositoryName}.prismic.io/settings/apps/ ` +
        '(Settings -> API & Security -> Write API), then run:\n' +
        '  PRISMIC_WRITE_TOKEN=... pnpm migrate:commit\n' +
        'See scripts/README.md.'
    )
  }

  const artists = withArtists ? await loadArtists() : null
  const client = clientFor(repositoryName, writeToken)

  let lang = DEFAULT_LANG
  try {
    const repository = await client.getRepository()
    lang = repository.languages[0].id
  } catch (error) {
    warnings.push(
      `Could not read the repository's master locale (${describeError(error)}). ` +
        `Falling back to "${DEFAULT_LANG}".`
    )
  }

  // Works without a write token too: the read client sees published documents and any
  // release the repository exposes.
  const existing = await collectExisting(client)

  let remoteSettings: PrismicDocument | null = null
  try {
    remoteSettings = await client.getSingle('settings')
  } catch (error) {
    if (commit) {
      throw new Error(
        `The existing settings document could not be read (${describeError(error)}). ` +
          'It must exist before its footer fields can be merged. Push the custom types with ' +
          'Slice Machine and publish a settings document first.'
      )
    }
    warnings.push(
      `Existing settings document not read (${describeError(error)}).`
    )
  }

  const migration = createMigration()
  const assets = new AssetRegistry(migration)
  const plan = await buildPlan({
    content,
    migration,
    assets,
    existing,
    lang,
    artists,
    remoteSettings,
  })

  const creates = plan.planned.filter((item) => item.action === 'create')
  const updates = plan.planned.filter((item) => item.action === 'update')
  const byType = summarise(plan.planned)

  // ---------------------------------------------------------------------------------------
  // Dry run
  // ---------------------------------------------------------------------------------------
  if (!commit) {
    const preview = {
      mode: 'dry-run',
      generatedAt: new Date().toISOString(),
      repository: repositoryName,
      lang,
      withArtists,
      existingChecked: existing.reachable,
      summary: {
        toCreate: creates.length,
        toCreateByType: byType,
        toUpdate: updates.length,
        skipped: plan.skipped.length,
        assets: assets.size,
      },
      assets: [...migration._assets.values()].map((asset) => ({
        filename: asset.config.filename,
        path: assets.pathOf(asset) ?? null,
        alt: asset.config.alt ?? null,
      })),
      documents: plan.planned.map((item) => ({
        action: item.action,
        type: item.type,
        uid: item.uid ?? null,
        title: item.title,
        lang: item.doc.document.lang,
        data: serialise(item.doc.document.data, assets),
      })),
      skipped: plan.skipped,
      warnings,
    }

    await writeFile(
      PREVIEW_PATH,
      `${JSON.stringify(preview, null, 2)}\n`,
      'utf8'
    )

    console.log(
      `Dry run against "${repositoryName}" (locale ${lang}). Nothing was written.`
    )
    console.log('')
    for (const item of plan.planned)
      console.log(`  ${item.action}  ${label(item)}`)
    for (const item of plan.skipped)
      console.log(`  skip    ${label(item)}  ${item.reason}`)
    console.log('')
    console.log(
      `Assets to upload: ${assets.size}. Documents: ${creates.length} to create ` +
        `(${Object.entries(byType)
          .map(([type, count]) => `${count} ${type}`)
          .join(
            ', '
          )}), ${updates.length} to update, ${plan.skipped.length} skipped.`
    )
    if (warnings.length > 0) {
      console.log('')
      console.log('Warnings:')
      for (const warning of warnings) console.log(`  - ${warning}`)
    }
    console.log('')
    console.log(`Full plan written to ${relativePath(PREVIEW_PATH)}`)
    console.log('Re-run with --commit to write it to Prismic.')
    return
  }

  // ---------------------------------------------------------------------------------------
  // Commit
  // ---------------------------------------------------------------------------------------
  if (plan.planned.length === 0) {
    console.log('Nothing to do. Every document already exists in Prismic.')
    return
  }

  // No backup, no write. A failure here aborts before anything is touched.
  console.log('Backing up the repository before writing anything.')
  let backup
  try {
    backup = await runBackup(client, repositoryName, (message) =>
      console.log(message)
    )
  } catch (error) {
    throw new Error(
      `Backup failed, so the migration was aborted and nothing was written: ` +
        `${describeError(error)}`
    )
  }
  console.log(`Backed up ${backup.documentCount} documents to ${backup.file}`)
  console.log('')

  console.log(
    `Writing to "${repositoryName}" (locale ${lang}): ${assets.size} assets, ` +
      `${creates.length} documents to create, ${updates.length} to update.`
  )
  console.log('')

  let assetsCreated = 0
  let documentsCreated = 0
  let documentsUpdated = 0

  const reporter = (event: MigrateReporterEvents) => {
    switch (event.type) {
      case 'assets:creating':
        console.log(
          `  asset   ${event.data.current}/${event.data.total}  ${event.data.asset.config.filename}`
        )
        break
      case 'assets:created':
        assetsCreated = event.data.created
        break
      case 'documents:creating':
        console.log(
          `  create  ${event.data.current}/${event.data.total}  ` +
            `${event.data.document.document.type}/${event.data.document.document.uid ?? '(singleton)'}`
        )
        break
      case 'documents:created':
        documentsCreated = event.data.created
        break
      case 'documents:updated':
        documentsUpdated = event.data.updated
        break
    }
  }

  try {
    await asWriteClient(client).migrate(migration, { reporter })
  } catch (error) {
    console.error('')
    console.error('Migration failed part way through.')
    console.error(`  assets created:    ${assetsCreated}`)
    console.error(`  documents created: ${documentsCreated}`)
    console.error(
      `  documents failed:  ${plan.planned.length - documentsCreated}`
    )
    console.error('')
    console.error(
      `Anything already written sits in the repository migration release, unpublished. ` +
        `Re-running skips documents whose uid already exists. The pre-migration backup is at ` +
        `${backup.file}.`
    )
    throw error
  }

  // --- verify -----------------------------------------------------------------------------
  console.log('')
  console.log('Verifying what landed in the repository.')

  let verification: { found: number; missing: string[] } | null = null
  try {
    verification = await verifyAfterWrite(client, plan.planned)
  } catch (error) {
    console.error(`  Could not verify: ${describeError(error)}`)
  }

  const expected = creates.filter((item) => item.uid).length

  console.log('')
  console.log('Done.')
  console.log(`  assets created:    ${assetsCreated}`)
  console.log(`  documents created: ${documentsCreated}`)
  console.log(`  documents updated: ${documentsUpdated}`)
  console.log(`  documents skipped: ${plan.skipped.length}`)
  console.log(
    `  documents failed:  ${Math.max(0, creates.length - documentsCreated)}`
  )
  console.log(`  backup:            ${backup.file}`)

  if (verification) {
    if (verification.found === expected && verification.missing.length === 0) {
      console.log(
        `  verified:          ${verification.found}/${expected} documents found`
      )
    } else {
      console.error('')
      console.error(
        `DRIFT: expected ${expected} created documents, found ${verification.found}.`
      )
      for (const item of verification.missing)
        console.error(`  missing: ${item}`)
      console.error(
        'The repository does not match the plan. Check the migration release in Prismic ' +
          `before publishing it. Pre-migration backup: ${backup.file}`
      )
      process.exitCode = 1
    }
  }

  if (warnings.length > 0) {
    console.log('')
    console.log('Warnings:')
    for (const warning of warnings) console.log(`  - ${warning}`)
  }

  console.log('')
  console.log(
    'The documents were created in the repository migration release. Open Prismic, review ' +
      'the release, and publish it when it looks right.'
  )
}

try {
  await main()
} catch (error) {
  console.error('')
  console.error(describeError(error))
  process.exitCode = 1
}
