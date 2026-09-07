import type { Content } from '@prismicio/client'
import type { SliceComponentProps } from '@prismicio/react'
import { getAllVolunteers } from '@/lib/queries'
import AboutSection from './AboutSection'

export type AboutProps = SliceComponentProps<Content.AboutSlice>

/**
 * The volunteer avatars are their own documents now, so the slice fetches them
 * server side and the client component renders the row inline, exactly as the
 * current home page does.
 */
export default async function About({ slice }: AboutProps) {
  const volunteers = await getAllVolunteers()

  return <AboutSection slice={slice} volunteers={volunteers} />
}
