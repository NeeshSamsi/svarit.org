'use client'

import { useRef, useEffect } from 'react'
import type { Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import { PrismicRichText } from '@prismicio/react'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap } from '@/lib/gsap'
import type { VolunteerDocument } from '../../../prismicio-types'

export default function AboutSection({
  slice,
  volunteers,
}: {
  slice: Content.AboutSlice
  volunteers: VolunteerDocument[]
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const statsDesktopRef = useRef<HTMLDivElement>(null)
  const statsMobileRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(
        [statsDesktopRef.current, statsMobileRef.current].filter(Boolean),
        {
          y: 20,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
        }
      )
      gsap.from(titleRef.current, {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
      })
      gsap.from('.about-para', {
        y: 20,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.18,
        scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const avatars = volunteers.map((volunteer) => (
    <PrismicNextImage
      key={volunteer.id}
      field={volunteer.data.photo}
      fallbackAlt=""
      width={48}
      height={48}
      className="h-12 w-12 rounded-full border-2 border-muted bg-muted object-cover"
    />
  ))

  return (
    <section
      ref={sectionRef}
      id="about"
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="About"
      className="col-span-full grid grid-cols-subgrid"
    >
      <div
        ref={statsDesktopRef}
        className="col-span-4 hidden flex-col gap-3 lg:flex"
      >
        <span className="font-body text-base text-foreground">
          {slice.primary.stats}
        </span>
        <div className="flex -space-x-3">{avatars}</div>
      </div>
      <div className="col-span-full flex flex-col gap-8 lg:col-span-8">
        <div ref={statsMobileRef} className="flex flex-col gap-3 lg:hidden">
          <span className="font-body text-base text-foreground">
            {slice.primary.stats}
          </span>
          <div className="flex -space-x-3">{avatars}</div>
        </div>
        <div ref={titleRef}>
          <SectionTitle title={slice.primary.heading ?? ''} />
        </div>
        <div className="flex flex-col gap-4">
          <PrismicRichText
            field={slice.primary.body}
            components={{
              paragraph: ({ children }) => (
                <p className="about-para font-body text-xl leading-relaxed font-light text-foreground">
                  {children}
                </p>
              ),
            }}
          />
        </div>
      </div>
    </section>
  )
}
