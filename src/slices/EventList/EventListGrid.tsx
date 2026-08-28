'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/ui/Button'
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
  const pageSize = slice.primary.page_size ?? 12
  const category = slice.primary.category ?? 'All'
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const sortedItems = useMemo(
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
  const visibleItems = sortedItems.slice(0, visibleCount)
  const hasMore = visibleCount < sortedItems.length

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

  const prevCountRef = useRef(pageSize)

  useEffect(() => {
    if (visibleCount > prevCountRef.current) {
      const cards = gsap.utils.toArray('.initiative-card') as HTMLElement[]
      const newCards = cards.slice(prevCountRef.current)
      gsap.from(newCards, {
        y: 16,
        opacity: 0,
        duration: 0.35,
        stagger: 0.18,
        ease: 'power2.out',
      })
    }
    prevCountRef.current = visibleCount
  }, [visibleCount])

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
      {hasMore && (
        <div className="col-span-full flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((c) => c + pageSize)}
          >
            Show more
          </Button>
        </div>
      )}
    </section>
  )
}
