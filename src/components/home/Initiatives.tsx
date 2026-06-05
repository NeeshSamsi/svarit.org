'use client'

import { useState, useRef, useEffect } from 'react'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap } from '@/lib/gsap'

type Tab = 'events' | 'workshops'

export default function Initiatives() {
  const { initiatives } = getContent()
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

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

  const isFirstRender = useRef(true)

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

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    gsap.killTweensOf('.initiative-card')
    animateCards()
  }, [activeTab])

  return (
    <section
      ref={sectionRef}
      id="initiatives"
      aria-label="Initiatives"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div ref={headerRef} className="col-span-full grid grid-cols-subgrid">
        <SectionTitle
          eyebrow={initiatives.subheading}
          title={initiatives.heading}
          className="col-span-full md:col-span-8"
        />
        <div className="col-span-full mt-4 flex gap-3 md:col-span-4 md:mt-0 md:items-end md:justify-end">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key)
              }}
              className={[
                'cursor-pointer rounded-full px-6 py-2 font-body text-base transition-colors',
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
      {initiatives[activeTab].map((item, index) => (
        <div
          key={index}
          className="initiative-card col-span-full flex flex-col gap-4 sm:col-span-6 lg:col-span-4"
        >
          <div className="aspect-4/3 w-full rounded-3xl bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <span className="font-body text-base font-light text-foreground">
              {item.date}
            </span>
            <h3 className="font-display text-card-title leading-tight font-medium text-foreground">
              {item.title}
            </h3>
            <p className="font-body text-xl font-light text-foreground">
              {item.description}
            </p>
          </div>
          <div className="h-px w-full bg-foreground" />
        </div>
      ))}
    </section>
  )
}
