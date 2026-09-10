'use client'

import { useRef } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import NewsletterSignup from '@/components/forms/NewsletterSignup'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import InitiativeTimelineCard from './InitiativeTimelineCard'
import type { ArtistDocument, EventDocument } from '../../../prismicio-types'

export default function EventListTimeline({
  slice,
  items,
}: {
  slice: Extract<Content.EventListSlice, { variation: 'timeline' }>
  items: Array<{ event: EventDocument; artists: ArtistDocument[] }>
}) {
  const sectionRef = useRef<HTMLElement>(null)

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context((self) => {
      const cards = self.selector!('.timeline-card')

      // CSS hides these before paint; the set adds the y offset and gives
      // GSAP the start state so the scroll tween never yanks a painted card
      // to 0.
      gsap.set(cards, { y: 24, opacity: 0 })

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

  // A migrated Text field reads back as [] and still passes isFilled.keyText,
  // so guard heading and subheading with a plain string check.
  const heading =
    typeof slice.primary.heading === 'string'
      ? slice.primary.heading.trim()
      : ''
  const subheading =
    typeof slice.primary.subheading === 'string'
      ? slice.primary.subheading.trim()
      : ''
  // The /centenary design carries no large heading on this section, only the
  // "Celebrations" eyebrow, so SectionTitle (and the rule paired with it)
  // renders when either is filled, not only when heading is.
  const hasSectionTitle = Boolean(heading || subheading)
  // Existing slice instances were saved before `show_signup` existed and
  // read null, not the model's `true` default.
  const showSignup = slice.primary.show_signup ?? true
  const signupHeading =
    slice.primary.signup_heading || 'A Year-Long Musical Celebration'
  const signupCtaLabel = slice.primary.signup_cta_label || 'Sign up for updates'

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Initiatives timeline"
      className="col-span-full grid grid-cols-subgrid gap-y-8"
    >
      {hasSectionTitle && (
        <>
          <SectionTitle
            className="col-span-full"
            eyebrow={subheading || undefined}
            title={heading}
          />
          <div className="col-span-full h-px bg-foreground" />
        </>
      )}

      {/* Signup heading: first on mobile, top of the left column on desktop.
          Its `order` and the timeline/form's put all three panes in that
          visual order below; at lg the grid's own auto-placement (heading
          col-span-4, timeline col-span-8 row-span-2, form col-span-4) puts
          the heading and form stacked in the left 4 columns beside a
          full-height timeline in the right 8, so `lg:order-none` just lets
          source order settle it rather than fighting the placement. */}
      <h3 className="order-1 col-span-full font-display text-2xl leading-tight font-medium text-foreground lg:order-none lg:col-span-4">
        {signupHeading}
      </h3>

      {/* --timeline-inset is pl-8 (2rem) + the card's p-6 (1.5rem) at base,
          pl-12 (3rem) + the card's md:p-8 (2rem) from md. It has to change
          if either the column's left padding or InitiativeTimelineCard's
          padding changes; nothing enforces that link. */}
      <div className="relative order-2 col-span-full flex flex-col gap-6 pl-8 [--timeline-inset:3.5rem] md:gap-8 md:pl-12 md:[--timeline-inset:5rem] lg:order-none lg:col-span-8 lg:row-span-2">
        {/* Faded at both ends so the rail doesn't hard-stop at the first and
            last dot. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px bg-foreground [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]"
        />
        {items.map(({ event, artists }) => (
          <InitiativeTimelineCard
            key={event.id}
            event={event}
            artists={artists}
            className="timeline-card gsap-reveal"
          />
        ))}
      </div>

      {showSignup && (
        <NewsletterSignup
          heading=""
          ctaLabel={signupCtaLabel}
          className="order-3 col-span-full lg:order-none lg:col-span-4"
        />
      )}
    </section>
  )
}
