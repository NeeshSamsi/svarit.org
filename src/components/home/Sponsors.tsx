'use client'

import { useRef, useEffect } from 'react'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap } from '@/lib/gsap'

export default function Sponsors() {
  const { sponsors } = getContent()
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.from(titleRef.current, {
      y: 24,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
    })
    gsap.from('.sponsor-logo', {
      y: 16,
      opacity: 0,
      duration: 0.4,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Sponsors"
      className="col-span-full grid grid-cols-subgrid gap-y-12"
    >
      <div ref={titleRef} className="col-span-full">
        <SectionTitle eyebrow={sponsors.subheading} title={sponsors.heading} />
      </div>
      <div className="col-span-full flex flex-wrap items-center gap-x-20 gap-y-6 sm:gap-x-30 sm:gap-y-10">
        {sponsors.logos.map((logo) => (
          <img
            key={logo.src}
            src={logo.src}
            alt={logo.alt}
            className="sponsor-logo h-12 w-auto object-contain sm:h-16"
          />
        ))}
      </div>
    </section>
  )
}
