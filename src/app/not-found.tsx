import type { Metadata } from 'next'
import NotFoundContent from './NotFoundContent'

// A 404 must not inherit the root layout's canonical (which points at the
// homepage) or its `index, follow`: a missing page that claims the homepage as
// canonical reads as a soft 404. `canonical: null` clears the inherited value.
// This export is load-bearing and has to live in a server component, so the
// animated body is a client child.
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
  alternates: { canonical: null },
}

export default function NotFound() {
  return <NotFoundContent />
}
