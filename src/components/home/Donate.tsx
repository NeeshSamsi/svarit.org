'use client'

import { useRef, useEffect } from 'react'
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
      <div className="relative w-full">
        <div
          ref={bgRef}
          className="aspect-2/3 w-full overflow-hidden rounded-3xl bg-muted md:aspect-video"
        >
          <picture>
            <source srcSet="/assets/donate/image.webp" type="image/webp" />
            <img src="/assets/donate/image.png" alt="" className="h-full w-full object-cover object-center" />
          </picture>
        </div>
        <div className="absolute inset-0 flex max-w-md items-end p-6">
          <div
            ref={boxRef}
            className="flex w-full flex-col gap-6 rounded-2xl bg-primary p-4 md:w-auto"
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
