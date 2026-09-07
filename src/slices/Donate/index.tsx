import { asLink, type Content } from '@prismicio/client'
import type { SliceComponentProps } from '@prismicio/react'
import { getSettings } from '@/lib/queries'
import DonateSection from './DonateSection'

export type DonateProps = SliceComponentProps<Content.DonateSlice>

/**
 * The donation URL lives on the settings singleton so it can be changed in one
 * place. A link set on the slice itself still wins.
 */
export default async function Donate({ slice }: DonateProps) {
  const settings = await getSettings()
  const donationLink = settings?.data.donationLink?.[0]

  const href =
    asLink(slice.primary.cta_link) ??
    asLink(donationLink) ??
    'https://pages.razorpay.com/svarit'
  const label =
    slice.primary.cta_label || donationLink?.text || 'Donate to Svarit'

  return <DonateSection slice={slice} href={href} label={label} />
}
