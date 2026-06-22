'use server'

import { z } from 'zod'
import { contactSchema } from '@/lib/schemas/contact'

export type ContactState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: Partial<Record<'name' | 'email' | 'message', string>>
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  if (formData.get('botcheck')) return { status: 'success' }

  const submittedAt = Number(formData.get('submittedAt'))
  if (!submittedAt || Date.now() - submittedAt < 3000) return { status: 'success' }

  const result = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!result.success) {
    const fieldErrors = z.flattenError(result.error).fieldErrors
    return {
      status: 'error',
      message: 'Please fix the errors and try again.',
      errors: {
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        message: fieldErrors.message?.[0],
      },
    }
  }

  const accessKey = process.env.SPLITFORM_ACCESS_KEY
  if (!accessKey)
    return {
      status: 'error',
      message: 'The form is not configured correctly. Please try again later.',
    }

  try {
    const res = await fetch('https://splitforms.com/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        access_key: accessKey,
        name: result.data.name,
        email: result.data.email,
        message: result.data.message,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await res.json().catch(() => null)

    if (res.status === 429)
      return {
        status: 'error',
        message: 'Too many submissions right now. Please try again in a few minutes.',
      }

    if (!res.ok || !data?.success)
      return {
        status: 'error',
        message: 'Something went wrong sending your message. Please try again.',
      }

    return { status: 'success' }
  } catch {
    return {
      status: 'error',
      message: 'Could not reach the server. Please try again in a moment.',
    }
  }
}
