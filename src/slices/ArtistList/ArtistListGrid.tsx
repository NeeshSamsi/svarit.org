'use client'

import { useRef, useEffect } from 'react'
import { isFilled, type Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import ArtistCard from '@/components/artists/ArtistCard'
import { gsap } from '@/lib/gsap'
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
    const ctx = gsap.context(() => {
      gsap.from('.artist-card', {
        y: 24,
        opacity: 0,
        duration: 0.4,
        stagger: 0.18,
        ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
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
