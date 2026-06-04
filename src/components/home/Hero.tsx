'use client'

import { useRef, useEffect } from 'react'
import { getContent } from '@/lib/cms'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'

export default function Hero() {
  const { hero } = getContent()
  const titleRef = useRef<HTMLDivElement>(null)
  const img1Ref = useRef<HTMLDivElement>(null)
  const img2Ref = useRef<HTMLDivElement>(null)
  const img3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 })
    tl.from(titleRef.current, {
      y: 24,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    }).from(
      [img1Ref.current, img2Ref.current, img3Ref.current].filter(Boolean),
      { y: 20, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.18 },
      '-=0.2'
    )
  }, [])

  return (
    <section
      aria-label="Hero"
      className="col-span-full grid grid-cols-subgrid items-start gap-y-6 pt-36 md:pt-44"
    >
      <div
        ref={titleRef}
        className="col-span-full flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:col-span-10"
      >
        <h1 className="min-w-0 font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
          {hero.title}
        </h1>
        <div className="hidden w-fit shrink-0 sm:block">
          <ButtonLink variant="secondary" href="#about">
            Learn more
          </ButtonLink>
        </div>
      </div>

      <div
        ref={img3Ref}
        className="col-span-2 row-span-2 hidden aspect-1/2 rounded-3xl bg-muted lg:block"
      />

      <div
        ref={img1Ref}
        className="hidden aspect-4/3 rounded-3xl bg-muted sm:col-span-6 sm:block lg:col-span-2 lg:aspect-square"
      />
      <div
        ref={img2Ref}
        className="col-span-full aspect-4/3 rounded-3xl bg-muted sm:col-span-6 lg:col-span-8 lg:aspect-video"
      />
    </section>
  )
}
