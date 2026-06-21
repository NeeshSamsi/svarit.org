import { z } from 'zod'

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(100),
  email: z.email('Please enter a valid email'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000),
})

export type ContactInput = z.infer<typeof contactSchema>
