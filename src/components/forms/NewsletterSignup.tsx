'use client'

import { useRef, useEffect, useActionState } from 'react'
import Button from '@/components/ui/Button'
import {
  subscribeToUpdates,
  type NewsletterState,
} from '@/lib/actions/newsletter'
import { track } from '@/lib/analytics'

export default function NewsletterSignup({
  // Any page can carry a timeline (event_list's timeline variation isn't
  // centenary-specific), so this default must stay page-agnostic. Page
  // copy like "A Year-Long Musical Celebration" belongs in the Prismic
  // signup_heading field, not here.
  heading = 'Stay in the loop',
  ctaLabel = 'Sign up for updates',
  className = '',
  // When a caller drives its own GSAP entrance for the individual fields
  // (EventListTimeline does, staggering them in), this hides the name
  // group, email group and submit button before paint via the existing
  // `.gsap-reveal` hook, giving that caller's tween something to reveal.
  // Left false by default so a standalone NewsletterSignup, used somewhere
  // with no animation wired up at all, always renders its fields visible;
  // without this opt-in, they would sit permanently invisible instead.
  staggerFields = false,
  // The Bento event this signup should track as, e.g. '$opt.in.centenary'
  // for the /centenary page's form. The server independently re-validates
  // this against an allowlist, since a hidden input is client controlled.
  eventType = '$opt.in',
}: {
  heading?: string
  ctaLabel?: string
  className?: string
  staggerFields?: boolean
  eventType?: string
}) {
  const initialState: NewsletterState = { status: 'idle' }
  const [state, formAction, isPending] = useActionState(
    subscribeToUpdates,
    initialState
  )
  const tsRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tsRef.current) tsRef.current.value = String(Date.now())
  }, [])

  useEffect(() => {
    if (state.result) {
      track('newsletter-signup', {
        list: eventType === '$opt.in.centenary' ? 'centenary' : 'general',
        result: state.result,
      })
    } else if (state.reason) {
      track('newsletter-signup-failed', { reason: state.reason })
    }
  }, [state, eventType])

  const fieldClassName = staggerFields ? 'gsap-reveal newsletter-field' : ''

  return (
    <div className={`flex flex-col gap-6 ${className}`.trim()}>
      {heading && (
        <h3 className="font-display text-2xl leading-tight font-medium text-foreground">
          {heading}
        </h3>
      )}
      {state.status === 'success' ? (
        <p className="font-body text-base font-light text-foreground">
          {state.message}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-6">
          <div className={`flex flex-col gap-2 ${fieldClassName}`.trim()}>
            <label
              htmlFor="newsletter-name"
              className="font-body text-base text-foreground"
            >
              Name
            </label>
            <input
              id="newsletter-name"
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
          <div className={`flex flex-col gap-2 ${fieldClassName}`.trim()}>
            <label
              htmlFor="newsletter-email"
              className="font-body text-base text-foreground"
            >
              Email
            </label>
            <input
              id="newsletter-email"
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
          <input
            type="checkbox"
            name="botcheck"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <input ref={tsRef} type="hidden" name="submittedAt" defaultValue="" />
          <input type="hidden" name="eventType" value={eventType} />
          {state.status === 'error' && state.message && (
            <p className="font-body text-sm text-red-600">{state.message}</p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className={`w-full ${fieldClassName}`.trim()}
          >
            {isPending ? 'Signing up…' : ctaLabel}
          </Button>
        </form>
      )}
    </div>
  )
}
