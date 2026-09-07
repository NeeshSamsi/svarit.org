import { isFilled } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import { getSettings } from '@/lib/queries'
import { FacebookIcon, InstagramIcon, YouTubeIcon } from './social-icons'

const socialLinks = [
  { key: 'instagram', label: 'Svarit on Instagram', Icon: InstagramIcon },
  { key: 'youtube', label: 'Svarit on YouTube', Icon: YouTubeIcon },
  { key: 'facebook', label: 'Svarit on Facebook', Icon: FacebookIcon },
] as const

export default async function SocialLinks({
  className = '',
  iconClassName = 'size-6',
}: {
  className?: string
  iconClassName?: string
}) {
  const settings = await getSettings()
  const socials = settings?.data.socials[0]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {socialLinks.map(({ key, label, Icon }) => {
        const field = socials?.[key]
        if (!isFilled.link(field)) return null

        return (
          <PrismicNextLink
            key={key}
            field={field}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="text-foreground transition-opacity hover:opacity-60"
          >
            <Icon className={iconClassName} />
          </PrismicNextLink>
        )
      })}
    </div>
  )
}
