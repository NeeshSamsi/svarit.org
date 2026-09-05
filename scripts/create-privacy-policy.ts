#!/usr/bin/env node
/**
 * Writes the privacy policy (Solo todo #233): a `page` document, uid
 * `privacy-policy`, one `hero` (`page_header`) slice followed by fifteen
 * `legal_section` slices, then a "Privacy Policy" entry in Settings'
 * `footer_links` group pointing at it.
 *
 * The copy is reproduced verbatim from the brief. This script only performs
 * structural transforms: prose to paragraph nodes, `###` sub-headings to
 * `heading3`, and the bulleted section to `list-item` nodes. Three sections
 * carry an `append_block` (contact details, the last-updated date, the
 * complaints email) read live from Settings by the slice component itself;
 * their generated lines are never typed into `content`.
 *
 * Both writes (the page, and the settings footer_links update) go through one
 * migration and one `migrate()` call, so they land in the same release.
 *
 *   node --experimental-strip-types scripts/create-privacy-policy.ts
 *       Dry run. Prints the hero and all fifteen sections, writes nothing.
 *
 *   PRISMIC_WRITE_TOKEN=... node --experimental-strip-types \
 *       scripts/create-privacy-policy.ts --commit
 *       Backs up the whole repository first (aborts if that fails), writes
 *       the page and the settings update through the Migration API, then
 *       reads them back.
 *
 * It is idempotent for the page: a second run against an existing
 * `privacy-policy` document updates it rather than creating a duplicate, and
 * the footer link is added once.
 *
 * IDEMPOTENCY ACROSS AN UNPUBLISHED RELEASE: the query API (`getByUID`) only
 * ever sees the master ref, so it cannot tell a create-vs-update run apart
 * once a prior write is sitting unpublished, and the Migration API is write
 * only, so there is no request that lists what a pending release holds
 * either. A create-vs-update decision based on `getByUID` alone would retry
 * the create every time and fail with "already exists", unable to ever
 * correct the document it cannot see. So this script also keeps its own
 * record: right after a successful create, it writes the real document id to
 * `backups/privacy-policy-doc.json` (that directory is already gitignored,
 * so this is local machine state, never committed). The next run prefers
 * `getByUID` when the document has become visible (it is the more
 * authoritative source once available), falls back to the recorded id
 * otherwise, and only falls through to create when neither knows of one.
 * If an update against a recorded id fails (the document it named was
 * deleted or archived out from under it), the record is stale and gets
 * cleared so the next run creates fresh instead of retrying a dead id
 * forever. If a create still collides with a document neither source knew
 * about (a fresh checkout, or a run from before this file existed), that is
 * reported clearly with the remedy, exactly as
 * scripts/migrate-to-prismic.ts's "already exists" handling does.
 *
 * It NEVER publishes. The writes land in the repository's unpublished
 * migration release, for a human to review and publish in the Prismic
 * dashboard.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  createMigration,
  type Migration,
  type PrismicDocument,
  type PrismicMigrationDocument,
} from '@prismicio/client'
import { runBackup } from './lib/backup.ts'
import {
  asWriteClient,
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { normaliseGroup, paragraph, slice } from './lib/transform.ts'

// -----------------------------------------------------------------------------------------
// The content (pure, covered by scripts/create-privacy-policy.test.ts)
// -----------------------------------------------------------------------------------------

export const PAGE_UID = 'privacy-policy'
export const HERO_TITLE = 'Privacy Policy'
export const HERO_LEAD =
  'This policy explains what information Svarit collects through www.svarit.org, why, and the rights you have over it.'
export const META_TITLE = 'Svarit Privacy Policy'
export const META_DESCRIPTION =
  'How Svarit collects, uses and protects personal information across www.svarit.org, and the rights you have over your data.'
export const FOOTER_LINK_TEXT = 'Privacy Policy'

export type AppendBlock =
  'none' | 'contact_details' | 'last_updated' | 'complaints_contact'

// `spans` is `unknown[]`, not `[]`: `paragraph()` from lib/transform.ts returns
// an `RTParagraphNode`, whose `spans` is typed `RTInlineNode[]`. Array element
// types are covariant, so a real `RTParagraphNode` and the plain `heading3` /
// `listItem` nodes below both satisfy this one shape.
type RichTextNode = { type: string; text: string; spans: unknown[] }

const heading3 = (text: string): RichTextNode => ({
  type: 'heading3',
  text,
  spans: [],
})
const listItem = (text: string): RichTextNode => ({
  type: 'list-item',
  text,
  spans: [],
})

export type LegalSection = {
  heading: string
  content: RichTextNode[]
  append_block: AppendBlock
  /** Only section 14 sets this; every other section omits the field. */
  updated_at?: string
}

/**
 * All fifteen sections, in order, reproduced verbatim from
 * privacy-policy-copy.md. The `N. ` in front of each section there is the
 * copy doc's own reference numbering, not part of the policy, so it is
 * stripped from the heading text. Lines marked APPEND in the source are never
 * authored here; the slice component reads them live from Settings.
 */
export const LEGAL_SECTIONS: LegalSection[] = [
  {
    heading: 'Who we are and how to reach us',
    content: [
      paragraph(
        'Svarit Trust is an NGO founded in 2001 by Pandit Dinkar Kaikini. We present and support Indian Music through concerts, festivals, workshops, education and community programmes.'
      ),
    ],
    append_block: 'contact_details',
  },
  {
    heading: 'What this policy covers',
    content: [
      paragraph('This policy applies to the www.svarit.org website.'),
      paragraph(
        'We link to third-party platforms (including, but not limited to, Razorpay, Instagram, YouTube, Facebook, and dinkarkaikini.in). Those websites have their own privacy policies.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Information we collect',
    content: [
      heading3('Information you give us'),
      paragraph(
        'When you use our contact form, you give us your name, email address and message. If you sign up for updates or give us your email address in other ways, we collect it to send you our newsletter.'
      ),
      heading3('Information collected automatically'),
      paragraph(
        'When you load a page, our servers and network providers receive technical request metadata. This includes your IP address, browser type and device information.'
      ),
      paragraph(
        'We use privacy-focused analytics hosted on our own developer infrastructure to count pageviews. This records the page you visited, the site that referred you, your approximate location based on your IP address, and your browser and device type. This setup is cookieless and does not track you across other websites.'
      ),
      paragraph(
        'To help us fix design problems and understand how people navigate the site, our analytics setup also records standard interaction data for a random sample (approximately 15%) of visits. This includes mouse movements, scrolling, clicks and navigation. Each recording stops after a maximum of 5 minutes. Any text you type into input fields is masked before it is recorded, so we cannot see what you write.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Cookies',
    content: [
      paragraph(
        'We do not set any cookies for ordinary website visitors. A session cookie is only set if you are a signed-in content editor using the site preview feature.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Why we collect it',
    content: [
      paragraph(
        'We use this information to understand which events and artists people are interested in, to improve the website, to send you our newsletter if you requested it, and to respond to your enquiries.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Who has access to your data',
    content: [
      heading3('Internal access'),
      paragraph(
        'Only authorised Svarit staff and volunteers who need the information to do their jobs have access to your data. This includes accessing contact form emails, reviewing site analytics, or securely viewing session recordings to improve the website.'
      ),
      heading3('External service providers'),
      paragraph(
        'We do not sell your data. We share only what is necessary with service categories that help us operate:'
      ),
      paragraph(
        'Hosting and infrastructure: Cloud hosting, content delivery networks (CDNs), and asset delivery services to serve web pages securely and quickly.'
      ),
      paragraph(
        'Form and email processing: A customer relationship management (CRM) and email marketing service to process forms and deliver our newsletter, alongside secure cloud email providers (such as Google Workspace) to hold our inbox.'
      ),
      paragraph(
        'Analytics: Privacy-focused analytics hosted on our own developer infrastructure to view page traffic without profiling individual visitors.'
      ),
      paragraph(
        'External assets: Third-party font providers who receive your IP address and browser details when a page loads.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Donations',
    content: [
      paragraph(
        'We do not process or store payment card or banking details on our website. When you click to donate, you are redirected to our payment partner, Razorpay. Payments are processed there under their privacy policy.'
      ),
      paragraph(
        'Razorpay provides us with a transaction summary containing your name, email address, PAN number, amount donated, and payment reference. We use this data solely to issue your donation receipt, process 80G tax certificates, and maintain our accounting records.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'What the site does not do',
    content: [
      listItem('We do not sell or share your personal data.'),
      listItem(
        'We run no advertising, no ad networks, and no retargeting pixels.'
      ),
      listItem(
        'We do not use third-party analytics trackers like Google Analytics or the Meta Pixel.'
      ),
      listItem(
        'We have no user account system, no logins, and no user-generated content.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'International transfers',
    content: [
      paragraph(
        'Our website is accessible worldwide. Some of our technical partners operate servers outside India. This means technical data such as server logs or form submissions may be transferred internationally in order to run the site securely.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'How long we keep it',
    content: [
      paragraph(
        'We keep your information only for as long as is necessary to fulfill the purposes outlined in this policy, or as required by law.'
      ),
      paragraph(
        'Form submissions and emails: We keep your contact form submissions and emails in our secure inbox and CRM systems for as long as necessary to maintain our organisational records and respond to your enquiries.'
      ),
      paragraph(
        'Analytics data: We keep analytics data and session recordings securely on our own infrastructure, deleting them when they are no longer needed for website improvements.'
      ),
      paragraph(
        'Donation records: We retain records of your donations and tax paperwork indefinitely to comply with Indian tax, accounting, and charitable trust regulations.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Your rights',
    content: [
      paragraph(
        "Under India's Digital Personal Data Protection Act (2023), you have the right to access the data we hold about you, ask us to correct it, or ask us to erase it. You can also withdraw consent where you have given it."
      ),
      paragraph(
        'If you are in the UK or the European Union, the UK GDPR and EU GDPR grant you similar rights, including the right to object to processing and to restrict how we use your data.'
      ),
      paragraph(
        'If you reside in a US state with specific privacy laws, you also hold rights to access, correct, or delete your personal information under those state frameworks.'
      ),
      paragraph('To exercise any of these rights, email team@svarit.org.'),
    ],
    append_block: 'none',
  },
  {
    heading: 'Children',
    content: [
      paragraph(
        'Our website is a general audience arts site. It is not directed at children. Svarit runs workshops and education programmes. If an enquiry concerning a minor is submitted via our contact form, we handle that information solely to respond to the parent or guardian and to manage the programme.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Security',
    content: [
      paragraph(
        'We use HTTPS to secure the connection between your browser and our servers. We do not handle payment data. Access to the backend systems that run the website is strictly limited.'
      ),
    ],
    append_block: 'none',
  },
  {
    heading: 'Changes to this policy',
    content: [
      paragraph(
        'We may update this policy to reflect technical changes or legal requirements.'
      ),
    ],
    append_block: 'last_updated',
    updated_at: '2026-09-03',
  },
  {
    heading: 'Complaints',
    content: [
      paragraph(
        'If you have a concern about how we handle your data, please contact us first.'
      ),
      paragraph(
        'If you are in India, you can raise concerns with the Data Protection Board of India. If you are in the UK or the EU, you have the right to lodge a complaint with your local data protection supervisory authority.'
      ),
    ],
    append_block: 'complaints_contact',
  },
]

/** The hero slice: page_header variation, title plus a one-sentence lead. */
export function heroSlice() {
  return slice(
    'hero',
    { title: HERO_TITLE, description: [paragraph(HERO_LEAD)] },
    'page_header'
  )
}

/** One legal_section slice from a `LegalSection` entry. */
export function legalSectionSlice(section: LegalSection) {
  const primary: Record<string, unknown> = {
    heading: section.heading,
    content: section.content,
    append_block: section.append_block,
  }
  if (section.updated_at) primary.updated_at = section.updated_at
  return slice('legal_section', primary, 'default')
}

/** The full slice zone: the hero, then all fifteen sections in order. */
export function buildSlices() {
  return [heroSlice(), ...LEGAL_SECTIONS.map(legalSectionSlice)]
}

/** The document's non-slice fields. */
export function buildPageFields() {
  return { meta_title: META_TITLE, meta_description: META_DESCRIPTION }
}

// -----------------------------------------------------------------------------------------
// The footer link (pure, testable)
// -----------------------------------------------------------------------------------------

export type FooterLink = Record<string, unknown> & {
  link_type?: unknown
  uid?: unknown
  id?: unknown
  text?: unknown
}

/** True when a footer link already points at this uid, by document link or a raw URL. */
export function hasFooterLink(links: FooterLink[], uid: string): boolean {
  return links.some(
    (link) =>
      link.uid === uid ||
      (typeof link.url === 'string' &&
        link.url.replace(/\/$/, '') === `/${uid}`)
  )
}

/**
 * Drops a stale, unresolved attempt at a footer link with this text: an entry
 * with no `uid`, `url` or `id` to build a URL from. The bare
 * `{ link_type, key, text }` object a previous run wrote is exactly this. It
 * has to be removed rather than left in place, or the fixed link ships
 * alongside a second, still-broken entry with the same label.
 */
export function withoutStaleFooterLink(
  links: FooterLink[],
  text: string
): FooterLink[] {
  return links.filter(
    (link) =>
      link.text !== text ||
      typeof link.uid === 'string' ||
      typeof link.url === 'string' ||
      typeof link.id === 'string'
  )
}

/** A real document, or the handle `migration.createDocument`/`updateDocument` returns. */
export type FooterLinkTarget = PrismicDocument | PrismicMigrationDocument<PrismicDocument>

/**
 * Builds one `footer_links.links` entry pointing at `document`. `id` carries
 * the document handle itself, not a bare uid: the Migration API only
 * recognises an object as a content relationship when its `id` resolves to a
 * real document (a `PrismicMigrationDocument`, a fetched `PrismicDocument`, or
 * a thunk returning one). A `{ link_type, type, uid }` object with no `id`
 * fails that check, so the API forwards it unresolved and the route resolver
 * has nothing to build a URL from, producing `href=""`.
 */
export function buildFooterLinkEntry(
  document: FooterLinkTarget,
  text: string
): FooterLink {
  return { link_type: 'Document', id: document, text }
}

/**
 * `footer.contact` and `footer.address` were dropped from the settings custom
 * type in a prior change. A document saved before that still carries them in
 * its raw data, and the Migration API rejects any write that forwards a field
 * the model no longer declares, so this strips them before a write forwards
 * the rest of a fetched document's data through unchanged.
 */
export function stripOrphanedFooterFields(
  settingsData: Record<string, unknown>
): Record<string, unknown> {
  const cleanFooter = Object.fromEntries(
    Object.entries(normaliseGroup(settingsData.footer)).filter(
      ([key]) => key !== 'contact' && key !== 'address'
    )
  )
  return {
    ...settingsData,
    footer: Array.isArray(settingsData.footer) ? [cleanFooter] : cleanFooter,
  }
}

// -----------------------------------------------------------------------------------------
// Idempotency: create-vs-update decision (pure, testable)
// -----------------------------------------------------------------------------------------

export type DocRef = { id: string; lang: string }
export type TargetSource = 'master ref' | 'local record' | 'none'

/**
 * Which document to write to, and where that answer came from. `getByUID`
 * (the master ref) wins when it has an answer, since it is authoritative once
 * a document is visible; the locally recorded id from a prior create is the
 * fallback for a document still sitting in an unpublished release; neither
 * present means a genuine create.
 */
export function resolveTarget(
  existingPage: DocRef | null,
  knownDoc: DocRef | null
): { target: DocRef | null; source: TargetSource } {
  if (existingPage) return { target: existingPage, source: 'master ref' }
  if (knownDoc) return { target: knownDoc, source: 'local record' }
  return { target: null, source: 'none' }
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
 * Where this script remembers the page's real id between runs. `backups/` is
 * already gitignored, so this is local machine state, the same way
 * `backups/latest.json` is: never committed, never shared between machines.
 */
const STATE_PATH = fileURLToPath(
  new URL('../backups/privacy-policy-doc.json', import.meta.url)
)

async function readKnownDoc(): Promise<DocRef | null> {
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

async function writeKnownDoc(doc: DocRef): Promise<void> {
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

/** The recorded id named a document that no longer resolves. Stop trusting it. */
async function clearKnownDoc(): Promise<void> {
  await rm(STATE_PATH, { force: true })
}

function printPlan() {
  const slices = buildSlices()
  console.log(`  hero/page_header  title=${JSON.stringify(HERO_TITLE)}`)
  for (const section of LEGAL_SECTIONS) {
    const extra = section.updated_at ? `  updated_at=${section.updated_at}` : ''
    console.log(
      `  legal_section  ${JSON.stringify(section.heading)}  append_block=${section.append_block}${extra}`
    )
  }
  console.log('')
  console.log(`  meta_title: ${JSON.stringify(META_TITLE)}`)
  console.log(`  meta_description: ${JSON.stringify(META_DESCRIPTION)}`)
  console.log('')
  console.log(
    `${slices.length} slices total (1 hero + ${LEGAL_SECTIONS.length} legal_section).`
  )
}

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()

  const writeToken = process.env.PRISMIC_WRITE_TOKEN
  if (commit && !writeToken) {
    throw new Error(
      'PRISMIC_WRITE_TOKEN is not set, so nothing can be written. Put it in .env.local or ' +
        'pass it inline:\n  PRISMIC_WRITE_TOKEN=... node --experimental-strip-types ' +
        'scripts/create-privacy-policy.ts --commit'
    )
  }

  const client = clientFor(repositoryName, writeToken)

  const existingPageDoc = await client
    .getByUID('page', PAGE_UID)
    .catch(() => null)
  const existingPage: DocRef | null = existingPageDoc
    ? { id: existingPageDoc.id, lang: existingPageDoc.lang }
    : null
  const knownDoc = await readKnownDoc()
  const { target, source } = resolveTarget(existingPage, knownDoc)

  let settings: PrismicDocument
  try {
    settings = await client.getSingle('settings')
  } catch (error) {
    throw new Error(
      `Could not read the settings document (${describeError(error)}). It must exist and be ` +
        'published before the footer link can be added.'
    )
  }
  const settingsData = (settings.data ?? {}) as Record<string, unknown>
  const footerLinksGroup = normaliseGroup(settingsData.footer_links)
  const rawFooterLinks = Array.isArray(footerLinksGroup.links)
    ? (footerLinksGroup.links as FooterLink[])
    : []
  const footerLinks = withoutStaleFooterLink(rawFooterLinks, FOOTER_LINK_TEXT)
  const hadStaleFooterLink = footerLinks.length !== rawFooterLinks.length
  const needsFooterLink = !hasFooterLink(footerLinks, PAGE_UID)
  const shouldUpdateFooterLinks = needsFooterLink || hadStaleFooterLink
  const writableSettingsData = stripOrphanedFooterFields(settingsData)

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}" (locale ${settings.lang}).`
  )
  console.log('')
  console.log(
    target
      ? `page/${PAGE_UID} already exists (${target.id}, known via ${source}). Would update it.`
      : `page/${PAGE_UID} does not exist yet (no master-ref match, no local record). Would create it.`
  )
  console.log('')
  printPlan()
  console.log('')
  if (hadStaleFooterLink) {
    console.log(
      `settings.footer_links has a stale, unresolved "${FOOTER_LINK_TEXT}" entry (no uid, ` +
        'url or id). Would drop it.'
    )
  }
  console.log(
    needsFooterLink
      ? `settings.footer_links has no working link to page/${PAGE_UID} yet. Would add "${FOOTER_LINK_TEXT}".`
      : `settings.footer_links already links to page/${PAGE_UID}. Nothing to add there.`
  )

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

  const migration: Migration = createMigration()

  const pageData = { ...buildPageFields(), slices: buildSlices() }
  const pageDoc = target
    ? migration.updateDocument(
        {
          id: target.id,
          uid: PAGE_UID,
          type: 'page',
          lang: target.lang,
          data: pageData,
        } as unknown as Parameters<Migration['updateDocument']>[0],
        HERO_TITLE
      )
    : migration.createDocument(
        {
          type: 'page',
          uid: PAGE_UID,
          lang: settings.lang,
          data: pageData,
        } as unknown as Parameters<Migration['createDocument']>[0],
        HERO_TITLE
      )

  if (shouldUpdateFooterLinks) {
    // footerLinks has already had any stale, unresolved attempt at this link
    // filtered out (withoutStaleFooterLink above), so appending here never
    // ships a fixed link alongside a still-broken duplicate.
    //
    // The pageDoc handle, not a bare { link_type, type, uid } object: that
    // shape has no `id`, so the Migration API doesn't recognise it as a
    // content relationship at all and forwards it unresolved, leaving the
    // route resolver with nothing to build a URL from. pageDoc carries the
    // document's real identity, whether it's being created in this same
    // migration or already exists (target.id, resolved above), so the API can
    // write a full document link. A document link, not a raw web link, so the
    // route resolver builds the URL and it survives a uid change.
    const nextLinks = needsFooterLink
      ? [...footerLinks, buildFooterLinkEntry(pageDoc, FOOTER_LINK_TEXT)]
      : footerLinks
    migration.updateDocument(
      {
        id: settings.id,
        type: 'settings',
        lang: settings.lang,
        data: { ...writableSettingsData, footer_links: [{ links: nextLinks }] },
      } as unknown as Parameters<Migration['updateDocument']>[0],
      'Site Settings'
    )
  }

  console.log(
    `Writing page/${PAGE_UID}${shouldUpdateFooterLinks ? ' and the settings footer link' : ''} ` +
      'through the Migration API.'
  )
  try {
    await asWriteClient(client).migrate(migration, {
      reporter: (event) => {
        if (event.type === 'documents:created') {
          console.log(`  created ${event.data.created} document(s)`)
        }
        if (event.type === 'documents:updated') {
          console.log(`  updated ${event.data.updated} document(s)`)
        }
      },
    })
  } catch (error) {
    // The Migration API creates the document (assigning a real id) before it
    // validates and writes the data onto it. A failure past that point still
    // leaves a real, if incomplete, document behind, and the SDK mutates
    // `pageDoc.document.id` in place the moment it has one, whether or not
    // migrate() ultimately throws. Record it now so the next run can find and
    // repair this document instead of colliding with an id nobody wrote down.
    const partialId =
      typeof pageDoc.document.id === 'string' ? pageDoc.document.id : null
    if (partialId && !target) {
      await writeKnownDoc({ id: partialId, lang: settings.lang })
      console.error('')
      console.error(
        `page/${PAGE_UID} was created as ${partialId} before this failed, so it exists but may ` +
          `be incomplete. Recorded it at backups/privacy-policy-doc.json: the next run will ` +
          'update it in place rather than colliding with it.'
      )
    }
    // PrismicError carries the parsed API response, which holds the actual
    // validation detail; describeError only reads .message.
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('API response:', JSON.stringify(error.response, null, 2))
    }
    if (target && source === 'local record') {
      // The id this script remembered no longer resolves: archived, deleted,
      // or otherwise gone. Keeping it would just fail the same way forever.
      await clearKnownDoc()
      console.error('')
      console.error(
        `The locally recorded page/${PAGE_UID} (${target.id}) could not be updated ` +
          `(${describeError(error)}). It has likely been archived or deleted in Prismic. The ` +
          'local record has been cleared, so the next run will create a fresh document instead ' +
          'of retrying this id.'
      )
    } else if (!target && /already exists/i.test(describeError(error))) {
      console.error('')
      console.error(
        `page/${PAGE_UID} already exists but was found on neither the master ref nor the local ` +
          'record at backups/privacy-policy-doc.json. That means a run from before this file ' +
          'existed (or something else) left it sitting in an unpublished Prismic migration ' +
          'release, which /api/v2 does not expose. Publish that release in the Prismic ' +
          'dashboard, or repair it there directly, then re-run.'
      )
    }
    console.error(`Pre-write backup: ${backup.file}`)
    throw error
  }
  console.log('')
  console.log(
    'The writes are in the repository migration release, unpublished. This script never ' +
      'publishes them. Review and publish in the Prismic dashboard (Releases -> the ' +
      'migration release -> Publish).'
  )
  console.log('')

  // Record (or refresh) the page's real id so the next run can find it even
  // while it stays invisible to the master ref. `pageDoc.document.id` is only
  // populated once `migrate()` above has actually assigned or confirmed it.
  const writtenId =
    typeof pageDoc.document.id === 'string' ? pageDoc.document.id : null
  if (writtenId) {
    await writeKnownDoc({ id: writtenId, lang: target?.lang ?? settings.lang })
    console.log(`Recorded page/${PAGE_UID} as ${writtenId} for future runs.`)
    console.log('')
  }

  // --- read back -----------------------------------------------------------------------
  console.log('Reading the page document back.')
  const readBack = await client.getByUID('page', PAGE_UID).catch(() => null)
  if (readBack) {
    const slices = Array.isArray(readBack.data.slices)
      ? readBack.data.slices
      : []
    console.log(
      `  page/${PAGE_UID}  read back with ${slices.length} slice(s)  ` +
        (slices.length === buildSlices().length ? 'OK' : 'not yet visible')
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
