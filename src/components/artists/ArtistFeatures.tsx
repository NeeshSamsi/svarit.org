'use client'

import { useRef, useEffect } from 'react'
import { type Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import EventCard from '@/slices/EventList/EventCard'
import { gsap, ScrollTrigger } from '@/lib/gsap'

/**
 * The events an artist has appeared in, from the reverse relationship query on
 * the detail page. Headings come from the artist document (`features_eyebrow`,
 * `features_title`) with fallbacks resolved by the caller. Reveal matches the
 * artists index: `ScrollTrigger.batch` so a fast scroll never leaves a blank
 * viewport, scoped in `gsap.context` with `ctx.revert()`.
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

  useEffect(() => {
    const ctx = gsap.context((self) => {
      ScrollTrigger.batch(self.selector!('.feature-card'), {
        once: true,
        batchMax: 6,
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
      aria-label="Features"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div className="col-span-full">
        <SectionTitle eyebrow={eyebrow} title={title} />
      </div>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          linked
          badge
          className="feature-card"
        />
      ))}
    </section>
  )
}
