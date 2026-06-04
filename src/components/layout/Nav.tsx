'use client'

import { useState, useRef, useEffect } from 'react'
import { getContent } from '@/lib/cms'
import ButtonLink from '@/components/ui/ButtonLink'
import { gsap } from '@/lib/gsap'

export default function Nav() {
  const { navigation } = getContent()
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = navigation.filter((i) => !i.isPrimary)
  const primary = navigation.filter((i) => i.isPrimary)
  const pillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.from(pillRef.current, {
      y: -16,
      opacity: 0,
      duration: 0.45,
      ease: 'power2.out',
      delay: 0.1,
    })
  }, [])

  return (
    <nav className="fixed top-6 right-0 left-0 z-50 px-6">
      <div className="max-w-content mx-auto">
        <div
          ref={pillRef}
          className="flex items-center justify-between rounded-full border border-foreground/5 bg-muted/80 px-8 py-4 shadow-lg backdrop-blur-md"
        >
          <img src="/assets/logo.svg" alt="Svarit" className="h-8 w-auto" />

          <div className="hidden items-center gap-8 lg:flex">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-body text-base font-normal text-foreground transition-opacity hover:opacity-60"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex">
            {primary.map((item) => (
              <ButtonLink
                key={item.label}
                variant="primary"
                size="sm"
                href={item.href}
                target="_blank"
              >
                {item.label}
              </ButtonLink>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-3 lg:hidden">
            {primary.map((item) => (
              <ButtonLink
                key={item.label}
                variant="primary"
                size="sm"
                href={item.href}
              >
                {item.label}
              </ButtonLink>
            ))}
            <button
              className="flex flex-col justify-center gap-1.5 p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <span
                className={`block h-0.5 w-6 bg-foreground transition-all duration-200 ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`}
              />
              <span
                className={`block h-0.5 w-6 bg-foreground transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`block h-0.5 w-6 bg-foreground transition-all duration-200 ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`}
              />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-2 flex flex-col gap-3 rounded-3xl border border-foreground/5 bg-muted/80 px-6 py-5 shadow-lg backdrop-blur-md lg:hidden">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-center font-body text-base font-normal text-foreground transition-opacity hover:opacity-60"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
