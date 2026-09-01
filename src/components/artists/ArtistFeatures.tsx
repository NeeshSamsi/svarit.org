'use client'

import { useRef } from 'react'
import { type Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import EventCard from '@/slices/EventList/EventCard'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

/**
 * The events an artist has appeared in, from the reverse relationship query on
 * the detail page. Headings come from the artist document (`features_eyebrow`,
 * `features_title`) with fallbacks resolved by the caller. Reveal matches the
 * artists index: cards hidden before paint, then `ScrollTrigger.batch` reveals
 * whatever crossed the trigger so a fast scroll never leaves a blank viewport.
 * Far below the fold, so no hero handoff.
 */
export default function ArtistFeatures({
  eyebrow,
  title,
  events,
}: {
  eyebrow: string
  title: string
  events: Content.EventDocument[]
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      const cards = self.selector!('.feature-card')

      // CSS hides these before paint; the set adds the y offset and gives GSAP
      // the start state.
      gsap.set(cards, { y: 24, opacity: 0 })

      if (headerRef.current) {
        gsap.set(headerRef.current, { y: 20, opacity: 0 })
        gsap.to(headerRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 85%',
            once: true,
          },
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
          }),
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Features"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div ref={headerRef} className="gsap-reveal col-span-full">
        <SectionTitle eyebrow={eyebrow} title={title} />
      </div>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          linked
          badge
          className="feature-card gsap-reveal"
        />
      ))}
    </section>
  )
}
