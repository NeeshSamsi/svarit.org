'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { asLink, type LinkField } from '@prismicio/client'
import { PrismicNextLink } from '@prismicio/next'
import ButtonLink from '@/components/ui/ButtonLink'
import GsapIntroStyles from '@/components/layout/GsapIntroStyles'
import { gsap } from '@/lib/gsap'
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect'

export default function NavClient({
  links,
  primary,
  socialLinks,
}: {
  links: LinkField[]
  primary: LinkField[]
  /** Rendered on the server, because SocialLinks reads the settings singleton. */
  socialLinks: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useIsomorphicLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        pillRef.current,
        { y: -16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.1 }
      )
    }, pillRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!mobileOpen || !menuRef.current) return
    const items =
      menuRef.current.querySelectorAll<HTMLElement>('.mobile-nav-item')
    if (!items.length) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.07,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
          onStart: () => items.forEach((el) => (el.style.transition = 'none')),
          onComplete: () =>
            items.forEach((el) => el.style.removeProperty('transition')),
        }
      )
    }, menuRef)

    return () => {
      ctx.revert()
      items.forEach((el) => el.style.removeProperty('transition'))
    }
  }, [mobileOpen])

  return (
    <nav className="fixed top-6 right-0 left-0 z-50 px-6">
      <GsapIntroStyles />
      <div className="mx-auto max-w-content">
        <div
          ref={pillRef}
          data-gsap-intro
          style={{ opacity: 0, transform: 'translateY(-16px)' }}
          className="flex items-center justify-between rounded-full border border-foreground/5 bg-muted/80 px-8 py-4 shadow-lg backdrop-blur-xs"
        >
          <Link
            href="/"
            aria-label="Svarit, home"
            className="flex items-center"
          >
            {/* Plain img: the logo is a 1KB SVG, so next/image adds a loader round trip for no optimisation benefit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo.svg" alt="Svarit" className="h-8 w-auto" />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {links.map((link, i) => (
              <PrismicNextLink
                key={i}
                field={link}
                className="font-body text-base text-foreground transition-opacity hover:opacity-60"
              >
                {link.text}
              </PrismicNextLink>
            ))}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-4 sm:flex">
              {primary.map((link, i) => (
                <ButtonLink
                  key={i}
                  variant="primary"
                  size="sm"
                  href={asLink(link) ?? '#'}
                  target="_blank"
                >
                  {link.text}
                </ButtonLink>
              ))}
            </div>
            {socialLinks}
            <button
              className="flex flex-col justify-center gap-1.5 p-2 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span
                className={`block h-0.5 w-6 rounded-full bg-foreground transition-all duration-200 ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`}
              />
              <span
                className={`block h-0.5 w-6 rounded-full bg-foreground transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`block h-0.5 w-6 rounded-full bg-foreground transition-all duration-200 ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`}
              />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div
            ref={menuRef}
            className="mt-2 flex flex-col gap-3 rounded-3xl border border-foreground/5 bg-muted/80 px-6 py-5 shadow-lg backdrop-blur-xs lg:hidden"
          >
            {links.map((link, i) => (
              <PrismicNextLink
                key={i}
                field={link}
                className="mobile-nav-item text-center font-body text-base text-foreground transition-opacity hover:opacity-60"
                onClick={() => setMobileOpen(false)}
              >
                {link.text}
              </PrismicNextLink>
            ))}
            {primary.map((link, i) => (
              <div key={i} className="mobile-nav-item sm:hidden">
                <ButtonLink
                  variant="primary"
                  size="sm"
                  href={asLink(link) ?? '#'}
                  target="_blank"
                  className="w-full justify-center"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.text}
                </ButtonLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
