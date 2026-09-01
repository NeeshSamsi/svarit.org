'use client'

import { useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'
import { introHandoff } from '@/lib/intro'

/**
 * Staggers its direct children into view on scroll. Slices are rendered on the
 * server and handed in as `children`; this wrapper only owns the reveal. The
 * `[data-gsap-stagger] > *` rule in GsapIntroStyles hides them before first
 * paint, so nothing snaps. Pass `introEnd` when the block sits below a GSAP
 * hero so an on-load reveal waits that hero out; leave it 0 for static headers.
 */
export default function StaggerReveal({
  children,
  className,
  introEnd = 0,
}: {
  children: React.ReactNode
  className?: string
  introEnd?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const mountedAt = performance.now()

    const ctx = gsap.context(() => {
      const el = ref.current
      if (!el) return

      const kids = Array.from(el.children)
      if (kids.length === 0) return

      gsap.set(kids, { opacity: 0, y: 24 })

      ScrollTrigger.batch(kids, {
        once: true,
        start: 'top 85%',
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            stagger: { amount: 0.3 },
            overwrite: true,
            delay: introHandoff(mountedAt, introEnd),
          }),
      })
    }, ref)

    return () => ctx.revert()
  }, [introEnd])

  return (
    <div ref={ref} data-gsap-stagger className={className}>
      {children}
    </div>
  )
}
