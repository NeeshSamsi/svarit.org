'use client'

import { useState, useRef, useMemo } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/ui/Button'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import {
  categoriesWithEvents,
  filterByCategory,
  filterByTimeframe,
  sortByDate,
} from '@/lib/initiatives'
import type { EventDocument } from '../../../prismicio-types'
import EventCard from './EventCard'

/** How many cards a limited tab shows, and how many each click adds. */
const BATCH_SIZE = 6

const TAB_LABELS: Record<string, string> = {
  Event: 'Events',
  Workshop: 'Workshops',
  Scholarship: 'Scholarships',
}

const SHOW_MORE_LABELS: Record<string, string> = {
  Event: 'Show more events',
  Workshop: 'Show more workshops',
  Scholarship: 'Show more scholarships',
}

export default function EventListTabs({
  slice,
  events,
}: {
  slice: Extract<Content.EventListSlice, { variation: 'default' }>
  events: EventDocument[]
}) {
  const timeframe = slice.primary.timeframe ?? 'All'
  // Documents saved before `limit` existed have no value for it, which
  // arrives as undefined rather than as the model's `true` default.
  // An editor who deliberately switches it off still sends false.
  const limit = slice.primary.limit ?? true

  // A category with no events in this timeframe renders no tab at all: with
  // no Scholarship documents yet, a Past timeframe leaves only Events and
  // Workshops rather than an empty Scholarships tab.
  const tabs = useMemo(
    () =>
      categoriesWithEvents(events, timeframe).map((category) => ({
        key: category,
        label: TAB_LABELS[category],
      })),
    [events, timeframe]
  )

  const [requestedTab, setRequestedTab] = useState<string | null>(null)
  // Events first when it has content, otherwise the first tab that does.
  // Deriving this each render (rather than only on click) also covers the
  // case where the previously active tab is the one that ends up with no
  // content: it falls back the same way.
  const activeTab =
    (requestedTab && tabs.some((tab) => tab.key === requestedTab)
      ? requestedTab
      : (tabs.find((tab) => tab.key === 'Event')?.key ?? tabs[0]?.key)) ?? ''

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const sortedItems = useMemo(() => {
    const direction = timeframe === 'Upcoming' ? 'asc' : 'desc'
    const inTimeframe = filterByTimeframe(events, timeframe)
    return sortByDate(filterByCategory(inTimeframe, activeTab), direction)
  }, [events, timeframe, activeTab])

  const visibleItems = limit ? sortedItems.slice(0, visibleCount) : sortedItems
  const hasMore = limit && visibleCount < sortedItems.length

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      const cards = self.selector!('.initiative-card')

      // CSS hides these before paint; the set adds the y offset and gives
      // GSAP the start state so the scroll tween never yanks a painted card
      // to 0.
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
            }),
        })
      }

      ScrollTrigger.batch(cards, {
        once: true,
        batchMax: 6,
        start: 'top 65%',
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

  // Re-run the card reveal only when the tab actually changes. A boolean
  // "first render" ref fires a second time under StrictMode's double-mount,
  // which stranded the cards at opacity 0; comparing the previous value does
  // not. fromTo, not from: .gsap-reveal leaves a freshly-mounted card's
  // resting opacity at 0, so `gsap.from` would animate from 0 to 0 and it
  // would never appear.
  const prevTabRef = useRef(activeTab)

  useIsomorphicLayoutEffect(() => {
    if (prevTabRef.current === activeTab) return
    prevTabRef.current = activeTab

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(
        sectionRef.current?.querySelectorAll('.initiative-card') ?? []
      )
      gsap.killTweensOf(cards)
      gsap.fromTo(
        cards,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.18, ease: 'power2.out' }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [activeTab])

  // "Show more" appends cards below the card scrollTrigger, which has
  // already fired with `once: true`, so the click drives their entrance
  // itself. fromTo, not from, for the same reason as the tab-change effect.
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
      id="initiatives"
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Initiatives"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div
        ref={headerRef}
        className="gsap-reveal col-span-full grid grid-cols-subgrid"
      >
        <SectionTitle
          eyebrow={slice.primary.subheading ?? undefined}
          title={slice.primary.heading ?? ''}
          className="col-span-full md:col-span-8"
        />
        <div className="col-span-full mt-4 flex gap-3 md:col-span-4 md:mt-0 md:items-end md:justify-end">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setRequestedTab(key)
                setVisibleCount(BATCH_SIZE)
              }}
              className={[
                'cursor-pointer rounded-full px-6 py-2 font-body text-base font-medium transition-colors',
                activeTab === key
                  ? 'border border-foreground bg-muted text-foreground'
                  : 'border border-transparent bg-muted text-foreground hover:border-foreground/20',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visibleItems.map((event) => (
        <EventCard key={event.id} event={event} className="gsap-reveal" />
      ))}
      {hasMore && (
        <div className="col-span-full flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
          >
            {SHOW_MORE_LABELS[activeTab] ?? 'Show more'}
          </Button>
        </div>
      )}
    </section>
  )
}
