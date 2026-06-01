'use client'

import { useRef, useEffect } from 'react'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function About() {
  const { about, hero } = getContent()
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([])

  useEffect(() => {
    gsap.from(titleRef.current, {
      y: 24,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
    })
    gsap.from(paraRefs.current.filter(Boolean), {
      y: 20,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0.18,
      scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-label="About"
      className="col-span-full grid grid-cols-subgrid"
    >
      <div className="col-span-4 hidden flex-col gap-3 lg:flex">
        <span className="font-body text-base text-foreground">
          {hero.stats}
        </span>
        <div className="flex -space-x-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 w-12 rounded-full border-2 border-primary bg-muted"
            />
          ))}
        </div>
      </div>
      <div className="col-span-full flex flex-col gap-8 lg:col-span-8">
        <div className="flex flex-col gap-3 lg:hidden">
          <span className="font-body text-base text-foreground">
            {hero.stats}
          </span>
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 w-12 rounded-full border-2 border-primary bg-muted"
              />
            ))}
          </div>
        </div>
        <div ref={titleRef}>
          <SectionTitle title={about.heading} />
        </div>
        <div className="flex flex-col gap-4">
          {about.paragraphs.map((para, i) => (
            <p
              key={i}
              ref={(el) => {
                paraRefs.current[i] = el
              }}
              className="font-body text-xl leading-relaxed font-light text-foreground"
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
