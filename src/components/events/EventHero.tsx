'use client'

import { useRef } from 'react'
import { isFilled, type Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import CategoryBadge from '@/components/events/CategoryBadge'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

/**
 * The event detail page header. Like ArtistHero it renders document fields, not
 * editable slices, so the page composes it directly. Borrows the shared hero
 * timeline (`gsap.timeline({ delay: 0.4 })`, `power2.out`): the hero image
 * settles in first, then the meta row, title, venue and description stagger in
 * reading order. Most events have no image, so its tween is added only when it
 * renders and the text stack opens the timeline in that case.
 */
export default function EventHero({ event }: { event: Content.EventDocument }) {
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const metaRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const venueRef = useRef<HTMLParagraphElement>(null)
  const descRef = useRef<HTMLDivElement>(null)

  const hasImage = isFilled.image(event.data.hero_image)
  const hasDescription = isFilled.richText(event.data.description)

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const textEls = [
        metaRef.current,
        titleRef.current,
        venueRef.current,
        descRef.current,
      ].filter(Boolean)

      const tl = gsap.timeline({ delay: 0.4 })

      // The image is usually absent; only tween it when it rendered, and let the
      // text stack open the timeline when it did not.
      if (imageRef.current) {
        tl.fromTo(
          imageRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        )
      }

      tl.fromTo(
        textEls,
        { opacity: 0, y: (_i, el) => (el === titleRef.current ? 24 : 20) },
        {
          opacity: 1,
          y: 0,
          ease: 'power2.out',
          duration: (_i, el) => (el === titleRef.current ? 0.5 : 0.4),
          stagger: 0.12,
        },
        imageRef.current ? '-=0.2' : 0
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <header
      ref={sectionRef}
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div className="col-span-full flex flex-col gap-4 md:col-span-9">
        <div
          ref={metaRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(20px)' }}
          className="flex flex-wrap items-center gap-3"
        >
          <CategoryBadge category={event.data.category} />
          {event.data.date_label && (
            <span className="font-body text-base font-light text-foreground">
              {event.data.date_label}
            </span>
          )}
        </div>
        <h1
          ref={titleRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(24px)' }}
          className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl"
        >
          {event.data.title}
        </h1>
        {event.data.venue && (
          <p
            ref={venueRef}
            data-gsap-intro
            style={{ opacity: 0, transform: 'translateY(20px)' }}
            className="font-body text-xl font-light text-foreground"
          >
            {event.data.venue}
          </p>
        )}
      </div>

      {hasImage && (
        <div
          ref={imageRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(24px)' }}
          className="relative col-span-full aspect-16/9 w-full overflow-hidden rounded-3xl bg-muted"
        >
          <PrismicNextImage
            field={event.data.hero_image}
            fill
            fallbackAlt=""
            priority
            sizes="(min-width: 1032px) 1032px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      {hasDescription && (
        <div
          ref={descRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(20px)' }}
          className="col-span-full flex flex-col gap-4 font-body text-xl font-light text-foreground md:col-span-9 [&_a]:underline [&_strong]:font-medium"
        >
          <PrismicRichText field={event.data.description} />
        </div>
      )}
    </header>
  )
}
