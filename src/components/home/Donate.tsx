'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'

export default function Donate() {
  const { donate } = getContent()
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
  }, [])

  return (
    <section ref={sectionRef} aria-label="Donate" className="col-span-full">
      <div className="relative">
        <div
          ref={bgRef}
          className="relative aspect-video w-full overflow-hidden rounded-3xl bg-muted"
        >
          <Image
            src="/assets/donate/image.jpg"
            alt="An attentive audience enjoying an intimate Hindustani classical music Baithak. In a moment of musical climax, maestros Pandit Yogesh Samsi and Pandit Suresh Talwalkar are seen in the audience with their hands raised in spontaneous approval and enjoyment."
            fill
            sizes="100vw"
            className="object-cover object-bottom"
          />
        </div>
        <div className="mt-6 flex sm:absolute sm:inset-0 sm:mt-0 sm:max-w-md sm:items-end sm:p-6">
          <div
            ref={boxRef}
            className="flex w-full flex-col gap-6 sm:w-auto sm:rounded-2xl sm:bg-primary sm:p-4"
          >
            <SectionTitle title={donate.heading} />
            <ButtonLink
              variant="primary"
              href="https://pages.razorpay.com/svarit"
              target="_blank"
            >
              {donate.cta}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  )
}
