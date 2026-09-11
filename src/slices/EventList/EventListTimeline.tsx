'use client'

import { useRef } from 'react'
import type { Content } from '@prismicio/client'
import SectionTitle from '@/components/ui/SectionTitle'
import NewsletterSignup from '@/components/forms/NewsletterSignup'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { introHandoff, PAGE_HEADER_INTRO_END } from '@/lib/intro'
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
    const mountedAt = performance.now()

    const ctx = gsap.context((self) => {
      const titleEl = self.selector!('.timeline-header-title')[0]
      const ruleEl = self.selector!('.timeline-header-rule')[0]
      const railEl = self.selector!('.timeline-rail')[0]
      const signupHeadingEl = self.selector!('.timeline-signup-heading')[0]
      const fields = self.selector!('.newsletter-field')
      const cards = self.selector!('.timeline-card')
      const firstCard = cards[0]
      const restCards = cards.slice(1)
      const firstDot = self.selector!('.timeline-dot')[0]

      // CSS hides the title before paint; the rule and rail's hidden state
      // is set inline in the markup instead (see their className comments
      // below), since both stay fully opaque and draw via scale rather than
      // fade. The sets below add the slide/scale offset and give GSAP the
      // start state so no scroll tween ever yanks a painted element to 0.
      if (titleEl) gsap.set(titleEl, { y: 24, opacity: 0 })
      if (ruleEl) gsap.set(ruleEl, { scaleX: 0, transformOrigin: 'left' })
      if (railEl) gsap.set(railEl, { scaleY: 0, transformOrigin: 'top' })
      gsap.set(cards, { x: -24, opacity: 0 })
      // The dot lives inside the card's h3, which is inside the card itself;
      // a parent sitting at opacity 0 already hides it, so it cannot become
      // visible before its own card does. Only the first card needs an
      // explicit tween for its dot, to make that "together, never before"
      // relationship visible in the code rather than leaving it implicit in
      // the opacity cascade; every later card's dot rides its own card's
      // opacity the same way, with no separate tween needed.
      if (firstDot) gsap.set(firstDot, { opacity: 0 })
      if (signupHeadingEl) gsap.set(signupHeadingEl, { y: 24, opacity: 0 })
      gsap.set(fields, { y: 24, opacity: 0 })

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          // A delay on a tween is baked in when the tween is created, not
          // when it fires. Computing it here, inside onEnter, means it is
          // evaluated at fire time: a section on screen at load gets the
          // hero's remaining time, one scrolled to later gets 0.
          const delay = introHandoff(mountedAt, PAGE_HEADER_INTRO_END)
          const tl = gsap.timeline({ delay })

          if (titleEl)
            tl.to(titleEl, {
              y: 0,
              opacity: 1,
              duration: 0.5,
              ease: 'power2.out',
            })
          if (ruleEl)
            tl.to(
              ruleEl,
              { scaleX: 1, duration: 0.4, ease: 'power2.out' },
              '-=0.35'
            )
          // '<': starts on the exact same frame as the rule, so the
          // horizontal and vertical lines read as one line spreading
          // outward from their shared corner rather than two in sequence.
          if (railEl)
            tl.to(railEl, { scaleY: 1, duration: 0.6, ease: 'power2.out' }, '<')
          if (firstCard)
            tl.to(
              firstCard,
              { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
              '-=0.1'
            )
          // '<': starts together with the card above, not before it.
          if (firstDot)
            tl.to(
              firstDot,
              { opacity: 1, duration: 0.5, ease: 'power2.out' },
              '<'
            )
          if (signupHeadingEl)
            tl.to(
              signupHeadingEl,
              { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
              '-=0.15'
            )
          // Last, so attention finishes on the form: name, then email, then
          // the submit button, staggered rather than arriving as one block.
          if (fields.length)
            tl.to(
              fields,
              {
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: 'power2.out',
                stagger: 0.08,
              },
              '-=0.1'
            )
        },
      })

      ScrollTrigger.batch(restCards, {
        once: true,
        batchMax: 6,
        start: 'top 85%',
        onEnter: (batch) =>
          gsap.to(batch, {
            x: 0,
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
  // Any page can carry a timeline, not only /centenary, so this fallback
  // must stay page-agnostic; page-specific copy belongs in the Prismic
  // signup_heading field, not here.
  const signupHeading = slice.primary.signup_heading || 'Stay in the loop'
  const signupCtaLabel = slice.primary.signup_cta_label || 'Sign up for updates'

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Initiatives timeline"
      className="col-span-full grid grid-cols-subgrid gap-y-4"
    >
      {hasSectionTitle && (
        // Eyebrow and rule bundled as one grid item with their own tight
        // internal gap, so the section's own gap-y only governs the space
        // between this header block and the content below it (the gap that
        // was reading too airy), not the eyebrow-to-rule spacing.
        <div className="col-span-full flex flex-col gap-3">
          <SectionTitle
            className="gsap-reveal timeline-header-title"
            eyebrow={subheading || undefined}
            title={heading}
          />
          {/* Reuses `data-gsap-intro`'s inline-style-plus-no-JS-reset
              mechanics, not `.gsap-reveal`: the rule stays fully opaque and
              is hidden only by scale, so it draws left-to-right rather than
              fading in, matching the rail below it. */}
          <div
            data-gsap-intro
            style={{ transform: 'scaleX(0)', transformOrigin: 'left' }}
            className="timeline-header-rule h-px w-full bg-foreground"
          />
        </div>
      )}

      {/* Signup heading + form: bundled as one flex column so they stack
          directly under each other at lg regardless of the timeline's
          height. Previously the heading and form were separate grid items
          with the timeline row-spanning both of them; the grid then had to
          size row 1 tall enough to help fit the (much taller) timeline,
          which pushed the form down into the vertical middle of the column
          instead of right under the heading. `contents` on mobile promotes
          both back into the section's own grid so their `order` utilities
          still produce heading, timeline, form in that literal order; at lg
          the wrapper becomes a real flex column, `self-start` so it isn't
          stretched to the timeline's (taller) row height. */}
      <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-8 lg:self-start">
        <h3 className="gsap-reveal timeline-signup-heading order-1 col-span-full font-display text-2xl leading-tight font-medium text-foreground lg:order-none">
          {signupHeading}
        </h3>
        {showSignup && (
          <NewsletterSignup
            heading=""
            ctaLabel={signupCtaLabel}
            staggerFields
            className="order-3 col-span-full lg:order-none"
          />
        )}
      </div>

      {/* --timeline-inset is pl-8 (2rem) + the card's p-6 (1.5rem) at base,
          pl-12 (3rem) + the card's md:p-8 (2rem) from md. It has to change
          if either the column's left padding or InitiativeTimelineCard's
          padding changes; nothing enforces that link. */}
      <div className="relative order-2 col-span-full flex flex-col gap-6 pl-8 [--timeline-inset:3.5rem] md:gap-8 md:pl-12 md:[--timeline-inset:5rem] lg:order-none lg:col-span-8">
        {/* Reuses `data-gsap-intro`'s inline-style-plus-no-JS-reset
            mechanics (not the `.gsap-reveal` class): this scroll-triggered
            rail isn't literally above the fold, but it needs to stay fully
            opaque and only be hidden by scale, so it reads as drawing
            downward rather than fading in when it reveals. `-top-4` reaches
            up through the section's own `gap-y-4` to touch the rule above,
            so it must change if that gap does. Solid where it meets the
            rule, fading only at the bottom. */}
        <div
          aria-hidden="true"
          data-gsap-intro
          style={{ transform: 'scaleY(0)', transformOrigin: 'top' }}
          className="timeline-rail absolute -top-4 bottom-0 left-0 w-px bg-foreground [mask-image:linear-gradient(to_bottom,black,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,black_92%,transparent)]"
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
    </section>
  )
}
