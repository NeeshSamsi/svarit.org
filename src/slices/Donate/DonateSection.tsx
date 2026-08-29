'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import type { Content } from '@prismicio/client'
import { PrismicNextImage } from '@prismicio/next'
import SectionTitle from '@/components/ui/SectionTitle'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'

const FALLBACK_IMAGE_ALT =
  'An attentive audience enjoying an intimate Hindustani classical music Baithak. In a moment of musical climax, maestros Pandit Yogesh Samsi and Pandit Suresh Talwalkar are seen in the audience with their hands raised in spontaneous approval and enjoyment.'

export default function DonateSection({
  slice,
  href,
  label,
}: {
  slice: Content.DonateSlice
  href: string
  label: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
      })
      tl.from(bgRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      }).from(
        boxRef.current,
        { y: 20, opacity: 0, duration: 0.4, ease: 'power2.out' },
        '-=0.2'
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      aria-label="Donate"
      className="col-span-full"
    >
      <div className="relative">
        <div
          ref={bgRef}
          className="relative aspect-video w-full overflow-hidden rounded-3xl bg-muted"
        >
          <PrismicNextImage
            field={slice.primary.background_image}
            fallbackAlt=""
            fill
            sizes="100vw"
            className="object-cover object-bottom"
            fallback={
              <Image
                src="/assets/donate/image.jpg"
                alt={FALLBACK_IMAGE_ALT}
                fill
                sizes="100vw"
                className="object-cover object-bottom"
              />
            }
          />
        </div>
        <div className="mt-6 flex sm:absolute sm:inset-0 sm:mt-0 sm:max-w-md sm:items-end sm:p-6">
          <div
            ref={boxRef}
            className="flex w-full flex-col gap-6 sm:w-auto sm:rounded-2xl sm:bg-primary sm:p-4"
          >
            <SectionTitle title={slice.primary.heading ?? ''} />
            <ButtonLink variant="primary" href={href} target="_blank">
              {label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
