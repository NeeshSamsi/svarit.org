'use client'

import { useRef, useEffect } from 'react'
import { type Content } from '@prismicio/client'
import { PrismicRichText } from '@prismicio/react'
import { gsap } from '@/lib/gsap'

/**
 * The `page_header` variation: a title and a short lead paragraph for the top of
 * an interior page. Shares the home hero's h1 treatment and its load-in timeline
 * (`gsap.timeline({ delay: 0.4 })`, title then the paragraph). Above the fold, so
 * no ScrollTrigger. The page wrapper owns the top padding here.
 */
export default function HeroPageHeader({
  slice,
}: {
  slice: Extract<Content.HeroSlice, { variation: 'page_header' }>
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 })
    tl.from(titleRef.current, {
      y: 24,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    }).from(
      descRef.current,
      { y: 20, opacity: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.2'
    )
  }, [])

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Page header"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <h1
        ref={titleRef}
        className="col-span-full min-w-0 font-display text-4xl leading-tight font-medium text-foreground md:text-5xl lg:col-span-8"
      >
        {slice.primary.title}
      </h1>
      <div ref={descRef} className="col-span-full lg:col-span-6 lg:col-start-5">
        <PrismicRichText
          field={slice.primary.description}
          components={{
            paragraph: ({ children }) => (
              <p className="font-body text-xl font-light text-foreground">
                {children}
              </p>
            ),
          }}
        />
      </div>
    </section>
  )
}
