import type { Content } from '@prismicio/client'

type AppendBlockVariant =
  Content.LegalSectionSliceDefaultPrimary['append_block']

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

/**
 * The three generated blocks a legal_section can append after its rich text.
 * They read Settings rather than typed copy so a page can never drift from it,
 * which also means every field can be null: Settings is seeded in an
 * unpublished release, so today's live master reads null across the board.
 * Each block renders nothing rather than an empty row or a stray "Invalid
 * Date" when its data is not there yet.
 */
export default function AppendBlock({
  variant,
  settings,
  updatedAt,
}: {
  variant: AppendBlockVariant
  settings: Content.SettingsDocument | null
  updatedAt: string | null
}) {
  if (variant === 'contact_details') {
    return <ContactDetails settings={settings} />
  }

  if (variant === 'last_updated') {
    return <LastUpdated date={updatedAt} />
  }

  if (variant === 'complaints_contact') {
    return <ComplaintsContact settings={settings} />
  }

  return null
}

function ContactDetails({
  settings,
}: {
  settings: Content.SettingsDocument | null
}) {
  const email = text(settings?.data.email)
  const phone = text(settings?.data.phone)
  const phoneHref = text(settings?.data.phone_e164)
  const address = [
    text(settings?.data.address_street),
    text(settings?.data.address_locality),
    text(settings?.data.address_region),
    text(settings?.data.address_postal_code),
  ]
    .filter(Boolean)
    .join(', ')

  if (!email && !phone && !address) return null

  return (
    <dl className="col-span-full flex flex-col gap-2 font-body text-xl leading-relaxed font-light text-foreground lg:col-span-8 lg:col-start-2">
      {address && (
        <div className="flex flex-wrap gap-2">
          <dt className="text-foreground/70">Address:</dt>
          <dd>{address}</dd>
        </div>
      )}
      {email && (
        <div className="flex flex-wrap gap-2">
          <dt className="text-foreground/70">Email:</dt>
          <dd>
            <a href={`mailto:${email}`} className="underline hover:font-normal">
              {email}
            </a>
          </dd>
        </div>
      )}
      {phone && (
        <div className="flex flex-wrap gap-2">
          <dt className="text-foreground/70">Phone:</dt>
          <dd>
            {phoneHref ? (
              <a
                href={`tel:${phoneHref}`}
                className="underline hover:font-normal"
              >
                {phone}
              </a>
            ) : (
              phone
            )}
          </dd>
        </div>
      )}
    </dl>
  )
}

function LastUpdated({ date }: { date: string | null }) {
  const formatted = formatIndianDate(date)
  if (!formatted) return null

  return (
    <p className="col-span-full font-body text-base font-light text-foreground/70 lg:col-span-8 lg:col-start-2">
      Last updated: {formatted}
    </p>
  )
}

function ComplaintsContact({
  settings,
}: {
  settings: Content.SettingsDocument | null
}) {
  const email = text(settings?.data.email)
  if (!email) return null

  return (
    <p className="col-span-full font-body text-xl leading-relaxed font-light text-foreground lg:col-span-8 lg:col-start-2">
      <a href={`mailto:${email}`} className="underline hover:font-normal">
        {email}
      </a>
    </p>
  )
}

// Prismic's Date field is a bare calendar date, no time or zone. Parsing and
// formatting in UTC keeps "3 September 2026" from rolling back a day for a
// reader, or a build server, sitting west of Greenwich.
const formatIndianDate = (date: string | null): string | null => {
  if (!date) return null

  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return null

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}
