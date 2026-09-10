import { z } from 'zod'

export const newsletterSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(100),
  email: z.email('Please enter a valid email'),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>
