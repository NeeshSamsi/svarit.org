'use client'

import { useRef, useEffect } from 'react'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/ui/Button'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export default function Contact() {
  const { contact } = getContent()
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.from(titleRef.current, {
      y: 24,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
    })
    gsap.from(widgetRef.current, {
      y: 20,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-label="Contact"
      className="col-span-full grid grid-cols-subgrid gap-y-8 md:gap-y-0"
    >
      <div ref={titleRef} className="col-span-full md:col-span-6">
        <SectionTitle
          eyebrow={contact.subheading}
          title={contact.heading}
          description={contact.description}
        />
      </div>
      <div className="col-span-full md:col-span-6">
        <div ref={widgetRef} className="rounded-3xl bg-muted p-6">
          <form className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-body text-base text-foreground">
                {contact.form.nameLabel}
              </label>
              <input
                type="text"
                className="rounded-full border border-transparent bg-primary px-6 py-3 font-body text-base transition-colors outline-none hover:border-foreground/20 focus:border-foreground"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-base text-foreground">
                {contact.form.emailLabel}
              </label>
              <input
                type="email"
                className="rounded-full border border-transparent bg-primary px-6 py-3 font-body text-base transition-colors outline-none hover:border-foreground/20 focus:border-foreground"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-body text-base text-foreground">
                {contact.form.messageLabel}
              </label>
              <textarea
                rows={4}
                className="resize-none rounded-3xl border border-transparent bg-primary px-6 py-4 font-body text-base transition-colors outline-none hover:border-foreground/20 focus:border-foreground"
              />
            </div>
            <Button className="w-full">Send Message</Button>
          </form>
        </div>
      </div>
    </section>
  )
}
