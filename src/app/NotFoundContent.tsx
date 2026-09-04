'use client'

import { useRef } from 'react'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

/**
 * The 404 body, split out of not-found.tsx so that file can stay a server
 * component and keep its `metadata` export. The giant 404 is decoration, so it
 * is an aria-hidden <p>: the status code and the page title already carry that
 * meaning for machines. The sentence is the real h1.
 */
export default function NotFoundContent() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const numeralRef = useRef<HTMLParagraphElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Quicker and tighter than the home hero (delay 0.4, 0.5s tweens): this
      // should register and be finished, not make the visitor wait.
      const tl = gsap.timeline({ delay: 0.15 })
      tl.fromTo(
        numeralRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
      )
        .fromTo(
          headingRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
          '-=0.25'
        )
        .fromTo(
          buttonRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
          '-=0.2'
        )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={sectionRef}
      className="col-span-full grid grid-cols-subgrid pt-36 md:pt-44"
    >
      {/* The md:min-height pins the whole footer to the viewport bottom at
          1440x900 so the content sits optically centred between nav and footer
          with no scroll. On a phone the numeral is large enough that the page
          runs past the fold, which is fine: no min-height or svh trick tries to
          stop it. */}
      <div className="col-span-full flex flex-col items-center justify-center gap-3 text-center md:min-h-[calc(100svh-35.5rem)] md:gap-5 lg:col-span-8 lg:col-start-3">
        <p
          ref={numeralRef}
          aria-hidden="true"
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(24px)' }}
          className="font-display text-[clamp(6.5rem,22vw,12.5rem)] leading-none font-medium -tracking-[0.03em] text-foreground"
        >
          404
        </p>
        <h1
          ref={headingRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(16px)' }}
          className="font-body text-xl font-light text-foreground md:text-2xl"
        >
          The page you are looking for does not exist
        </h1>
        <div
          ref={buttonRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(16px)' }}
          className="md:pt-2"
        >
          <ButtonLink variant="primary" size="sm" href="/">
            Back home
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
