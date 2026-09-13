import { z } from 'zod'

export const newsletterSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(100),
  email: z.email('Please enter a valid email'),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>

/**
 * Bento event types this signup form may submit. This lives on two layers on
 * purpose: the slice's `signup_event_type` field is a Select in the Prismic
 * model, which stops editors from typing a stray value, but the event type
 * still travels to the server through a hidden form input, which is client
 * controlled. Without this allowlist, anyone could POST an arbitrary string
 * and write junk event names into the Bento account. `.catch()` means
 * anything absent, empty, or not one of these two resolves to the default
 * opt-in flow rather than throwing, so the same schema works for both the
 * server's validation of a submitted value and the slice field resolving its
 * fallback.
 */
export const NEWSLETTER_EVENT_TYPES = ['$opt.in', '$opt.in.centenary'] as const
export const newsletterEventTypeSchema = z
  .enum(NEWSLETTER_EVENT_TYPES)
  .catch('$opt.in')
export type NewsletterEventType = (typeof NEWSLETTER_EVENT_TYPES)[number]
