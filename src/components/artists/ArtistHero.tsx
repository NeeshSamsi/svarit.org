'use client'

import { useRef } from 'react'
import { isFilled, type Content } from '@prismicio/client'
import ArtistPhoto from './ArtistPhoto'
import ArtistSocials from './ArtistSocials'
import { artistBioText } from './bio'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

/**
 * The artist detail page opener. Not a `hero` slice variation: `hero` is not a
 * choice on the artist Body slice zone and this block renders the document
 * (photo, discipline, name, bio, socials), not editable slice fields, so the
 * detail page composes it directly. It borrows the `page_header` load timeline
 * (`gsap.timeline({ delay: 0.4 })`, `power2.out`): the photo settles in first,
 * then the four text elements stagger in reading order so they arrive after it.
 */
export default function ArtistHero({
  artist,
}: {
  artist: Content.ArtistDocument
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const eyebrowRef = useRef<HTMLSpanElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const bioRef = useRef<HTMLParagraphElement>(null)
  const socialsRef = useRef<HTMLDivElement>(null)

  const { name, discipline, instagram, youtube } = artist.data
  const bioText = artistBioText(artist.data.bio)
  const hasSocials = isFilled.link(instagram) || isFilled.link(youtube)

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const els = [
        eyebrowRef.current,
        nameRef.current,
        bioRef.current,
        socialsRef.current,
      ].filter(Boolean)

      gsap
        .timeline({ delay: 0.4 })
        .fromTo(
          photoRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        )
        .fromTo(
          els,
          { opacity: 0, y: (_i, el) => (el === nameRef.current ? 24 : 20) },
          {
            opacity: 1,
            y: 0,
            ease: 'power2.out',
            duration: (_i, el) => (el === nameRef.current ? 0.5 : 0.4),
            stagger: 0.12,
          },
          '-=0.2'
        )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-label="Artist"
      className="col-span-full grid grid-cols-subgrid gap-y-6"
    >
      <div
        ref={photoRef}
        data-gsap-intro
        style={{ opacity: 0, transform: 'translateY(24px)' }}
        className="col-span-full sm:col-span-5 lg:col-span-4"
      >
        <ArtistPhoto
          artist={artist}
          priority
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 100vw"
          className="aspect-4/3 rounded-[32px]"
        />
      </div>

      <div className="col-span-full flex flex-col gap-4 sm:col-span-7 lg:col-span-8 lg:col-start-5">
        <div className="flex flex-col gap-1">
          {discipline && (
            <span
              ref={eyebrowRef}
              data-gsap-intro
              style={{ opacity: 0, transform: 'translateY(20px)' }}
              className="font-body text-base font-light text-foreground"
            >
              {discipline}
            </span>
          )}
          <h1
            ref={nameRef}
            data-gsap-intro
            style={{ opacity: 0, transform: 'translateY(24px)' }}
            className="font-display text-4xl leading-tight font-medium text-foreground md:text-5xl"
          >
            {name}
          </h1>
        </div>

        {bioText && (
          <p
            ref={bioRef}
            data-gsap-intro
            style={{ opacity: 0, transform: 'translateY(20px)' }}
            className="font-body text-xl font-light text-foreground"
          >
            {bioText}
          </p>
        )}

        {hasSocials && (
          <div
            ref={socialsRef}
            data-gsap-intro
            style={{ opacity: 0, transform: 'translateY(20px)' }}
          >
            <ArtistSocials
              artist={artist}
              orientation="horizontal"
              chipClassName="bg-muted"
            />
          </div>
        )}
      </div>
    </section>
  )
}
