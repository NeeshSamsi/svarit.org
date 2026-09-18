import type { Metadata } from 'next'
import Link from 'next/link'
import { isFilled } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import { richTextComponents } from '@/slices/RichText/components'
import { button } from '@/components/ui/button-variants'
import { getThankYou } from '@/lib/queries'
import { SITE_DESCRIPTION } from '@/lib/site'
import { titleFromSlug, filledOrFallback } from '@/lib/metadata'

const FALLBACK_TITLE = 'Thank you for supporting Svarit'
const FALLBACK_BODY =
  'Your donation helps bring Indian music to more people, through concerts, festivals, education and community. We are grateful to have you with us.'
const FALLBACK_CTA_LABEL = 'Explore our initiatives'
const FALLBACK_CTA_HREF = '/initiatives'

/**
 * Razorpay redirects donors here after a successful payment, so unlike
 * /welcome-updates this route must never 404: with no document yet, or an
 * empty field, it renders the built-in fallback copy above instead. No
 * searchParams, so it stays static and prerenders; the Prismic webhook
 * revalidation that already covers the shared client's `prismic` cache tag
 * picks up edits once the document exists.
 */
export default async function ThankYouPage() {
  const doc = await getThankYou()

  // Guarded with a plain string check, not `isFilled`, because a migrated
  // Text field can read back as `[]` and still pass `isFilled.keyText`.
  const title =
    typeof doc?.data.title === 'string' && doc.data.title.trim()
      ? doc.data.title
      : FALLBACK_TITLE

  const hasCta =
    typeof doc?.data.cta_label === 'string' &&
    doc.data.cta_label.trim() !== '' &&
    isFilled.contentRelationship(doc.data.cta_link)

  const ctaLabel =
    hasCta && typeof doc?.data.cta_label === 'string'
      ? doc.data.cta_label
      : FALLBACK_CTA_LABEL

  return (
    <div className="col-span-full grid grid-cols-subgrid gap-y-18 pt-36 md:pt-44">
      <div className="col-span-full flex flex-col gap-6 lg:col-span-8 lg:col-start-2">
        <h1 className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
          {title}
        </h1>
        {doc && isFilled.richText(doc.data.body) ? (
          <PrismicRichText
            field={doc.data.body}
            components={richTextComponents}
          />
        ) : (
          <p className="font-body text-xl leading-relaxed font-light text-foreground">
            {FALLBACK_BODY}
          </p>
        )}
        <div className="w-fit">
          {hasCta && doc ? (
            <PrismicNextLink
              field={doc.data.cta_link}
              className={button({ variant: 'secondary', size: 'base' })}
            >
              {ctaLabel}
            </PrismicNextLink>
          ) : (
            <Link
              href={FALLBACK_CTA_HREF}
              className={button({ variant: 'secondary', size: 'base' })}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getThankYou()

  const title = filledOrFallback(
    doc?.data.meta_title,
    titleFromSlug('thank-you')
  )
  const description = filledOrFallback(
    doc?.data.meta_description,
    SITE_DESCRIPTION
  )

  // Reached only after a successful donation payment and never linked from
  // the site, so it should not be indexed.
  return {
    title,
    description,
    robots: { index: false, follow: false },
  }
}
