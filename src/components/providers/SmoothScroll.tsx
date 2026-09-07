'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.12 })

    lenis.on('scroll', ScrollTrigger.update)

    const rafCb = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(rafCb)
    gsap.ticker.lagSmoothing(0)

    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href === '#') return
      e.preventDefault()
      lenis.scrollTo(href)
    }
    document.addEventListener('click', handleAnchorClick)

    // Images and webfonts change the document height after first paint, which
    // leaves every ScrollTrigger holding start and end positions measured
    // against a shorter page. Recompute them once each has settled.
    let alive = true
    const refresh = () => {
      if (alive) ScrollTrigger.refresh()
    }

    if (document.readyState === 'complete') refresh()
    else window.addEventListener('load', refresh)

    document.fonts?.ready.then(refresh)

    return () => {
      alive = false
      window.removeEventListener('load', refresh)
      document.removeEventListener('click', handleAnchorClick)
      gsap.ticker.remove(rafCb)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
