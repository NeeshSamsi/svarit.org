import SocialLinks from '@/components/ui/SocialLinks'
import { getSettings } from '@/lib/queries'
import NavClient from './NavClient'

/**
 * Server wrapper: reads the settings singleton, then hands the links to the
 * client component that owns the mobile menu and the GSAP entrance.
 */
export default async function Nav() {
  const settings = await getSettings()

  return (
    <NavClient
      links={settings?.data.nav[0]?.links ?? []}
      primary={settings?.data.donationLink ?? []}
      socialLinks={<SocialLinks />}
    />
  )
}
