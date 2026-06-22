'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { getContent } from '@/lib/cms'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'

export default function Hero() {
  const { hero } = getContent()
  const titleRef = useRef<HTMLDivElement>(null)
  const img1Ref = useRef<HTMLDivElement>(null)
  const img2Ref = useRef<HTMLDivElement>(null)
  const img3Ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    const playPromise = video.play()
    if (playPromise) playPromise.catch(() => {})
  }, [])

  return (
    <section
      aria-label="Hero"
      className="col-span-full grid grid-flow-dense grid-cols-subgrid items-start gap-y-6 pt-36 md:pt-44"
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
        className="col-span-4 col-start-9 aspect-1/2 overflow-hidden rounded-3xl bg-muted sm:col-span-3 sm:col-start-10 lg:col-span-2 lg:col-start-11 lg:row-span-2"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover object-center"
          src="/assets/hero/right.mp4"
          poster="/assets/hero/right-poster.jpg"
          preload="none"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      </div>

      <div
        ref={img1Ref}
        className="relative hidden aspect-square overflow-hidden rounded-3xl bg-muted lg:col-span-2 lg:col-start-1 lg:block"
      >
        <Image
          src="/assets/hero/left.png"
          alt=""
          fill
          sizes="(min-width: 1024px) 17vw, 0px"
          className="object-cover object-center"
        />
      </div>
      <div
        ref={img2Ref}
        className="relative col-span-8 col-start-1 aspect-4/3 overflow-hidden rounded-3xl bg-muted sm:col-span-9 lg:col-span-8 lg:col-start-3 lg:aspect-video"
      >
        <Image
          src="/assets/hero/middle.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover object-center"
        />
      </div>
    </section>
  )
}
