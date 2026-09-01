'use client'

import { useRef, useMemo, useState } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/ui/Button'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { introHandoff, PAGE_HEADER_INTRO_END } from '@/lib/intro'
import type { EventDocument } from '../../../prismicio-types'
import EventCard from './EventCard'

/** How many cards a limited grid shows, and how many each click adds. */
const BATCH_SIZE = 6

export default function EventListGrid({
  slice,
  events,
}: {
  slice: Extract<Content.EventListSlice, { variation: 'grid' }>
  events: EventDocument[]
}) {
  const category = slice.primary.category ?? 'All'
  // Documents saved before `limit` existed send undefined, not the model's
  // `true` default; an editor who switches it off still sends false.
  const limit = slice.primary.limit ?? true
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
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
  const visibleItems = limit ? sortedItems.slice(0, visibleCount) : sortedItems
  const hasMore = limit && visibleCount < sortedItems.length

  const showMoreLabel =
    category === 'Event'
      ? 'Show more events'
      : category === 'Workshop'
        ? 'Show more workshops'
        : 'Show more'

  useIsomorphicLayoutEffect(() => {
    // This grid follows the page_header hero. A grid on screen at load waits out
    // whatever is left of the header's intro so the two don't run together; the
    // second grid (Workshops) only triggers once scrolled to, by which point
    // the elapsed time already exceeds the constant and introHandoff returns 0.
    // Hence introHandoff runs inside onEnter, when the trigger actually fires.
    const mountedAt = performance.now()

    const ctx = gsap.context((self) => {
      const cards = self.selector!('.initiative-card')

      // CSS hides these before paint; the set adds the y offset and gives GSAP
      // the start state so the scroll tween never yanks a painted card to 0.
      gsap.set(cards, { y: 24, opacity: 0 })

      if (headerRef.current) {
        const header = headerRef.current
        gsap.set(header, { y: 24, opacity: 0 })
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top 70%',
          once: true,
          onEnter: () =>
            gsap.to(header, {
              y: 0,
              opacity: 1,
              duration: 0.5,
              ease: 'power2.out',
              delay: introHandoff(mountedAt, PAGE_HEADER_INTRO_END),
            }),
        })
      }

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 65%',
        once: true,
        onEnter: () =>
          gsap.to(cards, {
            y: 0,
            opacity: 1,
            duration: 0.4,
            stagger: 0.18,
            ease: 'power2.out',
            delay: introHandoff(mountedAt, PAGE_HEADER_INTRO_END),
          }),
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  // "Show more" appends cards below the card scrollTrigger, which has already
  // fired with `once: true`, so the click drives their entrance itself.
  // Comparing the previous count (rather than a "first render" boolean) keeps
  // StrictMode's double mount from animating the initial batch. fromTo, not
  // from, because .gsap-reveal leaves the cards' resting opacity at 0.
  const prevCountRef = useRef(BATCH_SIZE)

  useIsomorphicLayoutEffect(() => {
    const revealedCount = prevCountRef.current
    prevCountRef.current = visibleCount
    if (visibleCount <= revealedCount) return

    const cards = gsap.utils.toArray<HTMLElement>(
      sectionRef.current?.querySelectorAll('.initiative-card') ?? []
    )
    const tween = gsap.fromTo(
      cards.slice(revealedCount),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.18, ease: 'power2.out' }
    )

    return () => {
      tween.kill()
    }
  }, [visibleCount])

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Events"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div ref={headerRef} className="gsap-reveal col-span-full">
        <SectionTitle
          eyebrow={slice.primary.subheading ?? undefined}
          title={slice.primary.heading ?? ''}
        />
      </div>
      {visibleItems.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          linked
          className="gsap-reveal"
        />
      ))}
      {hasMore && (
        <div className="col-span-full flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
          >
            {showMoreLabel}
          </Button>
        </div>
      )}
    </section>
  )
}
