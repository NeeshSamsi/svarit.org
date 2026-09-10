'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/ui/Button'
import { gsap } from '@/lib/gsap'
import type { EventDocument } from '../../../prismicio-types'
import EventCard from './EventCard'

type Tab = 'events' | 'workshops'

/** How many cards a limited tab shows, and how many each click adds. */
const BATCH_SIZE = 6

export default function EventListTabs({
  slice,
  events,
}: {
  slice: Extract<Content.EventListSlice, { variation: 'default' }>
  events: EventDocument[]
}) {
  // Documents saved before `limit` existed have no value for it, which
  // arrives as undefined rather than as the model's `true` default.
  // An editor who deliberately switches it off still sends false.
  const limit = slice.primary.limit ?? true
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const sortedItems = useMemo(() => {
    const category = activeTab === 'events' ? 'Event' : 'Workshop'
    return events
      .filter((event) => event.data.category === category)
      .sort(
        (a, b) =>
          new Date(b.data.start_date ?? 0).getTime() -
          new Date(a.data.start_date ?? 0).getTime()
      )
  }, [events, activeTab])
  const visibleItems = limit ? sortedItems.slice(0, visibleCount) : sortedItems
  const hasMore = limit && visibleCount < sortedItems.length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'workshops', label: 'Workshops' },
    { key: 'events', label: 'Events' },
  ]

  const animateCards = () => {
    gsap.from('.initiative-card', {
      y: 16,
      opacity: 0,
      duration: 0.35,
      stagger: 0.18,
      ease: 'power2.out',
    })
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
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
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  // Re-run the card reveal only when the tab actually changes. A boolean
  // "first render" ref fires a second time under StrictMode's double-mount,
  // which stranded the cards at opacity 0; comparing the previous value does not.
  const prevTabRef = useRef(activeTab)

  useEffect(() => {
    if (prevTabRef.current === activeTab) return
    prevTabRef.current = activeTab

    const ctx = gsap.context(() => {
      gsap.killTweensOf('.initiative-card')
      animateCards()
    }, sectionRef)

    return () => ctx.revert()
  }, [activeTab])

  const prevCountRef = useRef(BATCH_SIZE)

  useEffect(() => {
    const revealedCount = prevCountRef.current
    prevCountRef.current = visibleCount
    if (visibleCount <= revealedCount) return

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.initiative-card') as HTMLElement[]
      const newCards = cards.slice(revealedCount)
      gsap.from(newCards, {
        y: 16,
        opacity: 0,
        duration: 0.35,
        stagger: 0.18,
        ease: 'power2.out',
      })
    }, sectionRef)

    return () => ctx.revert()
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
      <div ref={headerRef} className="col-span-full grid grid-cols-subgrid">
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
                setActiveTab(key)
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
        <EventCard key={event.id} event={event} />
      ))}
      {hasMore && (
        <div className="col-span-full flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
          >
            {activeTab === 'events'
              ? 'Show more events'
              : 'Show more workshops'}
          </Button>
        </div>
      )}
    </section>
  )
}
