'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'
import type { Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import type { SliceComponentProps } from '@prismicio/react'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export type SponsorsProps = SliceComponentProps<Content.SponsorsSlice>

export default function Sponsors({ slice }: SponsorsProps) {
  // The marquee starts once the reveal has finished AND Embla is ready.
  // Calling play() straight from the stagger's onComplete relied on Embla
  // having initialised first, and silently did nothing when it had not.
  const [revealDone, setRevealDone] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

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

  const setEmblaRef = useCallback(
    (node: HTMLDivElement | null) => {
      emblaRef(node)
      viewportRef.current = node
    },
    [emblaRef]
  )

  // Triple the logos so the track overflows the viewport and loops seamlessly
  const logos = [
    ...slice.primary.logos,
    ...slice.primary.logos,
    ...slice.primary.logos,
  ]

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
      })

      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
      const logoEls = gsap.utils.toArray<HTMLElement>('.sponsor-logo')
      gsap.set(logoEls, { opacity: 0, y: 16 })

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          if (reduce) {
            gsap.set(logoEls, { opacity: 1, y: 0 })
            return
          }

          // Only stagger the logos currently visible in the viewport, then
          // start auto-scrolling as soon as the last visible one is in.
          const vp = viewportRef.current
          let visible = logoEls
          if (vp) {
            const vpRect = vp.getBoundingClientRect()
            visible = logoEls.filter((el) => {
              const r = el.getBoundingClientRect()
              return r.right > vpRect.left + 1 && r.left < vpRect.right - 1
            })
          }
          if (!visible.length) visible = logoEls.slice(0, 3)
          const hidden = logoEls.filter((el) => !visible.includes(el))

          gsap.set(hidden, { opacity: 1, y: 0 })
          gsap.to(visible, {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.1,
            ease: 'power2.out',
            onComplete: () => {
              setRevealDone(true)
            },
          })
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!revealDone || !emblaApi) return
    emblaApi.plugins()?.autoScroll?.play()
  }, [revealDone, emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const imgs = Array.from(
      sectionRef.current?.querySelectorAll<HTMLImageElement>(
        'img.sponsor-logo'
      ) ?? []
    )
    const onLoad = () => emblaApi.reInit()
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', onLoad)
    })
    return () => imgs.forEach((img) => img.removeEventListener('load', onLoad))
  }, [emblaApi])

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Sponsors"
      className="col-span-full grid grid-cols-subgrid gap-y-12"
    >
      <div ref={titleRef} className="col-span-full">
        <SectionTitle
          eyebrow={slice.primary.subheading ?? undefined}
          title={slice.primary.heading ?? ''}
        />
      </div>
      <div
        ref={setEmblaRef}
        className="col-span-full overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-x-16 sm:gap-x-30">
          {logos.map((logo, i) => {
            const isClone = i >= slice.primary.logos.length
            return (
              <div key={i} className="flex-none" aria-hidden={isClone}>
                {isClone ? (
                  <PrismicNextImage
                    field={logo.logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="sponsor-logo h-12 w-auto object-contain"
                  />
                ) : (
                  <PrismicNextImage
                    field={logo.logo}
                    fallbackAlt=""
                    loading="eager"
                    decoding="async"
                    className="sponsor-logo h-12 w-auto object-contain"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
