'use client'

import { useRef, useEffect } from 'react'
import { isFilled, type Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import ArtistCard from '@/components/artists/ArtistCard'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import type { ArtistDocument } from '../../../prismicio-types'

export default function ArtistListGrid({
  slice,
  artists,
}: {
  slice: Content.ArtistListSlice
  artists: ArtistDocument[]
}) {
  const sectionRef = useRef<HTMLElement>(null)

  const hasHeader =
    isFilled.keyText(slice.primary.heading) ||
    isFilled.keyText(slice.primary.subheading)

  useEffect(() => {
    const ctx = gsap.context((self) => {
      // One staggered timeline over all 35 cards would leave the last rows at
      // opacity 0 for seconds after a fast scroll blew past them. batch() instead
      // reveals whatever crossed the trigger together as one group, its stagger
      // capped to a fixed total, so the viewport is never left blank.
      ScrollTrigger.batch(self.selector!('.artist-card'), {
        once: true,
        start: 'top 85%',
        onEnter: (batch) =>
          gsap.from(batch, {
            y: 24,
            opacity: 0,
            duration: 0.4,
            ease: 'power2.out',
            stagger: { amount: 0.3 },
            overwrite: true,
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
        <div className="col-span-full">
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
          className="artist-card col-span-full sm:col-span-6 lg:col-span-4"
        />
      ))}
    </section>
  )
}
