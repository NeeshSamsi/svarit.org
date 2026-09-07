import { isFilled, type Content } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import { InstagramIcon, YouTubeIcon } from '@/components/ui/social-icons'

interface ArtistSocialsProps {
  artist: Content.ArtistDocument
  /** The card stacks the chips on the photo; the hero lays them in a row. */
  orientation?: 'horizontal' | 'vertical'
  /** Chip background: the card sits on the photo, the hero on `bg-muted`. */
  chipClassName?: string
  /** Container utilities, e.g. absolute positioning on the card. */
  className?: string
}

/**
 * The Instagram / YouTube chips shared by `ArtistCard` and `ArtistHero`. Only the
 * two links the schema constrains us to are rendered, each omitted when empty so
 * there is never a dead icon. Renders nothing when the artist has neither.
 */
export default function ArtistSocials({
  artist,
  orientation = 'horizontal',
  chipClassName = 'bg-muted',
  className = '',
}: ArtistSocialsProps) {
  const { name, instagram, youtube } = artist.data
  const links = [
    { field: instagram, label: 'Instagram', Icon: InstagramIcon },
    { field: youtube, label: 'YouTube', Icon: YouTubeIcon },
  ].filter(({ field }) => isFilled.link(field))

  if (!links.length) return null

  return (
    <ul
      className={`flex gap-2 ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} ${className}`}
    >
      {links.map(({ field, label, Icon }) => (
        <li key={label}>
          <PrismicNextLink
            field={field}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name ? `${name} on ${label}` : label}
            className={`flex rounded-[12px] p-2.5 text-foreground transition-opacity hover:opacity-70 ${chipClassName}`}
          >
            <Icon className="size-6" />
          </PrismicNextLink>
        </li>
      ))}
    </ul>
  )
}
