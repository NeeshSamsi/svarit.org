/**
 * Turns `src/data/content.json` into a set of Migration API operations.
 *
 * Kept separate from the CLI so `scripts/plan.test.ts` can build a real plan in memory,
 * with no network, and assert on the exact payloads that would be sent.
 *
 * THE UID RULE: a document's uid belongs at the ROOT of the migration document, never inside
 * `data`. `uid` is not a field in any custom type's data schema, and the Migration API
 * rejects the WHOLE `data` object when it finds one there. That failure is silent on create:
 * the document is created as an empty shell and the API still returns 201. Every document
 * this migration wrote before that was understood came back empty. Do not put uid in data.
 */

import {
  PrismicMigrationAsset,
  PrismicMigrationDocument,
  type Client,
  type Migration,
  type PrismicDocument,
  type Ref,
} from '@prismicio/client'
import { AssetRegistry, mediaLink, type ImageRef } from './assets.ts'
import { allEventEntries, type Content } from './content.ts'
import {
  eventDates,
  mergeSettings,
  richText,
  slice,
  uidFor,
  webLink,
} from './transform.ts'

export type DraftArtist = {
  uid: string
  name: string
  discipline?: string
  bio?: string
  events?: string[]
}

export type PlannedDocument = {
  action: 'create' | 'update'
  type: string
  uid?: string
  title: string
  doc: PrismicMigrationDocument
}

export type SkippedDocument = {
  type: string
  uid?: string
  title: string
  reason: string
}

export type Plan = {
  planned: PlannedDocument[]
  skipped: SkippedDocument[]
  warnings: string[]
}

/**
 * The one donation URL, confirmed by the user. It is the URL the live Donate component uses.
 * content.json's nav and the settings.donationLink in Prismic both hold an older short link,
 * https://rzp.io/l/svarit, which this migration overwrites.
 */
export const DONATE_URL = 'https://pages.razorpay.com/svarit'

/**
 * The hero CTA is not in content.json. content.json has `hero.cta: "Explore Initiatives"`,
 * but that string is not what the site renders. Hero.tsx renders "Learn more" pointing at the
 * about section, and the user confirmed the rendered version wins.
 */
export const HERO_CTA_LABEL = 'Learn more'
export const HERO_CTA_URL = '#about'

/**
 * The /artists index hero, copied verbatim from the Figma frame
 * (https://www.figma.com/design/n1dLICrveaJDD6lY0JAwcG/Svarit?node-id=1934-5).
 * Rendered by the Hero slice's `page_header` variation.
 */
export const ARTISTS_HERO_TITLE = 'Artists who we have had the pleasure to host'
export const ARTISTS_HERO_DESCRIPTION =
  'Svarit was founded in 2001 with the vision of promoting and propagating the rich ' +
  'tradition of Hindustani Raag Sangeet, as envisioned by the legendary vocalist Pandit ' +
  'Dinkar Kaikini.'

/** Not in content.json. This is the label the current Contact form button renders. */
export const CONTACT_SUBMIT_LABEL = 'Send Message'

/** Repeatable types this migration creates, and therefore has to check for duplicates in. */
export const REPEATABLE_TYPES = [
  'page',
  'event',
  'artist',
  'volunteer',
] as const

// -----------------------------------------------------------------------------------------
// Existing content lookup
// -----------------------------------------------------------------------------------------

export type ExistingContent = {
  /** type -> uid -> document. */
  byUid: Map<string, Map<string, PrismicDocument>>
  /** Where each hit was found, for the summary. */
  foundIn: Map<string, string>
  /** True when the repository could actually be queried. */
  reachable: boolean
}

export function emptyExisting(): ExistingContent {
  return {
    byUid: new Map(REPEATABLE_TYPES.map((type) => [type, new Map()])),
    foundIn: new Map(),
    reachable: false,
  }
}

/**
 * Scans every ref the repository exposes.
 *
 * Note the limit: documents sitting in an unpublished Prismic migration release are NOT
 * exposed as a ref by `/api/v2`, so they cannot be found here. They become visible, and
 * therefore repairable, only once the migration release is published.
 */
export async function collectExisting(
  client: Client,
  onWarning: (message: string) => void = () => {}
): Promise<ExistingContent> {
  const existing = emptyExisting()

  let refs: Ref[]
  try {
    refs = await client.getRefs()
    existing.reachable = true
  } catch (error) {
    onWarning(
      `Could not reach the Prismic repository to check for existing documents ` +
        `(${error instanceof Error ? error.message : String(error)}). The plan below ` +
        'assumes the repository is empty.'
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

type MinimalUpdate = {
  id: string
  type: string
  uid?: string
  lang: string
  data: Record<string, unknown>
}

/**
 * Registers an update from the minimum the Migration API actually needs.
 *
 * `migration.updateDocument()` is typed as taking a whole fetched Prismic document, but the
 * PUT it produces only carries title, uid, tags and data. Handing it the fetched document
 * forwards a null root `uid` for singletons, which the API rejects with "The field 'UID'
 * should be put at the root level of the document". So send the minimum and cast.
 */
function registerUpdate(
  migration: Migration,
  doc: MinimalUpdate,
  title: string
): PrismicMigrationDocument {
  return migration.updateDocument(
    doc as unknown as Parameters<Migration['updateDocument']>[0],
    title
  )
}

/**
 * The /artists page ends with the very same donate slice the home page renders. Rather than
 * rebuild it from content.json and risk the two drifting, copy it straight off the published
 * `page/home` document. Strips the read-only keys the query API adds back to a slice
 * (`id`, `version`, `slice_label`) so what is left is the shape the Migration API accepts.
 *
 * Returns null when home is unreadable or carries no donate slice. A dry run then plans the
 * page without it and warns; a `--commit` run is blocked before it reaches here (see
 * `migrate-to-prismic.ts`). Inventing the values from content.json is deliberately not an
 * option: keeping the two donate slices identical is the whole point of copying.
 */
export function donateSliceFrom(
  remoteHome: PrismicDocument | null
): Record<string, unknown> | null {
  const slices =
    remoteHome &&
    Array.isArray((remoteHome.data as { slices?: unknown }).slices)
      ? (remoteHome.data as { slices: Record<string, unknown>[] }).slices
      : []

  const donate = slices.find((entry) => entry.slice_type === 'donate')
  if (!donate) return null

  return {
    slice_type: 'donate',
    variation: (donate.variation as string) ?? 'default',
    items: Array.isArray(donate.items) ? donate.items : [],
    primary: (donate.primary as Record<string, unknown>) ?? {},
  }
}

export type PlanInput = {
  content: Content
  migration: Migration
  assets: AssetRegistry
  existing: ExistingContent
  lang: string
  artists: DraftArtist[] | null
  remoteSettings: PrismicDocument | null
  /**
   * The published `page/home` document. The /artists page copies its donate slice from
   * here; see `donateSliceFrom`. Required whenever the plan includes page/artists.
   */
  remoteHome: PrismicDocument | null
  /** Leave documents that already exist alone instead of repairing them. */
  skipExisting?: boolean
  /**
   * Restrict the plan to documents whose uid is in this set. Empty or absent means the whole
   * plan. The settings singleton has no uid, so name it explicitly as "settings".
   *
   * This exists because documents sitting in an unpublished migration release are invisible
   * to the query API, so a full re-run would create duplicates of every one of them. A
   * filtered run writes the one document that needs writing and leaves the rest alone.
   */
  only?: ReadonlySet<string>
}

export async function buildPlan(input: PlanInput): Promise<Plan> {
  const {
    content,
    migration,
    assets,
    existing,
    lang,
    artists,
    remoteSettings,
    remoteHome,
    skipExisting = false,
    only,
  } = input

  const planned: PlannedDocument[] = []
  const skipped: SkippedDocument[] = []
  const warnings: string[] = []

  const existingOf = (type: string) => existing.byUid.get(type) ?? new Map()
  const foundIn = (type: string, uid: string) =>
    existing.foundIn.get(`${type}:${uid}`) ?? 'an existing ref'
  const filtering = only !== undefined && only.size > 0
  const wanted = (uid: string) => !filtering || only!.has(uid)

  /**
   * Creates the document, or updates the one already there. Repairing beats skipping,
   * because every document written before the uid bug was found is an empty shell.
   *
   * `data` must never contain a `uid` key. See the note at the top of this file.
   */
  const put = (
    type: string,
    uid: string | undefined,
    title: string,
    data: Record<string, unknown>
  ): PlannedDocument | null => {
    if ('uid' in data) {
      throw new Error(
        `Refusing to write ${type}/${uid}: uid must live at the document root, not in data.`
      )
    }

    const alreadyThere = uid ? existingOf(type).get(uid) : undefined

    if (alreadyThere && skipExisting) {
      skipped.push({
        type,
        uid,
        title,
        reason: `uid already exists in Prismic (${foundIn(type, uid!)})`,
      })
      return null
    }

    const doc = alreadyThere
      ? registerUpdate(
          migration,
          { id: alreadyThere.id, type, uid, lang, data },
          title
        )
      : migration.createDocument({ type, uid, lang, data }, title)

    const entry: PlannedDocument = {
      action: alreadyThere ? 'update' : 'create',
      type,
      uid,
      title,
      doc,
    }
    planned.push(entry)
    return entry
  }

  // --- volunteers -------------------------------------------------------------------------
  const volunteerUids = new Set<string>()

  for (const volunteer of content.volunteers) {
    const uid = uidFor(volunteer.name, volunteerUids)
    if (!wanted(uid)) continue

    put('volunteer', uid, volunteer.name, {
      name: volunteer.name,
      // The About and Volunteers slices render this with fallbackAlt="", so the alt has to
      // come from the asset.
      photo: await assets.add(
        volunteer.image,
        `${volunteer.name}, Svarit volunteer`
      ),
      // content.json carries no role for volunteers.
      role: '',
    })
  }

  // --- artists first, so events can point at the documents they produce --------------------
  const artistDocs = new Map<
    string,
    PrismicMigrationDocument | PrismicDocument
  >()

  if (artists) {
    const artistUids = new Set<string>()

    for (const artist of artists) {
      const uid = uidFor(artist.uid || artist.name, artistUids)
      if (!wanted(uid)) continue

      const entry = put('artist', uid, artist.name, {
        name: artist.name,
        discipline: artist.discipline || '',
        bio: artist.bio ? richText(artist.bio) : [],
        links: [],
        slices: [],
      })

      // Skipped artists still have to be linkable, so fall back to the remote document.
      const target = entry?.doc ?? existingOf('artist').get(uid)
      if (target) artistDocs.set(artist.name, target)
    }
  }

  // --- events -------------------------------------------------------------------------------
  const eventUids = new Set<string>()

  for (const { entry, category } of allEventEntries(content)) {
    const uid = uidFor(entry.title, eventUids)
    if (!wanted(uid)) continue

    // content.json has no images on any event. The mapping is here so that the moment one is
    // added, it migrates without a code change.
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

    put('event', uid, entry.title, {
      title: entry.title,
      category,
      ...eventDates(entry),
      description: richText(entry.description),
      ...(heroImage ? { hero_image: heroImage } : {}),
      artists: linkedArtists,
      slices: [],
    })
  }

  // --- page: home ----------------------------------------------------------------------------
  if (wanted('home')) {
    const heroImages: ImageRef[] = [
      await assets.add('/assets/hero/left.png'),
      await assets.add('/assets/hero/middle.png'),
    ]
    const heroVideo = await assets.add('/assets/hero/right.mp4')

    // Uploaded so it is available in the media library. The hero slice has no poster field, so
    // nothing references it yet.
    await assets.add('/assets/hero/right-poster.jpg', 'Hero video poster')

    // The Sponsors slice renders these with fallbackAlt="", so the alt has to come from the
    // asset or the logos ship with no alt text at all.
    const sponsorLogos = []
    for (const logo of content.sponsors.logos) {
      sponsorLogos.push({
        logo: await assets.add(logo.src, `${logo.alt} logo`),
        name: logo.alt,
      })
    }

    const donateBackground = await assets.add('/assets/donate/image.jpg')

    put('page', 'home', 'Home', {
      slices: [
        slice('hero', {
          title: content.hero.title,
          subtitle: richText(content.hero.subtitle),
          cta_label: HERO_CTA_LABEL,
          cta_link: webLink(HERO_CTA_URL),
          stats: content.hero.stats,
          images: heroImages.map((image) => ({ image })),
          video: mediaLink(heroVideo),
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

  // --- page: initiatives, the flat index ------------------------------------------------------
  // content.json has no copy for a dedicated index page, so this was drafted for the
  // migration and approved by the user. uid is `initiatives`: the document was renamed from
  // `events` by hand, and a seed at the old uid would recreate a stale duplicate.
  if (wanted('initiatives'))
    put('page', 'initiatives', 'Initiatives', {
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

  // --- page: artists, the index ---------------------------------------------------------------
  if (wanted('artists')) {
    const donate = donateSliceFrom(remoteHome)
    if (!donate) {
      warnings.push(
        'page/artists was planned without its trailing donate slice: page/home is not ' +
          'readable, or carries no donate slice, so there was nothing to copy. A --commit ' +
          'run is blocked in this state.'
      )
    }

    put('page', 'artists', 'Artists', {
      slices: [
        slice(
          'hero',
          {
            title: ARTISTS_HERO_TITLE,
            description: richText(ARTISTS_HERO_DESCRIPTION),
          },
          'page_header'
        ),
        // heading/subheading stay in the model but the slice renders them only when filled.
        // On /artists the page title comes from the hero above, so both are left empty.
        slice('artist_list', { heading: '', subheading: '' }),
        ...(donate ? [donate] : []),
      ],
      meta_title: 'Artists',
      meta_description:
        'The musicians who have performed and taught at Svarit since 2001.',
    })
  }

  // --- settings, merged into the existing document ---------------------------------------------
  if (remoteSettings && wanted('settings')) {
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

    // Settings is a singleton with no uid. Pass only what the API needs, never the whole
    // fetched document, whose null root uid the API rejects.
    const doc = registerUpdate(
      migration,
      {
        id: remoteSettings.id,
        type: 'settings',
        lang: remoteSettings.lang,
        data,
      },
      'Site Settings'
    )
    planned.push({
      action: 'update',
      type: 'settings',
      title: 'Site Settings',
      doc,
    })
  } else if (!remoteSettings && wanted('settings')) {
    warnings.push(
      'The existing settings document was not fetched, so the footer merge is not part of ' +
        'this plan. Run with network access to include it.'
    )
  }

  return { planned, skipped, warnings }
}

// -----------------------------------------------------------------------------------------
// Preview serialisation
// -----------------------------------------------------------------------------------------

export function serialise(value: unknown, assets: AssetRegistry): unknown {
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
