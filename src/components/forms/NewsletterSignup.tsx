'use client'

import { useRef, useEffect, useActionState } from 'react'
import Button from '@/components/ui/Button'
import {
  subscribeToUpdates,
  type NewsletterState,
} from '@/lib/actions/newsletter'

export default function NewsletterSignup({
  heading = 'A Year-Long Musical Celebration',
  ctaLabel = 'Sign up for updates',
  className = '',
}: {
  heading?: string
  ctaLabel?: string
  className?: string
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
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
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
          {state.status === 'error' && state.message && (
            <p className="font-body text-sm text-red-600">{state.message}</p>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Signing up…' : ctaLabel}
          </Button>
        </form>
      )}
    </div>
  )
}
