'use server'

import { z } from 'zod'
import {
  newsletterSchema,
  newsletterEventTypeSchema,
} from '@/lib/schemas/newsletter'
import { getBento } from '@/lib/bento'
import { splitName } from '@/lib/splitName'

export type NewsletterState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: Partial<Record<'name' | 'email', string>>
}

export async function subscribeToUpdates(
  _prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  if (formData.get('botcheck')) return { status: 'success' }

  const submittedAt = Number(formData.get('submittedAt'))
  if (!submittedAt || Date.now() - submittedAt < 3000)
    return { status: 'success' }

  const result = newsletterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  if (!result.success) {
    const fieldErrors = z.flattenError(result.error).fieldErrors
    return {
      status: 'error',
      message: 'Please fix the errors and try again.',
      errors: {
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
      },
    }
  }

  const bento = getBento()
  if (!bento)
    return {
      status: 'error',
      message:
        'The signup form is not configured correctly. Please try again later.',
    }

  const { name, email } = result.data
  // The hidden eventType input is client controlled; parsing it through the
  // allowlisted schema means anything absent, spoofed, or not one of the
  // two known values falls back to the default opt-in flow rather than
  // being written to Bento unchecked.
  const eventType = newsletterEventTypeSchema.parse(formData.get('eventType'))

  try {
    const subscriber = await bento.V1.Subscribers.getSubscribers({ email })
    if (subscriber)
      return { status: 'success', message: 'You are already subscribed.' }

    const { first_name, last_name } = splitName(name)

    await bento.V1.track({
      email,
      type: eventType,
      fields: { first_name, last_name },
    })

    return {
      status: 'success',
      message: 'Please check your inbox and confirm your subscription.',
    }
  } catch (err) {
    console.error(err)
    return {
      status: 'error',
      message: 'Something went wrong, please try again later.',
    }
  }
}
