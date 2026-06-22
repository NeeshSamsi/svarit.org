'use client'

import { useRef, useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap } from '@/lib/gsap'

export default function Sponsors() {
  const { sponsors } = getContent()
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, dragFree: true, align: 'start', containScroll: false },
    [
      AutoScroll({
        playOnInit: false,
        speed: 1,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: false,
      }),
    ]
  )

  // Triple the logos so the track overflows the viewport and loops seamlessly
  const logos = [...sponsors.logos, ...sponsors.logos, ...sponsors.logos]

  useEffect(() => {
    const ctx = gsap.context(() => {
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
        scrollTrigger: { trigger: sectionRef.current, start: 'top 65%', once: true },
        onComplete: () => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
          emblaApi?.plugins()?.autoScroll?.play()
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [emblaApi])

  return (
    <section
      ref={sectionRef}
      aria-label="Sponsors"
      className="col-span-full grid grid-cols-subgrid gap-y-12"
    >
      <div ref={titleRef} className="col-span-full">
        <SectionTitle eyebrow={sponsors.subheading} title={sponsors.heading} />
      </div>
      <div
        ref={emblaRef}
        className="col-span-full overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-x-[120px]">
          {logos.map((logo, i) => {
            const isClone = i >= sponsors.logos.length
            return (
              <div key={i} className="flex-none" aria-hidden={isClone}>
                <img
                  src={logo.src}
                  alt={isClone ? '' : logo.alt}
                  loading="lazy"
                  decoding="async"
                  className="sponsor-logo h-12 w-auto object-contain"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
