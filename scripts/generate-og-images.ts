#!/usr/bin/env node
/**
 * Generates the Open Graph share card for every artist and event that has no
 * `meta_image` in Prismic. 1200x630 JPEG, rendered by headless Chromium with the
 * site's real Adobe Fonts kit, so the cards are set in Fields Display and Proxima
 * Nova rather than a system fallback.
 *
 *   node --experimental-strip-types scripts/generate-og-images.ts
 *       Dry run. Lists the cards it would generate. Launches no browser.
 *
 *   node --experimental-strip-types scripts/generate-og-images.ts --commit
 *       Renders and writes public/og/generated/{artists,initiatives}/<uid>.jpg.
 *
 * WHY HEADLESS, NOT @vercel/og: Satori needs each font as a TTF/OTF ArrayBuffer.
 * Pulling those out of Adobe's token-signed CDN is against the Adobe Fonts terms.
 * A real browser loading the kit CSS is the licensed, intended path, and Adobe
 * serves the font to it exactly as designed.
 *
 * NOT PART OF THE PRODUCTION BUILD. The cards are a build artifact committed to
 * the repo and served as static files from public/. Playwright and its Chromium
 * download stay a devDependency: Vercel never runs this script.
 *
 * THE CARDS GO STALE. Each one bakes in the artist name or event title as it
 * read at generation time. When one changes in Prismic its card is wrong until
 * someone re-runs `pnpm og:generate:commit` by hand. Names and titles change
 * rarely, so that manual step is an accepted tradeoff for now.
 *
 * The font load is asserted before every screenshot (document.fonts plus a width
 * measurement against a distinct fallback). A silent drop to Helvetica throws
 * rather than shipping.
 */

import { mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as prismic from '@prismicio/client'
import { chromium, type Page } from 'playwright'
import {
  clientFor,
  describeError,
  resolveRepositoryName,
} from './lib/prismic.ts'
import { artistInitials } from '../src/components/artists/initials.ts'

// -----------------------------------------------------------------------------------------
// The card (pure, covered by scripts/generate-og-images.test.ts)
// -----------------------------------------------------------------------------------------

/** The `public/og/generated/<kind>/` folder each card type is written to. */
export type CardKind = 'artists' | 'initiatives'

/** The site's Adobe Fonts kit, the same one `src/app/layout.tsx` links. */
export const TYPEKIT_CSS = 'https://use.typekit.net/yan0qzb.css'

// Palette and type lifted from src/app/globals.css @theme, so the share card and
// the on-site initials placeholder (src/components/artists/ArtistPhoto.tsx) read
// as one system. The real site logo sits small in the top margin (read off disk
// and inlined, never fetched). Below it: a Proxima Nova kicker (the content
// type, echoing CategoryBadge), then for an artist the Fields Display monogram
// at 40% with the name under it, and for an event just the title in the same
// face, since an initials mark off an event title is meaningless.
const COLOR_PRIMARY = '#fef7ed'
const COLOR_FOREGROUND = '#1e1c1a'

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export type Card = {
  kind: CardKind
  uid: string
  /** Artist name on an artist card, event title on an event card. */
  label: string
  /** Uppercase content-type label: "Artist", or the event category. */
  kicker: string
  /**
   * First-and-last-initial monogram, from the same helper the site uses. Set
   * for artist cards only: an initials mark off an event title reads as noise.
   */
  monogram?: string
}

/** The web path a card is served at, matching `resolveOgImage` in src/lib/og.ts. */
export function generatedWebPath(kind: CardKind, uid: string): string {
  return `/og/generated/${kind}/${uid}.jpg`
}

/**
 * The 1200x630 document rendered for one card. `logoSvg` is the raw contents of
 * public/assets/logo.svg, inlined so the render has no external dependency.
 */
export function cardHtml(
  card: Pick<Card, 'label' | 'kicker' | 'monogram'>,
  logoSvg: string
): string {
  const isArtist = Boolean(card.monogram)
  const monogram = card.monogram
    ? `<div class="monogram">${escapeHtml(card.monogram)}</div>`
    : ''
  const stageClass = isArtist ? 'stage' : 'stage stage-event'
  const labelClass = isArtist ? 'label' : 'label label-lead'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="${TYPEKIT_CSS}">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  body{
    background:${COLOR_PRIMARY};
    color:${COLOR_FOREGROUND};
    font-family:'proxima-nova',sans-serif;
    position:relative;
  }
  /* The real site logo, centred in the top margin. Height is set here so the
     file's own 71x32 attributes do not decide the scale. Small and quiet: it is
     attribution, not the subject of the card. */
  .logo{
    position:absolute;top:44px;left:0;right:0;
    display:flex;justify-content:center;
  }
  .logo svg{height:44px;width:auto;display:block}
  /* The content band. For an artist it sits below the logo, so the big monogram
     keeps clear of it. An event has only a kicker and a title, so its band is
     the whole card: the title lands on the optical centre and the centred logo
     reads as a classic poster lockup rather than leaving a void. */
  .stage{
    position:absolute;left:96px;right:96px;top:172px;bottom:60px;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;
  }
  .stage-event{
    top:96px;bottom:44px;
  }
  .kicker{
    font-weight:500;font-size:19px;
    letter-spacing:0.3em;text-transform:uppercase;
    color:rgba(30,28,26,0.55);
  }
  .monogram{
    font-family:'fields-display',serif;font-weight:500;
    font-size:206px;line-height:1;margin-top:6px;
    color:rgba(30,28,26,0.40);
  }
  .label{
    font-family:'fields-display',serif;font-weight:500;
    font-size:52px;line-height:1.15;
    max-width:1000px;margin-top:18px;text-wrap:balance;
  }
  .label-lead{
    font-size:82px;margin-top:24px;
  }
</style>
</head>
<body>
  <div class="logo">${logoSvg}</div>
  <div class="${stageClass}">
    <div class="kicker">${escapeHtml(card.kicker)}</div>
    ${monogram}
    <div class="${labelClass}">${escapeHtml(card.label)}</div>
  </div>
</body>
</html>`
}

// -----------------------------------------------------------------------------------------
// The plan (pure, testable)
// -----------------------------------------------------------------------------------------

/** The bits of a Prismic artist or event document this script needs. */
export type SourceDoc = {
  uid: string
  /** Artist `name` or event `title`. */
  label: string | null | undefined
  /** Uppercase content-type label for the kicker. */
  kicker: string
  /** True when the document already has its own `meta_image`. */
  hasMetaImage: boolean
}

export type Skip = { uid: string; reason: string }

/**
 * Turns the fetched documents of one kind into the cards to render. A document
 * is skipped when it already has a `meta_image` (its own art wins) or when it
 * has no name / title to set (nothing meaningful to draw).
 */
export function planCards(
  kind: CardKind,
  docs: SourceDoc[]
): { cards: Card[]; skipped: Skip[] } {
  const cards: Card[] = []
  const skipped: Skip[] = []

  for (const doc of docs) {
    if (doc.hasMetaImage) {
      skipped.push({ uid: doc.uid, reason: 'has its own meta_image' })
      continue
    }

    const label = (doc.label ?? '').trim()
    if (!label) {
      skipped.push({ uid: doc.uid, reason: 'no name or title' })
      continue
    }

    // Artists get the monogram (mirroring the on-site placeholder); events lead
    // with the title instead.
    cards.push({
      kind,
      uid: doc.uid,
      label,
      kicker: doc.kicker,
      monogram: kind === 'artists' ? artistInitials(label) : undefined,
    })
  }

  return { cards, skipped }
}

// -----------------------------------------------------------------------------------------
// Font verification
// -----------------------------------------------------------------------------------------

/**
 * Throws unless both kit families actually rendered. `document.fonts.check`
 * alone is not enough: it returns true for a family that is not in any
 * `@font-face` rule at all, which is exactly the Helvetica-fallback case. So we
 * also measure a string against a deliberately distinct fallback and require the
 * width to move.
 */
async function assertFontsLoaded(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)

  const report = await page.evaluate(() => {
    const loaded = new Set<string>()
    document.fonts.forEach((face) => {
      if (face.status === 'loaded') {
        loaded.add(face.family.replace(/["']/g, '').toLowerCase())
      }
    })

    const widthWith = (family: string): number => {
      const el = document.createElement('span')
      el.style.cssText =
        'position:absolute;left:-9999px;font-size:180px;white-space:nowrap;font-family:' +
        family
      el.textContent = 'Svarit Dinarang MWil'
      document.body.appendChild(el)
      const width = el.getBoundingClientRect().width
      el.remove()
      return width
    }

    const mono = widthWith('monospace')

    return {
      loaded: [...loaded],
      fieldsShifted: widthWith("'fields-display',monospace") !== mono,
      proximaShifted: widthWith("'proxima-nova',monospace") !== mono,
    }
  })

  const missing: string[] = []
  if (!report.loaded.includes('fields-display') || !report.fieldsShifted) {
    missing.push('fields-display')
  }
  if (!report.loaded.includes('proxima-nova') || !report.proximaShifted) {
    missing.push('proxima-nova')
  }

  if (missing.length > 0) {
    throw new Error(
      `Typekit fonts did not load: ${missing.join(', ')}. Loaded faces: ` +
        `${report.loaded.join(', ') || 'none'}. Refusing to ship a card set in a system ` +
        'fallback. Check network access to use.typekit.net.'
    )
  }
}

// -----------------------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------------------

const GENERATED_DIR = fileURLToPath(
  new URL('../public/og/generated/', import.meta.url)
)

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

function toSourceDocs(
  docs: prismic.PrismicDocument[],
  labelField: 'name' | 'title'
): SourceDoc[] {
  return docs
    .filter((doc): doc is prismic.PrismicDocument & { uid: string } =>
      Boolean(doc.uid)
    )
    .map((doc) => ({
      uid: doc.uid,
      label: doc.data[labelField] as string | null | undefined,
      // Artists have no on-site type label; events carry a CategoryBadge.
      kicker:
        labelField === 'name'
          ? 'Artist'
          : (doc.data.category as string | null | undefined) || 'Event',
      hasMetaImage: Boolean(
        prismic.asImageSrc(doc.data.meta_image as prismic.ImageField)
      ),
    }))
}

const KB = 1024

async function directoryBytes(dir: string): Promise<number> {
  let total = 0
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) total += await directoryBytes(full)
    else total += (await stat(full)).size
  }
  return total
}

const LOGO_PATH = fileURLToPath(
  new URL('../public/assets/logo.svg', import.meta.url)
)

async function main() {
  const { commit } = parseArgs(process.argv.slice(2))
  const repositoryName = await resolveRepositoryName()
  const client = clientFor(repositoryName)

  const [artists, events] = await Promise.all([
    client.getAllByType('artist', { orderings: [{ field: 'my.artist.name' }] }),
    client.getAllByType('event', {
      orderings: [{ field: 'my.event.start_date', direction: 'desc' }],
    }),
  ])

  const artistPlan = planCards('artists', toSourceDocs(artists, 'name'))
  const eventPlan = planCards('initiatives', toSourceDocs(events, 'title'))
  const cards = [...artistPlan.cards, ...eventPlan.cards]
  const skipped = [...artistPlan.skipped, ...eventPlan.skipped]

  console.log(
    `${commit ? 'Commit' : 'Dry run'} against "${repositoryName}": ` +
      `${artists.length} artists, ${events.length} events. ` +
      `${cards.length} cards to render, ${skipped.length} skipped.`
  )
  console.log('')
  for (const card of cards) {
    const mark = card.monogram ? `[${card.monogram}]` : card.kicker
    console.log(
      `  ${card.kind}/${card.uid}.jpg  ${JSON.stringify(card.label)}  ${mark}`
    )
  }
  for (const skip of skipped) {
    console.log(`  skip  ${skip.uid}  ${skip.reason}`)
  }
  console.log('')

  if (!commit) {
    console.log(
      'Dry run: no browser launched, nothing written. Re-run with --commit to render.'
    )
    return
  }

  if (cards.length === 0) {
    console.log('Nothing to render.')
    return
  }

  // Inlined into every card so the render depends on no server and no cwd.
  const logoSvg = await readFile(LOGO_PATH, 'utf8')

  // A fresh browser per card: 59 setContent calls on one long-lived page crashed
  // the renderer part way through. deviceScaleFactor 1 so the screenshot is
  // exactly 1200x630. The Referer is the production site: Adobe serves the kit
  // to a real browser as designed.
  const renderCard = async (card: Card, outPath: string): Promise<void> => {
    const browser = await chromium.launch({
      args: ['--disable-dev-shm-usage'],
    })
    try {
      const page = await browser.newPage({
        viewport: { width: 1200, height: 630 },
        deviceScaleFactor: 1,
        extraHTTPHeaders: { Referer: 'https://www.svarit.org/' },
      })
      await page.setContent(cardHtml(card, logoSvg), {
        waitUntil: 'networkidle',
      })
      await assertFontsLoaded(page)
      await mkdir(dirname(outPath), { recursive: true })
      await page.screenshot({
        path: outPath,
        type: 'jpeg',
        quality: 82,
        clip: { x: 0, y: 0, width: 1200, height: 630 },
      })
    } finally {
      await browser.close()
    }
  }

  let written = 0
  for (const card of cards) {
    const outPath = join(GENERATED_DIR, card.kind, `${card.uid}.jpg`)
    try {
      await renderCard(card, outPath)
    } catch (error) {
      // One retry: the renderer occasionally dies for reasons unrelated to the
      // card. A font-gate failure throws again here and stops the run, which is
      // the point of the gate.
      console.warn(
        `  retry  ${card.kind}/${card.uid}  (${describeError(error)})`
      )
      await renderCard(card, outPath)
    }
    written += 1
    console.log(`  wrote  ${card.kind}/${card.uid}.jpg`)
  }

  const totalBytes = await directoryBytes(GENERATED_DIR)
  console.log('')
  console.log(
    `Wrote ${written} cards. public/og/generated/ total: ` +
      `${(totalBytes / KB / KB).toFixed(2)} MB (${(totalBytes / KB).toFixed(0)} KB).`
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(describeError(error))
    process.exit(1)
  })
}
