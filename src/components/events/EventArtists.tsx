'use client'

import { useRef } from 'react'
import { type Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import ArtistCard from '@/components/artists/ArtistCard'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { introHandoff, EVENT_HERO_INTRO_END } from '@/lib/intro'

/**
 * The artists featured in an event, the mirror of ArtistFeatures (which renders
 * events on an artist page). Reveal matches it: cards hidden before paint, then
 * `ScrollTrigger.batch` brings in whatever crossed the trigger so a fast scroll
 * never leaves a blank viewport. Unlike ArtistFeatures this can sit on screen at
 * load on a short event page, so it hands off from EventHero: introHandoff runs
 * in onEnter, returning the hero's remaining time on load and 0 once scrolled to.
 */
export default function EventArtists({
  artists,
}: {
  artists: Content.ArtistDocument[]
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const mountedAt = performance.now()

    const ctx = gsap.context((self) => {
      const cards = self.selector!('.event-artist-card')

      // CSS hides these before paint; the set adds the y offset and gives GSAP
      // the start state.
      gsap.set(cards, { y: 24, opacity: 0 })

      if (headerRef.current) {
        const header = headerRef.current
        gsap.set(header, { y: 20, opacity: 0 })
        ScrollTrigger.create({
          trigger: header,
          start: 'top 85%',
          once: true,
          onEnter: () =>
            gsap.to(header, {
              y: 0,
              opacity: 1,
              duration: 0.4,
              ease: 'power2.out',
              delay: introHandoff(mountedAt, EVENT_HERO_INTRO_END),
            }),
        })
      }

      ScrollTrigger.batch(cards, {
        once: true,
        batchMax: 6,
        start: 'top 85%',
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            stagger: { amount: 0.3 },
            overwrite: true,
            delay: introHandoff(mountedAt, EVENT_HERO_INTRO_END),
          }),
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Artists"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      {/* Own row: without this col-span-full wrapper the first card flows up
          beside the heading. */}
      <div ref={headerRef} className="gsap-reveal col-span-full">
        <SectionTitle eyebrow="Featuring" title="Artists" />
      </div>
      {artists.map((artist) => (
        <ArtistCard
          key={artist.id}
          artist={artist}
          headingLevel={3}
          className="event-artist-card gsap-reveal col-span-6 sm:col-span-4 lg:col-span-3"
        />
      ))}
    </section>
  )
}
