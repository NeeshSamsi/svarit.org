'use client'

import { useRef, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function Sponsors() {
  const { sponsors } = getContent()
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
              emblaApi?.plugins()?.autoScroll?.play()
            },
          })
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [emblaApi])

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
    return () =>
      imgs.forEach((img) => img.removeEventListener('load', onLoad))
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
            const isClone = i >= sponsors.logos.length
            return (
              <div key={i} className="flex-none" aria-hidden={isClone}>
                <img
                  src={logo.src}
                  alt={isClone ? '' : logo.alt}
                  loading={isClone ? 'lazy' : 'eager'}
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
