'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { asLink, isFilled, type Content } from '@prismicio/client'
import { PrismicNextImage, PrismicNextLink } from '@prismicio/next'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

export default function HeroDefault({
  slice,
}: {
  slice: Extract<Content.HeroSlice, { variation: 'default' }>
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const bannerRef = useRef<HTMLAnchorElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const img1Ref = useRef<HTMLDivElement>(null)
  const img2Ref = useRef<HTMLDivElement>(null)
  const img3Ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [left, middle] = slice.primary.images
  const ctaHref = asLink(slice.primary.cta_link) ?? '#about'
  const videoSrc = isFilled.linkToMedia(slice.primary.video)
    ? slice.primary.video.url
    : '/assets/hero/right.mp4'

  // Guarded with a plain string check, not `isFilled`, because a migrated
  // Text field can read back as `[]` and still pass `isFilled.keyText`.
  let bannerText: string | null = null
  let bannerHref: string | null = null

  if (isFilled.contentRelationship(slice.primary.banner_initiative)) {
    const title = slice.primary.banner_initiative.data?.title

    if (typeof title === 'string' && title.trim()) {
      bannerText = title
      bannerHref = asLink(slice.primary.banner_initiative)
    }
  } else if (
    typeof slice.primary.banner_text === 'string' &&
    slice.primary.banner_text.trim() &&
    isFilled.link(slice.primary.banner_link)
  ) {
    bannerText = slice.primary.banner_text
    bannerHref = asLink(slice.primary.banner_link)
  }

  const bannerCtaLabel =
    typeof slice.primary.banner_cta_label === 'string' &&
    slice.primary.banner_cta_label.trim()
      ? slice.primary.banner_cta_label
      : 'Learn more'

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.4 })

      if (bannerRef.current) {
        tl.fromTo(
          bannerRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        )
      }

      tl.fromTo(
        titleRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
        bannerRef.current ? '-=0.2' : undefined
      ).fromTo(
        [img1Ref.current, img2Ref.current, img3Ref.current].filter(Boolean),
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          stagger: 0.18,
        },
        '-=0.2'
      )
    }, sectionRef)

    return () => ctx.revert()
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
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Hero"
      className="col-span-full grid grid-flow-dense grid-cols-subgrid items-start gap-y-6 pt-36 md:pt-44"
    >
      {bannerText && bannerHref && (
        <PrismicNextLink
          ref={bannerRef}
          href={bannerHref}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(20px)' }}
          className="col-span-full inline-flex w-fit max-w-full flex-wrap items-center gap-x-6 gap-y-1 rounded-full bg-muted px-6 py-3 transition-opacity hover:opacity-60 lg:col-span-10"
        >
          <span className="font-body text-base font-light text-foreground">
            {bannerText}
          </span>
          <span className="inline-flex items-center gap-2 font-body text-base font-light text-foreground">
            {bannerCtaLabel}
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4 shrink-0"
            >
              <path
                d="M3.5 8h9M8.5 3.5 13 8l-4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </PrismicNextLink>
      )}

      <div
        ref={titleRef}
        data-gsap-intro
        style={{ opacity: 0, transform: 'translateY(24px)' }}
        className="col-span-full flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:col-span-10"
      >
        <h1 className="min-w-0 font-display text-4xl leading-tight font-medium text-foreground md:text-5xl">
          {slice.primary.title}
        </h1>
        <div className="hidden w-fit shrink-0 sm:block">
          <ButtonLink variant="secondary" href={ctaHref}>
            {slice.primary.cta_label || 'Learn more'}
          </ButtonLink>
        </div>
      </div>

      <div
        ref={img3Ref}
        data-gsap-intro
        style={{ opacity: 0, transform: 'translateY(20px)' }}
        className="col-span-4 col-start-9 aspect-1/2 overflow-hidden rounded-3xl bg-muted sm:col-span-3 sm:col-start-10 lg:col-span-2 lg:col-start-11 lg:row-span-2"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover object-center"
          src={videoSrc}
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
        data-gsap-intro
        style={{ opacity: 0, transform: 'translateY(20px)' }}
        className="relative hidden aspect-square overflow-hidden rounded-3xl bg-muted lg:col-span-2 lg:col-start-1 lg:block"
      >
        <PrismicNextImage
          field={left?.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 17vw, 0px"
          className="object-cover object-center"
          fallback={
            <Image
              src="/assets/hero/left.png"
              alt=""
              fill
              sizes="(min-width: 1024px) 17vw, 0px"
              className="object-cover object-center"
            />
          }
        />
      </div>
      <div
        ref={img2Ref}
        data-gsap-intro
        style={{ opacity: 0, transform: 'translateY(20px)' }}
        className="relative col-span-8 col-start-1 aspect-4/3 overflow-hidden rounded-3xl bg-muted sm:col-span-9 lg:col-span-8 lg:col-start-3 lg:aspect-video"
      >
        <PrismicNextImage
          field={middle?.image}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover object-center"
          fallback={
            <Image
              src="/assets/hero/middle.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 66vw, 100vw"
              className="object-cover object-center"
            />
          }
        />
      </div>
    </section>
  )
}
