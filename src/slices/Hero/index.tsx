import { type Content } from '@prismicio/client'
import type { SliceComponentProps } from '@prismicio/react'
import HeroDefault from './HeroDefault'
import HeroPageHeader from './HeroPageHeader'

export type HeroProps = SliceComponentProps<Content.HeroSlice>

/**
 * `default` is the homepage opener with the media panels. `page_header` is the
 * title-and-lead block for the top of an interior page. Each variation lives in
 * its own client component.
 */
export default function Hero({ slice }: HeroProps) {
  if (slice.variation === 'page_header') {
    return <HeroPageHeader slice={slice} />
  }

  return <HeroDefault slice={slice} />
}
