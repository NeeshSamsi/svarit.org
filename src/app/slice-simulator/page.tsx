import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  SliceSimulator,
  SliceSimulatorParams,
  getSlices,
} from '@prismicio/next'
import { SliceZone } from '@prismicio/react'

import { components } from '../../slices'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function SliceSimulatorPage({
  searchParams,
}: SliceSimulatorParams) {
  // This route only exists for Slice Machine, which runs it in dev or through a
  // preview session. On the live site it would otherwise serve a bare 200, so
  // close it to everyone except an active draft session. The NODE_ENV check
  // leaves `pnpm slicemachine` and `next dev` untouched.
  const { isEnabled } = await draftMode()
  if (process.env.NODE_ENV === 'production' && !isEnabled) notFound()

  const { state } = await searchParams
  const slices = getSlices(state)

  return (
    <SliceSimulator>
      <SliceZone slices={slices} components={components} />
    </SliceSimulator>
  )
}
