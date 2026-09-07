import type { Content } from '@prismicio/client'
import type { SliceComponentProps } from '@prismicio/react'
import { getAllArtists } from '@/lib/queries'
import ArtistListGrid from './ArtistListGrid'

export type ArtistListProps = SliceComponentProps<Content.ArtistListSlice>

/**
 * Fetches every artist server side, then hands them to the client component that
 * owns the grid and the GSAP reveal.
 */
export default async function ArtistList({ slice }: ArtistListProps) {
  const artists = await getAllArtists()

  return <ArtistListGrid slice={slice} artists={artists} />
}
