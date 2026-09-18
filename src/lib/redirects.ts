/**
 * The single home for campaign and vanity links: short `svarit.org/<slug>`
 * URLs handed out on Instagram, WhatsApp, posters/QR codes, or in emails.
 * Structural redirects (renamed or moved URLs, permanent by nature) stay in
 * `next.config.ts`; anything tied to a campaign belongs here instead.
 *
 * Why this file exists at all: a plain server redirect in `next.config.ts`
 * runs no JS, so Umami never sees the click, and a redirect straight to an
 * external URL is never tracked either.
 *
 * - Internal destination (a page on this site): must carry UTM params so
 *   the visit is attributed once it lands. `buildCampaignRedirects` adds
 *   them for you.
 * - External destination (a Google Form, YouTube, Razorpay, etc.): create
 *   an Umami Link first (dashboard: Links > Add) and use its
 *   `https://umami.neeshsamsi.com/q/<slug>` URL as the destination here.
 *   Never redirect straight to the external URL; it would be untracked.
 *   Umami Link stats live in the Links section, separate from the website,
 *   so they cannot be steps in website Goals/Funnels.
 * - Always temporary (307, `permanent: false`): campaign destinations
 *   change, and browsers cache a permanent (308) redirect hard.
 * - UTM conventions, lowercase kebab-case: `utm_source` is where the link
 *   is placed (instagram, whatsapp, bento, poster, youtube); `utm_medium`
 *   is the channel type (social, email, qr, referral, messaging);
 *   `utm_campaign` is the initiative uid or campaign name (e.g.
 *   centenary); optional `utm_content` tells apart two placements in one
 *   campaign (e.g. bio vs story).
 * - Slugs (`source`): lowercase kebab-case, short. A slug must not match a
 *   Prismic `page` uid or an app route: redirects run before routing and
 *   would silently shadow that page.
 * - Retiring a link: delete the entry once the campaign ends. If it was
 *   printed (poster, QR code), point it at a lasting page instead of
 *   deleting, since printed links live on. A deleted link then 404s, which
 *   shows up in Umami as a `not-found` event, the signal that an old link
 *   is still circulating.
 * - Keep a `note` on every entry (what it is, where it was shared, and
 *   month/year), so a stale one is obvious at a glance.
 *
 * No `@/` imports here: this file is loaded by `next.config.ts`, which is
 * not resolved through tsconfig paths.
 */

const UMAMI_HOST = 'umami.neeshsamsi.com'
const UMAMI_LINK_PREFIX = `https://${UMAMI_HOST}/q/`

type Utm = {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content?: string
}

/**
 * `destination` alone decides which shape applies: a leading `/` requires
 * `utm`, a `https://umami.neeshsamsi.com/q/` prefix requires nothing else.
 * Both an untagged internal link and a raw external URL fail to typecheck.
 */
export type CampaignRedirect = { source: string; note: string } & (
  | { destination: `/${string}`; utm: Utm }
  | { destination: `${typeof UMAMI_LINK_PREFIX}${string}` }
)

type NextRedirect = { source: string; destination: string; permanent: false }

// Internal example (destination is a page on this site, tagged with UTMs):
// {
//   source: '/centenary-ig',
//   note: 'Instagram bio link for the centenary launch, Sep 2026',
//   destination: '/centenary',
//   utm: {
//     utm_source: 'instagram',
//     utm_medium: 'social',
//     utm_campaign: 'centenary',
//     utm_content: 'bio',
//   },
// },
// External example (destination is an Umami Link, created in the dashboard
// first, never the raw external URL):
// {
//   source: '/centenary-form',
//   note: 'QR code on the centenary poster, links to the registration form, Sep 2026',
//   destination: 'https://umami.neeshsamsi.com/q/centenary-form',
// },
export const campaignRedirects: CampaignRedirect[] = []

const SLUG_PATTERN = /^\/[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Appends UTM params to an internal destination, preserving any query the
 * destination already carries. `URL` needs an absolute base to parse a
 * relative path, so a throwaway one is supplied and discarded.
 */
function appendUtm(destination: `/${string}`, utm: Utm): string {
  const url = new URL(destination, 'https://campaign-redirect.invalid')

  url.searchParams.set('utm_source', utm.utm_source)
  url.searchParams.set('utm_medium', utm.utm_medium)
  url.searchParams.set('utm_campaign', utm.utm_campaign)
  if (utm.utm_content) url.searchParams.set('utm_content', utm.utm_content)

  return `${url.pathname}?${url.searchParams.toString()}`
}

/**
 * Turns `campaignRedirects` entries into Next.js redirect objects, always
 * `permanent: false`. Throws at build time (rather than shipping a broken
 * or untracked link) for a malformed slug, a duplicate source, an external
 * destination that is not an Umami Link, or an internal destination
 * missing a required UTM field.
 */
export function buildCampaignRedirects(
  entries: CampaignRedirect[]
): NextRedirect[] {
  const seen = new Set<string>()

  return entries.map((entry) => {
    if (!SLUG_PATTERN.test(entry.source))
      throw new Error(
        `campaignRedirects: source "${entry.source}" must be a lowercase kebab-case path starting with "/" (e.g. "/dinarang-2026").`
      )

    if (seen.has(entry.source))
      throw new Error(`campaignRedirects: duplicate source "${entry.source}".`)
    seen.add(entry.source)

    if ('utm' in entry) {
      const { utm_source, utm_medium, utm_campaign } = entry.utm
      if (!utm_source || !utm_medium || !utm_campaign)
        throw new Error(
          `campaignRedirects: "${entry.source}" is missing utm_source, utm_medium, or utm_campaign.`
        )

      return {
        source: entry.source,
        destination: appendUtm(entry.destination, entry.utm),
        permanent: false,
      }
    }

    if (!entry.destination.startsWith(UMAMI_LINK_PREFIX))
      throw new Error(
        `campaignRedirects: "${entry.source}" has an external destination that is not a ${UMAMI_LINK_PREFIX} Umami Link. Create the Link in the Umami dashboard first, so the click is tracked.`
      )

    return {
      source: entry.source,
      destination: entry.destination,
      permanent: false,
    }
  })
}
