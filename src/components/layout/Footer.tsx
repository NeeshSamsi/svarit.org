import { asLink, isFilled } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import ButtonLink from '@/components/ui/ButtonLink'
import SocialLinks from '@/components/ui/SocialLinks'
import { getSettings } from '@/lib/queries'

const CREDITS_CLASS =
  'text-left font-body text-base font-light text-foreground sm:text-center'

/**
 * Composes the footer address line from the central street and locality,
 * with the postal code trailing after a dash. Region and country are correct
 * for schema and the privacy page's contact block, but the footer has never
 * shown them and shouldn't start. Each part drops cleanly when missing: no
 * dangling comma before an absent locality, no stray leading dash before a
 * postal code with nothing ahead of it. address_postal_code is stored
 * unspaced ("400007"), correct for PostalAddress schema, so it renders
 * unspaced here too rather than reformatting it for display.
 */
function footerAddress(
  street: string | null | undefined,
  locality: string | null | undefined,
  postalCode: string | null | undefined
): string {
  const place = [street, locality].filter(Boolean).join(', ')
  if (!postalCode) return place
  return place ? `${place} - ${postalCode}` : postalCode
}

export default async function Footer() {
  const settings = await getSettings()
  const footer = settings?.data.footer[0]
  const credits = footer?.credits
  // The same links the header renders; footer already has settings in hand.
  const navLinks = settings?.data.nav[0]?.links ?? []
  // The header's donation CTA, repeated at the foot of the page.
  const donationLink = settings?.data.donationLink ?? []
  // Legal and secondary links (Privacy Policy, later Terms). A separate group
  // from nav, so adding one here does not also put it in the header. The field
  // is new: `footer_links` will not exist yet on a document saved before the
  // custom type was pushed to Prismic, so it needs its own optional chain
  // rather than assuming the array like the older groups do.
  const footerLinks = settings?.data.footer_links?.[0]?.links ?? []
  // Split fields rather than the combined footer.contact text, so the email
  // and phone can each be a real link. See customtypes/settings.
  const email = settings?.data.email
  const phone = settings?.data.phone
  const phoneE164 = settings?.data.phone_e164
  const address = footerAddress(
    settings?.data.address_street,
    settings?.data.address_locality,
    settings?.data.address_postal_code
  )

  return (
    <footer className="col-span-full grid grid-cols-subgrid gap-y-4 pb-6">
      <div className="col-span-full h-px bg-foreground" />
      <div className="col-span-full flex flex-col items-start gap-4 sm:col-span-4">
        <div className="flex items-center gap-8">
          {/* Plain img: the logo is a 1KB SVG, so next/image adds a loader round trip for no optimisation benefit. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.svg" alt="Svarit" className="h-8 w-auto" />
          <SocialLinks />
        </div>
        <div className="flex flex-col gap-2">
          {/* `a` inherits color and underline from its parent (Tailwind resets
              both to `inherit`), so linking email and phone changes nothing
              visible. A missing phone drops the " | " rather than leaving it
              dangling, and the line disappears entirely with neither set. */}
          {(email || phone) && (
            <p className="font-body text-base font-light text-foreground">
              {email && <a href={`mailto:${email}`}>{email}</a>}
              {email && phone && ' | '}
              {phone &&
                (phoneE164 ? <a href={`tel:${phoneE164}`}>{phone}</a> : phone)}
            </p>
          )}
          {address && (
            <p className="font-body text-base font-light text-foreground">
              {address}
            </p>
          )}
        </div>
      </div>
      <div className="col-span-full flex flex-col items-start sm:col-span-8 sm:items-end">
        {navLinks.length > 0 && (
          <nav
            aria-label="Footer"
            className="flex flex-col gap-2 text-left sm:text-right"
          >
            {navLinks.map((link, i) => (
              <PrismicNextLink
                key={i}
                field={link}
                className="font-body text-base font-light text-foreground hover:font-normal"
              >
                {link.text}
              </PrismicNextLink>
            ))}
          </nav>
        )}
        {donationLink.length > 0 && (
          <div className="mt-4">
            {donationLink.map((link, i) => (
              <ButtonLink
                key={i}
                variant="primary"
                size="sm"
                href={asLink(link) ?? '#'}
                target="_blank"
              >
                {link.text}
              </ButtonLink>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-full flex flex-col items-start sm:items-center">
        <p className={CREDITS_CLASS}>{footer?.copyright}</p>
        {isFilled.richText(credits) ? (
          <PrismicRichText
            field={credits}
            components={{
              paragraph: ({ children }) => (
                <p className={CREDITS_CLASS}>{children}</p>
              ),
              hyperlink: ({ children, node }) => (
                <PrismicNextLink
                  field={node.data}
                  className="underline hover:font-normal"
                >
                  {children}
                </PrismicNextLink>
              ),
            }}
          />
        ) : (
          <p className={CREDITS_CLASS}>
            Made with 💛 by{' '}
            <a
              href="https://neeshsamsi.com?utm_source=svarit.org&utm_medium=referral"
              target="_blank"
              className="underline hover:font-normal"
            >
              Neesh Samsi
            </a>
          </p>
        )}
        {footerLinks.length > 0 && (
          <p className={CREDITS_CLASS}>
            {footerLinks.map((link, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                <PrismicNextLink
                  field={link}
                  className="underline hover:font-normal"
                >
                  {link.text}
                </PrismicNextLink>
              </span>
            ))}
          </p>
        )}
      </div>
    </footer>
  )
}
