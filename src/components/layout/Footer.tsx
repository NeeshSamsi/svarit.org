import { asLink, isFilled } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import ButtonLink from '@/components/ui/ButtonLink'
import SocialLinks from '@/components/ui/SocialLinks'
import { getSettings } from '@/lib/queries'

const CREDITS_CLASS =
  'text-left font-body text-base font-light text-foreground sm:text-center'

export default async function Footer() {
  const settings = await getSettings()
  const footer = settings?.data.footer[0]
  const credits = footer?.credits
  // The same links the header renders; footer already has settings in hand.
  const navLinks = settings?.data.nav[0]?.links ?? []
  // The header's donation CTA, repeated at the foot of the page.
  const donationLink = settings?.data.donationLink ?? []

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
          <p className="font-body text-base font-light text-foreground">
            {footer?.contact}
          </p>
          <p className="font-body text-base font-light text-foreground">
            {footer?.address}
          </p>
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
      </div>
    </footer>
  )
}
