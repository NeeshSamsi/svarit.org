'use client'

import { useRef, useEffect, useActionState } from 'react'
import { getContent } from '@/lib/cms'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/ui/Button'
import { gsap } from '@/lib/gsap'
import { submitContact, type ContactState } from '@/lib/actions/contact'

export default function Contact() {
  const { contact } = getContent()
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)

  const initialState: ContactState = { status: 'idle' }
  const [state, formAction, isPending] = useActionState(
    submitContact,
    initialState
  )
  const tsRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (tsRef.current) tsRef.current.value = String(Date.now())
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
          {state.status === 'success' ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
              <h3 className="font-display text-card-title font-medium text-foreground">
                Thank you for reaching out!
              </h3>
              <p className="font-body text-base font-light text-foreground">
                Your message has been sent. We&apos;ll be in touch soon.
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="contact-name"
                  className="font-body text-base text-foreground"
                >
                  {contact.form.nameLabel}
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  aria-invalid={!!state.errors?.name}
                  className="rounded-full border border-foreground/20 bg-primary px-6 py-3 font-body text-base transition-colors outline-none hover:border-foreground focus:border-foreground"
                />
                {state.errors?.name && (
                  <span className="font-body text-sm text-red-600">
                    {state.errors.name}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="contact-email"
                  className="font-body text-base text-foreground"
                >
                  {contact.form.emailLabel}
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  aria-invalid={!!state.errors?.email}
                  className="rounded-full border border-foreground/20 bg-primary px-6 py-3 font-body text-base transition-colors outline-none hover:border-foreground focus:border-foreground"
                />
                {state.errors?.email && (
                  <span className="font-body text-sm text-red-600">
                    {state.errors.email}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="contact-message"
                  className="font-body text-base text-foreground"
                >
                  {contact.form.messageLabel}
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  aria-invalid={!!state.errors?.message}
                  className="resize-none rounded-3xl border border-foreground/20 bg-primary px-6 py-4 font-body text-base transition-colors outline-none hover:border-foreground focus:border-foreground"
                />
                {state.errors?.message && (
                  <span className="font-body text-sm text-red-600">
                    {state.errors.message}
                  </span>
                )}
              </div>
              <input
                type="checkbox"
                name="botcheck"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <input
                ref={tsRef}
                type="hidden"
                name="submittedAt"
                defaultValue=""
              />
              {state.status === 'error' && state.message && (
                <p className="font-body text-sm text-red-600">
                  {state.message}
                </p>
              )}
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
