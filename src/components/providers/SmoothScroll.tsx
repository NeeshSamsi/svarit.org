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

    return () => {
      document.removeEventListener('click', handleAnchorClick)
      gsap.ticker.remove(rafCb)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
