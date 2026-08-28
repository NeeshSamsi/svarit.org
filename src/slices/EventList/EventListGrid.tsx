'use client'

import { useRef, useEffect, useMemo } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap } from '@/lib/gsap'
import type { EventDocument } from '../../../prismicio-types'
import EventCard from './EventCard'

export default function EventListGrid({
  slice,
  events,
}: {
  slice: Extract<Content.EventListSlice, { variation: 'grid' }>
  events: EventDocument[]
}) {
  const category = slice.primary.category ?? 'All'
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const visibleItems = useMemo(
    () =>
      events
        .filter(
          (event) => category === 'All' || event.data.category === category
        )
        .sort(
          (a, b) =>
            new Date(b.data.start_date ?? 0).getTime() -
            new Date(a.data.start_date ?? 0).getTime()
        ),
    [events, category]
  )

  useEffect(() => {
    gsap.from(headerRef.current, {
      y: 24,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
    })
    gsap.from('.initiative-card', {
      y: 24,
      opacity: 0,
      duration: 0.4,
      stagger: 0.18,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Events"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div ref={headerRef} className="col-span-full">
        <SectionTitle
          eyebrow={slice.primary.subheading ?? undefined}
          title={slice.primary.heading ?? ''}
        />
      </div>
      {visibleItems.map((event) => (
        <EventCard key={event.id} event={event} linked />
      ))}
    </section>
  )
}
