'use client'

import { useRef } from 'react'
import { isFilled, type Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import ArtistCard from '@/components/artists/ArtistCard'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { introHandoff, PAGE_HEADER_INTRO_END } from '@/lib/intro'
import type { ArtistDocument } from '../../../prismicio-types'

export default function ArtistListGrid({
  slice,
  artists,
}: {
  slice: Content.ArtistListSlice
  artists: ArtistDocument[]
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const hasHeader =
    isFilled.keyText(slice.primary.heading) ||
    isFilled.keyText(slice.primary.subheading)

  useIsomorphicLayoutEffect(() => {
    // The artists index is HeroPageHeader + this slice, both mounting at once.
    // Cards that reveal on load wait out whatever is left of the header's intro
    // so the two don't run over each other; cards scrolled to later get 0.
    const mountedAt = performance.now()

    const ctx = gsap.context((self) => {
      const cards = self.selector!('.artist-card')

      // CSS already hides these before paint; the set tells GSAP the start
      // state and adds the y offset.
      gsap.set(cards, { y: 24, opacity: 0 })

      // The header sits above the fold on load, so reveal it directly, just
      // ahead of the cards, once the page header's intro has cleared.
      if (headerRef.current) {
        gsap.set(headerRef.current, { y: 20, opacity: 0 })
        gsap.to(headerRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          delay: introHandoff(mountedAt, PAGE_HEADER_INTRO_END),
        })
      }

      // One staggered timeline over all 35 cards would leave the last rows at
      // opacity 0 for seconds after a fast scroll blew past them. batch() instead
      // reveals whatever crossed the trigger together as one group, its stagger
      // capped to a fixed total, so the viewport is never left blank.
      ScrollTrigger.batch(cards, {
        once: true,
        start: 'top 85%',
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            stagger: { amount: 0.3 },
            overwrite: true,
            delay: introHandoff(mountedAt, PAGE_HEADER_INTRO_END),
          }),
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Artists"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      {hasHeader && (
        <div ref={headerRef} className="gsap-reveal col-span-full">
          <SectionTitle
            eyebrow={slice.primary.subheading ?? undefined}
            title={slice.primary.heading ?? ''}
          />
        </div>
      )}
      {artists.map((artist, index) => (
        <ArtistCard
          key={artist.id}
          artist={artist}
          priority={index < 3}
          headingLevel={2}
          className="artist-card gsap-reveal col-span-full sm:col-span-6 lg:col-span-4"
        />
      ))}
    </section>
  )
}
